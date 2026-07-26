let errorReporter = null

export const configureErrorReporter = (reporter) => {
  errorReporter = typeof reporter === "function" ? reporter : null
}

export const reportClientError = (error, context = {}) => {
  if (errorReporter) {
    errorReporter(error, context)
    return
  }

  if (import.meta.env.DEV) {
    console.error("Unhandled client error", error)
  }
}
