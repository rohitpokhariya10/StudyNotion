import { DeleteAccount, UpdatePassword } from "@/features/authentication"
import { ChangeProfilePicture, EditProfile } from "@/features/profile-settings"
import PageIntro from "@/shared/ui/PageIntro"
import { useSelector } from "react-redux"

export default function Settings() {
  const { user } = useSelector((state) => state.profile)
  const providers = Array.isArray(user?.authProviders)
    ? user.authProviders
    : ["local"]

  if (user?.deletionPending) {
    return (
      <>
        <h1 className="mb-4 text-3xl font-medium text-text-primary">
          Complete account deletion
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-text-secondary">
          A previous deletion attempt did not finish. Your account is restricted
          while cleanup is pending. Re-authenticate below to retry safely, or
          contact support if the provider remains unavailable.
        </p>
        <DeleteAccount recoveryMode />
      </>
    )
  }

  return (
    <>
      <PageIntro
        eyebrow="Make yourself at home"
        title="Edit Profile"
        description="Your profile, password, and account security. All in one place."
      />
      {/* Change Profile Picture */}
      <ChangeProfilePicture />
      {/* Profile */}
      <EditProfile />
      {/* Password */}
      {providers.includes("local") && <UpdatePassword />}
      {/* Delete Account */}
      <DeleteAccount />
    </>
  )
}
