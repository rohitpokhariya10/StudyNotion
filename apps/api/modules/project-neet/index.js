// Public entry point of the Project NEET module. Other code must import from
// here rather than reaching into the module's private files.
const logger = require("../../utils/logger")
const { createNeetController } = require("./http/controller")
const {
  createProjectNeetRouter,
  isProjectNeetAttemptPath,
} = require("./http/routes")
const projectNeetModels = require("./models")
const { createNeetServices } = require("./services")
const { createSweeper } = require("./services/sweeper")

const projectNeetServices = createNeetServices()
const projectNeetRoutes = createProjectNeetRouter({
  controller: createNeetController({ logger, services: projectNeetServices }),
})
// Started by the server lifecycle after the API listens; stopped on shutdown.
const projectNeetSweeper = createSweeper({
  lifecycle: projectNeetServices.lifecycle,
  logger,
})

module.exports = {
  createNeetController,
  createNeetServices,
  createProjectNeetRouter,
  isProjectNeetAttemptPath,
  projectNeetModels: Object.freeze([...projectNeetModels]),
  projectNeetRoutes,
  projectNeetServices,
  projectNeetSweeper,
}
