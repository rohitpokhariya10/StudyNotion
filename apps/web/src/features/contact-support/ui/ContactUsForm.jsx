import { sendContactMessage } from "@/features/contact-support/api/contactSupportApi"
import CountryCode from "@/shared/config/countrycode.json"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"

const ContactUsForm = () => {
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  const submitContactForm = async (data) => {
    setLoading(true)
    try {
      const response = await sendContactMessage(data)
      toast.success(response.message || "Message sent successfully")
      reset()
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Your message could not be sent"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      className="flex min-w-0 flex-col gap-6"
      aria-busy={loading}
      onSubmit={handleSubmit(submitContactForm)}
    >
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="flex min-w-0 flex-col gap-2 lg:w-[48%]">
          <label htmlFor="firstname" className="lable-style">
            First Name
          </label>
          <input
            type="text"
            name="firstname"
            id="firstname"
            placeholder="Enter first name"
            className="form-style w-full min-w-0"
            {...register("firstname", { required: true })}
          />
          {errors.firstname && (
            <span className="-mt-1 text-[12px] text-brand-primary">
              Please enter your name.
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2 lg:w-[48%]">
          <label htmlFor="lastname" className="lable-style">
            Last Name
          </label>
          <input
            type="text"
            name="lastname"
            id="lastname"
            placeholder="Enter last name"
            className="form-style w-full min-w-0"
            {...register("lastname")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="lable-style">
          Email Address
        </label>
        <input
          type="email"
          name="email"
          id="email"
          placeholder="Enter email address"
          className="form-style w-full min-w-0"
          {...register("email", { required: true })}
        />
        {errors.email && (
          <span className="-mt-1 text-[12px] text-brand-primary">
            Please enter your Email address.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="phonenumber" className="lable-style">
          Phone Number
        </label>

        <div className="flex gap-3">
          <div className="flex w-[90px] shrink-0 flex-col gap-2">
            <select
              id="countrycode"
              aria-label="Country calling code"
              className="form-style w-full min-w-0"
              {...register("countrycode", { required: true })}
            >
              {CountryCode.map((ele, i) => {
                return (
                  <option key={i} value={ele.code}>
                    {ele.code} -{ele.country}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              type="tel"
              inputMode="numeric"
              name="phonenumber"
              id="phonenumber"
              placeholder="12345 67890"
              className="form-style w-full min-w-0"
              {...register("phoneNo", {
                required: {
                  value: true,
                  message: "Please enter your Phone Number.",
                },
                maxLength: { value: 12, message: "Invalid Phone Number" },
                minLength: { value: 10, message: "Invalid Phone Number" },
                pattern: {
                  value: /^\d+$/,
                  message: "Use digits only",
                },
              })}
            />
          </div>
        </div>
        {errors.phoneNo && (
          <span className="-mt-1 text-[12px] text-brand-primary">
            {errors.phoneNo.message}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="lable-style">
          Message
        </label>
        <textarea
          name="message"
          id="message"
          cols="30"
          rows="7"
          placeholder="Enter your message here"
          className="form-style w-full min-w-0"
          {...register("message", { required: true })}
        />
        {errors.message && (
          <span className="-mt-1 text-[12px] text-brand-primary">
            Please enter your Message.
          </span>
        )}
      </div>

      <button
        disabled={loading}
        type="submit"
        className="sn-btn sn-btn-primary w-full"
      >
        {loading ? "Sending..." : "Send Message"}
      </button>
    </form>
  )
}

export default ContactUsForm
