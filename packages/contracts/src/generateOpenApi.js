const { writeFileSync } = require("node:fs")
const { resolve } = require("node:path")

const { serializeOpenApiDocument } = require("./openapi")

writeFileSync(
  resolve(__dirname, "../openapi.json"),
  serializeOpenApiDocument(),
  "utf8"
)
