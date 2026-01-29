/**
 * Calculator tool for mathematical operations.
 * Uses a safe expression evaluator (no eval).
 */

export interface CalculatorResult {
  result: number | string
  expression: string
  error?: string
}

/** Safe mathematical operators and functions */
const SAFE_MATH: Record<string, number | ((...args: number[]) => number)> = {
  // Constants
  PI: Math.PI,
  E: Math.E,
  // Functions
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  log: Math.log,
  log10: Math.log10,
  exp: Math.exp,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
}

/**
 * Evaluate a mathematical expression safely.
 * Supports basic arithmetic (+, -, *, /, ^, %) and common math functions.
 */
export function calculate(expression: string): CalculatorResult {
  try {
    // Clean and validate expression
    const cleaned = expression
      .replace(/\s+/g, '')
      .replace(/\^/g, '**') // Support ^ for exponentiation
      .toLowerCase()

    // Validate characters (only allow safe chars)
    if (!/^[0-9+\-*/().%,a-z]+$/.test(cleaned)) {
      return {
        result: 'Invalid expression',
        expression,
        error: 'Contains invalid characters',
      }
    }

    // Simple tokenizer and evaluator
    const result = evaluateExpression(cleaned)

    return {
      result: Number.isFinite(result) ? result : 'Undefined',
      expression,
    }
  } catch (error) {
    return {
      result: 'Error',
      expression,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Simple recursive descent parser for mathematical expressions.
 */
function evaluateExpression(expr: string): number {
  let pos = 0

  function parseExpression(): number {
    let left = parseTerm()

    while (pos < expr.length) {
      const op = expr[pos]
      if (op !== '+' && op !== '-') break
      pos++
      const right = parseTerm()
      left = op === '+' ? left + right : left - right
    }

    return left
  }

  function parseTerm(): number {
    let left = parseFactor()

    while (pos < expr.length) {
      const op = expr[pos]
      if (op !== '*' && op !== '/' && op !== '%') break
      pos++
      const right = parseFactor()
      if (op === '*') left *= right
      else if (op === '/') left /= right
      else left %= right
    }

    return left
  }

  function parseFactor(): number {
    let base = parseUnary()

    while (pos < expr.length && expr.slice(pos, pos + 2) === '**') {
      pos += 2
      const exp = parseUnary()
      base = Math.pow(base, exp)
    }

    return base
  }

  function parseUnary(): number {
    if (expr[pos] === '-') {
      pos++
      return -parseUnary()
    }
    if (expr[pos] === '+') {
      pos++
      return parseUnary()
    }
    return parseAtom()
  }

  function parseAtom(): number {
    // Parentheses
    if (expr[pos] === '(') {
      pos++
      const result = parseExpression()
      if (expr[pos] === ')') pos++
      return result
    }

    // Number
    const numMatch = expr.slice(pos).match(/^[0-9.]+/)
    if (numMatch) {
      pos += numMatch[0].length
      return parseFloat(numMatch[0])
    }

    // Function or constant
    const nameMatch = expr.slice(pos).match(/^[a-z]+/)
    if (nameMatch) {
      const name = nameMatch[0]
      pos += name.length

      const mathValue = SAFE_MATH[name]
      if (mathValue === undefined) {
        throw new Error(`Unknown function or constant: ${name}`)
      }

      // If it's a function, parse arguments
      if (typeof mathValue === 'function') {
        if (expr[pos] !== '(') {
          throw new Error(`Expected ( after function ${name}`)
        }
        pos++ // Skip (

        const args: number[] = []
        if (expr[pos] !== ')') {
          args.push(parseExpression())
          while (expr[pos] === ',') {
            pos++
            args.push(parseExpression())
          }
        }

        if (expr[pos] === ')') pos++
        return mathValue(...args)
      }

      // It's a constant
      return mathValue
    }

    throw new Error(`Unexpected character at position ${pos}: ${expr[pos]}`)
  }

  const result = parseExpression()

  if (pos < expr.length) {
    throw new Error(`Unexpected character at position ${pos}: ${expr[pos]}`)
  }

  return result
}

/** Tool definition for LangChain */
export const calculatorToolDefinition = {
  name: 'calculator',
  description:
    'Useful for performing mathematical calculations. Input should be a mathematical expression like "2 + 2" or "sqrt(16) * 3".',
  execute: (input: string): string => {
    const result = calculate(input)
    if (result.error) {
      return `Error: ${result.error}`
    }
    return `${result.expression} = ${result.result}`
  },
}
