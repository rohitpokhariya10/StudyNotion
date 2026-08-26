const crypto = require("crypto")

const { CatalogApiError } = require("./catalogErrors")

const CURSOR_VERSION = 1
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i

const SORT_DEFINITIONS = Object.freeze({
  relevance: { direction: -1, field: "searchScore", kind: "number" },
  newest: { direction: -1, field: "createdAt", kind: "date" },
  price_asc: { direction: 1, field: "price", kind: "number" },
  price_desc: { direction: -1, field: "price", kind: "number" },
  rating_desc: { direction: -1, field: "ratingAverage", kind: "number" },
  popular: { direction: -1, field: "enrollmentCount", kind: "number" },
})

const normalizedFilterState = (query) => ({
  q: query.q || null,
  categoryId: query.categoryId || null,
  level: query.level || null,
  language: query.language || null,
  minPrice: query.minPrice ?? null,
  maxPrice: query.maxPrice ?? null,
  minRating: query.minRating ?? null,
  minDurationSeconds: query.minDurationSeconds ?? null,
  maxDurationSeconds: query.maxDurationSeconds ?? null,
  sort: query.sort,
})

const filterFingerprint = (query) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(normalizedFilterState(query)))
    .digest("base64url")
    .slice(0, 32)

const invalidCursor = () =>
  new CatalogApiError(
    "INVALID_CURSOR",
    "The catalog cursor is invalid or no longer matches these filters",
    400
  )

const normalizeCursorValue = (value, definition) => {
  if (definition.kind === "date") {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) throw invalidCursor()
    return date.toISOString()
  }
  const number = Number(value)
  if (!Number.isFinite(number)) throw invalidCursor()
  return number
}

const encodeCatalogCursor = (document, query) => {
  const definition = SORT_DEFINITIONS[query.sort]
  const id = document?._id?.toString()
  if (!definition || !OBJECT_ID_PATTERN.test(id || "")) throw invalidCursor()

  const payload = {
    v: CURSOR_VERSION,
    f: filterFingerprint(query),
    s: query.sort,
    k: normalizeCursorValue(document[definition.field], definition),
    id,
  }
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
}

const decodeCatalogCursor = (cursor, query) => {
  if (!cursor) return null
  if (
    typeof cursor !== "string" ||
    cursor.length > 2048 ||
    !/^[A-Za-z0-9_-]+$/.test(cursor)
  ) {
    throw invalidCursor()
  }

  let payload
  try {
    payload = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
  } catch {
    throw invalidCursor()
  }

  const definition = SORT_DEFINITIONS[query.sort]
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    Object.keys(payload).sort().join(",") !== "f,id,k,s,v" ||
    payload.v !== CURSOR_VERSION ||
    payload.s !== query.sort ||
    payload.f !== filterFingerprint(query) ||
    !OBJECT_ID_PATTERN.test(payload.id || "") ||
    !definition
  ) {
    throw invalidCursor()
  }

  return {
    id: payload.id,
    key: normalizeCursorValue(payload.k, definition),
  }
}

module.exports = {
  SORT_DEFINITIONS,
  decodeCatalogCursor,
  encodeCatalogCursor,
  filterFingerprint,
}
