import { useState, useEffect } from 'react'
import { Moon, Sun, Key, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useSettingsStore, type Theme } from '../../stores/settings-store'
import type { AIProviderConfig, AIProvider } from '@shared/types/ai'

const AI_PROVIDERS: { value: AIProvider; label: string; defaultBaseUrl: string; models: string[] }[] = [
  {
    value: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      // GPT-5 series (newest)
      'gpt-5.4', 'gpt-5.3-codex', 'gpt-5.2', 'gpt-5.2-pro',
      // GPT-4.5 / GPT-4.1 series
      'gpt-4.5-preview', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
      // GPT-4o series
      'gpt-4o', 'gpt-4o-mini', 'gpt-4o-2024-11-20', 'gpt-4o-2024-08-06',
      // GPT-4 series
      'gpt-4-turbo', 'gpt-4-turbo-2024-04-09', 'gpt-4', 'gpt-4-0613',
      // GPT-3.5 series
      'gpt-3.5-turbo', 'gpt-3.5-turbo-0125',
      // o-series (reasoning)
      'o4-mini', 'o3', 'o3-mini', 'o3-mini-2025-01-31', 'o1', 'o1-mini', 'o1-2024-12-17',
      // ChatGPT
      'chatgpt-4o-latest',
    ],
  },
  {
    value: 'anthropic',
    label: 'Anthropic',

    defaultBaseUrl: 'https://api.anthropic.com',
    models: [
      // Claude 4.5 / 4.6 series (newest)
      'claude-opus-4-5-20251101', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001',
      // Claude 4 series
      'claude-opus-4-20250514', 'claude-sonnet-4-20250514',
      // Claude 3.7 series
      'claude-3-7-sonnet-20250219',
      // Claude 3.5 series
      'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20240620', 'claude-3-5-haiku-20241022',
      // Claude 3 series
      'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307',
    ],
  },
  {
    value: 'openrouter',
    label: 'OpenRouter',

    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    models: [
      // OpenAI (newest first)
      'openai/gpt-5.4', 'openai/gpt-5.3-codex', 'openai/gpt-5.2', 'openai/gpt-4.1', 'openai/gpt-4.1-mini',
      'openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/o4-mini', 'openai/o3', 'openai/o3-mini', 'openai/o1',
      // Anthropic
      'anthropic/claude-opus-4.5', 'anthropic/claude-sonnet-4.5', 'anthropic/claude-haiku-4.5',
      'anthropic/claude-opus-4', 'anthropic/claude-sonnet-4',
      'anthropic/claude-3.7-sonnet', 'anthropic/claude-3.5-sonnet', 'anthropic/claude-3.5-haiku',
      'anthropic/claude-3-opus', 'anthropic/claude-3-haiku',
      // Google
      'google/gemini-3-flash-preview', 'google/gemini-2.5-pro-preview', 'google/gemini-2.5-flash-preview',
      'google/gemini-2.0-flash-001', 'google/gemini-2.0-flash-lite-001',
      'google/gemini-pro-1.5', 'google/gemini-flash-1.5',
      // DeepSeek (top trending)
      'deepseek/deepseek-r2', 'deepseek/deepseek-v3.2', 'deepseek/deepseek-chat-v3-0324',
      'deepseek/deepseek-r1', 'deepseek/deepseek-v3-base',
      // Qwen (top trending)
      'qwen/qwen3-coder', 'qwen/qwen3-235b-a22b', 'qwen/qwen3-32b',
      'qwen/qwen-2.5-72b-instruct', 'qwen/qwen-2.5-coder-32b-instruct',
      'qwen/qwq-32b', 'qwen/qwen-turbo',
      // MiniMax
      'minimax/minimax-m2.5',
      // Meta Llama
      'meta-llama/llama-4-maverick', 'meta-llama/llama-4-scout',
      'meta-llama/llama-3.3-70b-instruct', 'meta-llama/llama-3.1-405b-instruct',
      'meta-llama/llama-3.1-70b-instruct', 'meta-llama/llama-3.1-8b-instruct',
      // Mistral
      'mistralai/mistral-large-2411', 'mistralai/mistral-medium', 'mistralai/mistral-small-3.1-24b-instruct',
      'mistralai/codestral-2501', 'mistralai/mixtral-8x22b-instruct',
      // Microsoft
      'microsoft/phi-4', 'microsoft/phi-4-multimodal-instruct', 'microsoft/mai-ds-r1',
      // Cohere
      'cohere/command-a', 'cohere/command-r-plus', 'cohere/command-r',
      // xAI
      'x-ai/grok-3-beta', 'x-ai/grok-3-mini-beta', 'x-ai/grok-2-1212',
      // Amazon
      'amazon/nova-pro-v1', 'amazon/nova-lite-v1', 'amazon/nova-micro-v1',
      // Perplexity
      'perplexity/sonar-pro', 'perplexity/sonar', 'perplexity/sonar-reasoning',
    ],
  },
  {
    value: 'ollama',
    label: 'Ollama (Local)',

    defaultBaseUrl: 'http://localhost:11434',
    models: [
      // Meta Llama
      'llama3.3', 'llama3.3:70b', 'llama3.2', 'llama3.2:1b', 'llama3.1', 'llama3.1:70b', 'llama3',
      // OpenAI open-weight (gpt-oss)
      'gpt-oss',
      // DeepSeek
      'deepseek-r2', 'deepseek-r1', 'deepseek-r1:8b', 'deepseek-r1:14b', 'deepseek-r1:32b', 'deepseek-r1:70b',
      'deepseek-coder-v2', 'deepseek-v3',
      // Qwen (newest first)
      'qwen3', 'qwen3:8b', 'qwen3:14b', 'qwen3:32b', 'qwen3:72b',
      'qwen3-coder', 'qwen3.5', 'qwen3.5:2b', 'qwen3.5:4b', 'qwen3.5:9b',
      'qwen2.5', 'qwen2.5:7b', 'qwen2.5:14b', 'qwen2.5:32b', 'qwen2.5:72b',
      'qwen2.5-coder', 'qwen2.5-coder:7b', 'qwen2.5-coder:14b', 'qwen2.5-coder:32b',
      'qwq',
      // GLM / Kimi / MiniMax
      'glm-5', 'kimi-k2.5', 'minimax',
      // Mistral
      'mistral', 'mistral-nemo', 'mistral-large', 'mistral-small',
      'mixtral', 'mixtral:8x22b',
      // Google
      'gemma3', 'gemma3:12b', 'gemma3:27b', 'gemma2', 'gemma2:2b', 'gemma2:27b',
      // Microsoft
      'phi4', 'phi4-mini', 'phi3', 'phi3:14b',
      // Coding
      'codellama', 'codellama:13b', 'codellama:34b', 'codegemma', 'starcoder2',
      // Other
      'command-r', 'command-r-plus', 'solar', 'yi', 'yi:34b',
      'dolphin-mixtral', 'nous-hermes2', 'openchat', 'vicuna', 'zephyr',
    ],
  },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--mai-bg-elevated)',
  border: '1px solid var(--mai-border-strong)',
  borderRadius: 5,
  padding: '6px 10px',
  color: 'var(--mai-text-1)',
  fontSize: 12,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--mai-text-2)',
  marginBottom: 4,
  display: 'block',
}

