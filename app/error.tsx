'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Application error:', error)

    // In production, you would send this to Sentry or similar
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error)
    // }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-2xl font-bold">Something went wrong</h2>
        <p className="mt-2 text-gray-600">
          We've been notified and are working on a fix.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-4 overflow-auto rounded bg-gray-100 p-4 text-left text-xs max-h-64">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex gap-4 justify-center">
          <Button onClick={() => (window.location.href = '/')}>Go Home</Button>
          <Button variant="outline" onClick={reset}>
            Try Again
          </Button>
        </div>
      </div>
    </div>
  )
}
