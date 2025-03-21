'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Props for the Switch component
 */
interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}

/**
 * Switch component for toggling between states
 * Used for binary choices like enabling/disabling a setting
 */
export function Switch({
  className,
  checked = false,
  onCheckedChange,
  disabled = false,
  ...props
}: SwitchProps) {
  // Generate a unique ID for accessibility
  const id = React.useId()
  
  // Handle toggle click
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked)
    }
  }
  
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      data-state={checked ? 'checked' : 'unchecked'}
      data-disabled={disabled ? 'true' : undefined}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        checked 
          ? 'bg-emerald-600' 
          : 'bg-gray-600',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-1'
        )}
      />
    </button>
  )
} 