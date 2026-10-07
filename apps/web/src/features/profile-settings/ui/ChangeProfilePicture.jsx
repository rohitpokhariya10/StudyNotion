import { getAvatarSource, setInitialsAvatarOnError } from "@/entities/user"
import { updateDisplayPicture } from "@/features/profile-settings/api/profileSettingsApi"
import IconBtn from "@/shared/ui/IconBtn"
import { useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { FiUpload } from "react-icons/fi"
import { useDispatch, useSelector } from "react-redux"

const ALLOWED_PROFILE_IMAGE_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
])
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024

export default function ChangeProfilePicture() {
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)
  const dispatch = useDispatch()

  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [previewSource, setPreviewSource] = useState(null)

  const fileInputRef = useRef(null)

  const handleClick = () => {
    fileInputRef.current.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!ALLOWED_PROFILE_IMAGE_TYPES.has(file.type)) {
        toast.error("Choose a JPEG, PNG, WebP, or AVIF image")
        e.target.value = ""
        return
      }
      if (file.size > MAX_PROFILE_IMAGE_BYTES) {
        toast.error("Profile images must be 5 MB or smaller")
        e.target.value = ""
        return
      }
      setImageFile(file)
    }
  }

  const previewFile = (file) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {
      setPreviewSource(reader.result)
    }
  }

  const handleFileUpload = async () => {
    if (!imageFile || loading) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("displayPicture", imageFile)
      await dispatch(updateDisplayPicture(token, formData))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (imageFile) {
      previewFile(imageFile)
    }
  }, [imageFile])
  return (
    <>
      <div className="flex items-center justify-between rounded-md border-[1px] border-border-default bg-surface-secondary p-5 text-text-primary sm:p-8">
        <div className="flex items-center gap-x-4">
          <img
            src={previewSource || getAvatarSource(user)}
            alt={`profile-${user?.firstName}`}
            className="aspect-square w-[78px] rounded-full object-cover"
            onError={(event) => setInitialsAvatarOnError(event, user)}
          />
          <div className="space-y-2">
            <p>Change Profile Picture</p>
            <div className="flex flex-row gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/avif,image/jpeg,image/png,image/webp"
              />
              <button
                type="button"
                onClick={handleClick}
                disabled={loading}
                className="cursor-pointer rounded-md bg-surface-elevated px-5 py-2 font-semibold text-text-primary"
              >
                Select
              </button>
              <IconBtn
                text={loading ? "Uploading..." : "Upload"}
                onclick={handleFileUpload}
                disabled={!imageFile || loading}
              >
                {!loading && <FiUpload className="text-lg text-text-primary" />}
              </IconBtn>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
