const Profile = require("../models/Profile");
const CourseProgress = require("../models/CourseProgress");
const Course = require("../models/Course");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const mongoose = require("mongoose");
const { convertSecondsToDuration } = require("../utils/secToDuration");

// ---------------------------------------------
// Update Profile (with detailed console logs)
// ---------------------------------------------
exports.updateProfile = async (req, res) => {
  console.log("===== updateProfile called =====");
  console.log("req.user:", req.user);
  console.log("raw req.body:", req.body);

  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      about,
      contactNumber,
      gender,
    } = req.body;

    const id = req.user && req.user.id;
    if (!id) {
      console.error("No req.user.id found - unauthorized");
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Find user
    const userDetails = await User.findById(id);
    console.log("Found userDetails:", userDetails ? userDetails._id : null);

    if (!userDetails) {
      console.error("User not found for id:", id);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update basic user info only if provided
    const userUpdate = {};
    if (typeof firstName !== "undefined") userUpdate.firstName = firstName;
    if (typeof lastName !== "undefined") userUpdate.lastName = lastName;

    if (Object.keys(userUpdate).length > 0) {
      console.log("Updating User fields:", userUpdate);
      await User.findByIdAndUpdate(id, { $set: userUpdate }, { new: true });
    } else {
      console.log("No basic user fields to update.");
    }

    // Log additionalDetails field
    console.log("userDetails.additionalDetails (before refresh):", userDetails.additionalDetails);

    // Refresh userDetails (in case it was updated)
    const freshUser = await User.findById(id).lean();
    console.log("Fresh user after possible update:", freshUser);

    // Ensure profile exists
    let profile = null;
    if (freshUser.additionalDetails) {
      try {
        profile = await Profile.findById(freshUser.additionalDetails);
        console.log("Found existing profile:", profile ? profile._id : null);
      } catch (err) {
        console.warn("Error finding profile by additionalDetails:", err.message);
      }
    }

    if (!profile) {
      console.log("No profile found -> creating new Profile");
      profile = new Profile({});
      await profile.save();
      console.log("Created profile with id:", profile._id);

      // Attach profile to user
      await User.findByIdAndUpdate(id, { $set: { additionalDetails: profile._id } }, { new: true });
      console.log("Attached new profile to user:", profile._id);
    }

    // Prepare profile update only for provided fields (avoid overwriting with empty strings)
    const profileUpdate = {};
    if (typeof dateOfBirth !== "undefined") profileUpdate.dateOfBirth = dateOfBirth;
    if (typeof about !== "undefined") profileUpdate.about = about;
    if (typeof contactNumber !== "undefined") profileUpdate.contactNumber = contactNumber;
    if (typeof gender !== "undefined") profileUpdate.gender = gender;

    if (Object.keys(profileUpdate).length > 0) {
      console.log("Updating profile fields:", profileUpdate);
      await Profile.findByIdAndUpdate(profile._id, { $set: profileUpdate }, { new: true });
    } else {
      console.log("No profile fields to update.");
    }

    const updatedUserDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec();

    console.log("Returning updatedUserDetails:", updatedUserDetails._id);
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      updatedUserDetails,
    });
  } catch (error) {
    console.error("updateProfile error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ---------------------------------------------
// Delete Account (with logs)
// ---------------------------------------------
exports.deleteAccount = async (req, res) => {
  console.log("===== deleteAccount called =====");
  try {
    const id = req.user && req.user.id;
    console.log("Deleting user id:", id);

    const user = await User.findById(id);
    if (!user) {
      console.error("User not found for delete:", id);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("User found, deleting associated profile:", user.additionalDetails);
    // Delete associated profile
    if (user.additionalDetails) {
      await Profile.findByIdAndDelete(user.additionalDetails);
      console.log("Deleted profile:", user.additionalDetails);
    }

    // Remove user from enrolled courses
    for (const courseId of user.courses || []) {
      console.log("Removing user from course:", courseId);
      await Course.findByIdAndUpdate(
        courseId,
        { $pull: { studentsEnroled: id } },
        { new: true }
      );
    }

    // Delete user
    await User.findByIdAndDelete(id);
    console.log("User deleted:", id);

    // Delete progress
    const deleteRes = await CourseProgress.deleteMany({ userId: id });
    console.log("Deleted CourseProgress:", deleteRes.deletedCount);

    return res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("deleteAccount error:", error);
    return res.status(500).json({ success: false, message: "User cannot be deleted", error: error.message });
  }
};

// ---------------------------------------------
// Get User Details (with logs)
// ---------------------------------------------
exports.getAllUserDetails = async (req, res) => {
  console.log("===== getAllUserDetails called =====");
  try {
    const id = req.user && req.user.id;
    console.log("Fetching details for user id:", id);

    const userDetails = await User.findById(id).populate("additionalDetails").exec();
    if (!userDetails) {
      console.error("User not found in getAllUserDetails:", id);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("Fetched userDetails:", userDetails._id);
    return res.status(200).json({
      success: true,
      message: "User Data fetched successfully",
      data: userDetails,
    });
  } catch (error) {
    console.error("getAllUserDetails error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------
// Update Display Picture (with logs)
// ---------------------------------------------

exports.updateDisplayPicture = async (req, res) => {
  console.log("===== updateDisplayPicture called =====");
  try {
    if (!req.files || !req.files.displayPicture) {
      console.warn("No file uploaded in updateDisplayPicture");
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const file = req.files.displayPicture;
    const userId = req.user && req.user.id;
    console.log("Uploading image for user:", userId);

    const image = await uploadImageToCloudinary(
      file,
      process.env.FOLDER_NAME || "profilePictures",
      1000,
      1000
    );

    console.log("Cloudinary upload result:", image && image.secure_url);

    const updatedProfile = await User.findByIdAndUpdate(
      userId,
      { image: image.secure_url },
      { new: true }
    );

    console.log("Updated user image for:", userId);
    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating display picture:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------
// Get Enrolled Courses (with logs)
// ---------------------------------------------
exports.getEnrolledCourses = async (req, res) => {
  console.log("===== getEnrolledCourses called =====");
  try {
    const userId = req.user && req.user.id;
    console.log("Fetching enrolled courses for:", userId);

    let userDetails = await User.findById(userId)
      .populate({
        path: "courses",
        populate: {
          path: "courseContent",
          populate: { path: "subSection" },
        },
      })
      .exec();

    if (!userDetails) {
      console.error("User not found in getEnrolledCourses:", userId);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    userDetails = userDetails.toObject();
    console.log("Found courses count:", userDetails.courses?.length || 0);

    for (let course of userDetails.courses) {
      let totalDurationInSeconds = 0;
      let subsectionLength = 0;

      for (let content of course.courseContent) {
        // safe reduce-like accumulation (in-case subSection missing)
        const subSecs = Array.isArray(content.subSection) ? content.subSection : [];
        totalDurationInSeconds += subSecs.reduce(
          (acc, curr) => acc + parseInt(curr.timeDuration || 0, 10),
          0
        );
        subsectionLength += subSecs.length;
      }

      course.totalDuration = convertSecondsToDuration(totalDurationInSeconds);

      let courseProgressCount = await CourseProgress.findOne({
        courseID: course._id,
        userId,
      });

      courseProgressCount = courseProgressCount?.completedVideos?.length || 0;

      course.progressPercentage =
        subsectionLength === 0
          ? 100
          : Math.round((courseProgressCount / subsectionLength) * 100 * 100) / 100;

      console.log(`Course ${course._id} - subsections: ${subsectionLength}, completed: ${courseProgressCount}`);
    }

    return res.status(200).json({ success: true, data: userDetails.courses });
  } catch (error) {
    console.error("getEnrolledCourses error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------------------------------------
// Instructor Dashboard (with logs)
// ---------------------------------------------
exports.instructorDashboard = async (req, res) => {
  console.log("===== instructorDashboard called =====");
  try {
    const courseDetails = await Course.find({ instructor: req.user.id });
    console.log("Found instructor courses count:", courseDetails.length);

    const courseData = courseDetails.map((course) => {
      const totalStudentsEnrolled = Array.isArray(course.studentsEnroled) ? course.studentsEnroled.length : 0;
      const totalAmountGenerated = totalStudentsEnrolled * (course.price || 0);

      return {
        _id: course._id,
        courseName: course.courseName,
        courseDescription: course.courseDescription,
        totalStudentsEnrolled,
        totalAmountGenerated,
      };
    });

    return res.status(200).json({ success: true, courses: courseData });
  } catch (error) {
    console.error("instructorDashboard error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
