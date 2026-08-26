import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, extname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const webSourceRoot = join(repositoryRoot, "apps", "web", "src")
const apiRoot = join(repositoryRoot, "apps", "api")
const sourceExtensions = new Set([".cjs", ".js", ".jsx", ".mjs"])
const importExtensions = [".js", ".jsx", ".mjs", ".cjs", ".json"]
const layerRanks = new Map([
  ["shared", 0],
  ["entities", 1],
  ["features", 2],
  ["widgets", 3],
  ["pages", 4],
  ["app", 5],
])

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0)
const toRepositoryPath = (absolutePath) =>
  relative(repositoryRoot, absolutePath).split(sep).join("/")

const listSourceFiles = (directory) => {
  if (!existsSync(directory)) return []

  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => compareText(left.name, right.name))
    .flatMap((entry) => {
      const entryPath = join(directory, entry.name)
      if (entry.isDirectory()) return listSourceFiles(entryPath)
      if (!entry.isFile() || !sourceExtensions.has(extname(entry.name)))
        return []
      return [entryPath]
    })
}

const lineNumberAt = (content, offset) => {
  let line = 1
  for (let index = 0; index < offset; index += 1) {
    if (content.charCodeAt(index) === 10) line += 1
  }
  return line
}

const extractModuleReferences = (content) => {
  const patterns = [
    /\b(?:import|export)\s+(?:[\w$*{},\s]+\s+from\s+)?["']([^"'\r\n]+)["']/g,
    /\brequire\s*\(\s*["']([^"'\r\n]+)["']\s*\)/g,
    /\bimport\s*\(\s*["']([^"'\r\n]+)["']\s*\)/g,
  ]
  const references = new Map()

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      references.set(`${match.index}\0${match[1]}`, {
        line: lineNumberAt(content, match.index),
        specifier: match[1],
      })
    }
  }

  return [...references.values()].sort(
    (left, right) =>
      left.line - right.line || compareText(left.specifier, right.specifier)
  )
}

const resolveExistingImport = (basePath) => {
  const candidates = [
    basePath,
    ...importExtensions.map((extension) => `${basePath}${extension}`),
    ...importExtensions.map((extension) => join(basePath, `index${extension}`)),
  ]

  return candidates.find((candidate) => {
    try {
      return existsSync(candidate) && statSync(candidate).isFile()
    } catch {
      return false
    }
  })
}

const resolveRepositoryImport = (sourceFile, specifier) => {
  let basePath
  if (specifier.startsWith(".")) {
    basePath = resolve(dirname(sourceFile), specifier)
  } else if (specifier.startsWith("@/")) {
    basePath = resolve(webSourceRoot, specifier.slice(2))
  } else if (specifier.startsWith("apps/web/src/")) {
    basePath = resolve(repositoryRoot, specifier)
  } else if (specifier.startsWith("apps/api/")) {
    basePath = resolve(repositoryRoot, specifier)
  } else {
    return null
  }

  return toRepositoryPath(resolveExistingImport(basePath) || basePath)
}

const webCoordinate = (repositoryPath) => {
  const match =
    /^apps\/web\/src\/(app|pages|widgets|features|entities|shared)(?:\/([^/]+))?\//.exec(
      repositoryPath
    )
  if (!match) return null
  return { layer: match[1], rank: layerRanks.get(match[1]), slice: match[2] }
}

const isTestFile = (repositoryPath) =>
  /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(repositoryPath)

const isUiSource = (repositoryPath) => {
  if (isTestFile(repositoryPath)) return false
  return (
    /^apps\/web\/src\/(?:app|pages|widgets)\//.test(repositoryPath) ||
    /^apps\/web\/src\/(?:features|entities)\/[^/]+\/ui\//.test(
      repositoryPath
    ) ||
    /^apps\/web\/src\/shared\/ui\//.test(repositoryPath)
  )
}

const apiModule = (repositoryPath) => {
  const match = /^apps\/api\/modules\/([^/]+)\//.exec(repositoryPath)
  return match?.[1] || null
}

const apiDomain = (repositoryPath) => {
  const match = /^apps\/api\/domains\/([^/]+)\//.exec(repositoryPath)
  return match?.[1] || null
}

const isApiCompositionTarget = (repositoryPath) =>
  repositoryPath === "apps/api/index.js" ||
  /^apps\/api\/(?:app|bootstrap)\//.test(repositoryPath)

const isPublicModuleEntry = (repositoryPath, moduleName) =>
  repositoryPath === `apps/api/modules/${moduleName}/index.js`

const violations = []
const report = (sourcePath, line, target, message) => {
  violations.push({ sourcePath, line, target, message })
}

for (const layer of layerRanks.keys()) {
  const layerPath = join(webSourceRoot, layer)
  if (!existsSync(layerPath)) {
    report(
      "apps/web/src",
      0,
      layer,
      `required frontend layer '${layer}' is missing`
    )
  }
}

