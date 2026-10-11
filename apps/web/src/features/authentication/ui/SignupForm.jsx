import { ACCOUNT_TYPE, setSignupData } from "@/entities/user"
import { sendOtp } from "@/features/authentication/api/authApi"
import PolicyAcknowledgement from "@/features/authentication/ui/PolicyAcknowledgement"
import Tab from "@/features/authentication/ui/Tab"
import { usePrivateField } from "@/shared/ui/auth-scene"
import { useId, useState } from "react"
import { toast } from "react-hot-toast"
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"
import { useDispatch } from "react-redux"
import { useLocation, useNavigate } from "react-router"

function SignupForm({ policyAcknowledgement, setPolicyAcknowledgement }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const id = useId()
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
  // Both password fields close the mascot's eyes while focused or shown.
  const passwordPrivacy = usePrivateField(showPassword)
  const confirmPrivacy = usePrivateField(showConfirmPassword)

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
      <Tab tabData={tabData} field={accountType} setField={setAccountType} />
      <form onSubmit={handleOnSubmit} className="sn-auth-form">
        <div className="sn-auth-row">
          <div className="sn-auth-field">
            <label className="sn-auth-label" htmlFor={`${id}-first`}>
              First name
            </label>
            <input
              id={`${id}-first`}
              required
              type="text"
              name="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={handleOnChange}
              placeholder="Enter first name"
              className="sn-auth-input"
            />
          </div>
          <div className="sn-auth-field">
            <label className="sn-auth-label" htmlFor={`${id}-last`}>
              Last name
            </label>
            <input
              id={`${id}-last`}
              required
              type="text"
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={handleOnChange}
              placeholder="Enter last name"
              className="sn-auth-input"
            />
          </div>
        </div>
        <div className="sn-auth-field">
          <label className="sn-auth-label" htmlFor={`${id}-email`}>
            Email address
          </label>
          <input
            id={`${id}-email`}
            required
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={handleOnChange}
            placeholder="Enter email address"
            className="sn-auth-input"
          />
        </div>
        <div className="sn-auth-row">
          <div className="sn-auth-field">
            <label className="sn-auth-label" htmlFor={`${id}-password`}>
              Create password
            </label>
            <div className="sn-auth-password">
              <input
                id={`${id}-password`}
                required
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}"
                title="Use 8 to 72 characters including uppercase, lowercase, and a number"
                aria-describedby={`${id}-password-rule`}
                value={password}
                onChange={handleOnChange}
                {...passwordPrivacy}
                placeholder="Enter Password"
                className="sn-auth-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="sn-auth-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <AiOutlineEyeInvisible aria-hidden="true" fontSize={20} />
                ) : (
                  <AiOutlineEye aria-hidden="true" fontSize={20} />
                )}
              </button>
            </div>
          </div>
          <div className="sn-auth-field">
            <label className="sn-auth-label" htmlFor={`${id}-confirm`}>
              Confirm password
            </label>
            <div className="sn-auth-password">
              <input
                id={`${id}-confirm`}
                required
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                value={confirmPassword}
                onChange={handleOnChange}
                {...confirmPrivacy}
                placeholder="Confirm Password"
                className="sn-auth-input"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="sn-auth-toggle"
                aria-label={
                  showConfirmPassword
                    ? "Hide password confirmation"
                    : "Show password confirmation"
                }
                aria-pressed={showConfirmPassword}
              >
                {showConfirmPassword ? (
                  <AiOutlineEyeInvisible aria-hidden="true" fontSize={20} />
                ) : (
                  <AiOutlineEye aria-hidden="true" fontSize={20} />
                )}
              </button>
            </div>
          </div>
        </div>
        <p id={`${id}-password-rule`} className="sn-auth-hint">
          Use 8 to 72 characters with an uppercase letter, a lowercase letter
          and a number.
        </p>
        <PolicyAcknowledgement
          idPrefix="email-signup-policy"
          value={policyAcknowledgement}
          onChange={setPolicyAcknowledgement}
        />
        <button type="submit" className="sn-auth-submit">
          Create Account
        </button>
      </form>
    </div>
  )
}

export default SignupForm
