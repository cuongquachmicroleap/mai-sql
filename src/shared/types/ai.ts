export type AIProvider = 'openai' | 'anthropic' | 'ollama'

export interface AIProviderConfig {
  provider: AIProvider
  apiKey: string
  model: string
  baseUrl?: string
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface AIRequest {
  prompt: string
  schemaContext?: string
  queryContext?: string
  errorContext?: string
}

export interface AIResponse {
  content: string
  sql?: string
  error?: string
}
