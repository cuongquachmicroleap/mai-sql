import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Copy, ArrowDownToLine, Loader2, Sparkles } from 'lucide-react'
import { invoke } from '../../lib/ipc-client'
import { useSettingsStore } from '../../stores/settings-store'
import { useEditorStore } from '../../stores/editor-store'
import { useConnectionStore } from '../../stores/connection-store'
import type { AIChatMessage } from '@shared/types/ai'

export function AIChatPanel() {
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { aiConfig } = useSettingsStore()
  const { tabs, activeTabId, addTabWithContent } = useEditorStore()
  const { activeConnectionId } = useConnectionStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !aiConfig || loading) return

    const userMessage: AIChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const result = await invoke('ai:chat', aiConfig, {
        prompt: input.trim(),
        queryContext: activeTab?.content || undefined,
        errorContext: activeTab?.error || undefined,
      })

      const assistantMessage: AIChatMessage = {
        role: 'assistant',
        content: result.error || result.content,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${(err as Error).message}`, timestamp: new Date().toISOString() },
      ])
    } finally {
      setLoading(false)
    }
  }

  const extractSQL = (content: string): string | null => {
    const match = content.match(/```sql\s*([\s\S]*?)```/)
    if (match) return match[1].trim()
    if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b/i.test(content)) return content.trim()
    return null
  }

  const handleInsertSQL = (sql: string) => {
    addTabWithContent('AI Query', sql)
  }

  if (!aiConfig) {
    return (
      <div className="flex flex-col h-full items-center justify-center" style={{ background: 'var(--mai-bg-panel)', color: 'var(--mai-text-3)', padding: 24 }}>
        <Bot size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p style={{ fontSize: 12, textAlign: 'center', marginBottom: 4 }}>AI Assistant not configured</p>
        <p style={{ fontSize: 11, textAlign: 'center' }}>
          Go to Settings to add your OpenAI, Anthropic, OpenRouter, or Ollama API key
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--mai-bg-panel)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 shrink-0"
        style={{
          height: 40,
          padding: '0 12px',
          borderBottom: '1px solid var(--mai-border)',
        }}
      >
        <Sparkles size={12} style={{ color: 'var(--mai-accent)' }} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mai-text-3)' }}>
          AI Assistant
        </span>
        <div className="flex-1" />
        <span style={{ fontSize: 10, color: 'var(--mai-text-4)' }}>
          {aiConfig.provider} / {aiConfig.model}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-3 py-3" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1" style={{ color: 'var(--mai-text-4)' }}>
            <Bot size={24} style={{ opacity: 0.2, marginBottom: 8 }} />
            <p style={{ fontSize: 11 }}>Ask me to write SQL, explain queries, or fix errors</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const sql = msg.role === 'assistant' ? extractSQL(msg.content) : null
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '90%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  lineHeight: 1.5,
                  background: msg.role === 'user' ? 'var(--mai-accent)' : 'var(--mai-bg-elevated)',
                  color: msg.role === 'user' ? '#fff' : 'var(--mai-text-1)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </div>
              {sql && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleInsertSQL(sql)}
                    className="flex items-center gap-1"
                    style={{
                      fontSize: 10,
                      color: 'var(--mai-accent)',
                      background: 'var(--mai-accent-bg)',
                      border: 'none',
                      borderRadius: 4,
                      padding: '2px 6px',
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowDownToLine size={9} />
                    Insert SQL
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(sql).catch(() => {})}
                    className="flex items-center gap-1"
                    style={{
                      fontSize: 10,
                      color: 'var(--mai-text-3)',
                      background: 'var(--mai-bg-hover)',
                      border: 'none',
                      borderRadius: 4,
                      padding: '2px 6px',
                      cursor: 'pointer',
                    }}
                  >
                    <Copy size={9} />
                    Copy
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div className="flex items-center gap-2" style={{ color: 'var(--mai-text-3)', fontSize: 11 }}>
            <Loader2 size={12} className="animate-spin" />
            Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 py-2" style={{ borderTop: '1px solid var(--mai-border)' }}>
        <div
          className="flex items-center gap-2"
          style={{
            background: 'var(--mai-bg-elevated)',
            borderRadius: 6,
            padding: '0 8px',
            border: '1px solid var(--mai-border-strong)',
          }}
        >
          <input
            type="text"
            placeholder="Ask AI to write SQL..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={loading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--mai-text-1)',
              fontSize: 12,
              height: 32,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              color: input.trim() && !loading ? 'var(--mai-accent)' : 'var(--mai-text-4)',
              padding: 2,
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
