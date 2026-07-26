const contractModules = [
  require("./admin"),
  require("./auth"),
  require("./catalog"),
  require("./commerce"),
  require("./common"),
  require("./courses"),
  require("./errors"),
  require("./learning"),
  require("./pagination"),
  require("./registry"),
  require("./reviews"),
  require("./users"),
  require("./openapi"),
]

const contracts = {}
for (const contractModule of contractModules) {
  for (const [name, value] of Object.entries(contractModule)) {
    if (Object.hasOwn(contracts, name) && contracts[name] !== value) {
      throw new Error(`Duplicate contract export: ${name}`)
    }
    contracts[name] = value
  }
}

module.exports = contracts
