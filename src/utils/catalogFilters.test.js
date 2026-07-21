import { describe, expect, it } from "vitest"

import {
  catalogFiltersToSearchParams,
  categoryPathSlug,
  countActiveCatalogFilters,
  durationFiltersFromPreset,
  durationPresetFromFilters,
  readCatalogFilters,
} from "./catalogFilters"

describe("catalog URL filters", () => {
  it("normalizes valid filters and defaults searched lists to relevance", () => {
    const filters = readCatalogFilters(
      new URLSearchParams(
        "q=%20react%20hooks%20&level=beginner&language=EN&minPrice=100&maxPrice=900&minRating=4.5"
      )
    )

    expect(filters).toMatchObject({
      q: "react hooks",
      level: "beginner",
      language: "en",
      minPrice: "100",
      maxPrice: "900",
      minRating: "4.5",
      sort: "relevance",
    })
  })

  it("drops invalid values and relevance sorting without a query", () => {
    const filters = readCatalogFilters(
      new URLSearchParams(
        "level=expert&language=javascript&minPrice=-1&minRating=8&sort=relevance"
      )
    )

    expect(filters).toMatchObject({
      level: "",
      language: "",
      minPrice: "",
      minRating: "",
      sort: "newest",
    })
  })

  it("does not send inverted ranges restored from a shared URL", () => {
    const filters = readCatalogFilters(
      new URLSearchParams(
        "minPrice=1000&maxPrice=500&minDurationSeconds=7200&maxDurationSeconds=60"
      )
    )

    expect(filters).toMatchObject({
      minPrice: "",
      maxPrice: "",
      minDurationSeconds: "",
      maxDurationSeconds: "",
    })
  })

  it("caps search text at the shared 120-character boundary", () => {
    const filters = readCatalogFilters(
      new URLSearchParams({ q: "x".repeat(140) })
    )
    expect(filters.q).toHaveLength(120)
  })

  it("serializes only non-default validated values", () => {
    const params = catalogFiltersToSearchParams({
      q: "react",
      level: "intermediate",
      language: "en",
      minPrice: "",
      maxPrice: "2000",
      minRating: "4",
      minDurationSeconds: "",
      maxDurationSeconds: "7200",
      sort: "relevance",
    })

    expect(params.toString()).toBe(
      "q=react&level=intermediate&language=en&maxPrice=2000&minRating=4&maxDurationSeconds=7200"
    )
  })

  it("keeps the legacy category slug convention", () => {
    expect(categoryPathSlug("Web Development")).toBe("web-development")
    expect(categoryPathSlug("Data  Science")).toBe("data--science")
  })

  it("treats price and duration ranges as one active filter each", () => {
    expect(
      countActiveCatalogFilters({
        q: "react",
        level: "",
        language: "",
        minPrice: "100",
        maxPrice: "500",
        minRating: "",
        minDurationSeconds: "7201",
        maxDurationSeconds: "21600",
      })
    ).toBe(3)
  })

  it("round-trips accessible duration presets", () => {
    const range = durationFiltersFromPreset("2-6")
    expect(range).toEqual({
      minDurationSeconds: "7201",
      maxDurationSeconds: "21600",
    })
    expect(durationPresetFromFilters(range)).toBe("2-6")
  })
})
