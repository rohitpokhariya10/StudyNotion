// Read-only audit against the original dirty-tree baseline. Never regenerate it.
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"

const baseline = JSON.parse(
  readFileSync("docs/growed-redesign/baseline.json", "utf8")
)
const hash = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex")
const frozen = (path) =>
  /^(apps\/api\/|packages\/contracts\/|\.github\/|scripts\/)/.test(path) ||
  /(^|\/)(package(?:-lock)?\.json|[^/]*Dockerfile[^/]*|[^/]*nginx[^/]*|[^/]*compose[^/]*|\.env[^/]*|vite\.config\.[^/]+)$/.test(
    path
  ) ||
  /^apps\/web\/src\/(shared\/api\/|(?:entities|features)\/[^/]+\/api\/|app\/(store\/|providers\/|bootstrap\.jsx|main\.jsx)|entities\/(?!editorial\/)[^/]+\/model\/|features\/authentication\/(model|routing|lib)\/)/.test(
    path
  ) ||
  /(^|\/)(policies|legal-documents)\//.test(path) ||
  /^apps\/web\/src\/features\/authentication\/SessionBootstrap\.jsx$/.test(
    path
  ) ||
  /^apps\/web\/src\/(features\/course-purchase\/lib\/|pages\/legal\/index\.jsx)/.test(
    path
  )
const paths = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" }
)
  .split("\0")
  .filter(Boolean)
const changed = Object.entries(baseline.sha256)
  .filter(([path, sha]) => !existsSync(path) || hash(path) !== sha)
  .map(([path]) => path)
const added = [...new Set(paths)].filter(
  (path) => existsSync(path) && !(path in baseline.sha256)
)
const violations = [...changed, ...added].filter(frozen)
const report = {
  baselineCommit: baseline.commit,
  baselineFiles: Object.keys(baseline.sha256).length,
  baselineSha256: hash("docs/growed-redesign/baseline.json"),
  frozenBaselineFiles: Object.keys(baseline.sha256).filter(frozen).length,
  taskChangedExistingFiles: changed,
  taskAddedFiles: added,
  frozenViolations: violations,
  projectNeetSourceChanges: [...changed, ...added].filter((path) =>
    /^apps\/(?:web\/(?:src|public)|api)\/.*(?:neet|helix)/i.test(path)
  ),
}
console.log(JSON.stringify(report, null, 2))
if (violations.length) process.exitCode = 1
