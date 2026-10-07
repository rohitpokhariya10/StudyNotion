import {
  getCatalogErrorPresentation,
  useGetCatalogCategoriesQuery,
  useGetCoursesInfiniteQuery,
} from "@/entities/catalog"
import { CourseCard } from "@/entities/course"
import {
  catalogFiltersToSearchParams,
  categoryPathSlug,
  countActiveCatalogFilters,
  durationPresetFromFilters,
  readCatalogFilters,
} from "@/features/course-filter"
import Button from "@/shared/ui/Button"
import FormField from "@/shared/ui/FormField"
import StatusPanel from "@/shared/ui/StatusPanel"
import Footer from "@/widgets/footer"
import { useMemo, useState } from "react"
import { FiSliders } from "react-icons/fi"
import { useParams, useSearchParams } from "react-router"

import CatalogFilters, { catalogInputClassName } from "./ui/CatalogFilters"
import CatalogHero, { CatalogSearch } from "./ui/CatalogHero"
import CategoryChips from "./ui/CategoryChips"

const SORT_OPTIONS = [
  { label: "Most relevant", value: "relevance" },
  { label: "Newest", value: "newest" },
  { label: "Most popular", value: "popular" },
  { label: "Highest rated", value: "rating_desc" },
  { label: "Price: low to high", value: "price_asc" },
  { label: "Price: high to low", value: "price_desc" },
]

function CatalogSkeleton({ category }) {
  return (
    <div className="bg-catalog-canvas text-catalog-text">
      <CatalogHero category={category} />
      <main
        className="sn-container grid gap-8 py-10 lg:grid-cols-[17rem_minmax(0,1fr)]"
        aria-busy="true"
        aria-label="Loading courses"
        role="status"
      >
        <span className="sr-only">Loading courses…</span>
        <div
          aria-hidden="true"
          className="catalog-skeleton hidden h-96 rounded-2xl bg-catalog-surface-muted lg:block"
        />
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="overflow-hidden rounded-2xl border border-catalog-border bg-white"
            >
              <div className="catalog-skeleton aspect-[16/10] bg-catalog-surface-muted" />
              <div className="space-y-3 p-6">
                <div className="catalog-skeleton h-5 w-24 rounded-full bg-catalog-surface-muted" />
                <div className="catalog-skeleton h-6 w-4/5 rounded-sm bg-catalog-surface-muted" />
                <div className="catalog-skeleton h-4 w-1/2 rounded-sm bg-catalog-surface-muted" />
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
      <div className="bg-catalog-canvas text-catalog-text">
        <CatalogHero />
        <main className="sn-container min-h-[420px] py-12">
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
      <div className="bg-catalog-canvas text-catalog-text">
        <CatalogHero />
        <main className="sn-container min-h-[420px] py-12">
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
    <div className="bg-catalog-canvas text-catalog-text">
      <CatalogHero
        category={category}
        search={
          <CatalogSearch
            categoryName={category.name}
            value={draftFilters.q}
            onSubmit={applyFilters}
            onChange={(q) => setDraftFilters((current) => ({ ...current, q }))}
          />
        }
      />
      <CategoryChips activeId={category.id} categories={categoriesQuery.data} />
      <main className="sn-container grid min-h-[560px] items-start gap-8 py-10 sm:py-14 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <CatalogFilters
          draftFilters={draftFilters}
          durationPreset={durationPreset}
          error={filterError}
          mobileOpen={mobileFiltersOpen}
          onApply={applyFilters}
          onClear={clearFilters}
          onChange={(changes) =>
            setDraftFilters((current) => ({ ...current, ...changes }))
          }
        />

        <section aria-labelledby="catalog-results-title" className="min-w-0">
          <div className="flex flex-col gap-4 border-b border-catalog-border pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="catalog-results-title"
                className="sn-subheading text-catalog-text"
              >
                {filters.q
                  ? `Results for “${filters.q}”`
                  : `${category.name} courses`}
              </h2>
              <p
                className="mt-2 text-sm text-catalog-muted"
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

            <div className="flex w-full items-end gap-3 sm:w-auto">
              <Button
                className="flex-none whitespace-nowrap lg:hidden"
                type="button"
                variant="secondary"
                aria-controls="catalog-filters"
                aria-expanded={mobileFiltersOpen}
                onClick={() => setMobileFiltersOpen((open) => !open)}
              >
                <FiSliders aria-hidden="true" />
                {mobileFiltersOpen ? "Hide filters" : "Show filters"}
              </Button>
              <div className="min-w-0 flex-1 sm:w-52 sm:flex-none">
                <FormField htmlFor="catalog-sort" label="Sort by">
                  <select
                    id="catalog-sort"
                    className={catalogInputClassName}
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
          </div>

          {activeFilterCount > 0 && courses.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--sn-blue-line)] bg-brand-soft px-4 py-3">
              <p className="text-sm font-medium text-catalog-text">
                {activeFilterCount} active filter
                {activeFilterCount === 1 ? "" : "s"}
              </p>
              <Button
                className="ml-auto"
                variant="quiet"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          )}

          <div className="mt-8">
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
                <ul className="grid gap-6 sm:grid-cols-2" aria-label="Courses">
                  {courses.map((course, index) => (
                    <li key={course.id}>
                      <CourseCard course={course} priority={index < 2} />
                    </li>
                  ))}
                </ul>

                <div className="mt-10 flex flex-col items-center gap-3">
                  {hasPaginationError && (
                    <div
                      className="w-full max-w-2xl rounded-xl border border-catalog-danger/30 bg-white p-4 text-center"
                      role="alert"
                    >
                      <p className="text-sm text-catalog-danger">
                        {error.message}
                      </p>
                      {error.requestId && (
                        <p className="mt-1 font-mono text-xs break-all text-catalog-muted">
                          Request ID: {error.requestId}
                        </p>
                      )}
                    </div>
                  )}
                  {hasNextPage ? (
                    <Button
                      variant="secondary"
                      className="sn-btn-lg"
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
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Catalog
