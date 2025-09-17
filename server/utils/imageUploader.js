const cloudinary = require("cloudinary").v2;

exports.uploadImageToCloudinary = async (file, folder, height, quality) => {
  try {
    const options = { folder, resource_type: "auto" };

    if (height) {
      options.height = height;
      options.crop = "scale"; // ensure proportion resize
    }
    if (quality) {
      options.quality = quality;
    }

    console.log("📤 Uploading to Cloudinary with options:", options);

    // express-fileupload provides file.tempFilePath
    const result = await cloudinary.uploader.upload(file.tempFilePath, options);

    console.log("✅ Cloudinary upload success:", result.secure_url);

    return result;
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error);
    throw error;
  }
};
