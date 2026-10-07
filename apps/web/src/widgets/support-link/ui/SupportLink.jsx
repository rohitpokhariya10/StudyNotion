import { FiMail } from "react-icons/fi"
import { Link, useLocation } from "react-router"

// Public-page shortcut to the real contact form. It is a link, not a chat:
// StudyNotion has no live-chat service, so it never claims one.
const HIDDEN_PATTERNS = [
  /^\/contact/i,
  /^\/dashboard/i,
  /^\/view-course/i,
  /^\/project-neet\/attempts/i,
  /^\/project-neet\/mocks\/[^/]+\/start/i,
  /^\/(login|signup|verify-email|forgot-password|update-password|accept-terms)/i,
]

export default function SupportLink() {
  const { pathname } = useLocation()
  if (HIDDEN_PATTERNS.some((pattern) => pattern.test(pathname))) return null
  return (
    <aside aria-label="Support">
      <Link
        to="/contact"
        className="fixed right-4 bottom-4 z-40 inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full bg-[#c2382e] px-0 font-medium text-white shadow-[0_10px_30px_rgb(194_56_46/0.3)] transition-transform hover:-translate-y-0.5 hover:bg-[#a92f26] sm:right-6 sm:bottom-6 sm:px-5"
      >
        <FiMail aria-hidden="true" className="text-xl" />
        <span className="sr-only sm:not-sr-only">Contact us</span>
      </Link>
    </aside>
  )
}
