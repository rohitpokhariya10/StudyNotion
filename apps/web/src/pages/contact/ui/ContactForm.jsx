import { ContactUsForm } from "@/features/contact-support"

const ContactForm = () => {
  return (
    <div className="sn-card flex flex-col gap-3 text-text-secondary">
      <h1 className="text-4xl leading-10 font-semibold text-text-primary">
        Let’s talk learning.
      </h1>
      <p className="">
        Tell us what’s on your mind. We’re here to help with your Prahit
        journey.
      </p>

      <div className="mt-7">
        <ContactUsForm />
      </div>
    </div>
  )
}

export default ContactForm