for (const legacyDirectory of [
  "components",
  "hooks",
  "reducer",
  "services",
  "slices",
  "utils",
]) {
  if (existsSync(join(webSourceRoot, legacyDirectory))) {
    report(
      "apps/web/src",
      0,
      legacyDirectory,
      "legacy frontend dumping-ground directory must be classified into a feature layer"
    )
  }
}

const frontendSourceFiles = listSourceFiles(webSourceRoot)
for (const sourceFile of frontendSourceFiles) {
  const sourcePath = toRepositoryPath(sourceFile)
  const sourceCoordinate = webCoordinate(sourcePath)
  const content = readFileSync(sourceFile, "utf8")

  for (const reference of extractModuleReferences(content)) {
    if (
      reference.specifier.startsWith("src/") ||
      reference.specifier.startsWith("server/")
    ) {
      report(
        sourcePath,
        reference.line,
        reference.specifier,
        "stale pre-modularization source path"
      )
      continue
    }

    const targetPath = resolveRepositoryImport(sourceFile, reference.specifier)
    const targetCoordinate = targetPath && webCoordinate(targetPath)

    if (
      sourceCoordinate &&
      targetCoordinate &&
      targetCoordinate.rank > sourceCoordinate.rank
    ) {
      report(
        sourcePath,
        reference.line,
        targetPath,
        `layer '${sourceCoordinate.layer}' must not import upward from '${targetCoordinate.layer}'`
      )
    }

    if (
      sourceCoordinate?.layer === "features" &&
      targetCoordinate?.layer === "features" &&
      sourceCoordinate.slice !== targetCoordinate.slice
    ) {
      report(
        sourcePath,
        reference.line,
        targetPath,
        `feature '${sourceCoordinate.slice}' must not import feature '${targetCoordinate.slice}' directly`
      )
    }

    const isDirectTransport =
      reference.specifier === "axios" ||
      targetPath === "apps/web/src/shared/api/httpClient.js"
    if (isUiSource(sourcePath) && isDirectTransport) {
      report(
        sourcePath,
        reference.line,
        targetPath || reference.specifier,
        "page/UI code must use its owning feature or entity API boundary"
      )
    }
  }
}

const backendSourceFiles = [
  ...listSourceFiles(join(apiRoot, "app")),
  ...listSourceFiles(join(apiRoot, "bootstrap")),
  ...listSourceFiles(join(apiRoot, "domains")),
  ...listSourceFiles(join(apiRoot, "modules")),
  ...listSourceFiles(join(apiRoot, "shared")),
].sort((left, right) => compareText(left, right))

for (const sourceFile of backendSourceFiles) {
  const sourcePath = toRepositoryPath(sourceFile)
  const content = readFileSync(sourceFile, "utf8")

  for (const reference of extractModuleReferences(content)) {
    if (reference.specifier.startsWith("server/")) {
      report(
        sourcePath,
        reference.line,
        reference.specifier,
        "stale pre-modularization API path"
      )
      continue
    }

    const targetPath = resolveRepositoryImport(sourceFile, reference.specifier)
    if (!targetPath) continue

    if (
      sourcePath.startsWith("apps/api/shared/") &&
      (isApiCompositionTarget(targetPath) ||
        targetPath.startsWith("apps/api/domains/") ||
        targetPath.startsWith("apps/api/modules/"))
    ) {
      report(
        sourcePath,
        reference.line,
        targetPath,
        "shared API code must not depend on composition or business domains"
      )
    }

    const sourceDomain = apiDomain(sourcePath)
    if (sourceDomain && isApiCompositionTarget(targetPath)) {
      report(
        sourcePath,
        reference.line,
        targetPath,
        `domain '${sourceDomain}' must not depend on app/bootstrap composition`
      )
    }

    const sourceModule = apiModule(sourcePath)
    if (!sourceModule) continue
    if (isApiCompositionTarget(targetPath)) {
      report(
        sourcePath,
        reference.line,
        targetPath,
        `module '${sourceModule}' must not depend on app/bootstrap composition`
      )
    }

    const targetModule = apiModule(targetPath)
    if (
      targetModule &&
      targetModule !== sourceModule &&
      !isPublicModuleEntry(targetPath, targetModule)
    ) {
      report(
        sourcePath,
        reference.line,
        targetPath,
        `module '${sourceModule}' must use module '${targetModule}' through its public index`
      )
    }
  }
}

violations.sort(
  (left, right) =>
    compareText(left.sourcePath, right.sourcePath) ||
    left.line - right.line ||
    compareText(left.target, right.target)
)

if (violations.length) {
  console.error("Architecture boundary violations:")
  for (const violation of violations) {
    const location = violation.line
      ? `${violation.sourcePath}:${violation.line}`
      : violation.sourcePath
    console.error(`${location} -> ${violation.target}: ${violation.message}`)
  }
  process.exitCode = 1
} else {
  console.log(
    `Architecture check passed (${frontendSourceFiles.length} frontend and ${backendSourceFiles.length} bounded backend source files; six frontend layers enforced)`
  )
}
