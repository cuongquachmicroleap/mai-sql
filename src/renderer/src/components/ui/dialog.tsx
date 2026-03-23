import { type ReactNode, type CSSProperties } from 'react'
import { X } from 'lucide-react'
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
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50" style={{ width: '100%', maxWidth: 480, margin: '0 16px' }}>
        {children}
        {/* Close button — top right of modal */}
        <button
          onClick={() => onOpenChange(false)}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--mai-text-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--mai-border-strong)'
            e.currentTarget.style.color = 'var(--mai-text-1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--mai-text-3)'
          }}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
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
        background: 'var(--mai-bg-panel)',
        border: '1px solid var(--mai-border-strong)',
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
        color: 'var(--mai-text-1)',
        ...style,
      }}
    >
      {children}
    </h2>
  )
}
