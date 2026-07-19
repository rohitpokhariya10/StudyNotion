import { useSelector } from "react-redux"
import { Navigate } from "react-router-dom"

export default function RoleRoute({ allowedRoles, children }) {
  const { isAuthenticated, status } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)

  if (status === "checking") {
    return (
      <div
        className="grid min-h-[calc(100vh-3.5rem)] place-items-center"
        role="status"
        aria-label="Checking account permissions"
      >
        <div className="spinner" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return allowedRoles.includes(user?.accountType) ? (
    children
  ) : (
    <Navigate to="/dashboard/my-profile" replace />
  )
}
