import { useSelector } from "react-redux"

import ChangeProfilePicture from "./ChangeProfilePicture"
import DeleteAccount from "./DeleteAccount"
import EditProfile from "./EditProfile"
import UpdatePassword from "./UpdatePassword"

export default function Settings() {
  const { user } = useSelector((state) => state.profile)
  const providers = Array.isArray(user?.authProviders)
    ? user.authProviders
    : ["local"]

  if (user?.deletionPending) {
    return (
      <>
        <h1 className="mb-4 text-3xl font-medium text-richblack-5">
          Complete account deletion
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-richblack-200">
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
      <h1 className="mb-14 text-3xl font-medium text-richblack-5">
        Edit Profile
      </h1>
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
