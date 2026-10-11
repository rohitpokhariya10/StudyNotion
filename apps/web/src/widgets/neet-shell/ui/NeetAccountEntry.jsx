import { useSelector } from "react-redux"
import { Link } from "react-router"

const VARIANTS = {
  default: {
    skeleton: "pn-skeleton h-9 w-24",
    account: "pn-chip border-neet-line bg-neet-surface/70 py-1.5",
    initial:
      "grid h-6 w-6 place-items-center rounded-full bg-neet-accent text-xs font-bold text-neet-accent-ink",
    name: "max-w-[9rem] truncate",
    signIn: "pn-btn pn-btn-secondary min-h-0 px-4 py-2 text-sm",
  },
  landing: {
    skeleton: "pn-skeleton np-account-skeleton",
    account: "np-account",
    initial: "np-account-initial",
    name: "np-account-name",
    signIn: "np-sign-in",
  },
}

// Auth-aware account entry shared by every Prahit NEET Mocks header. Signing
// in returns to the mock catalog, where a paper can be chosen.
export function NeetAccountEntry({ variant = "default" }) {
  const { isAuthenticated, status } = useSelector((state) => state.auth)
  const user = useSelector((state) => state.profile.user)
  const classes = VARIANTS[variant]

  if (status === "checking")
    return <span className={classes.skeleton} aria-hidden="true" />
  if (isAuthenticated && user)
    return (
      <Link
        to="/neet/mocks"
        className={classes.account}
        aria-label={`Signed in as ${user.firstName || "student"}. View mocks.`}
      >
        <span aria-hidden="true" className={classes.initial}>
          {(user.firstName || "S").slice(0, 1).toUpperCase()}
        </span>
        <span className={classes.name}>{user.firstName || "Student"}</span>
      </Link>
    )
  return (
    <Link
      to="/login"
      state={{ from: { pathname: "/neet/mocks" } }}
      className={classes.signIn}
    >
      Sign in
    </Link>
  )
}
