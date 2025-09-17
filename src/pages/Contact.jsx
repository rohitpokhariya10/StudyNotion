import React from "react"

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
      <div className="relative mx-auto my-20 w-11/12 max-w-maxContent bg-richblack-900 text-white rounded-xl flex flex-col items-center justify-between gap-8 p-6">
        <h1 className="text-center text-4xl font-semibold mt-2">
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
