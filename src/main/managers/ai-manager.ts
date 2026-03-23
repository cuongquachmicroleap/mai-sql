import { net } from 'electron'
import type { AIProviderConfig, AIRequest, AIResponse } from '../../shared/types/ai'

function buildSystemPrompt(schemaContext?: string): string {
  let prompt =
    'You are a SQL assistant embedded in a database client. ' +
    'Help the user write, debug, and optimise SQL queries. ' +
    'When you include SQL in your response, wrap it in a ```sql code block. ' +
    'Be concise and accurate.'

  if (schemaContext) {
    prompt += `\n\nThe user is working with the following database schema:\n${schemaContext}`
  }

  return prompt
}

function extractSQL(text: string): string | undefined {
  // Try to extract from fenced code blocks (```sql ... ``` or ``` ... ```)
  const fencedRegex = /```(?:sql)?\s*\n?([\s\S]*?)```/gi
  const matches: string[] = []

  let match: RegExpExecArray | null
  while ((match = fencedRegex.exec(text)) !== null) {
    const content = match[1].trim()
    if (content.length > 0) {
      matches.push(content)
    }
  }

  if (matches.length > 0) {
    return matches.join(';\n\n')
  }

  // Fallback: detect if the entire text looks like raw SQL
  const sqlKeywords =
    /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH|EXPLAIN|TRUNCATE|BEGIN|COMMIT|ROLLBACK)\b/i
  if (sqlKeywords.test(text.trim())) {
    return text.trim()
  }

  return undefined
}

async function fetchJSON(
  url: string,
  options: { method: string; headers: Record<string, string>; body: string },
): Promise<unknown> {
  const response = await net.fetch(url, {
    method: options.method,
    headers: options.headers,
    body: options.body,
  })

  const text = await response.text()

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const parsed = JSON.parse(text)
      message = parsed.error?.message ?? parsed.message ?? parsed.error ?? message
    } catch {
      // keep the status-based message
    }
    throw new Error(message)
  }

  return JSON.parse(text)
}

async function callOpenAI(
  config: AIProviderConfig,
  system: string,
  user: string,
): Promise<string> {
  const baseUrl = config.baseUrl?.replace(/\/+$/, '') || 'https://api.openai.com'

  const body = JSON.stringify({
    model: config.model || 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
  })

  const data = (await fetchJSON(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body,
  })) as { choices: { message: { content: string } }[] }

  return data.choices?.[0]?.message?.content ?? ''
}

async function callAnthropic(
  config: AIProviderConfig,
  system: string,
  user: string,
): Promise<string> {
  const baseUrl = config.baseUrl?.replace(/\/+$/, '') || 'https://api.anthropic.com'

  const body = JSON.stringify({
    model: config.model || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const data = (await fetchJSON(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body,
  })) as { content: { type: string; text: string }[] }

  const textBlocks = data.content?.filter((b) => b.type === 'text') ?? []
  return textBlocks.map((b) => b.text).join('\n')
}

async function callOllama(
  config: AIProviderConfig,
  system: string,
  user: string,
): Promise<string> {
  const baseUrl = config.baseUrl?.replace(/\/+$/, '') || 'http://localhost:11434'

  const body = JSON.stringify({
    model: config.model || 'llama3',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    stream: false,
  })

  const data = (await fetchJSON(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })) as { message?: { content: string } }

  return data.message?.content ?? ''
}

async function callOpenRouter(
  config: AIProviderConfig,
  system: string,
  user: string,
): Promise<string> {
  const baseUrl = config.baseUrl?.replace(/\/+$/, '') || 'https://openrouter.ai/api'

  const body = JSON.stringify({
    model: config.model || 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
  })

  const data = (await fetchJSON(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'HTTP-Referer': 'https://mai-sql.app',
      'X-Title': 'MAI SQL',
    },
    body,
  })) as { choices: { message: { content: string } }[] }

  return data.choices?.[0]?.message?.content ?? ''
}

export async function chatWithAI(
  config: AIProviderConfig,
  request: AIRequest,
): Promise<AIResponse> {
  try {
    const system = buildSystemPrompt(request.schemaContext)

    let userMessage = request.prompt
    if (request.queryContext) {
      userMessage += `\n\nCurrent query:\n\`\`\`sql\n${request.queryContext}\n\`\`\``
    }
    if (request.errorContext) {
      userMessage += `\n\nError from database:\n${request.errorContext}`
    }

    let content: string

    switch (config.provider) {
      case 'openai':
        content = await callOpenAI(config, system, userMessage)
        break
      case 'anthropic':
        content = await callAnthropic(config, system, userMessage)
        break
      case 'ollama':
        content = await callOllama(config, system, userMessage)
        break
      case 'openrouter':
        content = await callOpenRouter(config, system, userMessage)
        break
      default:
        return { content: '', error: `Unsupported provider: ${config.provider}` }
    }

    const sql = extractSQL(content)
    return { content, sql }
  } catch (err) {
    return { content: '', error: (err as Error).message }
  }
}

export async function testAIKey(
  config: AIProviderConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await chatWithAI(config, {
      prompt: 'Reply with exactly: OK',
    })

    if (response.error) {
      return { success: false, error: response.error }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}
