import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const sizeStyles = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: keyof typeof sizeStyles
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded text-gray-400 hover:text-gray-100 hover:bg-[#1a1a2e] transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed',
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    )
  },
)

IconButton.displayName = 'IconButton'
