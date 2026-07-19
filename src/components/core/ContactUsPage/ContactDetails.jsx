import { BiWorld } from "react-icons/bi"
import { HiChatBubbleLeftRight } from "react-icons/hi2"

const configuredSupportEmail = import.meta.env.VITE_SUPPORT_EMAIL?.trim()
const supportEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
  configuredSupportEmail || ""
)
  ? configuredSupportEmail
  : "support@studynotion.local"
const legalAddress =
  import.meta.env.VITE_LEGAL_ADDRESS || "Not configured for local development"

const contactDetails = [
  {
    icon: HiChatBubbleLeftRight,
    heading: "Email support",
    description: "Account, enrollment, payment, and course help.",
    details: supportEmail,
    href: `mailto:${supportEmail}`,
  },
  {
    icon: BiWorld,
    heading: "Registered office",
    description: "Business and legal correspondence address.",
    details: legalAddress,
  },
]

const ContactDetails = () => (
  <div className="flex flex-col gap-6 rounded-xl bg-richblack-800 p-4 lg:p-6">
    {contactDetails.map(({ description, details, heading, href, icon: Icon }) => (
      <div
        className="flex flex-col gap-1 p-3 text-sm text-richblack-200"
        key={heading}
      >
        <div className="flex flex-row items-center gap-3">
          <Icon size={25} aria-hidden="true" />
          <h2 className="text-lg font-semibold text-richblack-5">{heading}</h2>
        </div>
        <p className="font-medium">{description}</p>
        {href ? (
          <a
            className="break-all font-semibold text-yellow-50 hover:text-yellow-100"
            href={href}
          >
            {details}
          </a>
        ) : (
          <p className="font-semibold">{details}</p>
        )}
      </div>
    ))}
  </div>
)

export default ContactDetails
