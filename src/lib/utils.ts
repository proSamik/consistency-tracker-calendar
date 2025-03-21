import { ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to conditionally join class names
 * Uses clsx for conditional classes and tailwind-merge to handle Tailwind class conflicts
 * @param inputs - Class names or conditional class expressions
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 