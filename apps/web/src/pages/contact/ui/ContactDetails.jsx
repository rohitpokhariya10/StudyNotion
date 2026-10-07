import { legalAddress, supportEmail } from "@/shared/config/publicContact"
import { BiWorld } from "react-icons/bi"
import { HiChatBubbleLeftRight } from "react-icons/hi2"

const contactDetails = [
  {
    icon: HiChatBubbleLeftRight,
    heading: "Email support",
    description: "Account, enrollment, payment, and course help.",
    details: supportEmail || "Use the contact form for support.",
    href: supportEmail ? `mailto:${supportEmail}` : undefined,
  },
  {
    icon: BiWorld,
    heading: "Registered office",
    description: "Business and legal correspondence address.",
    details: legalAddress || "Address not configured.",
  },
]

const ContactDetails = () => (
  <div className="flex flex-col gap-6 rounded-xl bg-surface-secondary p-4 lg:p-6">
    {contactDetails.map(
      ({ description, details, heading, href, icon: Icon }) => (
        <div
          className="flex flex-col gap-1 p-3 text-sm text-text-secondary"
          key={heading}
        >
          <div className="flex flex-row items-center gap-3">
            <Icon size={25} aria-hidden="true" />
            <h2 className="text-lg font-semibold text-text-primary">
              {heading}
            </h2>
          </div>
          <p className="font-medium">{description}</p>
          {href ? (
            <a
              className="font-semibold break-all text-brand-primary hover:text-brand-primary"
              href={href}
            >
              {details}
            </a>
          ) : (
            <p className="font-semibold">{details}</p>
          )}
        </div>
      )
    )}
  </div>
)

export default ContactDetails
