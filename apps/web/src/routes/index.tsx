import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

interface HealthResponse {
  status: string
  db: string
}

function IndexPage() {
  const { data, isLoading, isError } = useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/health')
      if (!res.ok) {
        const body = await res.json()
        return body as HealthResponse
      }
      return res.json()
    },
    refetchInterval: 10000,
  })

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">DOLinear</h1>
        <p className="text-lg text-gray-400 mb-8">
          Project management, reimagined.
        </p>
        <div className="rounded-lg bg-white/5 border border-white/10 p-6 inline-block text-left">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            System Status
          </h2>
          {isLoading && <p className="text-gray-400">Checking API status...</p>}
          {isError && <p className="text-red-400">API unreachable</p>}
          {data && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${data.status === 'ok' ? 'bg-green-400' : 'bg-red-400'}`}
                />
                <span className="text-gray-300">
                  API: {data.status === 'ok' ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${data.db === 'connected' ? 'bg-green-400' : 'bg-red-400'}`}
                />
                <span className="text-gray-300">
                  Database:{' '}
                  {data.db === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
