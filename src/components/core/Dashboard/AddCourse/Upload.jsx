import { useEffect, useRef, useState } from "react"
import { useDropzone } from "react-dropzone"
import { FiUploadCloud } from "react-icons/fi"
import { toast } from "react-hot-toast"

const IMAGE_ACCEPT = {
  "image/avif": [".avif"],
  "image/jpeg": [".jpeg", ".jpg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
}
const VIDEO_ACCEPT = {
  "video/mp4": [".mp4", ".m4v"],
  "video/quicktime": [".mov"],
  "video/webm": [".webm"],
}
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 25 * 1024 * 1024

export default function Upload({
  name,
  label,
  register,
  setValue,
  errors,
  video = false,
  viewData = null,
  editData = null,
}) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewSource, setPreviewSource] = useState(
    viewData ? viewData : editData ? editData : ""
  )
  const objectUrlRef = useRef(null)

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file) {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = URL.createObjectURL(file)
      setPreviewSource(objectUrlRef.current)
      setSelectedFile(file)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: video ? VIDEO_ACCEPT : IMAGE_ACCEPT,
    maxFiles: 1,
    maxSize: video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES,
    multiple: false,
    onDrop,
    onDropRejected: (rejections) => {
      const tooLarge = rejections.some(({ errors: dropErrors }) =>
        dropErrors.some(({ code }) => code === "file-too-large")
      )
      toast.error(
        tooLarge
          ? `${video ? "Videos" : "Images"} must be ${
              video ? "25" : "10"
            } MB or smaller`
          : video
            ? "Choose an MP4, MOV, or WebM video"
            : "Choose a JPEG, PNG, WebP, or AVIF image"
      )
    },
  })

  useEffect(() => {
    register(name, { required: true })
  }, [name, register])

  useEffect(() => {
    setValue(name, selectedFile || previewSource || null, {
      shouldValidate: true,
    })
  }, [name, previewSource, selectedFile, setValue])

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    []
  )

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm text-richblack-5" htmlFor={name}>
        {label} {!viewData && <sup className="text-pink-200">*</sup>}
      </label>
      <div
        className={`${
          isDragActive ? "bg-richblack-600" : "bg-richblack-700"
        } flex min-h-[250px] cursor-pointer items-center justify-center rounded-md border-2 border-dotted border-richblack-500`}
      >
        {previewSource ? (
          <div className="flex w-full flex-col p-6">
            {!video ? (
              <img
                src={previewSource}
                alt="Preview"
                className="h-full w-full rounded-md object-cover"
              />
            ) : (
              <video
                className="aspect-video w-full rounded-md bg-black"
                controls
                playsInline
                preload="metadata"
                src={previewSource}
              >
                Your browser does not support HTML5 video.
              </video>
            )}
            {!viewData && (
              <button
                type="button"
                onClick={() => {
                  setPreviewSource("")
                  setSelectedFile(null)
                  setValue(name, null)
                  if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current)
                    objectUrlRef.current = null
                  }
                }}
                className="mt-3 text-richblack-400 underline"
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div
            className="flex w-full flex-col items-center p-6"
            {...getRootProps()}
          >
            <input {...getInputProps()} />
            <div className="grid aspect-square w-14 place-items-center rounded-full bg-pure-greys-800">
              <FiUploadCloud className="text-2xl text-yellow-50" />
            </div>
            <p className="mt-2 max-w-[200px] text-center text-sm text-richblack-200">
              Drag and drop an {!video ? "image" : "video"}, or click to{" "}
              <span className="font-semibold text-yellow-50">browse</span> a
              file
            </p>

            <ul className="mt-10 flex list-disc justify-between space-x-12 text-center  text-xs text-richblack-200">
              <li>Aspect ratio 16:9</li>
              <li>Recommended size 1024x576</li>
            </ul>
          </div>
        )}
      </div>
      {errors[name] && (
        <span className="ml-2 text-xs tracking-wide text-pink-200">
          {label} is required
        </span>
      )}
    </div>
  )
}
