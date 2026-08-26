const mongoose = require("mongoose")

const subSectionSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 200 },
    timeDuration: { type: String, trim: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 5000 },
    videoUrl: { type: String, maxlength: 2048 },
    videoPublicId: { type: String, select: false },
    videoFormat: { type: String, trim: true, maxlength: 20, select: false },
    videoDeliveryType: {
      type: String,
      enum: ["authenticated", "upload"],
      select: false,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("SubSection", subSectionSchema)
