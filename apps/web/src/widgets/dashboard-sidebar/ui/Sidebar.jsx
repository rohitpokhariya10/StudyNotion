import { getAvatarSource, setInitialsAvatarOnError } from "@/entities/user"
import { logout } from "@/features/authentication"
import AccessibleDialog from "@/shared/ui/AccessibleDialog"
import ConfirmationModal from "@/shared/ui/ConfirmationModal"
import FlaskLoader from "@/shared/ui/FlaskLoader"
import { sidebarLinks } from "@/widgets/dashboard-sidebar/model/links"
import SidebarLink from "@/widgets/dashboard-sidebar/ui/SidebarLink"
import { useState } from "react"
import { VscSignOut } from "react-icons/vsc"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router"

const sidebarClasses =
  "h-full w-[min(85vw,280px)] shrink-0 flex-col border-r border-r-border-default bg-white py-6 md:min-h-[calc(100dvh-var(--sn-header-height))] md:w-[256px] md:min-w-[256px] md:py-8"

const ROLE_LABELS = {
  Admin: "Administrator",
  Instructor: "Instructor",
  Student: "Learner",
}

export default function Sidebar({ mobileOpen = false, onClose }) {
  const { user, loading: profileLoading } = useSelector(
    (state) => state.profile
  )
  const { loading: authLoading } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [confirmationModal, setConfirmationModal] = useState(null)

  const renderSidebarContent = () => {
    if (profileLoading || authLoading) {
      return (
        <div className="grid flex-1 place-items-center" aria-busy="true">
          <FlaskLoader accessibleLabel="Loading navigation" />
        </div>
      )
    }

    return (
      <>
        {user && (
          <div className="mx-4 mb-6 flex items-center gap-3 rounded-2xl border border-border-default bg-brand-soft p-3">
            <img
              src={getAvatarSource(user)}
              alt=""
              onError={(event) => setInitialsAvatarOnError(event, user)}
              className="h-11 w-11 flex-none rounded-full object-cover ring-2 ring-white"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                  "Your account"}
              </p>
              <p className="text-xs text-text-secondary">
                {ROLE_LABELS[user.accountType] || "Member"}
              </p>
            </div>
          </div>
        )}
        <p className="mb-2 px-6 text-xs font-semibold tracking-[0.12em] text-text-secondary uppercase">
          Workspace
        </p>
        <nav className="flex flex-col gap-1" aria-label="Dashboard navigation">
          {sidebarLinks.map((link) => {
            if (link.type && user?.accountType !== link.type) return null
            return (
              <SidebarLink
                key={link.id}
                link={link}
                iconName={link.icon}
                onNavigate={onClose}
              />
            )
          })}
        </nav>
        <div className="mx-auto mt-6 mb-4 h-px w-10/12 bg-border-default" />
        <p className="mb-2 px-6 text-xs font-semibold tracking-[0.12em] text-text-secondary uppercase">
          Account
        </p>
        <div className="flex flex-col gap-1">
          <SidebarLink
            link={{ name: "Settings", path: "/dashboard/settings" }}
            iconName="VscSettingsGear"
            onNavigate={onClose}
          />
          <button
            type="button"
            onClick={() =>
              setConfirmationModal({
                text1: "Are you sure?",
                text2: "You will be logged out of your account.",
                btn1Text: "Logout",
                btn2Text: "Cancel",
                btn1Handler: () => dispatch(logout(navigate)),
                btn2Handler: () => setConfirmationModal(null),
              })
            }
            className="mx-3 flex min-h-11 items-center rounded-xl px-5 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-brand-soft hover:text-danger"
          >
            <span className="flex items-center gap-x-2">
              <VscSignOut className="text-lg" aria-hidden="true" />
              <span>Logout</span>
            </span>
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {mobileOpen && (
        <AccessibleDialog
          title="Your workspace"
          titleClassName="sr-only"
          onClose={onClose}
          overlayClassName="bg-black/30 p-0! place-items-start! md:hidden"
          className={`${sidebarClasses} flex max-h-dvh min-h-dvh overflow-y-auto shadow-2xl`}
        >
          <div id="dashboard-mobile-navigation">
            <button
              type="button"
              className="sn-btn sn-btn-ghost mx-3 mb-5"
              onClick={onClose}
              aria-label="Close dashboard navigation"
            >
              ← Close menu
            </button>
            {renderSidebarContent()}
          </div>
        </AccessibleDialog>
      )}

      <aside
        className={`${sidebarClasses} hidden md:flex md:h-auto md:self-stretch`}
      >
        {renderSidebarContent()}
      </aside>

      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </>
  )
}
