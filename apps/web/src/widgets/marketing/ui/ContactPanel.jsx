import { ContactUsForm } from "@/features/contact-support"
import {
  legalAddress as address,
  supportEmail as email,
} from "@/shared/config/publicContact"
import BrandLogo from "@/shared/ui/BrandLogo"
import { FiMail, FiMapPin, FiMessageCircle } from "react-icons/fi"

export default function ContactPanel({ page = false }) {
  const Heading = page ? "h1" : "h2"
  return (
    <section className="sn-block">
      <div className="sn-container grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <aside className="sn-contact-identity rounded-xl bg-brand-primary p-7 text-white sm:p-10">
          <BrandLogo size="panel" />
          <p className="mt-8 text-2xl font-semibold">
            Let’s keep
            <br />
            learning connected.
          </p>
          <p className="mt-4 leading-7">
            Questions about a course, your account or a purchase? Send the
            Prahit team a message.
          </p>
          <div className="mt-10 space-y-6 text-sm">
            {email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
              <a
                className="flex items-start gap-3 break-all"
                href={`mailto:${email}`}
              >
                <FiMail className="mt-1 shrink-0" aria-hidden="true" />
                {email}
              </a>
            )}
            {address && (
              <p className="flex items-start gap-3">
                <FiMapPin className="mt-1 shrink-0" aria-hidden="true" />
                {address}
              </p>
            )}
            <p className="flex items-start gap-3">
              <FiMessageCircle className="mt-1 shrink-0" aria-hidden="true" />
              Course, account and order support
            </p>
          </div>
          <p className="mt-16 border-t border-white/30 pt-5 text-sm">
            Prahit · Made for curious learners.
          </p>
        </aside>
        <div className="min-w-0">
          <Heading className="sn-heading">
            Get in <span className="text-brand-primary">touch with us</span>
          </Heading>
          <p className="mt-3 mb-7 text-text-secondary">
            Tell us how we can help. We’ll reply to your email.
          </p>
          <ContactUsForm />
        </div>
      </div>
    </section>
  )
}
