import { resetCourseState } from "@/entities/course"
import {
  VscAccount,
  VscAdd,
  VscArchive,
  VscCreditCard,
  VscDashboard,
  VscHistory,
  VscMortarBoard,
  VscSettingsGear,
  VscVerified,
  VscVm,
} from "react-icons/vsc"
import { useDispatch } from "react-redux"
import { matchPath, NavLink, useLocation } from "react-router"

const SIDEBAR_ICONS = {
  VscAccount,
  VscAdd,
  VscArchive,
  VscCreditCard,
  VscDashboard,
  VscHistory,
  VscMortarBoard,
  VscSettingsGear,
  VscVerified,
  VscVm,
}

export default function SidebarLink({ link, iconName, onNavigate }) {
  const Icon = SIDEBAR_ICONS[iconName] || VscAccount
  const location = useLocation()
  const dispatch = useDispatch()

  const matchRoute = (route) => {
    return matchPath({ path: route }, location.pathname)
  }

  return (
    <NavLink
      to={link.path}
      onClick={() => {
        dispatch(resetCourseState())
        onNavigate?.()
      }}
      className={`relative mx-3 flex min-h-11 items-center rounded-xl px-5 text-sm font-medium ${
        matchRoute(link.path)
          ? "bg-brand-soft text-brand-primary"
          : "text-text-secondary hover:bg-[#f7f9fc] hover:text-text-primary"
      } transition-colors duration-150`}
    >
      <span
        className={`absolute top-3 bottom-3 left-0 w-[0.2rem] rounded-full bg-brand-primary ${
          matchRoute(link.path) ? "opacity-100" : "opacity-0"
        }`}
      ></span>
      <div className="flex items-center gap-x-2">
        {/* Icon Goes Here */}
        <Icon className="text-lg" />
        <span>{link.name}</span>
      </div>
    </NavLink>
  )
}
