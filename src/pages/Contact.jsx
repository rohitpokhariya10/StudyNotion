import Footer from "../components/Common/Footer"
import ReviewSlider from "../components/Common/ReviewSlider"
import ContactDetails from "../components/core/ContactUsPage/ContactDetails"
import ContactForm from "../components/core/ContactUsPage/ContactForm"

const Contact = () => {
  return (
    <div>
      {/* Contact details + form section */}
      <div className="mx-auto mt-20 flex w-11/12 max-w-maxContent flex-col justify-between gap-10 text-white lg:flex-row">
        {/* Contact Details */}
        <div className="lg:w-[40%]">
          <ContactDetails />
        </div>

        {/* Contact Form */}
        <div className="lg:w-[60%]">
          <ContactForm />
        </div>
      </div>

      {/* ✅ Reviews Section (same as Home/AboutUs) */}
      <div className="relative mx-auto my-20 flex w-11/12 max-w-maxContent flex-col items-center justify-between gap-8 rounded-xl bg-richblack-900 p-6 text-white">
        <h1 className="mt-2 text-center text-4xl font-semibold">
          Reviews from other learners
        </h1>
        <div className="mt-8 w-full">
          <ReviewSlider />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default Contact
