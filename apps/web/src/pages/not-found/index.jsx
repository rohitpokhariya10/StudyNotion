import ProductCollage from "@/shared/ui/ProductCollage"
import { Link } from "react-router"

function Error() {
  return (
    <main className="grid min-h-[calc(100dvh-var(--sn-header-height))] flex-1 place-items-center px-6 py-12 text-text-primary">
      <div className="max-w-lg text-center">
        <ProductCollage variant="empty" className="mx-auto max-w-xs" />
        <p className="text-sm font-semibold tracking-widest text-brand-primary uppercase">
          Error 404
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Page not found</h1>
        <p className="mt-4 leading-7 text-text-secondary">
          The page may have moved, or the address may be incorrect.
        </p>
        <Link
          className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-brand-primary px-5 py-2 font-semibold text-white"
          to="/"
        >
          Return home
        </Link>
      </div>
    </main>
  )
}

export default Error
