import { reportClientError } from "@/shared/lib/errorMonitoring"
import { Component } from "react"

class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    reportClientError(error, {
      boundary: this.props.scope || "application",
      componentStack: info.componentStack,
    })
  }

  componentDidUpdate(previousProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="grid min-h-[calc(100dvh-var(--sn-header-height))] flex-1 place-items-center bg-surface-primary px-6 py-12 text-text-primary">
        <div
          role="alert"
          className="w-full max-w-xl rounded-xl border border-border-default bg-surface-secondary p-8 text-center shadow-lg"
        >
          <p className="text-sm font-semibold tracking-widest text-brand-primary uppercase">
            Prahit
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            {this.props.title || "Something went wrong"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Your account and course data are safe. Reload this page, or return
            home and try again.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              className="min-h-11 rounded-lg bg-brand-primary px-5 py-2 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border-default px-5 py-2 font-semibold text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              href="/"
            >
              Return home
            </a>
          </div>
        </div>
      </main>
    )
  }
}

export default ErrorBoundary
