import type { WorkflowState } from '@dolinear/shared'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui'
import { WorkflowStateIcon } from './WorkflowStateIcon'

interface StateDropdownProps {
  currentState: WorkflowState
  states: WorkflowState[]
  onSelect: (stateId: string) => void
}

export function StateDropdown({
  currentState,
  states,
  onSelect,
}: StateDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center rounded p-0.5 hover:bg-white/10 transition-colors"
          aria-label={`Status: ${currentState.name}. Click to change.`}
          onClick={(e) => e.stopPropagation()}
        >
          <WorkflowStateIcon
            type={currentState.type}
            color={currentState.color}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {states.map((state) => (
          <DropdownMenuItem
            key={state.id}
            onSelect={() => onSelect(state.id)}
            className="gap-2"
          >
            <WorkflowStateIcon type={state.type} color={state.color} />
            <span>{state.name}</span>
            {state.id === currentState.id && (
              <span className="ml-auto text-xs text-indigo-400">&#10003;</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
