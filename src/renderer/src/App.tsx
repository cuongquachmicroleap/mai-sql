import { MainLayout } from './components/layout/MainLayout'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export default function App() {
  useKeyboardShortcuts()
  return <MainLayout />
}
