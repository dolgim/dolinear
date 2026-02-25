import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const colorStyles: Record<string, string> = {
  gray: 'bg-gray-700 text-gray-200',
  indigo: 'bg-indigo-600/20 text-indigo-300',
  green: 'bg-green-600/20 text-green-300',
  yellow: 'bg-yellow-600/20 text-yellow-300',
  red: 'bg-red-600/20 text-red-300',
  blue: 'bg-blue-600/20 text-blue-300',
  purple: 'bg-purple-600/20 text-purple-300',
  orange: 'bg-orange-600/20 text-orange-300',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: keyof typeof colorStyles
}

export function Badge({ className, color = 'gray', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        colorStyles[color],
        className,
      )}
      {...props}
    />
  )
}
