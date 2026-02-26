interface EmptyStateProps {
  hasFilters: boolean
  onClearFilters: () => void
}

export function EmptyState({ hasFilters, onClearFilters }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 text-center"
      data-testid="empty-state"
    >
      <svg
        className="mb-4 h-12 w-12 text-gray-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
      <h3 className="text-sm font-medium text-gray-300">
        {hasFilters ? 'No matching issues' : 'No issues yet'}
      </h3>
      <p className="mt-1 text-xs text-gray-500">
        {hasFilters
          ? 'Try adjusting your filters to see more results.'
          : 'Create your first issue to get started.'}
      </p>
      {hasFilters && (
        <button
          className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          onClick={onClearFilters}
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}
