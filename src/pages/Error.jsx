import { Link } from "react-router"

function Error() {
  return (
    <main className="grid min-h-[calc(100vh-3.5rem)] flex-1 place-items-center px-6 py-12 text-richblack-5">
      <div className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-yellow-100">
          Error 404
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Page not found</h1>
        <p className="mt-4 leading-7 text-richblack-200">
          The page may have moved, or the address may be incorrect.
        </p>
        <Link
          className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-yellow-50 px-5 py-2 font-semibold text-richblack-900"
          to="/"
        >
          Return home
        </Link>
      </div>
    </main>
  )
}

export default Error
