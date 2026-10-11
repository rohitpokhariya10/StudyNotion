import { ACCOUNT_TYPE } from "@/entities/user"
import { OpenRoute, PrivateRoute, RoleRoute } from "@/features/authentication"
import { lazy } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router"

const NeetLanding = lazy(() => import("@/pages/neet-landing"))
const NeetMocks = lazy(() => import("@/pages/neet-mocks"))
const NeetOnboarding = lazy(() => import("@/pages/neet-onboarding"))
const NeetExam = lazy(() => import("@/pages/neet-exam"))
const NeetResult = lazy(() => import("@/pages/neet-result"))
const studentPage = (page) => (
  <PrivateRoute>
    <RoleRoute allowedRoles={[ACCOUNT_TYPE.STUDENT]}>{page}</RoleRoute>
  </PrivateRoute>
)

const About = lazy(() => import("@/pages/about"))
const Services = lazy(() => import("@/pages/services"))
const Careers = lazy(() => import("@/pages/careers"))
const Blogs = lazy(() => import("@/pages/blogs"))
const BlogArticle = lazy(() => import("@/pages/blog-article"))
const AddCourse = lazy(() => import("@/pages/course-create"))
const Cart = lazy(() => import("@/pages/cart"))
const Catalog = lazy(() => import("@/pages/catalog"))
const Contact = lazy(() => import("@/pages/contact"))
const CourseDetails = lazy(() => import("@/pages/course-details"))
const Dashboard = lazy(() => import("@/pages/dashboard"))
const EditCourse = lazy(() => import("@/pages/course-edit"))
const EnrolledCourses = lazy(() => import("@/pages/enrolled-courses"))
const Error = lazy(() => import("@/pages/not-found"))
const ForgotPassword = lazy(() => import("@/pages/forgot-password"))
const Home = lazy(() => import("@/pages/home"))
const Instructor = lazy(() => import("@/pages/instructor-dashboard"))
const InstructorApprovals = lazy(() => import("@/pages/instructor-approvals"))
const PaymentReconciliation = lazy(
  () => import("@/pages/payment-reconciliation")
)
const Legal = lazy(() => import("@/pages/legal"))
const Login = lazy(() => import("@/pages/login"))
const MyCourses = lazy(() => import("@/pages/instructor-courses"))
const MyProfile = lazy(() => import("@/pages/profile"))
const PolicyAcceptance = lazy(() => import("@/pages/policy-acceptance"))
const PurchaseHistory = lazy(() => import("@/pages/purchase-history"))
const Settings = lazy(() => import("@/pages/settings"))
const Signup = lazy(() => import("@/pages/signup"))
const UpdatePassword = lazy(() => import("@/pages/update-password"))
const VerifyEmail = lazy(() => import("@/pages/verify-email"))
const VideoDetails = lazy(() => import("@/pages/lesson"))
const ViewCourse = lazy(() => import("@/pages/learning"))

function LegacySettingsRedirect() {
  const { hash, search } = useLocation()

  return (
    <Navigate to={{ pathname: "/dashboard/settings", search, hash }} replace />
  )
}

function MarketingAlias({ pathname }) {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname, search, hash }} replace />
}

// Maps /project-neet/** to the same /neet/** path, keeping query and hash.
function LegacyNeetRedirect() {
  const { pathname, search, hash } = useLocation()
  return (
    <Navigate
      to={{
        pathname: pathname.replace(/^\/project-neet/i, "/neet"),
        search,
        hash,
      }}
      replace
    />
  )
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<MarketingAlias pathname="/" />} />
      <Route path="/about-us" element={<MarketingAlias pathname="/about" />} />
      <Route path="/services" element={<Services />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/blogs" element={<Blogs />} />
      <Route path="/blogs/:slug" element={<BlogArticle />} />
      <Route path="/neet" element={<NeetLanding />} />
      <Route path="/neet/mocks" element={<NeetMocks />} />
      <Route
        path="/neet/mocks/:testId/start"
        element={studentPage(<NeetOnboarding />)}
      />
      <Route
        path="/neet/attempts/:attemptId"
        element={studentPage(<NeetExam />)}
      />
      <Route
        path="/neet/attempts/:attemptId/result"
        element={studentPage(<NeetResult />)}
      />
      {/* Compatibility: earlier links and bookmarks used /project-neet. */}
      <Route path="/project-neet/*" element={<LegacyNeetRedirect />} />
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
        <Route
          path="dashboard"
          element={<Navigate to="/dashboard/my-profile" replace />}
        />
        <Route path="dashboard/my-profile" element={<MyProfile />} />
        <Route
          caseSensitive
          path="dashboard/Settings"
          element={<LegacySettingsRedirect />}
        />

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
        <Route caseSensitive path="dashboard/settings" element={<Settings />} />
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
  )
}

export default AppRouter
