import { useState, useEffect } from 'react'
import { Moon, Sun, Key, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useSettingsStore, type Theme } from '../../stores/settings-store'
import type { AIProviderConfig, AIProvider } from '@shared/types/ai'

const AI_PROVIDERS: { value: AIProvider; label: string; defaultModel: string }[] = [
  { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini' },
  { value: 'anthropic', label: 'Anthropic', defaultModel: 'claude-sonnet-4-20250514' },
  { value: 'ollama', label: 'Ollama (Local)', defaultModel: 'llama3' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#222227',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 5,
  padding: '6px 10px',
  color: '#ECECEC',
  fontSize: 12,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#8B8B8B',
  marginBottom: 4,
  display: 'block',
}

export function SettingsPanel() {
  const { theme, aiConfig, setTheme, setAIConfig } = useSettingsStore()
  const [provider, setProvider] = useState<AIProvider>(aiConfig?.provider ?? 'openai')
  const [apiKey, setApiKey] = useState(aiConfig?.apiKey ?? '')
  const [model, setModel] = useState(aiConfig?.model ?? 'gpt-4o-mini')
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
    const def = AI_PROVIDERS.find((pp) => pp.value === p)
    setModel(def?.defaultModel ?? '')
    setBaseUrl(p === 'ollama' ? 'http://localhost:11434' : '')
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
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#131316', padding: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#ECECEC', marginBottom: 24 }}>Settings</h2>

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
                border: theme === t ? '1px solid #5B8AF0' : '1px solid rgba(255,255,255,0.1)',
                background: theme === t ? 'rgba(91,138,240,0.1)' : '#222227',
                color: theme === t ? '#5B8AF0' : '#8B8B8B',
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
                border: provider === p.value ? '1px solid #5B8AF0' : '1px solid rgba(255,255,255,0.1)',
                background: provider === p.value ? 'rgba(91,138,240,0.1)' : '#222227',
                color: provider === p.value ? '#5B8AF0' : '#8B8B8B',
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
              placeholder={provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestResult(null) }}
              style={{ ...inputStyle, marginBottom: 8 }}
            />
          </>
        )}

        <label style={labelStyle}>Model</label>
        <input
          type="text"
          placeholder="Model name"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={{ ...inputStyle, marginBottom: 8 }}
        />

        {(provider === 'ollama' || baseUrl) && (
          <>
            <label style={labelStyle}>Base URL</label>
            <input
              type="text"
              placeholder="http://localhost:11434"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              style={{ ...inputStyle, marginBottom: 8 }}
            />
          </>
        )}

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
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: '#8B8B8B',
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
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#ECECEC', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}
