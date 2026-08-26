const { existsSync } = require("node:fs")
const path = require("node:path")

const dotenv = require("dotenv")

const apiEnvironmentPath = path.resolve(__dirname, "../.env")
const legacyEnvironmentPath = path.resolve(__dirname, "../../../server/.env")

const selectEnvironmentPath = ({ fileExists = existsSync } = {}) => {
  if (fileExists(apiEnvironmentPath)) return apiEnvironmentPath
  if (fileExists(legacyEnvironmentPath)) return legacyEnvironmentPath
  return apiEnvironmentPath
}

const loadEnvironment = ({
  configure = dotenv.config,
  fileExists = existsSync,
} = {}) =>
  configure({
    path: selectEnvironmentPath({ fileExists }),
    quiet: true,
  })

module.exports = {
  apiEnvironmentPath,
  legacyEnvironmentPath,
  loadEnvironment,
  selectEnvironmentPath,
}
