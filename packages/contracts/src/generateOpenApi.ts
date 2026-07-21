import { writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { serializeOpenApiDocument } from "./openapi"

writeFileSync(
  resolve(__dirname, "../openapi.json"),
  serializeOpenApiDocument(),
  "utf8"
)
