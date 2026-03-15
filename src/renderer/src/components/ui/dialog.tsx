import { type ReactNode, type CSSProperties } from 'react'
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
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={() => onOpenChange(false)}
      />
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

export function DialogContent({
  className,
  style,
  children,
  ...props
}: {
  className?: string
  style?: CSSProperties
  children: ReactNode
  [key: string]: unknown
}) {
  return (
    <div
      className={cn('w-full', className)}
      style={{
        background: '#1C1C20',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 10,
        padding: '20px 20px 16px',
        maxWidth: 480,
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div style={{ marginBottom: 16 }}>{children}</div>
}

export function DialogTitle({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: 14,
        fontWeight: 600,
        color: '#ECECEC',
        ...style,
      }}
    >
      {children}
    </h2>
  )
}
