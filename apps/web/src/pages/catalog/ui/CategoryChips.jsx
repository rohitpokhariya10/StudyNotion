import { categoryPathSlug } from "@/features/course-filter"
import { Link } from "react-router"

// Real published categories as quick-switch chips.
export default function CategoryChips({ activeId, categories }) {
  const available = (categories || []).filter(
    (item) => Number(item.publishedCourseCount) > 0
  )
  if (available.length < 2) return null
  return (
    <nav
      aria-label="Course categories"
      className="border-b border-border-default bg-white"
    >
      <ul className="sn-container flex gap-2 overflow-x-auto py-4">
        {available.map((item) => {
          const active = item.id === activeId
          return (
            <li key={item.id} className="flex-none">
              <Link
                to={`/catalog/${categoryPathSlug(item.name)}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-brand-primary bg-brand-primary text-white"
                    : "border-border-default bg-white text-text-primary hover:border-brand-primary hover:text-brand-primary"
                }`}
              >
                {item.name}
                <span
                  className={`text-xs ${active ? "text-white/80" : "text-text-secondary"}`}
                >
                  {item.publishedCourseCount}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
