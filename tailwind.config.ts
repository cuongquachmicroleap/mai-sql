import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/src/**/*.{ts,tsx}', './src/renderer/index.html'],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: []
} satisfies Config
