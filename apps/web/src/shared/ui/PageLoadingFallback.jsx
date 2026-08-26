function PageLoadingFallback() {
  return (
    <div
      className="grid min-h-[calc(100vh-3.5rem)] place-items-center"
      role="status"
      aria-label="Loading page"
    >
      <div className="spinner" />
    </div>
  )
}

export default PageLoadingFallback
