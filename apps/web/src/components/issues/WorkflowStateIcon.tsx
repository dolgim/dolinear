import type { WorkflowStateType } from '@dolinear/shared'

interface WorkflowStateIconProps {
  type: WorkflowStateType
  color: string
  className?: string
}

export function WorkflowStateIcon({
  type,
  color,
  className = 'h-4 w-4',
}: WorkflowStateIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      {type === 'backlog' && (
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
      )}
      {type === 'unstarted' && (
        <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" />
      )}
      {type === 'started' && (
        <>
          <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" />
          <path
            d="M8 2 A6 6 0 0 1 14 8"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="8" cy="8" r="2.5" fill={color} />
        </>
      )}
      {type === 'completed' && (
        <>
          <circle cx="8" cy="8" r="6" fill={color} />
          <path
            d="M5.5 8L7.2 9.7L10.5 6.3"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {type === 'cancelled' && (
        <>
          <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" />
          <path
            d="M6 6L10 10M10 6L6 10"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}
