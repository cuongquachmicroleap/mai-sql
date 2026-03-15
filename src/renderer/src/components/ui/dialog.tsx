import { type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative z-50">{children}</div>
    </div>
  )
}

interface DialogTriggerProps {
  asChild?: boolean
  children: ReactNode
}

export function DialogTrigger({ children }: DialogTriggerProps) {
  return <>{children}</>
}

export function DialogContent({ className, children, ...props }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'bg-background border border-border rounded-lg shadow-xl p-6 w-full max-w-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>
}
