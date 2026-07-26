const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

const { serializeOpenApiDocument } = require("./openapi")

const path = resolve(__dirname, "../openapi.json")
const committed = readFileSync(path, "utf8")
const generated = serializeOpenApiDocument()

if (committed !== generated) {
  throw new Error(
    "packages/contracts/openapi.json is stale; run npm run contracts:generate"
  )
}
