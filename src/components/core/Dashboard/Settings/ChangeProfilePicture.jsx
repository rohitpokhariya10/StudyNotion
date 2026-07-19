import { useEffect, useRef, useState } from "react"
import { FiUpload } from "react-icons/fi"
import { toast } from "react-hot-toast"
import { useDispatch, useSelector } from "react-redux"

import { updateDisplayPicture } from "../../../../services/operations/SettingsAPI"
import {
  getAvatarSource,
  setInitialsAvatarOnError,
} from "../../../../utils/avatar"
import IconBtn from "../../../Common/IconBtn"

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
      <div className="flex items-center justify-between rounded-md border-[1px] border-richblack-700 bg-richblack-800 p-8 px-12 text-richblack-5">
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
                onClick={handleClick}
                disabled={loading}
                className="cursor-pointer rounded-md bg-richblack-700 py-2 px-5 font-semibold text-richblack-50"
              >
                Select
              </button>
              <IconBtn
                text={loading ? "Uploading..." : "Upload"}
                onclick={handleFileUpload}
                disabled={!imageFile || loading}
              >
                {!loading && (
                  <FiUpload className="text-lg text-richblack-900" />
                )}
              </IconBtn>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
