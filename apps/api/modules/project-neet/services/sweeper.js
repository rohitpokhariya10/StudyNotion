const { NEET_SWEEPER_DEFAULTS } = require("../config/defaults")

// Periodically finalises abandoned expired attempts. Runs on every API
// replica: sweeps are idempotent compare-and-set transitions, so overlap only
// costs a few reads. A slow sweep is never overlapped by the next one.
const createSweeper = ({
  clearTimer = clearTimeout,
  config = NEET_SWEEPER_DEFAULTS,
  lifecycle,
  logger,
  random = Math.random,
  setTimer = setTimeout,
}) => {
  let timer = null
  let stopped = true
  let running = false

  const scheduleNext = () => {
    if (stopped) return
    const delay = config.intervalMs + Math.floor(random() * config.jitterMs)
    timer = setTimer(tick, delay)
    timer?.unref?.()
  }

  async function tick() {
    timer = null
    if (stopped || running) return
    running = true
    try {
      await lifecycle.sweep({
        graceMs: config.graceMs,
        limit: config.batchLimit,
      })
    } catch (error) {
      logger.warn("neet.sweep.failed", {
        errorType: String(error?.name || "Error"),
      })
    } finally {
      running = false
      scheduleNext()
    }
  }

  return {
    start() {
      if (!stopped) return
      stopped = false
      scheduleNext()
    },
    stop() {
      stopped = true
      if (timer) clearTimer(timer)
      timer = null
    },
    tick,
  }
}

module.exports = { createSweeper }
