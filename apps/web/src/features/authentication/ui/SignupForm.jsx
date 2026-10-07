import { ACCOUNT_TYPE, setSignupData } from "@/entities/user"
import { sendOtp } from "@/features/authentication/api/authApi"
import PolicyAcknowledgement from "@/features/authentication/ui/PolicyAcknowledgement"
import Tab from "@/features/authentication/ui/Tab"
import { useState } from "react"
import { toast } from "react-hot-toast"
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"
import { useDispatch } from "react-redux"
import { useLocation, useNavigate } from "react-router"

function SignupForm({ policyAcknowledgement, setPolicyAcknowledgement }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  // An email typed into the footer sign-up strip is carried over as a
  // convenience only; the form's normal validation still applies.
  const { state } = useLocation()
  const prefillEmail =
    typeof state?.email === "string" &&
    state.email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)
      ? state.email
      : ""

  // student or instructor
  const [accountType, setAccountType] = useState(ACCOUNT_TYPE.STUDENT)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: prefillEmail,
    password: "",
    confirmPassword: "",
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { firstName, lastName, email, password, confirmPassword } = formData

  // Handle input fields, when some value changes
  const handleOnChange = (e) => {
    setFormData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }))
  }

  // Handle Form Submission
  const handleOnSubmit = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Passwords Do Not Match")
      return
    }
    const signupData = {
      ...formData,
      accountType,
      ...policyAcknowledgement,
    }

    // Setting signup data to state
    // To be used after otp verification
    dispatch(setSignupData(signupData))
    // Send OTP to user for verification
    const sent = await dispatch(sendOtp(formData.email, navigate))
    if (!sent) dispatch(setSignupData(null))
  }

  // data to pass to Tab component
  const tabData = [
    {
      id: 1,
      tabName: "Student",
      type: ACCOUNT_TYPE.STUDENT,
    },
    {
      id: 2,
      tabName: "Instructor",
      type: ACCOUNT_TYPE.INSTRUCTOR,
    },
  ]

  return (
    <div>
      {/* Tab */}
      <Tab tabData={tabData} field={accountType} setField={setAccountType} />
      {/* Form */}
      <form onSubmit={handleOnSubmit} className="flex w-full flex-col gap-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <p className="mb-1 text-[0.875rem] leading-[1.375rem] text-text-primary">
              First Name <sup className="text-danger">*</sup>
            </p>
            <input
              required
              type="text"
              name="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={handleOnChange}
              placeholder="Enter first name"
              className="form-style w-full"
            />
          </label>
          <label>
            <p className="mb-1 text-[0.875rem] leading-[1.375rem] text-text-primary">
              Last Name <sup className="text-danger">*</sup>
            </p>
            <input
              required
              type="text"
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={handleOnChange}
              placeholder="Enter last name"
              className="form-style w-full"
            />
          </label>
        </div>
        <label className="w-full">
          <p className="mb-1 text-[0.875rem] leading-[1.375rem] text-text-primary">
            Email Address <sup className="text-danger">*</sup>
          </p>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={handleOnChange}
            placeholder="Enter email address"
            className="form-style w-full"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="relative">
            <p className="mb-1 text-[0.875rem] leading-[1.375rem] text-text-primary">
              Create Password <sup className="text-danger">*</sup>
            </p>
            <input
              required
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}"
              title="Use 8 to 72 characters including uppercase, lowercase, and a number"
              value={password}
              onChange={handleOnChange}
              placeholder="Enter Password"
              className="form-style w-full pr-10!"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute top-[38px] right-3 z-[10] cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <AiOutlineEyeInvisible fontSize={24} fill="#AFB2BF" />
              ) : (
                <AiOutlineEye fontSize={24} fill="#AFB2BF" />
              )}
            </button>
          </label>
          <label className="relative">
            <p className="mb-1 text-[0.875rem] leading-[1.375rem] text-text-primary">
              Confirm Password <sup className="text-danger">*</sup>
            </p>
            <input
              required
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={confirmPassword}
              onChange={handleOnChange}
              placeholder="Confirm Password"
              className="form-style w-full pr-10!"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute top-[38px] right-3 z-[10] cursor-pointer"
              aria-label={
                showConfirmPassword
                  ? "Hide password confirmation"
                  : "Show password confirmation"
              }
              aria-pressed={showConfirmPassword}
            >
              {showConfirmPassword ? (
                <AiOutlineEyeInvisible fontSize={24} fill="#AFB2BF" />
              ) : (
                <AiOutlineEye fontSize={24} fill="#AFB2BF" />
              )}
            </button>
          </label>
        </div>
        <PolicyAcknowledgement
          idPrefix="email-signup-policy"
          value={policyAcknowledgement}
          onChange={setPolicyAcknowledgement}
        />
        <button
          type="submit"
          className="mt-6 rounded-[8px] bg-brand-primary px-[12px] py-[8px] font-medium text-white"
        >
          Create Account
        </button>
      </form>
    </div>
  )
}

export default SignupForm
