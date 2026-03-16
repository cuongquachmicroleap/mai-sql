import { Moon, Sun } from 'lucide-react'
import { useSettingsStore } from '../../stores/settings-store'

export function ThemeToggle() {
  const { theme, setTheme } = useSettingsStore()

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex items-center justify-center"
      style={{
        width: 36,
        height: 36,
        borderRadius: 6,
        color: '#555560',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#8B8B8B'
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#555560'
        e.currentTarget.style.background = 'transparent'
      }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
