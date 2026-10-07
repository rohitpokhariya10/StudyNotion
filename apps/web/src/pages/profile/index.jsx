import {
  ACCOUNT_TYPE,
  getAvatarSource,
  setInitialsAvatarOnError,
} from "@/entities/user"
import { formattedDate } from "@/shared/lib/dateFormatter"
import IconBtn from "@/shared/ui/IconBtn"
import PageIntro from "@/shared/ui/PageIntro"
import { RiEditBoxLine } from "react-icons/ri"
import { useSelector } from "react-redux"
import { Link, useNavigate } from "react-router"

export default function MyProfile() {
  const { user } = useSelector((state) => state.profile)
  const navigate = useNavigate()

  return (
    <>
      <PageIntro
        eyebrow="Your learning space"
        title="My Profile"
        description={`Welcome back, ${user?.firstName || "learner"}. Make a little room for your next big idea.`}
      />
      {user?.accountType === ACCOUNT_TYPE.STUDENT && (
        <div className="mb-7 grid gap-4 sm:grid-cols-2">
          <Link
            to="/dashboard/enrolled-courses"
            className="sn-card bg-brand-soft"
          >
            <p className="sn-eyebrow">Pick up where you left off</p>
            <h2 className="text-2xl font-bold">Continue learning →</h2>
          </Link>
          <Link to="/project-neet" className="sn-card bg-mint">
            <p className="sn-eyebrow">For your next practice session</p>
            <h2 className="text-2xl font-bold">Explore Project NEET →</h2>
          </Link>
        </div>
      )}
      <div className="sn-card flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-x-4">
          <img
            src={getAvatarSource(user)}
            onError={(event) => setInitialsAvatarOnError(event, user)}
            alt={`profile-${user?.firstName}`}
            className="aspect-square w-[78px] rounded-full object-cover"
          />
          <div className="space-y-1">
            <p className="text-lg font-semibold text-text-primary">
              {user?.firstName + " " + user?.lastName}
            </p>
            <p className="text-sm text-text-secondary">{user?.email}</p>
          </div>
        </div>
        <IconBtn
          text="Edit"
          onclick={() => {
            navigate("/dashboard/settings")
          }}
        >
          <RiEditBoxLine />
        </IconBtn>
      </div>
      <div className="sn-card my-6 flex flex-col gap-y-6">
        <div className="flex w-full items-center justify-between">
          <p className="text-lg font-semibold text-text-primary">About</p>
          <IconBtn
            text="Edit"
            onclick={() => {
              navigate("/dashboard/settings")
            }}
          >
            <RiEditBoxLine />
          </IconBtn>
        </div>
        <p
          className={`${
            user?.additionalDetails?.about
              ? "text-text-primary"
              : "text-text-secondary"
          } text-sm font-medium`}
        >
          {user?.additionalDetails?.about ?? "Write Something About Yourself"}
        </p>
      </div>
      <div className="sn-card my-6 flex flex-col gap-y-6">
        <div className="flex w-full items-center justify-between">
          <p className="text-lg font-semibold text-text-primary">
            Personal Details
          </p>
          <IconBtn
            text="Edit"
            onclick={() => {
              navigate("/dashboard/settings")
            }}
          >
            <RiEditBoxLine />
          </IconBtn>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="flex flex-col gap-y-5">
            <div>
              <p className="mb-2 text-sm text-text-secondary">First Name</p>
              <p className="text-sm font-medium break-words text-text-primary">
                {user?.firstName}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm text-text-secondary">Email</p>
              <p className="text-sm font-medium break-words text-text-primary">
                {user?.email}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm text-text-secondary">Gender</p>
              <p className="text-sm font-medium break-words text-text-primary">
                {user?.additionalDetails?.gender ?? "Add Gender"}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-y-5">
            <div>
              <p className="mb-2 text-sm text-text-secondary">Last Name</p>
              <p className="text-sm font-medium break-words text-text-primary">
                {user?.lastName}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm text-text-secondary">Phone Number</p>
              <p className="text-sm font-medium break-words text-text-primary">
                {user?.additionalDetails?.contactNumber ?? "Add Contact Number"}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm text-text-secondary">Date Of Birth</p>
              <p className="text-sm font-medium break-words text-text-primary">
                {formattedDate(user?.additionalDetails?.dateOfBirth) ??
                  "Add Date Of Birth"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
