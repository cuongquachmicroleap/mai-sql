export interface Snippet {
  id: string
  title: string
  description: string
  sql: string
  category: 'admin' | 'performance' | 'schema' | 'data' | 'custom'
  isBuiltIn: boolean
  createdAt: string
}
