export const CATALOG_LEVELS = ["beginner", "intermediate", "advanced"]
export const CATALOG_LANGUAGES = ["en", "hi"]
export const CATALOG_SORTS = [
  "newest",
  "relevance",
  "price_asc",
  "price_desc",
  "rating_desc",
  "popular",
]

const MAX_QUERY_LENGTH = 120
const MAX_PRICE = 10_000_000
const MAX_DURATION_SECONDS = 31_536_000

const normalizeText = (value, maxLength = MAX_QUERY_LENGTH) => {
  if (typeof value !== "string") return ""
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength)
}

const allowedValue = (value, allowed) => (allowed.includes(value) ? value : "")

const boundedNumber = (value, maximum, { integer = false } = {}) => {
  if (value === null || value === undefined || value === "") return ""
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > maximum) return ""
  return integer ? String(Math.floor(number)) : String(number)
}

export const categoryPathSlug = (name) =>
  String(name || "")
    .trim()
    .split(" ")
    .join("-")
    .toLowerCase()

export const readCatalogFilters = (searchParams) => {
  const q = normalizeText(searchParams.get("q") || "")
  const requestedSort = allowedValue(searchParams.get("sort"), CATALOG_SORTS)

  const filters = {
    q,
    level: allowedValue(searchParams.get("level"), CATALOG_LEVELS),
    language: allowedValue(
      normalizeText(searchParams.get("language") || "", 35).toLowerCase(),
      CATALOG_LANGUAGES
    ),
    minPrice: boundedNumber(searchParams.get("minPrice"), MAX_PRICE),
    maxPrice: boundedNumber(searchParams.get("maxPrice"), MAX_PRICE),
    minRating: boundedNumber(searchParams.get("minRating"), 5),
    minDurationSeconds: boundedNumber(
      searchParams.get("minDurationSeconds"),
      MAX_DURATION_SECONDS,
      { integer: true }
    ),
    maxDurationSeconds: boundedNumber(
      searchParams.get("maxDurationSeconds"),
      MAX_DURATION_SECONDS,
      { integer: true }
    ),
    sort:
      requestedSort === "relevance" && !q
        ? "newest"
        : requestedSort || (q ? "relevance" : "newest"),
  }

  if (
    filters.minPrice !== "" &&
    filters.maxPrice !== "" &&
    Number(filters.minPrice) > Number(filters.maxPrice)
  ) {
    filters.minPrice = ""
    filters.maxPrice = ""
  }
  if (
    filters.minDurationSeconds !== "" &&
    filters.maxDurationSeconds !== "" &&
    Number(filters.minDurationSeconds) > Number(filters.maxDurationSeconds)
  ) {
    filters.minDurationSeconds = ""
    filters.maxDurationSeconds = ""
  }

  return filters
}

export const catalogFiltersToSearchParams = (filters) => {
  const params = new URLSearchParams()
  const normalized = readCatalogFilters(
    new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== "")
    )
  )

  for (const key of [
    "q",
    "level",
    "language",
    "minPrice",
    "maxPrice",
    "minRating",
    "minDurationSeconds",
    "maxDurationSeconds",
  ]) {
    if (normalized[key] !== "") params.set(key, normalized[key])
  }

  const defaultSort = normalized.q ? "relevance" : "newest"
  if (normalized.sort !== defaultSort) params.set("sort", normalized.sort)
  return params
}

export const countActiveCatalogFilters = (filters) =>
  [
    filters.q,
    filters.level,
    filters.language,
    filters.minPrice || filters.maxPrice,
    filters.minRating,
    filters.minDurationSeconds || filters.maxDurationSeconds,
  ].filter((value) => value !== "").length

export const durationPresetFromFilters = (filters) => {
  const key = `${filters.minDurationSeconds}:${filters.maxDurationSeconds}`
  return (
    {
      ":7200": "under-2",
      "7201:21600": "2-6",
      "21601:43200": "6-12",
      "43201:": "over-12",
    }[key] || ""
  )
}

export const durationFiltersFromPreset = (preset) =>
  ({
    "under-2": { minDurationSeconds: "", maxDurationSeconds: "7200" },
    "2-6": { minDurationSeconds: "7201", maxDurationSeconds: "21600" },
    "6-12": { minDurationSeconds: "21601", maxDurationSeconds: "43200" },
    "over-12": { minDurationSeconds: "43201", maxDurationSeconds: "" },
  })[preset] || { minDurationSeconds: "", maxDurationSeconds: "" }
