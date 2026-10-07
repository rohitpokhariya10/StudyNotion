import { durationFiltersFromPreset } from "@/features/course-filter"
import Button from "@/shared/ui/Button"
import FormField from "@/shared/ui/FormField"
import { FiSliders } from "react-icons/fi"

export const catalogInputClassName =
  "min-h-11 w-full rounded-lg border border-catalog-border bg-white px-3 py-2 text-sm text-catalog-text placeholder:text-catalog-muted disabled:cursor-not-allowed disabled:opacity-60"

// Filter panel: a sticky sidebar on wide screens, a toggled panel on small
// screens. Field names, options and validation are unchanged.
export default function CatalogFilters({
  draftFilters,
  durationPreset,
  error,
  mobileOpen,
  onApply,
  onChange,
  onClear,
}) {
  const set = (field) => (event) => onChange({ [field]: event.target.value })
  return (
    <form
      id="catalog-filters"
      aria-label="Course filters"
      onSubmit={onApply}
      className={`${mobileOpen ? "block" : "hidden"} rounded-2xl border border-catalog-border bg-white p-5 lg:sticky lg:top-6 lg:block`}
    >
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <FiSliders aria-hidden="true" className="text-brand-primary" /> Filters
      </h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
        <FormField htmlFor="catalog-level" label="Level">
          <select
            id="catalog-level"
            className={catalogInputClassName}
            value={draftFilters.level}
            onChange={set("level")}
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
            className={catalogInputClassName}
            value={draftFilters.language}
            onChange={set("language")}
          >
            <option value="">All languages</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
        </FormField>

        <FormField htmlFor="catalog-rating" label="Minimum rating">
          <select
            id="catalog-rating"
            className={catalogInputClassName}
            value={draftFilters.minRating}
            onChange={set("minRating")}
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
            className={catalogInputClassName}
            value={durationPreset}
            onChange={(event) =>
              onChange(durationFiltersFromPreset(event.target.value))
            }
          >
            <option value="">Any duration</option>
            <option value="under-2">Under 2 hours</option>
            <option value="2-6">2–6 hours</option>
            <option value="6-12">6–12 hours</option>
            <option value="over-12">Over 12 hours</option>
          </select>
        </FormField>

        <fieldset className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-1 lg:grid-cols-1">
          <legend className="sr-only">Price range in rupees</legend>
          <FormField htmlFor="catalog-min-price" label="Minimum price">
            <input
              id="catalog-min-price"
              className={catalogInputClassName}
              type="number"
              min="0"
              max="10000000"
              step="1"
              inputMode="decimal"
              value={draftFilters.minPrice}
              placeholder="₹0"
              onChange={set("minPrice")}
            />
          </FormField>
          <FormField htmlFor="catalog-max-price" label="Maximum price">
            <input
              id="catalog-max-price"
              className={catalogInputClassName}
              type="number"
              min="0"
              max="10000000"
              step="1"
              inputMode="decimal"
              value={draftFilters.maxPrice}
              placeholder="No maximum"
              onChange={set("maxPrice")}
            />
          </FormField>
        </fieldset>
      </div>

      {error && (
        <p
          className="mt-4 text-sm font-medium text-catalog-danger"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3 lg:flex-col">
        <Button className="flex-1" type="submit">
          Apply filters
        </Button>
        <Button
          className="flex-1"
          type="button"
          variant="quiet"
          onClick={onClear}
        >
          Clear all
        </Button>
      </div>
    </form>
  )
}
