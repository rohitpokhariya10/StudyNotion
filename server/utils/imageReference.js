const IMAGE_PATH_COMPONENT = /^[a-z0-9]+(?:(?:[._]|__|[-]+)[a-z0-9]+)*$/
const REGISTRY_HOST =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/
const SHA256_DIGEST = /^sha256:[a-f0-9]{64}$/

const hasValidRegistryPort = (component) => {
  const separator = component.lastIndexOf(":")
  if (separator < 1) return false
  const host = component.slice(0, separator)
  const port = component.slice(separator + 1)
  if (!REGISTRY_HOST.test(host) || !/^[1-9][0-9]{0,4}$/.test(port)) {
    return false
  }
  return Number(port) <= 65535
}

const isImmutableImageReference = (value) => {
  if (
    typeof value !== "string" ||
    value.length > 327 ||
    value.trim() !== value
  ) {
    return false
  }

  const parts = value.split("@")
  if (parts.length !== 2 || !SHA256_DIGEST.test(parts[1])) return false

  const imageName = parts[0]
  if (!imageName || imageName.length > 255 || imageName.includes("://")) {
    return false
  }

  const components = imageName.split("/")
  if (components.some((component) => !component)) return false
  if (components[0].includes(":")) {
    if (components.length < 2 || !hasValidRegistryPort(components[0])) {
      return false
    }
    components.shift()
  }

  return components.every((component) => IMAGE_PATH_COMPONENT.test(component))
}

module.exports = { isImmutableImageReference }
