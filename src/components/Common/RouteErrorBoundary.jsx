import { useLocation } from "react-router-dom"

import ErrorBoundary from "./ErrorBoundary"

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
