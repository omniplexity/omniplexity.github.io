export interface AgentConfig {
  /** Enable ReAct-style reasoning */
  enabled: boolean
  /** System prompt for the agent */
  systemPrompt: string
  /** Maximum reasoning steps before forcing an answer */
  maxIterations: number
  /** Temperature for agent reasoning (usually lower) */
  temperature: number
  /** Available tools */
  tools: AgentTool[]
}

export interface AgentTool {
  name: string
  description: string
  enabled: boolean
}

export interface AgentStep {
  type: 'thought' | 'action' | 'observation' | 'answer'
  content: string
  tool?: string
  toolInput?: string
  toolOutput?: string
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  enabled: false,
  systemPrompt: `You are a helpful AI assistant with access to tools.
When you need to use a tool, use the following format:

Thought: I need to think about what to do
Action: tool_name
Action Input: the input to the tool
Observation: the result of the tool

When you have enough information to answer, use:
Thought: I now know the answer
Final Answer: your final answer

Always be helpful, accurate, and concise.`,
  maxIterations: 5,
  temperature: 0.3,
  tools: [
    { name: 'calculator', description: 'Perform mathematical calculations', enabled: true },
    { name: 'memory', description: 'Search through conversation history', enabled: true },
  ],
}
