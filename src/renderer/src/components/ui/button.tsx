import { forwardRef, type ButtonHTMLAttributes, useState } from 'react'
import { cn } from '../../lib/utils'

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  default: { height: 32, padding: '0 12px' },
  sm:      { height: 28, padding: '0 10px' },
  lg:      { height: 36, padding: '0 16px' },
  icon:    { height: 32, width: 32, padding: 0 },
}

function getVariantStyle(variant: ButtonVariant, hovered: boolean, disabled: boolean): React.CSSProperties {
  if (disabled) {
    return {
      background: 'rgba(255,255,255,0.04)',
      color: '#555560',
      border: '1px solid rgba(255,255,255,0.06)',
    }
  }
  switch (variant) {
    case 'default':
      return {
        background: hovered ? '#4A7AE0' : '#5B8AF0',
        color: '#ffffff',
        border: 'none',
      }
    case 'secondary':
      return {
        background: hovered ? '#2A2A30' : '#222227',
        color: '#ECECEC',
        border: '1px solid rgba(255,255,255,0.08)',
      }
    case 'outline':
      return {
        background: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        color: hovered ? '#ECECEC' : '#8B8B8B',
        border: '1px solid rgba(255,255,255,0.12)',
      }
    case 'ghost':
      return {
        background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: hovered ? '#ECECEC' : '#8B8B8B',
        border: 'none',
      }
    case 'destructive':
      return {
        background: hovered ? '#ef5350' : '#F87171',
        color: '#ffffff',
        border: 'none',
      }
    default:
      return {
        background: hovered ? '#4A7AE0' : '#5B8AF0',
        color: '#ffffff',
        border: 'none',
      }
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', style, disabled, ...props }, ref) => {
    const [hovered, setHovered] = useState(false)

    const variantStyle = getVariantStyle(variant, hovered, !!disabled)
    const sizeStyle = SIZE_STYLES[size]

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn('inline-flex items-center justify-center rounded', className)}
        style={{
          fontSize: 12,
          fontWeight: 500,
          fontFamily: 'inherit',
          borderRadius: 6,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'background 0.15s, color 0.15s',
          outline: 'none',
          ...sizeStyle,
          ...variantStyle,
          ...style,
        }}
        onMouseEnter={() => { if (!disabled) setHovered(true) }}
        onMouseLeave={() => setHovered(false)}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
