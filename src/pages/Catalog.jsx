import { useMemo, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"

import Footer from "../components/Common/Footer"
import CourseCard from "../components/core/Catalog/Course_Card"
import Button from "../components/ui/Button"
import FormField from "../components/ui/FormField"
import StatusPanel from "../components/ui/StatusPanel"
import {
  getCatalogErrorPresentation,
  useGetCatalogCategoriesQuery,
  useGetCoursesInfiniteQuery,
} from "../services/catalogApi"
import {
  catalogFiltersToSearchParams,
  categoryPathSlug,
  countActiveCatalogFilters,
  durationFiltersFromPreset,
  durationPresetFromFilters,
  readCatalogFilters,
} from "../utils/catalogFilters"

const inputClassName =
  "min-h-11 w-full rounded-product border border-catalog-border bg-catalog-surface px-3 py-2 text-sm text-catalog-text placeholder:text-catalog-muted disabled:cursor-not-allowed disabled:opacity-60"

const SORT_OPTIONS = [
  { label: "Most relevant", value: "relevance" },
  { label: "Newest", value: "newest" },
  { label: "Most popular", value: "popular" },
  { label: "Highest rated", value: "rating_desc" },
  { label: "Price: low to high", value: "price_asc" },
  { label: "Price: high to low", value: "price_desc" },
]

function CatalogHero({ category }) {
  return (
    <header className="bg-catalog-action text-white">
      <div className="mx-auto w-11/12 max-w-maxContent py-10 sm:py-14">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-white/75">
            <li>
              <Link className="min-h-11 py-3 hover:text-white" to="/">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>Catalog</li>
            {category?.name && (
              <>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-catalog-brand-soft">
                  {category.name}
                </li>
              </>
            )}
          </ol>
        </nav>
        <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          {category?.name || "Course catalog"}
        </h1>
        {category?.description && (
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/80">
            {category.description}
          </p>
        )}
      </div>
    </header>
  )
}

function CatalogSkeleton({ category }) {
  return (
    <div className="catalog-theme min-h-[calc(100vh-3.5rem)] bg-catalog-canvas text-catalog-text">
      <CatalogHero category={category} />
      <main
        className="mx-auto w-11/12 max-w-maxContent py-10"
        aria-busy="true"
        aria-label="Loading courses"
        role="status"
      >
        <span className="sr-only">Loading courses…</span>
        <div className="catalog-skeleton h-11 max-w-2xl rounded-product bg-catalog-surface-muted" />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="overflow-hidden rounded-product-lg border border-catalog-border bg-catalog-surface"
            >
              <div className="catalog-skeleton aspect-video bg-catalog-surface-muted" />
              <div className="space-y-3 p-5">
                <div className="catalog-skeleton h-4 w-1/3 rounded bg-catalog-surface-muted" />
                <div className="catalog-skeleton h-6 w-4/5 rounded bg-catalog-surface-muted" />
                <div className="catalog-skeleton h-4 w-1/2 rounded bg-catalog-surface-muted" />
                <div className="catalog-skeleton h-10 rounded bg-catalog-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function Catalog() {
  const { catalogName = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchKey = searchParams.toString()
  const filters = useMemo(
    () => readCatalogFilters(new URLSearchParams(searchKey)),
    [searchKey]
  )
  const [draftState, setDraftState] = useState({
    filters,
    searchKey,
  })
  const [filterErrorState, setFilterErrorState] = useState({
    message: "",
    searchKey,
  })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const draftFilters =
    draftState.searchKey === searchKey ? draftState.filters : filters
  const filterError =
    filterErrorState.searchKey === searchKey ? filterErrorState.message : ""
  const setDraftFilters = (updater) => {
    setDraftState((currentState) => {
      const currentFilters =
        currentState.searchKey === searchKey ? currentState.filters : filters
      return {
        filters:
          typeof updater === "function" ? updater(currentFilters) : updater,
        searchKey,
      }
    })
  }
  const setFilterError = (message) =>
    setFilterErrorState({ message, searchKey })

  const categoriesQuery = useGetCatalogCategoriesQuery()
  const category = useMemo(
    () =>
      categoriesQuery.data?.find(
        (item) => categoryPathSlug(item.name) === catalogName.toLowerCase()
      ) || null,
    [catalogName, categoriesQuery.data]
  )
  const courseQueryArgs = useMemo(
    () => ({ ...filters, categoryId: category?.id || "" }),
    [category?.id, filters]
  )
  const coursesQuery = useGetCoursesInfiniteQuery(courseQueryArgs, {
    skip: !category,
  })
  const {
    currentData: courseData,
    error: coursesError,
    fetchNextPage,
    hasNextPage,
    isError: coursesHaveError,
    isFetching,
    isFetchingNextPage,
    isLoading: coursesLoading,
    refetch: refetchCourses,
  } = coursesQuery

  const courses = useMemo(() => {
    const seen = new Set()
    return (courseData?.pages || [])
      .flatMap((page) => page.items)
      .filter((course) => {
        if (seen.has(course.id)) return false
        seen.add(course.id)
        return true
      })
  }, [courseData])
  const activeFilterCount = countActiveCatalogFilters(filters)
  const durationPreset = durationPresetFromFilters(draftFilters)

  const applyFilters = (event) => {
    event.preventDefault()
    const minPrice = Number(draftFilters.minPrice)
    const maxPrice = Number(draftFilters.maxPrice)
    if (
      draftFilters.minPrice !== "" &&
      draftFilters.maxPrice !== "" &&
      minPrice > maxPrice
    ) {
      setFilterError("Minimum price cannot be greater than maximum price.")
      return
    }

    const nextFilters = { ...draftFilters }
    if (nextFilters.q && !filters.q && !searchParams.has("sort")) {
      nextFilters.sort = "relevance"
    }
    if (!nextFilters.q && nextFilters.sort === "relevance") {
      nextFilters.sort = "newest"
    }

    setFilterError("")
    setSearchParams(catalogFiltersToSearchParams(nextFilters))
  }

  const clearFilters = () => {
    setFilterError("")
    setSearchParams(new URLSearchParams())
  }

  const updateSort = (sort) => {
    setSearchParams(catalogFiltersToSearchParams({ ...filters, sort }))
  }

  if (
    categoriesQuery.isLoading ||
    (category && !courseData && (coursesLoading || isFetching))
  ) {
    return <CatalogSkeleton category={category} />
  }

  if (categoriesQuery.isError) {
    const error = getCatalogErrorPresentation(categoriesQuery.error)
    return (
      <div className="catalog-theme bg-catalog-canvas text-catalog-text">
        <CatalogHero />
        <main className="mx-auto min-h-[420px] w-11/12 max-w-maxContent py-12">
          <StatusPanel
            tone="error"
            title="The catalog is temporarily unavailable"
            description={error.message}
            requestId={error.requestId}
            action={
              <Button onClick={categoriesQuery.refetch}>Try again</Button>
            }
          />
        </main>
        <Footer />
      </div>
    )
  }

  if (!category) {
    return (
      <div className="catalog-theme bg-catalog-canvas text-catalog-text">
        <CatalogHero />
        <main className="mx-auto min-h-[420px] w-11/12 max-w-maxContent py-12">
          <StatusPanel
            title="Catalog category not found"
            description="This category may have moved or is no longer available. Choose another category from the catalog menu."
            action={
              <Button variant="secondary" onClick={() => window.history.back()}>
                Go back
              </Button>
            }
          />
        </main>
        <Footer />
      </div>
    )
  }

  const error = getCatalogErrorPresentation(coursesError)
  const hasInitialError = coursesHaveError && courses.length === 0
  const hasPaginationError = coursesHaveError && courses.length > 0

  return (
    <div className="catalog-theme bg-catalog-canvas text-catalog-text">
      <CatalogHero category={category} />
      <main className="mx-auto min-h-[560px] w-11/12 max-w-maxContent py-8 sm:py-12">
        <form
          className="rounded-product-lg border border-catalog-border bg-catalog-surface p-4 shadow-sm sm:p-6"
          role="search"
          aria-label={`Search and filter ${category.name} courses`}
          onSubmit={applyFilters}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <FormField htmlFor="catalog-search" label="Search courses">
                <input
                  id="catalog-search"
                  name="q"
                  type="search"
                  maxLength="120"
                  autoComplete="off"
                  value={draftFilters.q}
                  placeholder={`Search in ${category.name}`}
                  className={inputClassName}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      q: event.target.value,
                    }))
                  }
                />
              </FormField>
            </div>
            <Button className="sm:min-w-28" type="submit">
              Search
            </Button>
            <Button
              className="lg:hidden"
              type="button"
              variant="secondary"
              aria-controls="catalog-filters"
              aria-expanded={mobileFiltersOpen}
              onClick={() => setMobileFiltersOpen((open) => !open)}
            >
              {mobileFiltersOpen ? "Hide filters" : "Show filters"}
            </Button>
          </div>

          <div
            id="catalog-filters"
            className={`${mobileFiltersOpen ? "grid" : "hidden"} mt-6 gap-4 border-t border-catalog-border pt-6 sm:grid-cols-2 lg:grid lg:grid-cols-4`}
          >
            <FormField htmlFor="catalog-level" label="Level">
              <select
                id="catalog-level"
                className={inputClassName}
                value={draftFilters.level}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    level: event.target.value,
                  }))
                }
              >
                <option value="">All levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </FormField>

            <FormField htmlFor="catalog-language" label="Language">
              <select
                id="catalog-language"
                className={inputClassName}
                value={draftFilters.language}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    language: event.target.value,
                  }))
                }
              >
                <option value="">All languages</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
              </select>
            </FormField>

            <FormField htmlFor="catalog-rating" label="Minimum rating">
              <select
                id="catalog-rating"
                className={inputClassName}
                value={draftFilters.minRating}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    minRating: event.target.value,
                  }))
                }
              >
                <option value="">Any rating</option>
                <option value="3">3.0 and up</option>
                <option value="4">4.0 and up</option>
                <option value="4.5">4.5 and up</option>
              </select>
            </FormField>

            <FormField htmlFor="catalog-duration" label="Duration">
              <select
                id="catalog-duration"
                className={inputClassName}
                value={durationPreset}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    ...durationFiltersFromPreset(event.target.value),
                  }))
                }
              >
                <option value="">Any duration</option>
                <option value="under-2">Under 2 hours</option>
                <option value="2-6">2–6 hours</option>
                <option value="6-12">6–12 hours</option>
                <option value="over-12">Over 12 hours</option>
              </select>
            </FormField>

            <FormField htmlFor="catalog-min-price" label="Minimum price">
              <input
                id="catalog-min-price"
                className={inputClassName}
                type="number"
                min="0"
                max="10000000"
                step="1"
                inputMode="decimal"
                value={draftFilters.minPrice}
                placeholder="₹0"
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    minPrice: event.target.value,
                  }))
                }
              />
            </FormField>

            <FormField htmlFor="catalog-max-price" label="Maximum price">
              <input
                id="catalog-max-price"
                className={inputClassName}
                type="number"
                min="0"
                max="10000000"
                step="1"
                inputMode="decimal"
                value={draftFilters.maxPrice}
                placeholder="No maximum"
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    maxPrice: event.target.value,
                  }))
                }
              />
            </FormField>

            <div className="flex items-end gap-3 sm:col-span-2">
              <Button className="flex-1" type="submit">
                Apply filters
              </Button>
              <Button
                className="flex-1"
                type="button"
                variant="quiet"
                onClick={clearFilters}
              >
                Clear all
              </Button>
            </div>
          </div>

          {filterError && (
            <p
              className="mt-4 text-sm font-medium text-catalog-danger"
              role="alert"
            >
              {filterError}
            </p>
          )}
        </form>

        <div className="mt-8 flex flex-col gap-4 border-b border-catalog-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-catalog-text">
              {filters.q
                ? `Results for “${filters.q}”`
                : `${category.name} courses`}
            </h2>
            <p
              className="mt-1 text-sm text-catalog-muted"
              role="status"
              aria-live="polite"
            >
              {courses.length > 0
                ? `${courses.length} course${courses.length === 1 ? "" : "s"} shown`
                : activeFilterCount > 0
                  ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`
                  : "Browse the latest published courses"}
              {isFetching && !isFetchingNextPage ? " · Updating…" : ""}
            </p>
          </div>

          <div className="w-full sm:w-56">
            <FormField htmlFor="catalog-sort" label="Sort by">
              <select
                id="catalog-sort"
                className={inputClassName}
                value={filters.sort}
                onChange={(event) => updateSort(event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.value === "relevance" && !filters.q}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </div>

        {activeFilterCount > 0 && courses.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-product border border-catalog-border bg-catalog-brand-soft/60 px-4 py-3">
            <p className="text-sm font-medium text-catalog-text">
              {activeFilterCount} active filter
              {activeFilterCount === 1 ? "" : "s"}
            </p>
            <Button className="ml-auto" variant="quiet" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}

        <div className="mt-7">
          {hasInitialError ? (
            <StatusPanel
              tone="error"
              title="Courses could not be loaded"
              description={error.message}
              requestId={error.requestId}
              action={<Button onClick={refetchCourses}>Try again</Button>}
            />
          ) : courses.length === 0 ? (
            activeFilterCount > 0 ? (
              <StatusPanel
                title="No courses match these filters"
                description="Try a broader search, adjust the price or duration, or clear the filters to see every published course in this category."
                action={
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <StatusPanel
                title="No courses published yet"
                description={`There are no published courses in ${category.name} right now. Please check back later.`}
              />
            )
          ) : (
            <>
              <ul
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                aria-label="Courses"
              >
                {courses.map((course, index) => (
                  <li key={course.id}>
                    <CourseCard course={course} priority={index < 3} />
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-col items-center gap-3">
                {hasPaginationError && (
                  <div
                    className="w-full max-w-2xl rounded-product border border-catalog-danger/30 bg-catalog-surface p-4 text-center"
                    role="alert"
                  >
                    <p className="text-sm text-catalog-danger">
                      {error.message}
                    </p>
                    {error.requestId && (
                      <p className="mt-1 break-all font-mono text-xs text-catalog-muted">
                        Request ID: {error.requestId}
                      </p>
                    )}
                  </div>
                )}
                {hasNextPage ? (
                  <Button
                    variant="secondary"
                    disabled={isFetchingNextPage}
                    aria-describedby="catalog-pagination-status"
                    onClick={() => fetchNextPage()}
                  >
                    {isFetchingNextPage
                      ? "Loading more courses…"
                      : "Load more courses"}
                  </Button>
                ) : (
                  <p className="text-sm text-catalog-muted" role="status">
                    You’ve reached the end of this category.
                  </p>
                )}
                <p
                  id="catalog-pagination-status"
                  className="sr-only"
                  aria-live="polite"
                >
                  {isFetchingNextPage
                    ? "Loading more courses"
                    : `${courses.length} courses currently shown`}
                </p>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Catalog
