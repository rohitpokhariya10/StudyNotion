import FlaskLoader from "@/shared/ui/FlaskLoader"

// Full content-area loading state (lazy routes, session and page loads). The
// navbar and app shell stay rendered around it.
function PageLoadingFallback({ accessibleLabel = "Loading page", label }) {
  return (
    <FlaskLoader
      variant="page"
      accessibleLabel={accessibleLabel}
      label={label}
    />
  )
}

export default PageLoadingFallback
