import ErrorBoundary from "@/shared/ui/ErrorBoundary"
import { useLocation } from "react-router"

function RouteErrorBoundary({ children }) {
  const location = useLocation()

  return (
    <ErrorBoundary
      resetKey={`${location.pathname}${location.search}`}
      scope="route"
      title="This page could not be displayed"
    >
      {children}
    </ErrorBoundary>
  )
}

export default RouteErrorBoundary
