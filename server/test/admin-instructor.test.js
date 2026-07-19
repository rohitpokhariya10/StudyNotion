const assert = require("node:assert/strict")
const { beforeEach, test } = require("node:test")

const adminId = "64b000000000000000000001"
const pendingId = "64b000000000000000000002"
const secondPendingId = "64b000000000000000000003"
const approvedId = "64b000000000000000000004"

let records

const pendingRecords = () =>
  records.filter(
    (record) =>
      record.accountType === "Instructor" &&
      record.active !== false &&
      record.approved === false &&
      [undefined, "Pending"].includes(record.instructorApprovalStatus)
  )

const queryFor = (initialValue) => {
  let value = initialValue
  let skip = 0
  let limit = Number.MAX_SAFE_INTEGER
  return {
    select() {
      return this
    },
    populate() {
      return this
    },
    sort() {
      return this
    },
    skip(count) {
      skip = count
      return this
    },
    limit(count) {
      limit = count
      return this
    },
    lean() {
      const resolved = Array.isArray(value)
        ? value.slice(skip, skip + limit)
        : value
      return Promise.resolve(resolved)
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject)
    },
  }
}

const User = {
  find: () => queryFor(pendingRecords()),
  countDocuments: async () => pendingRecords().length,
  findOne: ({ _id, accountType }) =>
    queryFor(
      records.find(
        (record) => record._id === _id && record.accountType === accountType
      ) || null
    ),
  findOneAndUpdate: (filter, update) => {
    const record = records.find(
      (candidate) =>
        candidate._id === filter._id &&
        candidate.accountType === "Instructor" &&
        candidate.active !== false &&
        candidate.approved === false &&
        [undefined, "Pending"].includes(candidate.instructorApprovalStatus)
    )
    if (record) {
      Object.assign(record, update.$set)
      record.sessionVersion += update.$inc.sessionVersion
    }
    return queryFor(record || null)
  },
}

const userPath = require.resolve("../models/User")
require.cache[userPath] = {
  id: userPath,
  filename: userPath,
  loaded: true,
  exports: User,
}

const controllerPath = require.resolve("../controllers/Admin")
delete require.cache[controllerPath]
const {
  approveInstructor,
  listPendingInstructors,
  rejectInstructor,
} = require(controllerPath)

beforeEach(() => {
  records = [
    {
      _id: pendingId,
      firstName: "Pending",
      lastName: "Instructor",
      email: "pending@example.com",
      accountType: "Instructor",
      active: true,
      approved: false,
      instructorApprovalStatus: "Pending",
      sessionVersion: 0,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      _id: secondPendingId,
      firstName: "Legacy",
      lastName: "Instructor",
      email: "legacy@example.com",
      accountType: "Instructor",
      active: true,
      approved: false,
      sessionVersion: 0,
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
    },
    {
      _id: approvedId,
      firstName: "Approved",
      lastName: "Instructor",
      email: "approved@example.com",
      accountType: "Instructor",
      active: true,
      approved: true,
      instructorApprovalStatus: "Approved",
      sessionVersion: 1,
    },
    {
      _id: "64b000000000000000000005",
      firstName: "Student",
      accountType: "Student",
      active: true,
      approved: true,
    },
  ]
})

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code
    return this
  },
  json(body) {
    this.body = body
    return this
  },
})

test("pending instructor listing is paginated and includes legacy applications", async () => {
  const response = createResponse()
  await listPendingInstructors(
    { query: { page: "1", limit: "20" }, user: { id: adminId } },
    response
  )

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.deepEqual(
    response.body.data.instructors.map(({ _id }) => _id),
    [pendingId, secondPendingId]
  )
  assert.deepEqual(response.body.data.pagination, {
    page: 1,
    limit: 20,
    total: 2,
    pages: 1,
  })

  const invalid = createResponse()
  await listPendingInstructors({ query: { limit: "101" } }, invalid)
  assert.equal(invalid.statusCode, 400)
  assert.equal(invalid.body.success, false)
})

test("approval records the admin audit and is idempotent", async () => {
  const request = {
    params: { instructorId: pendingId },
    body: { note: "Identity and teaching profile verified" },
    user: { id: adminId },
  }
  const response = createResponse()
  await approveInstructor(request, response)

  assert.equal(response.statusCode, 200)
  assert.equal(response.body.success, true)
  assert.equal(response.body.data.instructor.instructorApprovalStatus, "Approved")
  assert.equal(response.body.data.instructor.approved, true)
  assert.equal(response.body.data.instructor.active, true)
  assert.equal(response.body.data.instructor.instructorReviewedBy, adminId)
  assert.equal(
    response.body.data.instructor.instructorReviewNote,
    "Identity and teaching profile verified"
  )
  assert.ok(response.body.data.instructor.instructorReviewedAt instanceof Date)
  assert.equal(records.find(({ _id }) => _id === pendingId).sessionVersion, 1)

  const repeated = createResponse()
  await approveInstructor(request, repeated)
  assert.equal(repeated.statusCode, 200)
  assert.match(repeated.body.message, /already approved/i)
  assert.equal(records.find(({ _id }) => _id === pendingId).sessionVersion, 1)
})

test("rejection requires a reason, writes audit fields, and cannot reverse approval", async () => {
  const missingReason = createResponse()
  await rejectInstructor(
    {
      params: { instructorId: secondPendingId },
      body: { reason: "" },
      user: { id: adminId },
    },
    missingReason
  )
  assert.equal(missingReason.statusCode, 400)

  const rejected = createResponse()
  await rejectInstructor(
    {
      params: { instructorId: secondPendingId },
      body: { reason: "Teaching credentials could not be verified" },
      user: { id: adminId },
    },
    rejected
  )
  assert.equal(rejected.statusCode, 200)
  assert.equal(rejected.body.data.instructor.instructorApprovalStatus, "Rejected")
  assert.equal(rejected.body.data.instructor.active, false)
  assert.equal(rejected.body.data.instructor.approved, false)
  assert.equal(rejected.body.data.instructor.instructorReviewedBy, adminId)
  assert.equal(
    records.find(({ _id }) => _id === secondPendingId).sessionVersion,
    1
  )

  const conflict = createResponse()
  await rejectInstructor(
    {
      params: { instructorId: approvedId },
      body: { reason: "Attempted reversal" },
      user: { id: adminId },
    },
    conflict
  )
  assert.equal(conflict.statusCode, 409)
  assert.equal(conflict.body.success, false)
})
