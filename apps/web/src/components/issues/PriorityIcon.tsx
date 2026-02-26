import type { IssuePriority } from '@dolinear/shared'
import { PRIORITY_LABELS } from '@dolinear/shared'
import { cn } from '@/lib/utils'

const PRIORITY_COLORS: Record<IssuePriority, string> = {
  0: 'text-gray-500',
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-yellow-500',
  4: 'text-blue-500',
}

interface PriorityIconProps {
  priority: IssuePriority
  className?: string
}

export function PriorityIcon({ priority, className }: PriorityIconProps) {
  if (priority === 0) return null

  const label = PRIORITY_LABELS[priority]
  const colorClass = PRIORITY_COLORS[priority]
  const barCount = 4 - priority + 1

  return (
    <svg
      className={cn('h-4 w-4', colorClass, className)}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-label={`Priority: ${label}`}
    >
      {priority === 1 ? (
        // Urgent: exclamation icon
        <>
          <rect x="6.5" y="2" width="3" height="8" rx="1" />
          <rect x="6.5" y="12" width="3" height="2.5" rx="1" />
        </>
      ) : (
        // High/medium/low: bar chart
        <>
          {barCount >= 1 && <rect x="1" y="11" width="3" height="4" rx="0.5" />}
          {barCount >= 2 && (
            <rect x="5.5" y="7" width="3" height="8" rx="0.5" />
          )}
          {barCount >= 3 && (
            <rect x="10" y="3" width="3" height="12" rx="0.5" />
          )}
          {barCount < 3 && (
            <rect
              x="10"
              y="3"
              width="3"
              height="12"
              rx="0.5"
              className="opacity-20"
            />
          )}
          {barCount < 2 && (
            <rect
              x="5.5"
              y="7"
              width="3"
              height="8"
              rx="0.5"
              className="opacity-20"
            />
          )}
        </>
      )}
    </svg>
  )
}
