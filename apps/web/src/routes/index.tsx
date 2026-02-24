import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">DOLinear</h1>
        <p className="text-lg text-gray-400">Project management, reimagined.</p>
      </div>
    </div>
  )
}
