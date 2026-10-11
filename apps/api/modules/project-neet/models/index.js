// Model registration without the HTTP router, for one-shot jobs such as
// index provisioning and seeding.
module.exports = [
  require("./NeetMockTest"),
  require("./NeetQuestion"),
  require("./NeetAttempt"),
  require("./NeetProctorEvent"),
  require("./NeetPaperVersion"),
  require("./NeetAnswerKeyVersion"),
]
