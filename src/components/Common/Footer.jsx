import { Link } from "react-router-dom"

import Logo from "../../assets/Logo/Logo-Full-Light.png"
import { FooterLink2 } from "../../data/footer-links"

const configuredSupportEmail = import.meta.env.VITE_SUPPORT_EMAIL?.trim()
const supportEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
  configuredSupportEmail || ""
)
  ? configuredSupportEmail
  : "support@studynotion.local"

const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-richblack-800 text-richblack-400">
      <div className="mx-auto grid w-11/12 max-w-maxContent gap-10 py-14 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <img
            src={Logo}
            alt="StudyNotion"
            className="w-[160px] object-contain"
          />
          <p className="max-w-[360px] text-sm text-richblack-300">
            Practical, instructor-led online courses that help learners build
            durable skills and move their careers forward at their own pace.
          </p>
        </div>

        <nav
          className="grid grid-cols-2 gap-8"
          aria-label="Footer navigation"
        >
          {FooterLink2.map((section) => (
            <div key={section.title}>
              <h2 className="mb-3 text-base font-semibold text-richblack-50">
                {section.title}
              </h2>
              <ul className="flex flex-col gap-2">
                {section.links.map((link) => (
                  <li key={link.title} className="text-sm">
                    <Link
                      to={link.link}
                      className="transition-colors hover:text-richblack-50"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div>
          <h2 className="mb-3 text-base font-semibold text-richblack-50">
            Support
          </h2>
          <p className="mb-3 text-sm text-richblack-300">
            Need help with your account, enrollment, or a course?
          </p>
          <a
            href={`mailto:${supportEmail}`}
            className="break-all text-sm text-yellow-50 transition-colors hover:text-yellow-100"
          >
            {supportEmail}
          </a>
        </div>
      </div>

      <div className="border-t border-richblack-700">
        <div className="mx-auto flex w-11/12 max-w-maxContent flex-col items-center justify-between gap-4 py-6 text-center text-sm text-richblack-400 lg:flex-row lg:text-left">
          <nav
            className="flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-start"
            aria-label="Legal and support"
          >
            <Link to="/contact" className="hover:text-richblack-50">
              Contact support
            </Link>
            <Link to="/privacy-policy" className="hover:text-richblack-50">
              Privacy policy
            </Link>
            <Link to="/cookie-policy" className="hover:text-richblack-50">
              Cookie policy
            </Link>
            <Link to="/terms" className="hover:text-richblack-50">
              Terms
            </Link>
            <Link to="/refund-policy" className="hover:text-richblack-50">
              Refunds &amp; cancellations
            </Link>
          </nav>
          <span>© {year} StudyNotion. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