export function SettingsPanel() {
  const { theme, aiConfig, setTheme, setAIConfig } = useSettingsStore()
  const [provider, setProvider] = useState<AIProvider>(aiConfig?.provider ?? 'openai')
  const [apiKey, setApiKey] = useState(aiConfig?.apiKey ?? '')
  const [model, setModel] = useState(aiConfig?.model ?? '')
  const [baseUrl, setBaseUrl] = useState(aiConfig?.baseUrl ?? '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)

  useEffect(() => {
    if (aiConfig) {
      setProvider(aiConfig.provider)
      setApiKey(aiConfig.apiKey)
      setModel(aiConfig.model)
      setBaseUrl(aiConfig.baseUrl ?? '')
    }
  }, [aiConfig])

  const handleProviderChange = (p: AIProvider) => {
    setProvider(p)
    setModel('')
    setBaseUrl('')
    setTestResult(null)
  }

  const handleSaveAI = () => {
    const config: AIProviderConfig = {
      provider,
      apiKey,
      model,
      baseUrl: baseUrl || undefined,
    }
    setAIConfig(config)
  }

  const handleTestKey = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const config: AIProviderConfig = { provider, apiKey, model, baseUrl: baseUrl || undefined }
      const result = await invoke('ai:test-key', config)
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, error: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: 'var(--mai-bg-base)', padding: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--mai-text-1)', marginBottom: 24 }}>Settings</h2>

      {/* Appearance */}
      <Section title="Appearance">
        <label style={labelStyle}>Theme</label>
        <div className="flex items-center gap-2">
          {(['dark', 'light'] as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className="flex items-center gap-1.5"
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: theme === t ? '1px solid var(--mai-accent)' : '1px solid var(--mai-border-strong)',
                background: theme === t ? 'var(--mai-accent-bg)' : 'var(--mai-bg-elevated)',
                color: theme === t ? 'var(--mai-accent)' : 'var(--mai-text-2)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {t === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </Section>

      {/* AI Configuration */}
      <Section title="AI Configuration">
        <label style={labelStyle}>Provider</label>
        <div className="flex items-center gap-2 mb-3">
          {AI_PROVIDERS.map((p) => (
            <button
              key={p.value}
              onClick={() => handleProviderChange(p.value)}
              style={{
                padding: '5px 12px',
                borderRadius: 5,
                border: provider === p.value ? '1px solid var(--mai-accent)' : '1px solid var(--mai-border-strong)',
                background: provider === p.value ? 'var(--mai-accent-bg)' : 'var(--mai-bg-elevated)',
                color: provider === p.value ? 'var(--mai-accent)' : 'var(--mai-text-2)',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {provider !== 'ollama' && (
          <>
            <label style={labelStyle}>
              <Key size={10} style={{ display: 'inline', marginRight: 4 }} />
              API Key
            </label>
            <input
              type="password"
              placeholder={provider === 'openai' ? 'sk-...' : provider === 'anthropic' ? 'sk-ant-...' : 'sk-or-...'}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestResult(null) }}
              style={{ ...inputStyle, marginBottom: 8 }}
            />
          </>
        )}

        <label style={labelStyle}>Model</label>
        <input
          type="text"
          list={`model-suggestions-${provider}`}
          placeholder="Model name"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={{ ...inputStyle, marginBottom: 8 }}
        />
        <datalist id={`model-suggestions-${provider}`}>
          {(AI_PROVIDERS.find((p) => p.value === provider)?.models ?? []).map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

        <label style={labelStyle}>Endpoint</label>
        <input
          type="text"
          placeholder={AI_PROVIDERS.find((p) => p.value === provider)?.defaultBaseUrl ?? ''}
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          style={{ ...inputStyle, marginBottom: 8 }}
        />

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleSaveAI}
            style={{
              padding: '6px 14px',
              borderRadius: 5,
              border: 'none',
              background: '#5B8AF0',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Save
          </button>
          <button
            onClick={handleTestKey}
            disabled={testing || (!apiKey && provider !== 'ollama')}
            style={{
              padding: '6px 14px',
              borderRadius: 5,
              border: '1px solid var(--mai-border-strong)',
              background: 'transparent',
              color: 'var(--mai-text-2)',
              cursor: testing ? 'default' : 'pointer',
              fontSize: 12,
              opacity: testing || (!apiKey && provider !== 'ollama') ? 0.4 : 1,
            }}
          >
            {testing ? (
              <span className="flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" /> Testing...
              </span>
            ) : (
              'Test Connection'
            )}
          </button>
          {testResult && (
            <span className="flex items-center gap-1" style={{ fontSize: 11, color: testResult.success ? '#34D399' : '#F87171' }}>
              {testResult.success ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
              {testResult.success ? 'Connected' : testResult.error}
            </span>
          )}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--mai-text-1)', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--mai-border)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}
