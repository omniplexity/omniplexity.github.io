/**
 * ReAct (Reasoning + Acting) Agent Implementation
 *
 * This implements a simple ReAct-style agent that can:
 * 1. Think about the problem
 * 2. Decide on an action (tool to use)
 * 3. Execute the action
 * 4. Observe the result
 * 5. Repeat until it has a final answer
 *
 * Note: This is a simplified implementation that works with LM Studio.
 * For production use, consider using the full LangChain.js library.
 */

import { lmStudioClient } from '../lmstudio'
import { calculatorToolDefinition, memoryToolDefinition } from './tools'
import { REACT_SYSTEM_PROMPT } from './prompts'
import type { ChatMessage } from '../lmstudio/types'
import type { AgentConfig, AgentStep } from '../../types/agent'

export interface AgentTool {
  name: string
  description: string
  execute: (input: string) => string | Promise<string>
}

export interface AgentResult {
  answer: string
  steps: AgentStep[]
  tokensUsed?: number
}

// Available tools
const TOOLS: Record<string, AgentTool> = {
  calculator: calculatorToolDefinition,
  memory: memoryToolDefinition,
}

/**
 * Parse the agent's response to extract thought, action, and final answer.
 */
function parseAgentResponse(response: string): {
  thought?: string
  action?: string
  actionInput?: string
  finalAnswer?: string
} {
  const result: ReturnType<typeof parseAgentResponse> = {}

  // Extract thought
  const thoughtMatch = response.match(/Thought:\s*(.+?)(?=\n|Action:|Final Answer:|$)/is)
  if (thoughtMatch) {
    result.thought = thoughtMatch[1].trim()
  }

  // Extract action
  const actionMatch = response.match(/Action:\s*(\w+)/i)
  if (actionMatch) {
    result.action = actionMatch[1].toLowerCase()
  }

  // Extract action input
  const inputMatch = response.match(/Action Input:\s*(.+?)(?=\n|Observation:|$)/is)
  if (inputMatch) {
    result.actionInput = inputMatch[1].trim()
  }

  // Extract final answer
  const answerMatch = response.match(/Final Answer:\s*(.+)/is)
  if (answerMatch) {
    result.finalAnswer = answerMatch[1].trim()
  }

  return result
}

/**
 * Build the tools description for the system prompt.
 */
function buildToolsDescription(enabledTools: string[]): string {
  return enabledTools
    .map((name) => {
      const tool = TOOLS[name]
      if (!tool) return null
      return `- ${tool.name}: ${tool.description}`
    })
    .filter(Boolean)
    .join('\n')
}

/**
 * Run the ReAct agent loop.
 */
export async function runReactAgent(
  userMessage: string,
  config: AgentConfig,
  model: string,
  onStep?: (step: AgentStep) => void
): Promise<AgentResult> {
  const steps: AgentStep[] = []
  const enabledTools = config.tools.filter((t) => t.enabled).map((t) => t.name)

  // Build system prompt with tools
  const toolsDescription = buildToolsDescription(enabledTools)
  const systemPrompt = REACT_SYSTEM_PROMPT.replace('{tools}', toolsDescription)

  // Initialize conversation
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]

  let iterations = 0
  let finalAnswer = ''

  while (iterations < config.maxIterations) {
    iterations++

    // Get agent's response
    const response = await lmStudioClient.chatCompletion({
      model,
      messages,
      temperature: config.temperature,
      max_tokens: 1024,
    })

    const agentResponse = response.choices[0]?.message?.content || ''
    const parsed = parseAgentResponse(agentResponse)

    // Record thought
    if (parsed.thought) {
      const thoughtStep: AgentStep = { type: 'thought', content: parsed.thought }
      steps.push(thoughtStep)
      onStep?.(thoughtStep)
    }

    // Check for final answer
    if (parsed.finalAnswer) {
      finalAnswer = parsed.finalAnswer
      const answerStep: AgentStep = { type: 'answer', content: parsed.finalAnswer }
      steps.push(answerStep)
      onStep?.(answerStep)
      break
    }

    // Execute action if provided
    if (parsed.action && parsed.actionInput) {
      const tool = TOOLS[parsed.action]

      if (tool && enabledTools.includes(parsed.action)) {
        // Record action
        const actionStep: AgentStep = {
          type: 'action',
          content: `Using ${parsed.action}`,
          tool: parsed.action,
          toolInput: parsed.actionInput,
        }
        steps.push(actionStep)
        onStep?.(actionStep)

        // Execute tool
        try {
          const toolResult = await tool.execute(parsed.actionInput)

          // Record observation
          const observationStep: AgentStep = {
            type: 'observation',
            content: toolResult,
            tool: parsed.action,
            toolOutput: toolResult,
          }
          steps.push(observationStep)
          onStep?.(observationStep)

          // Add to conversation
          messages.push({ role: 'assistant', content: agentResponse })
          messages.push({ role: 'user', content: `Observation: ${toolResult}` })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          const errorStep: AgentStep = {
            type: 'observation',
            content: `Error: ${errorMessage}`,
            tool: parsed.action,
            toolOutput: `Error: ${errorMessage}`,
          }
          steps.push(errorStep)
          onStep?.(errorStep)

          messages.push({ role: 'assistant', content: agentResponse })
          messages.push({ role: 'user', content: `Observation: Error - ${errorMessage}` })
        }
      } else {
        // Unknown tool
        const errorMessage = `Unknown tool: ${parsed.action}. Available tools: ${enabledTools.join(', ')}`
        messages.push({ role: 'assistant', content: agentResponse })
        messages.push({ role: 'user', content: `Observation: ${errorMessage}` })
      }
    } else {
      // No action or final answer - prompt for continuation
      messages.push({ role: 'assistant', content: agentResponse })
      messages.push({
        role: 'user',
        content: 'Continue your reasoning. Use a tool if needed, or provide your Final Answer.',
      })
    }
  }

  // If we hit max iterations without an answer, force one
  if (!finalAnswer) {
    const forcedResponse = await lmStudioClient.chatCompletion({
      model,
      messages: [
        ...messages,
        {
          role: 'user',
          content:
            'You have reached the maximum number of steps. Please provide your Final Answer now based on what you have learned.',
        },
      ],
      temperature: config.temperature,
      max_tokens: 1024,
    })

    const forcedContent = forcedResponse.choices[0]?.message?.content || ''
    const forcedParsed = parseAgentResponse(forcedContent)
    finalAnswer = forcedParsed.finalAnswer || forcedContent

    const answerStep: AgentStep = { type: 'answer', content: finalAnswer }
    steps.push(answerStep)
    onStep?.(answerStep)
  }

  return { answer: finalAnswer, steps }
}
