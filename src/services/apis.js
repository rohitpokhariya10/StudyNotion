const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL

if (!configuredBaseUrl && import.meta.env.PROD) {
  throw new Error("VITE_API_BASE_URL must be configured for production builds")
}

const BASE_URL = (configuredBaseUrl || "http://localhost:4000/api/v1").replace(
  /\/$/,
  ""
)

export const API_V1_BASE_URL = BASE_URL

export const deriveApiVersionBaseUrl = (baseUrl, version) => {
  const normalizedBaseUrl = String(baseUrl || "").replace(/\/$/, "")
  if (!/^v\d+$/.test(version) || !normalizedBaseUrl.endsWith("/api/v1")) {
    throw new Error("The API base URL must end in /api/v1")
  }

  return `${normalizedBaseUrl.slice(0, -"v1".length)}${version}`
}

export const API_V2_BASE_URL = deriveApiVersionBaseUrl(BASE_URL, "v2")

// ---------------- AUTH ENDPOINTS ----------------
export const endpoints = {
  SENDOTP_API: BASE_URL + "/auth/sendotp",
  SIGNUP_API: BASE_URL + "/auth/signup",
  LOGIN_API: BASE_URL + "/auth/login",
  GOOGLE_LOGIN_API: BASE_URL + "/auth/google",
  LOGOUT_API: BASE_URL + "/auth/logout",
  ACCEPT_POLICIES_API: BASE_URL + "/auth/accept-policies",
  RESETPASSTOKEN_API: BASE_URL + "/auth/reset-password-token",
  RESETPASSWORD_API: BASE_URL + "/auth/reset-password",
}

// ---------------- ADMIN ENDPOINTS ----------------
export const adminEndpoints = {
  PENDING_INSTRUCTORS_API: BASE_URL + "/admin/instructors/pending",
  APPROVE_INSTRUCTOR_API: (instructorId) =>
    `${BASE_URL}/admin/instructors/${encodeURIComponent(instructorId)}/approve`,
  REJECT_INSTRUCTOR_API: (instructorId) =>
    `${BASE_URL}/admin/instructors/${encodeURIComponent(instructorId)}/reject`,
  PAYMENT_RECONCILIATION_API: BASE_URL + "/admin/payments/reconciliation",
  RESOLVE_PAYMENT_RECONCILIATION_API: (purchaseId) =>
    `${BASE_URL}/admin/payments/reconciliation/${encodeURIComponent(
      purchaseId
    )}/resolve`,
}

// ---------------- PROFILE ENDPOINTS ----------------
export const profileEndpoints = {
  GET_USER_DETAILS_API: BASE_URL + "/profile/getUserDetails",
  GET_USER_ENROLLED_COURSES_API: BASE_URL + "/profile/getEnrolledCourses",
  GET_INSTRUCTOR_DATA_API: BASE_URL + "/profile/instructorDashboard",
}

// ---------------- STUDENTS ENDPOINTS ----------------
export const studentEndpoints = {
  CHECKOUT_CONFIG_API: BASE_URL + "/payment/config",
  COURSE_PAYMENT_API: BASE_URL + "/payment/capturePayment",
  COURSE_VERIFY_API: BASE_URL + "/payment/verifyPayment",
  SEND_PAYMENT_SUCCESS_EMAIL_API: BASE_URL + "/payment/sendPaymentSuccessEmail",
  PURCHASE_HISTORY_API: BASE_URL + "/payment/purchases",
  REFUND_REQUEST_API: (purchaseId) =>
    `${BASE_URL}/payment/purchases/${encodeURIComponent(
      purchaseId
    )}/refund-request`,
}

// ---------------- COURSE ENDPOINTS ----------------
export const courseEndpoints = {
  GET_ALL_COURSE_API: BASE_URL + "/course/getAllCourses",
  COURSE_DETAILS_API: BASE_URL + "/course/getCourseDetails",
  EDIT_COURSE_API: BASE_URL + "/course/editCourse",
  COURSE_CATEGORIES_API: BASE_URL + "/course/showAllCategories",
  CREATE_COURSE_API: BASE_URL + "/course/createCourse",
  CREATE_SECTION_API: BASE_URL + "/course/addSection",
  CREATE_SUBSECTION_API: BASE_URL + "/course/addSubSection",
  UPDATE_SECTION_API: BASE_URL + "/course/updateSection",
  UPDATE_SUBSECTION_API: BASE_URL + "/course/updateSubSection",
  GET_ALL_INSTRUCTOR_COURSES_API: BASE_URL + "/course/getInstructorCourses",
  DELETE_SECTION_API: BASE_URL + "/course/deleteSection",
  DELETE_SUBSECTION_API: BASE_URL + "/course/deleteSubSection",
  DELETE_COURSE_API: BASE_URL + "/course/deleteCourse",
  GET_FULL_COURSE_DETAILS_AUTHENTICATED:
    BASE_URL + "/course/getFullCourseDetails",
  GET_LESSON_PLAYBACK_URL_API: BASE_URL + "/course/getLessonPlaybackUrl",
  LECTURE_COMPLETION_API: BASE_URL + "/course/updateCourseProgress",
  CREATE_RATING_API: BASE_URL + "/course/createRating",
}

// ---------------- RATINGS AND REVIEWS ----------------
export const ratingsEndpoints = {
  REVIEWS_DETAILS_API: BASE_URL + "/course/getReviews",
}

// ---------------- CATEGORIES API ----------------
export const categories = {
  CATEGORIES_API: BASE_URL + "/course/showAllCategories",
}

// ---------------- CATALOG PAGE DATA ----------------
export const catalogData = {
  CATALOGPAGEDATA_API: BASE_URL + "/course/getCategoryPageDetails",
}

// ---------------- V2 CATALOG API ----------------
export const catalogEndpoints = {
  CATEGORIES_API: categories.CATEGORIES_API,
  COURSES_API: API_V2_BASE_URL + "/courses",
}

// ---------------- CONTACT-US API ----------------
export const contactusEndpoint = {
  CONTACT_US_API: BASE_URL + "/reach/contact",
}

// ---------------- SETTINGS PAGE API ----------------
export const settingsEndpoints = {
  UPDATE_DISPLAY_PICTURE_API: BASE_URL + "/profile/updateDisplayPicture",
  UPDATE_PROFILE_API: BASE_URL + "/profile/updateProfile",
  CHANGE_PASSWORD_API: BASE_URL + "/auth/changepassword",
  DELETE_PROFILE_API: BASE_URL + "/profile/deleteProfile",
}
