/**
 * ErrorBoundary — catches any unhandled render error and shows a fallback UI
 * instead of a blank white screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    // In production: send to Sentry / Datadog
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  reset = () => {
    this.setState({ hasError: false, error: null, info: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-dvh flex items-center justify-center bg-base px-6">
        <div className="max-w-md w-full text-center space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-error" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-text-primary">Something went wrong</h1>
            <p className="text-text-secondary text-sm mt-2">
              An unexpected error occurred. The details have been logged.
            </p>
          </div>

          {/* Show error message in development */}
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs bg-base-50 border border-border rounded-lg p-4 overflow-auto max-h-40 text-error font-mono">
              {this.state.error.toString()}
            </pre>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={this.reset}
              className="btn-primary"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="btn-ghost"
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    )
  }
}
