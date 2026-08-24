import imageReference from "../server/utils/imageReference.js"

const { isImmutableImageReference } = imageReference
const image = process.env.STUDYNOTION_API_IMAGE_DIGEST || ""
if (!isImmutableImageReference(image)) {
  throw new Error(
    "STUDYNOTION_API_IMAGE_DIGEST must be a reviewed immutable sha256 image reference"
  )
}

console.log("Immutable API image reference validated")
