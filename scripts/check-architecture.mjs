import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, extname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sourceRoot = join(repositoryRoot, "src")
const serverRoot = join(repositoryRoot, "server")
const sourceExtensions = new Set([".cjs", ".js", ".jsx", ".mjs"])
const importExtensions = [".js", ".jsx", ".mjs", ".cjs"]

// Keep this list exact. A missing edge fails the check so the exception cannot
// outlive the compatibility adapter it documents.
const grandfatheredDirectTransportEdges = new Set([
  "src/components/Common/ReviewSlider.jsx -> src/services/apiConnector.js",
  "src/components/core/ContactUsPage/ContactUsForm.jsx -> src/services/apiConnector.js",
])

const directTransportTargets = new Set([
  "src/services/apiConnector.js",
  "src/shared/api/httpClient.js",
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
      if (!entry.isFile() || !sourceExtensions.has(extname(entry.name))) {
        return []
      }
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
      const reference = {
        line: lineNumberAt(content, match.index),
        specifier: match[1],
      }
      references.set(`${match.index}\0${reference.specifier}`, reference)
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
    basePath = resolve(sourceRoot, specifier.slice(2))
  } else if (specifier.startsWith("src/")) {
    basePath = resolve(repositoryRoot, specifier)
  } else if (specifier.startsWith("server/")) {
    basePath = resolve(repositoryRoot, specifier)
  } else {
    return null
  }

  return toRepositoryPath(resolveExistingImport(basePath) || basePath)
}

const isPageOrUiSource = (repositoryPath) => {
  if (/\.(?:spec|test)\.[cm]?[jt]sx?$/.test(repositoryPath)) return false
  if (/^src\/(?:app|components|pages|widgets)\//.test(repositoryPath)) {
    return true
  }
  if (/^src\/shared\/ui\//.test(repositoryPath)) return true
  return /^src\/(?:entities|features)\/[^/]+\/ui\//.test(repositoryPath)
}

const featureSlice = (repositoryPath) => {
  const match = /^src\/features\/([^/]+)\//.exec(repositoryPath)
  return match?.[1] || null
}

const serverModule = (repositoryPath) => {
  const match = /^server\/modules\/([^/]+)\//.exec(repositoryPath)
  return match?.[1] || null
}

const isServerCompositionTarget = (repositoryPath) =>
  repositoryPath === "server/index.js" ||
  /^server\/(?:app|bootstrap)\//.test(repositoryPath)

const isPublicModuleEntry = (repositoryPath, moduleName) =>
  repositoryPath === `server/modules/${moduleName}/index.js`

const violations = []
const observedGrandfatheredEdges = new Set()
const sourceFiles = listSourceFiles(sourceRoot)
const backendSourceFiles = [
  ...listSourceFiles(join(serverRoot, "app")),
  ...listSourceFiles(join(serverRoot, "bootstrap")),
  ...listSourceFiles(join(serverRoot, "modules")),
  ...listSourceFiles(join(serverRoot, "shared")),
].sort((left, right) => compareText(left, right))

for (const sourceFile of sourceFiles) {
  const sourcePath = toRepositoryPath(sourceFile)
  const content = readFileSync(sourceFile, "utf8")

  for (const reference of extractModuleReferences(content)) {
    const targetPath = resolveRepositoryImport(sourceFile, reference.specifier)
    const isExternalAxios = reference.specifier === "axios"
    const isDirectTransport =
      isExternalAxios || directTransportTargets.has(targetPath)

    if (isPageOrUiSource(sourcePath) && isDirectTransport) {
      const edge = `${sourcePath} -> ${targetPath || reference.specifier}`
      if (grandfatheredDirectTransportEdges.has(edge)) {
        observedGrandfatheredEdges.add(edge)
      } else {
        violations.push({
          line: reference.line,
          message:
            "page/UI code must use an entity or feature API boundary, not a direct HTTP transport",
          sourcePath,
          target: targetPath || reference.specifier,
        })
      }
    }

    const sourceFeature = featureSlice(sourcePath)
    const targetFeature = targetPath && featureSlice(targetPath)
    if (sourceFeature && targetFeature && sourceFeature !== targetFeature) {
      violations.push({
        line: reference.line,
        message: `feature '${sourceFeature}' must not import feature '${targetFeature}' directly`,
        sourcePath,
        target: targetPath,
      })
    }
  }
}

for (const sourceFile of backendSourceFiles) {
  const sourcePath = toRepositoryPath(sourceFile)
  const content = readFileSync(sourceFile, "utf8")

  for (const reference of extractModuleReferences(content)) {
    const targetPath = resolveRepositoryImport(sourceFile, reference.specifier)
    if (!targetPath) continue

    if (
      sourcePath.startsWith("server/shared/") &&
      (isServerCompositionTarget(targetPath) ||
        targetPath.startsWith("server/modules/"))
    ) {
      violations.push({
        line: reference.line,
        message:
          "shared backend code must not depend on app/bootstrap composition or domain modules",
        sourcePath,
        target: targetPath,
      })
    }

    const sourceModule = serverModule(sourcePath)
    if (!sourceModule) continue

    if (isServerCompositionTarget(targetPath)) {
      violations.push({
        line: reference.line,
        message: `module '${sourceModule}' must not depend on app/bootstrap composition`,
        sourcePath,
        target: targetPath,
      })
    }

    const targetModule = serverModule(targetPath)
    if (
      targetModule &&
      targetModule !== sourceModule &&
      !isPublicModuleEntry(targetPath, targetModule)
    ) {
      violations.push({
        line: reference.line,
        message: `module '${sourceModule}' must use module '${targetModule}' through its public index`,
        sourcePath,
        target: targetPath,
      })
    }
  }
}

for (const edge of grandfatheredDirectTransportEdges) {
  if (!observedGrandfatheredEdges.has(edge)) {
    violations.push({
      line: 0,
      message: "remove this stale grandfathered transport exception",
      sourcePath: edge.split(" -> ")[0],
      target: edge.split(" -> ")[1],
    })
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
    `Architecture check passed (${sourceFiles.length} frontend and ${backendSourceFiles.length} bounded backend source files, ${observedGrandfatheredEdges.size} grandfathered direct transport edges)`
  )
}
