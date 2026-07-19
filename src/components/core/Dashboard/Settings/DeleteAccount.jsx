import { useState } from "react"
import { FiTrash2 } from "react-icons/fi"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { deleteProfile } from "../../../../services/operations/SettingsAPI"
import GoogleReauthenticationButton from "../../Auth/GoogleReauthenticationButton"

export default function DeleteAccount({ recoveryMode = false }) {
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [formOpen, setFormOpen] = useState(recoveryMode)
  const [confirmationEmail, setConfirmationEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [deleting, setDeleting] = useState(false)

  const providers = Array.isArray(user?.authProviders)
    ? user.authProviders
    : ["local"]
  const usesLocalPassword = providers.includes("local")
  const usesGoogleOnly =
    !usesLocalPassword && providers.includes("google")
  const normalizedEmail = confirmationEmail.trim().toLowerCase()
  const emailMatches = normalizedEmail === user?.email?.trim().toLowerCase()

  const submitDeletion = async (reauthentication) => {
    if (!emailMatches || deleting) return
    setDeleting(true)
    const deleted = await dispatch(
      deleteProfile(token, navigate, {
        confirmationEmail: normalizedEmail,
        ...reauthentication,
      })
    )
    if (!deleted) setDeleting(false)
  }

  const handlePasswordDeletion = (event) => {
    event.preventDefault()
    if (!currentPassword) return
    void submitDeletion({ currentPassword })
  }

  return (
    <section className="my-10 rounded-md border border-pink-700 bg-pink-900 p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pink-700">
          <FiTrash2 className="text-3xl text-pink-200" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-richblack-5">
            Delete account
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-pink-25">
            {recoveryMode
              ? "Account deletion is pending. Retrying continues the same idempotent cleanup; it does not create a second deletion operation."
              : "Account deletion is permanent. Your profile is deactivated and personal data is removed where retention is not required. Instructors must archive or transfer their courses first. Administrator accounts require support-assisted ownership transfer and cannot self-delete."}
          </p>

          {!formOpen ? (
            <button
              type="button"
              className="mt-4 w-fit font-medium text-pink-200 underline underline-offset-4"
              onClick={() => setFormOpen(true)}
            >
              Start account deletion
            </button>
          ) : (
            <form
              className="mt-5 max-w-xl space-y-4"
              onSubmit={handlePasswordDeletion}
            >
              <div>
                <label
                  htmlFor="deleteConfirmationEmail"
                  className="mb-2 block text-sm text-richblack-50"
                >
                  Type your account email to confirm
                </label>
                <input
                  id="deleteConfirmationEmail"
                  type="email"
                  value={confirmationEmail}
                  onChange={(event) => setConfirmationEmail(event.target.value)}
                  className="form-style w-full"
                  placeholder={user?.email || "you@example.com"}
                  autoComplete="off"
                  spellCheck="false"
                  disabled={deleting}
                  required
                />
                {confirmationEmail && !emailMatches && (
                  <p className="mt-1 text-xs text-pink-100">
                    This must exactly match your signed-in email address.
                  </p>
                )}
              </div>

              {usesLocalPassword ? (
                <div>
                  <label
                    htmlFor="deleteCurrentPassword"
                    className="mb-2 block text-sm text-richblack-50"
                  >
                    Current password
                  </label>
                  <input
                    id="deleteCurrentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="form-style w-full"
                    autoComplete="current-password"
                    maxLength={128}
                    disabled={deleting}
                    required
                  />
                </div>
              ) : usesGoogleOnly ? (
                <div>
                  <p className="mb-3 text-sm text-richblack-50">
                    Complete a fresh Google sign-in to authorize deletion. The
                    account is unchanged unless Google verification succeeds.
                  </p>
                  <GoogleReauthenticationButton
                    disabled={!emailMatches || deleting}
                    onCredential={(googleCredential) =>
                      void submitDeletion({ googleCredential })
                    }
                  />
                </div>
              ) : (
                <p className="text-sm text-pink-100" role="alert">
                  This account has no supported re-authentication method. Contact
                  support; no account changes have been made.
                </p>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                {usesLocalPassword && (
                  <button
                    type="submit"
                    disabled={!emailMatches || !currentPassword || deleting}
                    className="rounded-md bg-pink-600 px-5 py-2 font-semibold text-richblack-5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Permanently delete account"}
                  </button>
                )}
                {!recoveryMode && (
                  <button
                    type="button"
                    disabled={deleting}
                    className="rounded-md bg-richblack-700 px-5 py-2 font-semibold text-richblack-50 disabled:opacity-50"
                    onClick={() => {
                      setFormOpen(false)
                      setConfirmationEmail("")
                      setCurrentPassword("")
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
