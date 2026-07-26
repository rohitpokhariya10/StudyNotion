import { Component } from "react"

import { reportClientError } from "../../utils/errorMonitoring"

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
      <main
        className="grid min-h-[calc(100vh-3.5rem)] flex-1 place-items-center bg-richblack-900 px-6 py-12 text-richblack-5"
        role="alert"
      >
        <div className="w-full max-w-xl rounded-xl border border-richblack-600 bg-richblack-800 p-8 text-center shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-yellow-100">
            StudyNotion
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            {this.props.title || "Something went wrong"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-richblack-200">
            Your account and course data are safe. Reload this page, or return
            home and try again.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              className="min-h-11 rounded-lg bg-yellow-50 px-5 py-2 font-semibold text-richblack-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-50"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-richblack-500 px-5 py-2 font-semibold text-richblack-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-50"
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
