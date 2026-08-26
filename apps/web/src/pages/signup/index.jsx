import { Template } from "@/features/authentication"
import signupImg from "@/shared/assets/Images/signup.webp"

function Signup() {
  return (
    <Template
      title="Build practical skills with StudyNotion"
      description1="Build skills for today, tomorrow, and beyond."
      description2="Education to future-proof your career."
      image={signupImg}
      formType="signup"
    />
  )
}

export default Signup
