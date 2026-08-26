const path = require("node:path")

const dotenv = require("dotenv")

const apiEnvironmentPath = path.resolve(__dirname, "../.env")

const loadEnvironment = ({ configure = dotenv.config } = {}) =>
  configure({
    path: apiEnvironmentPath,
    quiet: true,
  })

module.exports = {
  apiEnvironmentPath,
  loadEnvironment,
}
