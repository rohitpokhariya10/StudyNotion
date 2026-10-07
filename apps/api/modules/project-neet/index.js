// Public entry point of the Project NEET module. Other code must import from
// here rather than reaching into the module's private files.
const logger = require("../../utils/logger")
const { createNeetController } = require("./http/controller")
const {
  createProjectNeetRouter,
  isProjectNeetAttemptPath,
} = require("./http/routes")
const NeetAttempt = require("./models/NeetAttempt")
const NeetMockTest = require("./models/NeetMockTest")
const NeetProctorEvent = require("./models/NeetProctorEvent")
const NeetQuestion = require("./models/NeetQuestion")
const { createNeetServices } = require("./services")

const projectNeetRoutes = createProjectNeetRouter({
  controller: createNeetController({ logger, services: createNeetServices() }),
})

const projectNeetModels = Object.freeze([
  NeetMockTest,
  NeetQuestion,
  NeetAttempt,
  NeetProctorEvent,
])

module.exports = {
  createNeetController,
  createNeetServices,
  createProjectNeetRouter,
  isProjectNeetAttemptPath,
  projectNeetModels,
  projectNeetRoutes,
}
