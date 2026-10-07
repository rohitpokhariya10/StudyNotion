const defaultLogger = require("../../../utils/logger")
const attemptRepository = require("../repositories/attemptRepository")
const proctorEventRepository = require("../repositories/proctorEventRepository")
const testRepository = require("../repositories/testRepository")
const { createAttemptService } = require("./attemptService")
const { createLifecycle } = require("./lifecycle")
const { createProctorService } = require("./proctorService")
const { createTestService } = require("./testService")

// Composition root for the module. Tests inject fake repositories and a
// deterministic clock; production uses the Mongoose repositories.
const createNeetServices = ({
  attempts = attemptRepository,
  clock = () => new Date(),
  events = proctorEventRepository,
  logger = defaultLogger,
  tests = testRepository,
} = {}) => {
  const lifecycle = createLifecycle({ attempts, clock, logger, tests })
  const proctor = createProctorService({
    attempts,
    clock,
    events,
    lifecycle,
    logger,
  })
  const attemptService = createAttemptService({
    attempts,
    clock,
    lifecycle,
    logger,
    proctor,
    tests,
  })
  return {
    attempts: attemptService,
    lifecycle,
    proctor,
    tests: createTestService({ clock, tests }),
  }
}

module.exports = { createNeetServices }
