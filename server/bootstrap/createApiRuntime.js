const { createApp } = require("../app/createApp")
const { createServerLifecycle } = require("./createServerLifecycle")

const createApiRuntime = () => {
  const lifecycleState = { isShuttingDown: false }
  const app = createApp({
    isShuttingDown: () => lifecycleState.isShuttingDown,
  })
  const { shutdown, startServer } = createServerLifecycle({
    app,
    lifecycleState,
  })

  return { app, shutdown, startServer }
}

module.exports = { createApiRuntime }
