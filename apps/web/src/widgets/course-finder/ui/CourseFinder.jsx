import { useGetCatalogCategoriesQuery } from "@/entities/catalog"
import {
  catalogFiltersToSearchParams,
  categoryPathSlug,
} from "@/features/course-filter"
import FlaskLoader from "@/shared/ui/FlaskLoader"
import { useId, useState } from "react"
import { FiSearch } from "react-icons/fi"
import { useNavigate } from "react-router"

// `layout="bar"` lays the same form out horizontally on wide screens; the
// default card is unchanged.
export default function CourseFinder({ layout = "card" }) {
  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useGetCatalogCategoriesQuery()
  const [categoryId, setCategoryId] = useState("")
  const [query, setQuery] = useState("")
  const id = useId()
  const navigate = useNavigate()
  const category = categories.find((item) => item.id === categoryId)
  const bar = layout === "bar"
  return (
    <form
      className={bar ? "sn-finder sn-finder-bar" : "sn-finder"}
      aria-labelledby={`${id}-title`}
      onSubmit={(event) => {
        event.preventDefault()
        if (!category || isLoading || isError) return
        const search = catalogFiltersToSearchParams({ q: query }).toString()
        navigate({
          pathname: `/catalog/${categoryPathSlug(category.name)}`,
          search: search ? `?${search}` : "",
        })
      }}
    >
      <div className="sn-finder-intro">
        <h2
          id={`${id}-title`}
          className={
            bar
              ? "text-xl font-semibold"
              : "mt-2 text-center text-xl font-semibold"
          }
        >
          Find your next course
        </h2>
        <p
          className={
            bar
              ? "mt-1 text-sm text-text-secondary"
              : "mt-2 text-center text-sm text-text-secondary"
          }
        >
          A little curiosity. A new possibility.
        </p>
      </div>
      {isLoading ? (
        <div className={bar ? "sn-finder-state" : "my-8 text-center"}>
          <FlaskLoader variant="compact" label="Loading subjects" />
        </div>
      ) : isError ? (
        <div
          role="alert"
          className={`rounded-lg bg-brand-soft p-4 text-sm ${bar ? "sn-finder-state" : "my-6"}`}
        >
          <p>We couldn’t load subjects. Please try again.</p>
          <button
            type="button"
            className="sn-btn sn-btn-secondary mt-3"
            onClick={refetch}
          >
            Retry subjects
          </button>
        </div>
      ) : !categories.length ? (
        <p
          role="status"
          className={`text-text-secondary ${bar ? "sn-finder-state" : "my-8 text-center"}`}
        >
          New subjects will appear here when available.
        </p>
      ) : (
        <>
          <div className="sn-finder-field">
            <label
              className={`block text-sm font-medium ${bar ? "" : "mt-7"}`}
              htmlFor={`${id}-category`}
            >
              Choose a subject
            </label>
            <select
              id={`${id}-category`}
              required
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="form-style mt-2 w-full"
            >
              <option value="">Select your subject</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sn-finder-field">
            <label
              className={`block text-sm font-medium ${bar ? "" : "mt-5"}`}
              htmlFor={`${id}-query`}
            >
              What interests you?{" "}
              <span className="font-normal text-text-secondary">
                (optional)
              </span>
            </label>
            <input
              id={`${id}-query`}
              type="search"
              value={query}
              maxLength={120}
              onChange={(event) => setQuery(event.target.value)}
              className="form-style mt-2 w-full"
              placeholder="Search a topic or skill"
            />
          </div>
        </>
      )}
      <button
        type="submit"
        className={`sn-btn sn-btn-primary w-full ${bar ? "sn-finder-submit" : "mt-6"}`}
        disabled={!category || isLoading || isError}
      >
        <FiSearch aria-hidden="true" /> Find courses
      </button>
      <p
        className={`text-xs leading-5 text-text-secondary ${bar ? "sn-finder-note" : "mt-5 text-center"}`}
      >
        Explore the curriculum before you enrol.
        <br />
        No account needed to browse.
      </p>
    </form>
  )
}
