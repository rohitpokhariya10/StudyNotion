import ProductCollage from "@/shared/ui/ProductCollage"
import { FiSearch } from "react-icons/fi"
import { Link } from "react-router"

function Breadcrumb({ category }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
        <li>
          <Link
            className="inline-flex min-h-11 items-center hover:text-brand-primary"
            to="/"
          >
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>Catalog</li>
        {category?.name && (
          <>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-brand-primary">
              {category.name}
            </li>
          </>
        )}
      </ol>
    </nav>
  )
}

// Discovery hero: title, description, real course count, and the search box.
export default function CatalogHero({ category, children, search }) {
  const count = Number(category?.publishedCourseCount) || 0
  return (
    <header className="sn-hero !pb-12 sm:!pb-16">
      <div className="sn-container grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="max-w-2xl">
          <Breadcrumb category={category} />
          <p className="sn-eyebrow mt-4">Course catalog</p>
          <h1 className="sn-display">{category?.name || "Course catalog"}</h1>
          {category?.description && (
            <p className="sn-lead mt-4 text-[1.0625rem]">
              {category.description}
            </p>
          )}
          {count > 0 && (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--sn-blue-line)] bg-white px-4 py-1.5 text-sm font-medium">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-brand-primary"
              />
              {count} published course{count === 1 ? "" : "s"}
            </p>
          )}
          {search && <div className="mt-8">{search}</div>}
          {children}
        </div>
        <div className="mx-auto hidden w-full max-w-[22rem] lg:block">
          <ProductCollage />
        </div>
      </div>
    </header>
  )
}

export function CatalogSearch({ categoryName, onChange, onSubmit, value }) {
  return (
    <form
      role="search"
      aria-label={`Search and filter ${categoryName} courses`}
      onSubmit={onSubmit}
    >
      <label htmlFor="catalog-search" className="sr-only">
        Search courses
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-border-default bg-white p-1.5 shadow-education focus-within:border-brand-primary">
        <FiSearch
          aria-hidden="true"
          className="ml-3 flex-none text-lg text-text-secondary"
        />
        <input
          id="catalog-search"
          name="q"
          type="search"
          maxLength="120"
          autoComplete="off"
          value={value}
          placeholder={`Search in ${categoryName}`}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 min-w-0 flex-1 !border-0 bg-transparent px-1 text-[0.9375rem] outline-none focus-visible:!outline-none"
        />
        <button type="submit" className="sn-btn sn-btn-primary min-h-11 px-6">
          Search
        </button>
      </div>
    </form>
  )
}
