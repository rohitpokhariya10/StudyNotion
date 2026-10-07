import { getAvatarSource, setInitialsAvatarOnError } from "@/entities/user"
import { logout } from "@/features/authentication/api/authApi"
import useOnClickOutside from "@/shared/hooks/useOnClickOutside"
import { useEffect, useRef, useState } from "react"
import { AiOutlineCaretDown } from "react-icons/ai"
import { VscDashboard, VscSignOut } from "react-icons/vsc"
import { useDispatch, useSelector } from "react-redux"
import { Link, useNavigate } from "react-router"

export default function ProfileDropdown() {
  const { user } = useSelector((state) => state.profile)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const trigger = useRef(null)

  useOnClickOutside(ref, () => setOpen(false))

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (event.key === "Escape") {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener("keydown", close)
    return () => document.removeEventListener("keydown", close)
  }, [open])

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        ref={trigger}
        type="button"
        className="flex min-h-11 min-w-11 items-center justify-center gap-x-1"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-controls="account-links"
        aria-label="Open profile menu"
      >
        <img
          src={getAvatarSource(user)}
          alt={`profile-${user?.firstName}`}
          className="aspect-square w-[30px] rounded-full object-cover"
          onError={(event) => setInitialsAvatarOnError(event, user)}
        />
        <AiOutlineCaretDown className="text-sm text-text-secondary" />
      </button>
      {open && (
        <div
          className="absolute top-[118%] right-0 z-[1000] divide-y-[1px] divide-border-default overflow-hidden rounded-md border-[1px] border-border-default bg-surface-secondary"
          id="account-links"
          aria-label="Account links"
        >
          <Link
            to="/dashboard/my-profile"
            onClick={() => setOpen(false)}
            className="flex min-h-11 w-full items-center gap-x-1 px-4 py-3 text-sm text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
          >
            <VscDashboard className="text-lg" />
            Dashboard
          </Link>
          <Link
            to="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center px-4 py-3 text-sm text-text-secondary hover:bg-surface-elevated"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={() => {
              dispatch(logout(navigate))
              setOpen(false)
            }}
            className="flex min-h-11 w-full items-center gap-x-1 px-4 py-3 text-sm text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
          >
            <VscSignOut className="text-lg" />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
