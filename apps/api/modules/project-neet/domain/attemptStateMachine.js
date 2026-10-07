// The attempt lifecycle is enforced server-side. Every persisted transition is
// a compare-and-set whose predicate is derived from this table, so concurrent
// requests cannot move an attempt along an edge that is not listed here.

const ATTEMPT_STATUS = Object.freeze({
  REGISTERED: "REGISTERED",
  READY: "READY",
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTING: "SUBMITTING",
  SUBMITTED: "SUBMITTED",
  AUTO_SUBMITTED: "AUTO_SUBMITTED",
  EXPIRED: "EXPIRED",
  TERMINATED: "TERMINATED",
})

const SUBMISSION_REASON = Object.freeze({
  MANUAL_SUBMIT: "MANUAL_SUBMIT",
  TIME_EXPIRED: "TIME_EXPIRED",
  PROCTOR_POLICY: "PROCTOR_POLICY",
  ADMIN_RECOVERY: "ADMIN_RECOVERY",
})

const TRANSITIONS = Object.freeze({
  REGISTERED: Object.freeze(["READY", "EXPIRED", "TERMINATED"]),
  READY: Object.freeze(["REGISTERED", "IN_PROGRESS", "EXPIRED", "TERMINATED"]),
  IN_PROGRESS: Object.freeze(["SUBMITTING", "TERMINATED"]),
  SUBMITTING: Object.freeze(["SUBMITTED", "AUTO_SUBMITTED", "TERMINATED"]),
  SUBMITTED: Object.freeze([]),
  AUTO_SUBMITTED: Object.freeze([]),
  EXPIRED: Object.freeze([]),
  TERMINATED: Object.freeze([]),
})

const PRE_START_STATUSES = Object.freeze([
  ATTEMPT_STATUS.REGISTERED,
  ATTEMPT_STATUS.READY,
])
const FINAL_STATUSES = Object.freeze([
  ATTEMPT_STATUS.SUBMITTED,
  ATTEMPT_STATUS.AUTO_SUBMITTED,
  ATTEMPT_STATUS.EXPIRED,
  ATTEMPT_STATUS.TERMINATED,
])
const SCORED_STATUSES = Object.freeze([
  ATTEMPT_STATUS.SUBMITTED,
  ATTEMPT_STATUS.AUTO_SUBMITTED,
])

const canTransition = (from, to) =>
  Boolean(TRANSITIONS[from] && TRANSITIONS[from].includes(to))

// Statuses from which `to` may be entered; used to build CAS predicates.
const sourcesFor = (to) =>
  Object.keys(TRANSITIONS).filter((from) => TRANSITIONS[from].includes(to))

const isFinalStatus = (status) => FINAL_STATUSES.includes(status)
const isScoredStatus = (status) => SCORED_STATUSES.includes(status)
const isPreStartStatus = (status) => PRE_START_STATUSES.includes(status)

const finalStatusForReason = (reason) =>
  reason === SUBMISSION_REASON.MANUAL_SUBMIT
    ? ATTEMPT_STATUS.SUBMITTED
    : ATTEMPT_STATUS.AUTO_SUBMITTED

module.exports = {
  ATTEMPT_STATUS,
  FINAL_STATUSES,
  PRE_START_STATUSES,
  SCORED_STATUSES,
  SUBMISSION_REASON,
  TRANSITIONS,
  canTransition,
  finalStatusForReason,
  isFinalStatus,
  isPreStartStatus,
  isScoredStatus,
  sourcesFor,
}
