import { Template } from "@/features/authentication"

function Login() {
  return (
    <Template
      title="Welcome back"
      description="Enter your email and password to access your account."
      formType="login"
    />
  )
}

export default Login
