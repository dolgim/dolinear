export function IssueListSkeleton() {
  return (
    <div className="animate-pulse" data-testid="issue-list-skeleton">
      {/* Filter bar skeleton */}
      <div className="flex items-center gap-2 px-4 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 w-24 rounded bg-white/5" />
        ))}
      </div>

      {/* Group skeleton */}
      {Array.from({ length: 3 }).map((_, gi) => (
        <div key={gi}>
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="h-4 w-4 rounded-full bg-white/5" />
            <div className="h-4 w-24 rounded bg-white/5" />
            <div className="h-4 w-6 rounded bg-white/5" />
          </div>
          {Array.from({ length: gi === 0 ? 4 : 2 }).map((_, ri) => (
            <div
              key={ri}
              className="flex items-center gap-3 px-4 py-2 border-b border-white/5"
            >
              <div className="h-4 w-4 rounded bg-white/5" />
              <div className="h-3 w-14 rounded bg-white/5" />
              <div className="h-4 w-4 rounded-full bg-white/5" />
              <div className="h-3 flex-1 rounded bg-white/5" />
              <div className="h-5 w-5 rounded-full bg-white/5" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
