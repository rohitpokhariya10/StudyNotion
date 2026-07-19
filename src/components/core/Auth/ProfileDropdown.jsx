import { useRef, useState } from "react"
import { AiOutlineCaretDown } from "react-icons/ai"
import { VscDashboard, VscSignOut } from "react-icons/vsc"
import { useDispatch, useSelector } from "react-redux"
import { Link, useNavigate } from "react-router-dom"

import useOnClickOutside from "../../../hooks/useOnClickOutside"
import { logout } from "../../../services/operations/authAPI"
import {
  getAvatarSource,
  setInitialsAvatarOnError,
} from "../../../utils/avatar"

export default function ProfileDropdown() {
  const { user } = useSelector((state) => state.profile)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useOnClickOutside(ref, () => setOpen(false))

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-x-1"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open profile menu"
      >
        <img
          src={getAvatarSource(user)}
          alt={`profile-${user?.firstName}`}
          className="aspect-square w-[30px] rounded-full object-cover"
          onError={(event) => setInitialsAvatarOnError(event, user)}
        />
        <AiOutlineCaretDown className="text-sm text-richblack-100" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-[118%] z-[1000] divide-y-[1px] divide-richblack-700 overflow-hidden rounded-md border-[1px] border-richblack-700 bg-richblack-800"
          role="menu"
        >
          <Link
            to="/dashboard/my-profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-x-1 px-[12px] py-[10px] text-sm text-richblack-100 hover:bg-richblack-700 hover:text-richblack-25"
            role="menuitem"
          >
            <VscDashboard className="text-lg" />
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => {
              dispatch(logout(navigate))
              setOpen(false)
            }}
            className="flex w-full items-center gap-x-1 px-[12px] py-[10px] text-sm text-richblack-100 hover:bg-richblack-700 hover:text-richblack-25"
            role="menuitem"
          >
            <VscSignOut className="text-lg" />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
