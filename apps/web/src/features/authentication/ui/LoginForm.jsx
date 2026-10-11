import { login } from "@/features/authentication/api/authApi"
import { sanitizeInternalRedirect } from "@/shared/lib/routing/internalRedirect"
import { usePrivateField } from "@/shared/ui/auth-scene"
import { useId, useState } from "react"
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"
import { useDispatch } from "react-redux"
import { Link, useLocation, useNavigate } from "react-router"

function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const id = useId()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const [showPassword, setShowPassword] = useState(false)
  const passwordPrivacy = usePrivateField(showPassword)

  const { email, password } = formData

  const handleOnChange = (e) => {
    setFormData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }))
  }

  const handleOnSubmit = (e) => {
    e.preventDefault()
    const postLoginPath = sanitizeInternalRedirect(location.state?.from)
    dispatch(login(email, password, navigate, postLoginPath))
  }

  return (
    <form onSubmit={handleOnSubmit} className="sn-auth-form">
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
      <div className="sn-auth-field">
        <label className="sn-auth-label" htmlFor={`${id}-password`}>
          Password
        </label>
        <div className="sn-auth-password">
          <input
            id={`${id}-password`}
            required
            type={showPassword ? "text" : "password"}
            name="password"
            maxLength={72}
            autoComplete="current-password"
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
      <div className="sn-auth-options">
        <Link to="/forgot-password" className="sn-auth-link">
          Forgot password?
        </Link>
      </div>
      <button type="submit" className="sn-auth-submit">
        Sign In
      </button>
    </form>
  )
}

export default LoginForm
