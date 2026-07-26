import ContactUsForm from "../ContactUsPage/ContactUsForm"

const ContactFormSection = () => {
  return (
    <div className="mx-auto">
      <h1 className="text-center text-4xl font-semibold">Get in Touch</h1>
      <p className="mt-3 text-center text-richblack-300">
        We&apos;d love to here for you, Please fill out this form.
      </p>
      <div className="mx-auto mt-12">
        <ContactUsForm />
      </div>
    </div>
  )
}

export default ContactFormSection
