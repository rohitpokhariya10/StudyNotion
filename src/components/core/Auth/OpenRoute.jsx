// This will prevent authenticated users from accessing this route
import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

function OpenRoute({ children }) {
  const { isAuthenticated, requiresPolicyAcceptance, status } = useSelector(
    (state) => state.auth
  )

  if (status === "checking") {
    return (
      <div
        className="grid min-h-[calc(100vh-3.5rem)] place-items-center"
        role="status"
        aria-label="Checking your session"
      >
        <div className="spinner" />
      </div>
    )
  }

  return isAuthenticated ? (
    <Navigate
      to={requiresPolicyAcceptance ? "/accept-terms" : "/dashboard/my-profile"}
      replace
    />
  ) : (
    children
  )
}

export default OpenRoute
