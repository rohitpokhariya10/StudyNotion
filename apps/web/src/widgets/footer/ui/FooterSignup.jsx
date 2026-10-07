import { Link } from "react-router"

// StudyNotion has no newsletter service, so this row offers the two real next
// steps instead of an email field that could not deliver anything.
export default function FooterSignup() {
  return (
    <div className="sn-footer-cta-row">
      <h2 className="sn-footer-title">Make room for your next chapter</h2>
      <div className="sn-footer-actions">
        <Link to="/signup" className="sn-footer-action">
          Create an account
        </Link>
        <Link
          to="/services"
          className="sn-footer-action sn-footer-action-primary"
        >
          Explore courses
        </Link>
      </div>
    </div>
  )
}
