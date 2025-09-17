// middleware/auth.js

const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require("../models/User");

// Load env variables
dotenv.config();

/**
 * Authentication Middleware
 */
exports.auth = async (req, res, next) => {
  try {
    console.log(">>> [AUTH] middleware hit:", req.method, req.originalUrl);

    // Tokens from cookie/body/header
    const authHeader = req.header("Authorization");
    const cookieToken = req.cookies?.token;
    const bodyToken = req.body?.token;

    let token = null;

    if (cookieToken) {
      token = cookieToken;
    } else if (bodyToken) {
      token = bodyToken;
    } else if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim(); // remove "Bearer "
    }

    if (!token) {
      console.warn(">>> [AUTH] Token missing");
      return res.status(401).json({ success: false, message: "Token Missing" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(">>> [AUTH] Token verified for user:", decoded?.email || decoded?.id);
    } catch (err) {
      console.warn(">>> [AUTH] Token verification failed:", err.message);
      return res.status(401).json({ success: false, message: "Token is invalid or expired" });
    }

    // Attach user to req
    req.user = decoded;

    next();
  } catch (error) {
    console.error(">>> [AUTH] Unexpected error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while validating the token",
    });
  }
};

/**
 * Student Role Middleware
 */
exports.isStudent = async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userDetails = await User.findOne({ email: req.user.email });
    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (userDetails.accountType !== "Student") {
      return res.status(403).json({
        success: false,
        message: "This is a Protected Route for Students",
      });
    }

    next();
  } catch (error) {
    console.error(">>> [isStudent] error:", error);
    return res.status(500).json({ success: false, message: "User Role Can't be Verified" });
  }
};

/**
 * Admin Role Middleware
 */
exports.isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userDetails = await User.findOne({ email: req.user.email });
    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (userDetails.accountType !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "This is a Protected Route for Admins",
      });
    }

    next();
  } catch (error) {
    console.error(">>> [isAdmin] error:", error);
    return res.status(500).json({ success: false, message: "User Role Can't be Verified" });
  }
};

/**
 * Instructor Role Middleware
 */
exports.isInstructor = async (req, res, next) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userDetails = await User.findOne({ email: req.user.email });
    if (!userDetails) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log(">>> [isInstructor] user:", userDetails.email, "role:", userDetails.accountType);

    if (userDetails.accountType !== "Instructor") {
      return res.status(403).json({
        success: false,
        message: "This is a Protected Route for Instructors",
      });
    }

    next();
  } catch (error) {
    console.error(">>> [isInstructor] error:", error);
    return res.status(500).json({ success: false, message: "User Role Can't be Verified" });
  }
};
