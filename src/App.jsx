import { lazy, Suspense, useEffect, useRef } from "react"

import "./App.css"

// Redux
import { useDispatch } from "react-redux"
// React Router
import { Route, Routes } from "react-router-dom"

// Components
import Navbar from "./components/Common/Navbar"
import OpenRoute from "./components/core/Auth/OpenRoute"
import PrivateRoute from "./components/core/Auth/PrivateRoute"
import RoleRoute from "./components/core/Auth/RoleRoute"
import { restoreSession } from "./services/operations/authAPI"
import { ACCOUNT_TYPE } from "./utils/constants"

const About = lazy(() => import("./pages/About"))
const AddCourse = lazy(() => import("./components/core/Dashboard/AddCourse"))
const Cart = lazy(() => import("./components/core/Dashboard/Cart"))
const Catalog = lazy(() => import("./pages/Catalog"))
const Contact = lazy(() => import("./pages/Contact"))
const CourseDetails = lazy(() => import("./pages/CourseDetails"))
const Dashboard = lazy(() => import("./pages/Dashboard"))
const EditCourse = lazy(() => import("./components/core/Dashboard/EditCourse"))
const EnrolledCourses = lazy(
  () => import("./components/core/Dashboard/EnrolledCourses")
)
const Error = lazy(() => import("./pages/Error"))
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"))
const Home = lazy(() => import("./pages/Home"))
const Instructor = lazy(() => import("./components/core/Dashboard/Instructor"))
const InstructorApprovals = lazy(
  () => import("./components/core/Dashboard/Admin/InstructorApprovals")
)
const PaymentReconciliation = lazy(
  () => import("./components/core/Dashboard/Admin/PaymentReconciliation")
)
const Legal = lazy(() => import("./pages/Legal"))
const Login = lazy(() => import("./pages/Login"))
const MyCourses = lazy(() => import("./components/core/Dashboard/MyCourses"))
const MyProfile = lazy(() => import("./components/core/Dashboard/MyProfile"))
const PolicyAcceptance = lazy(() => import("./pages/PolicyAcceptance"))
const PurchaseHistory = lazy(
  () => import("./components/core/Dashboard/PurchaseHistory")
)
const Settings = lazy(() => import("./components/core/Dashboard/Settings"))
const Signup = lazy(() => import("./pages/Signup"))
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"))
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"))
const VideoDetails = lazy(
  () => import("./components/core/ViewCourse/VideoDetails")
)
const ViewCourse = lazy(() => import("./pages/ViewCourse"))

function App() {
  const dispatch = useDispatch()
  const hasRestoredSession = useRef(false)

  useEffect(() => {
    if (hasRestoredSession.current) return
    hasRestoredSession.current = true
    dispatch(restoreSession())
  }, [dispatch])

  return (
    <div className="flex min-h-screen w-full flex-col bg-richblack-900 font-inter">
      <Navbar />
      <Suspense
        fallback={
          <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
            <div className="spinner" aria-label="Loading page" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="courses/:courseId" element={<CourseDetails />} />
          <Route path="catalog/:catalogName" element={<Catalog />} />
          <Route path="privacy-policy" element={<Legal document="privacy" />} />
          <Route path="cookie-policy" element={<Legal document="cookies" />} />
          <Route path="terms" element={<Legal document="terms" />} />
          <Route path="refund-policy" element={<Legal document="refunds" />} />
          {/* Open Route - for Only Non Logged in User */}
          <Route
            path="login"
            element={
              <OpenRoute>
                <Login />
              </OpenRoute>
            }
          />
          <Route
            path="forgot-password"
            element={
              <OpenRoute>
                <ForgotPassword />
              </OpenRoute>
            }
          />
          <Route
            path="update-password"
            element={
              <OpenRoute>
                <UpdatePassword />
              </OpenRoute>
            }
          />
          <Route
            path="signup"
            element={
              <OpenRoute>
                <Signup />
              </OpenRoute>
            }
          />
          <Route
            path="verify-email"
            element={
              <OpenRoute>
                <VerifyEmail />
              </OpenRoute>
            }
          />
          <Route
            path="accept-terms"
            element={
              <PrivateRoute allowPendingPolicies>
                <PolicyAcceptance />
              </PrivateRoute>
            }
          />
          {/* Private Route - for Only Logged in User */}
          <Route
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          >
            {/* Route for all users */}
            <Route path="dashboard/my-profile" element={<MyProfile />} />
            <Route path="dashboard/Settings" element={<Settings />} />
            {/* Routes only for Instructors */}
            <Route
              path="dashboard/instructor"
              element={
                <RoleRoute allowedRoles={[ACCOUNT_TYPE.INSTRUCTOR]}>
                  <Instructor />
                </RoleRoute>
              }
            />
            <Route
              path="dashboard/my-courses"
              element={
                <RoleRoute allowedRoles={[ACCOUNT_TYPE.INSTRUCTOR]}>
                  <MyCourses />
                </RoleRoute>
              }
            />
            <Route
              path="dashboard/add-course"
              element={
                <RoleRoute allowedRoles={[ACCOUNT_TYPE.INSTRUCTOR]}>
                  <AddCourse />
                </RoleRoute>
              }
            />
            <Route
              path="dashboard/edit-course/:courseId"
              element={
                <RoleRoute allowedRoles={[ACCOUNT_TYPE.INSTRUCTOR]}>
                  <EditCourse />
                </RoleRoute>
              }
            />
            {/* Routes only for Students */}
            <Route
              path="dashboard/enrolled-courses"
              element={
                <RoleRoute allowedRoles={[ACCOUNT_TYPE.STUDENT]}>
                  <EnrolledCourses />
                </RoleRoute>
              }
            />
            <Route
              path="dashboard/cart"
              element={
                <RoleRoute allowedRoles={[ACCOUNT_TYPE.STUDENT]}>
                  <Cart />
                </RoleRoute>
              }
            />
            <Route
              path="dashboard/purchases"
              element={
                <RoleRoute allowedRoles={[ACCOUNT_TYPE.STUDENT]}>
                  <PurchaseHistory />
                </RoleRoute>
              }
            />
            <Route path="dashboard/settings" element={<Settings />} />
            <Route
              path="dashboard/instructor-approvals"
              element={
                <RoleRoute allowedRoles={[ACCOUNT_TYPE.ADMIN]}>
                  <InstructorApprovals />
                </RoleRoute>
              }
            />
            <Route
              path="dashboard/payment-reconciliation"
              element={
                <RoleRoute allowedRoles={[ACCOUNT_TYPE.ADMIN]}>
                  <PaymentReconciliation />
                </RoleRoute>
              }
            />
          </Route>

          {/* For the watching course lectures */}
          <Route
            element={
              <PrivateRoute>
                <ViewCourse />
              </PrivateRoute>
            }
          >
            <Route
              path="view-course/:courseId/section/:sectionId/sub-section/:subSectionId"
              element={
                <RoleRoute allowedRoles={[ACCOUNT_TYPE.STUDENT]}>
                  <VideoDetails />
                </RoleRoute>
              }
            />
          </Route>

          {/* 404 Page */}
          <Route path="*" element={<Error />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
