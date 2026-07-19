const mongoose = require("mongoose")

const courseProgress = new mongoose.Schema(
  {
    courseID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    completedVideos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubSection",
      },
    ],
  },
  { timestamps: true },
)

courseProgress.index({ userId: 1, courseID: 1 }, { unique: true })

module.exports = mongoose.model("courseProgress", courseProgress)
