import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

const isDev = import.meta.env.DEV

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo.componentStack)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-8">
          <div className="w-full max-w-2xl space-y-4 rounded-lg border border-destructive/50 bg-destructive/10 p-6">
            <h2 className="text-lg font-semibold text-destructive">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              {error?.message || 'An unexpected error occurred.'}
            </p>

            {isDev && error?.stack && (
              <details className="rounded border border-destructive/20 bg-background">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-destructive">
                  Stack trace
                </summary>
                <pre className="overflow-auto px-3 py-2 text-xs text-muted-foreground">
                  {error.stack}
                </pre>
              </details>
            )}

            {isDev && errorInfo?.componentStack && (
              <details className="rounded border border-destructive/20 bg-background">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-destructive">
                  Component stack
                </summary>
                <pre className="overflow-auto px-3 py-2 text-xs text-muted-foreground">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}

            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            >
              Try again
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
