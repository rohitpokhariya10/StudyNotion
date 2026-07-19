import { useState } from "react"
import { VscSignOut } from "react-icons/vsc"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { sidebarLinks } from "../../../data/dashboard-links"
import { logout } from "../../../services/operations/authAPI"
import ConfirmationModal from "../../Common/ConfirmationModal"
import SidebarLink from "./SidebarLink"

const sidebarClasses =
  "h-full w-[min(85vw,280px)] shrink-0 flex-col border-r border-r-richblack-700 bg-richblack-800 py-8 md:h-[calc(100vh-3.5rem)] md:w-[220px] md:min-w-[220px] md:py-10"

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
        <div className="grid flex-1 place-items-center">
          <div className="spinner" role="status" aria-label="Loading navigation" />
        </div>
      )
    }

    return (
      <>
        <nav className="flex flex-col" aria-label="Dashboard navigation">
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
        <div className="mx-auto mb-6 mt-6 h-px w-10/12 bg-richblack-700" />
        <div className="flex flex-col">
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
            className="px-8 py-2 text-left text-sm font-medium text-richblack-300"
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
        <>
          <button
            type="button"
            className="fixed inset-x-0 bottom-0 top-14 z-30 bg-richblack-900/70 md:hidden"
            onClick={onClose}
            aria-label="Close dashboard navigation"
          />
          <aside
            id="dashboard-mobile-navigation"
            className={`${sidebarClasses} fixed bottom-0 left-0 top-14 z-40 flex shadow-2xl md:hidden`}
          >
            {renderSidebarContent()}
          </aside>
        </>
      )}

      <aside className={`${sidebarClasses} hidden md:flex`}>
        {renderSidebarContent()}
      </aside>

      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
    </>
  )
}
