import { ContactUsForm } from "@/features/contact-support"
import { legalAddress, supportEmail } from "@/shared/config/publicContact"
import BrandLogo from "@/shared/ui/BrandLogo"
import { MarkerUnderline } from "@/shared/ui/illustrations/Doodles"
import { FiMail, FiMapPin, FiMessageCircle } from "react-icons/fi"

// Contact block: brand card on a blue panel beside the real contact form.
// Only configured contact details are shown — nothing is invented.
function SupportCard() {
  return (
    <div className="flex items-center justify-center rounded-md bg-brand-primary px-6 py-10 sm:px-16 sm:py-16">
      <div className="w-full max-w-80 rounded-lg bg-white px-8 py-8 text-sm">
        <div className="flex justify-center">
          <BrandLogo size="panel" />
        </div>
        <ul className="mt-8 space-y-4">
          {supportEmail && (
            <li className="flex items-start gap-3">
              <FiMail aria-hidden="true" className="mt-0.5 flex-none text-lg" />
              <a
                href={`mailto:${supportEmail}`}
                className="break-all hover:text-brand-primary"
              >
                {supportEmail}
              </a>
            </li>
          )}
          <li className="flex items-start gap-3">
            <FiMessageCircle
              aria-hidden="true"
              className="mt-0.5 flex-none text-lg"
            />
            <span>Use the form and we’ll reply by email.</span>
          </li>
          {legalAddress && (
            <li className="flex items-start gap-3">
              <FiMapPin
                aria-hidden="true"
                className="mt-0.5 flex-none text-lg"
              />
              <span>{legalAddress}</span>
            </li>
          )}
        </ul>
        <p className="mt-8 text-center text-xs">
          © {new Date().getFullYear()} Prahit
        </p>
      </div>
    </div>
  )
}

export default function ContactSection() {
  return (
    <section className="sn-block" aria-labelledby="contact-title">
      <div className="sn-container grid items-center gap-12 lg:grid-cols-[37rem_minmax(0,1fr)] lg:gap-24">
        <div className="order-last lg:order-first">
          <SupportCard />
        </div>
        <div className="mx-auto w-full max-w-[25rem]">
          <div className="text-center">
            <h2 id="contact-title" className="sn-heading text-brand-primary">
              Get in touch with us
            </h2>
            <MarkerUnderline className="mx-auto mt-4 w-[23.5rem] max-w-full" />
            <p className="mt-6 text-base leading-6">
              Write us a message and we’ll get back to you by email.
            </p>
          </div>
          <div className="mt-6">
            <ContactUsForm />
          </div>
        </div>
      </div>
    </section>
  )
}
