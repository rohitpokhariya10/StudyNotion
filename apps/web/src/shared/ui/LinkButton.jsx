import { Link } from "react-router"

const Button = ({ children, active, linkto }) => {
  return (
    <Link
      to={linkto}
      className={`sn-btn ${active ? "sn-btn-primary" : "sn-btn-secondary"}`}
    >
      {children}
    </Link>
  )
}

export default Button
