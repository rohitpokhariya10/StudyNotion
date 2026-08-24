const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const path = require("node:path")
const test = require("node:test")

const repositoryRoot = path.resolve(__dirname, "../..")
const validate = (image) =>
  spawnSync(process.execPath, ["scripts/validate-image-reference.mjs"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, STUDYNOTION_API_IMAGE_DIGEST: image },
  })

test("operations host gate accepts only immutable sha256 image references", () => {
  const valid = validate(
    `registry.example/studynotion-api@sha256:${"a".repeat(64)}`
  )
  assert.equal(valid.status, 0, valid.stderr)

  for (const image of [
    "studynotion-api:latest",
    "studynotion-api:main",
    `INVALID@sha256:${"a".repeat(64)}`,
    `https://registry.example/studynotion-api@sha256:${"a".repeat(64)}`,
    `registry.example:70000/studynotion-api@sha256:${"a".repeat(64)}`,
    `studynotion-api@sha256:${"a".repeat(63)}`,
  ]) {
    const result = validate(image)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /reviewed immutable sha256/)
  }
})
