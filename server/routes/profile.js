const express = require("express");
const router = express.Router();

// Middlewares
const { auth, isInstructor } = require("../middleware/auth");

// Controllers
const {
  deleteAccount,
  updateProfile,
  getAllUserDetails,
  updateDisplayPicture,
  getEnrolledCourses,
  instructorDashboard,
} = require("../controllers/profile");

// ********************************************************************************************************
//                                      Profile Routes
// ********************************************************************************************************

// Delete User Account
router.delete("/deleteProfile", auth, deleteAccount);

// Update User Profile
router.put("/updateProfile", auth, updateProfile);

// Get All User Details
router.get("/getUserDetails", auth, getAllUserDetails);

// Get Enrolled Courses
router.get("/getEnrolledCourses", auth, getEnrolledCourses);

// Update Profile Picture
router.put("/updateDisplayPicture", auth, updateDisplayPicture);

// Instructor Dashboard (only for Instructors)
router.get("/instructorDashboard", auth, isInstructor, instructorDashboard);

module.exports = router;
