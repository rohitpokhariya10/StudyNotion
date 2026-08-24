const withDeadline = async (promise, timeoutMs, message) => {
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(message)
          error.code = "DEPENDENCY_DEADLINE_EXCEEDED"
          reject(error)
        }, timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

module.exports = { withDeadline }
