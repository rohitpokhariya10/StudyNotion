# Complete feature flows

Paths are repository-relative. `web:` abbreviates `apps/web/src/`; `api:` abbreviates `apps/api/`. These are path prefixes, not separate runtime services. Each flow follows the current caller chain; exact HTTP inputs/roles are in [API_MAP](API_MAP.md).

## 1. Signup, verification, and instructor approval

`web:pages/signup/index.jsx` → `features/authentication/ui/SignupForm.jsx` → `api/authApi.js` sendOtp → POST `/api/v1/auth/sendotp` → `api:routes/user.js` OTP limiters → `controllers/Auth.js::sendotp` → normalized email, User existence, hashed expiring OTP → `utils/mailSender.js`/Resend → VerifyEmail/VerificationCodeInput. Submit verified code → authApi signUp → signup route/limits → Auth.signup → OTP expiry/attempt/hash checks, bcrypt, Profile/User and policy acceptance → registration response → login screen. Pending instructors cannot login; Student can.

Admin signs in → `web:pages/instructor-approvals` → `features/instructor-approval/ui/InstructorApprovals.jsx` → `api/instructorApprovalApi.js` → pending queue and approve/reject endpoints → router-level auth/isAdmin → `api:controllers/Admin.js` → pending active Instructor conditional update, approved/status/reviewer/time/note → refreshed queue. Public signup cannot create Admin; `api:scripts/provision-admin.js` is the initial-admin operation.

## 2. Local/Google login, restoration, policy, logout

LoginForm → authApi.login → credentialed Axios → `/auth/login` limits → Auth.login → bcrypt/current status/safe projection → issueSession HttpOnly cookie → Redux auth/profile → safe return path. GoogleSignInButton instead obtains Google credential → authApi Google thunk → Auth.googleLogin/verifyGoogleIdToken → verified subject/email/audience → linked/new identity/policy gates → same cookie/session state.

Page reload → `SessionBootstrap` → authApi.restoreSession → GET profile/getUserDetails → auth middleware loads DB state/sessionVersion → safe User/Profile → checking becomes authenticated or anonymous. PrivateRoute handles pending policy/deletion before feature navigation. PolicyAcceptance submits affirmative booleans → acceptPolicies appends current acceptance → updated state. A server 401/423/428 reaches sessionResponseIntegration through transport and updates application gates.

ProfileDropdown logout → authApi.logout → POST logout → valid-token conditional sessionVersion increment → clear cookies → clear identity/cart/private learning cache. A revocation failure stays retryable rather than treating a failed logout as complete.

## 3. Password recovery/change

ForgotPassword page → authApi.getPasswordResetToken → resetPasswordToken → generic response, random challenge hash and 30-minute expiry, escaped Resend email → URL fragment on UpdatePassword page → authApi.resetPassword → reset API with challenge/new passwords → atomic hash+expiry match, bcrypt update, version increment, fields unset → navigate login. Settings UpdatePassword instead uses authenticated old/new password → Auth.changePassword → fresh session cookie and best-effort security email.

## 4. Public catalog and details

Navbar/category link → `web:pages/catalog/index.jsx` → category query and `features/course-filter/model/catalogFilters.js` URL state → catalogApi GET v2/courses. `api:routes/CatalogV2.js` validates strict query into locals → CatalogV2 controller → catalogService.listCatalogCourses → catalogCursor validates filter-bound cursor → catalogRepository aggregates Published courses, text/range/category metadata, rating, duration, instructor/category summaries → mapper strips private fields → shared response schema → RTK Query cache → accumulated/deduplicated CourseCards, count-free next cursor, stable loading/error/empty states.

Click card → `web:pages/course-details/index.jsx` → `entities/course/api/courseApi.js` public details → POST getCourseDetails → Course controller allows Published only → public curriculum/reviews/instructor summary without private playback/learner IDs → details and purchase/cart controls. The older category-page endpoint remains available but is not the new catalog's query engine.

## 5. Draft authoring, uploads, publishing

Instructor route → AddCourse/RenderSteps → CourseInformationForm with react-hook-form, ChipInput, RequirementsField, Upload → courseApi.addCourseDetails multipart → createCourse auth/isInstructor/upload middleware → metadata/category validation, validated Cloudinary thumbnail upload, Draft Course creation, User/Category mirrors → courseSlice current course and next step. Compensation removes newly created resources where possible after failure.

CourseBuilderForm/NestedView → add/update section → owner lookup through Course and relation → Section mutation. SubSectionModal → multipart section/title/description/video → auth/role/upload limits → Subsection controller resolves owner and membership → imageUploader magic bytes/MIME validation → Cloudinary authenticated video and duration → SubSection metadata and Section membership → refreshed nested UI. Temp upload cleanup runs on response completion and uploader cleanup paths.

PublishCourse → editCourse status Published → Course.editCourse → required metadata plus courseLifecycle.isCoursePublishReady checks every referenced section/lesson, title/description/duration and private-media metadata → sets everPublishedAt and status → instructor list/public catalog can show it. Adding an empty section drafts the course until publishable. Optional catalog level/language have no ordinary authoring form/allowlist write path.

## 6. Editing, archiving, curriculum deletion

Instructor CoursesTable → EditCourse fetches authenticated owned course → populate wizard → editCourse and nested APIs validate ownership/relationships on every request. Metadata allowlist prevents changing instructor/enrollment from client bodies. Thumbnail/video replacement updates media metadata and attempts cleanup of replaced assets.

Delete course requires exact course name → Course.deleteCourse expires stale checkouts and examines lifecycle/history → archive any published/ever-published or enrollment/paid-history course; reject unresolved checkout conflicts for a deletable draft; physically delete only eligible unsold draft and dependent/mirror/media data. Archive removes public sale visibility while existing access remains possible. Section/lesson physical deletion has a stricter never-published/no-learner/no-financial-history gate and cleans stale completion IDs. These are deliberate product-retention rules, not a generic cascade delete.

## 7. Cart and order creation

Details/cart action → cartSlice persists bounded course metadata/recomputes display totals → CheckoutPolicyAcknowledgement obtains current checkout config → `features/course-purchase/api/coursePurchaseApi.js::BuyCourse` ensures profile, key and agreement, loads Razorpay script once (bounded wait), gets session-scoped key from checkoutIdempotency → POST capturePayment with IDs/current policy and Idempotency-Key.

Payment auth/isStudent/limiter → payments.capturePayment → max 20 distinct valid Published course IDs, not already enrolled; validate exact policy versions/window; clear stale reservations; acquire short eligible-user payment lock; find/reuse active Purchase or create immutable server-priced paise line items and reservation keys; recheck courses; call Razorpay orders.create with receipt/notes. Provider ambiguity triggers receipt-based recovery with money/currency checks. Duplicate DB key races resolve to existing checkout. Response carries server order/money/expiry → Razorpay Checkout opens. Changing browser totals never changes captured amount. Header omission is accepted server-side even though README says required.

## 8. Capture, verification, webhook, fulfillment

Checkout success callback → verifyPayment request with provider identifiers/signature → owned Purchase lookup → timing-safe HMAC check over order/payment → Razorpay fetch confirms captured order, amount and INR. Provider webhook instead enters raw-body signature verification before JSON middleware; payment.captured/order.paid evidence reaches the same fulfillment logic. Unknown event/order is acknowledged safely. Captures after reservation expiry go to payment_review, not automatic enrollment.

`payments.js::fulfillPurchase` conditionally claims paid state, preserves provider identity, and invokes bounded non-gating sidecar reservation. `enrollStudent` upserts unique CourseProgress, adds Course/Progress refs to eligible User, adds Student to each Course, and compensates partial failures where possible. Failure holds reconciliation evidence. Final compare-and-set marks fulfilled; post-fulfillment sidecar activation rechecks mirrors; enrollment email fan-out is best effort. Replays converge through statuses/unique indexes. Browser clears cart and navigates to enrolled courses after successful verification. A webhook can complete fulfillment without a browser callback.

No database transaction spans provider+Purchase+User+Course+Progress. This is why intermediate paid state, reconciliation, and consistency audit exist.

## 9. Enrolled dashboard, curriculum, playback, progress

EnrolledCourses page → profileApi → getEnrolledCourses auth → profile controller uses User.courses and canonicalized progress/lesson count → safe summary cards. Open course → `pages/learning` + `widgets/curriculum-panel/ui/VideoDetailsSidebar.jsx` + nested `pages/lesson` → learningApi GET v2 learning → auth Student and strict IDs → learningService.resolveEntitledCourse (Course.studentsEnroled) → repository curriculum/progress → mapper filters missing/duplicate/stale IDs → validated DTO with no playback URLs → navigation/current-progress UI.

VideoDetails requests a separate v1 getLessonPlaybackUrl through courseApi → auth → resolveCourseAccess (owning Instructor/Admin/enrolled Student) and course-section-lesson relationship → Cloudinary private URL/expiry → local video state. Production refuses legacy public lesson media; development can return a legacy URL with null expiry. Native media error refreshes URL once and restores position; persistent failure exposes retry.

After video ended the UI permits complete → learningApi PUT path courseId/lessonId with empty body → auth Student → service verifies access and current lesson membership → CourseProgress unique upsert/$addToSet with duplicate-key retry → canonical percent/counts → response-validated confirmed cache patch → sidebar/completion/next lesson update. No watch-time proof or uncomplete endpoint exists. Entitlement does not gate this flow yet.

## 10. Reviews, instructor revenue, contact

CourseReviewModal/RatingInput → courseApi.createRating → createRating auth enrolled Student → rating/review validation, unique user-course review, course review mirror → public ReviewSlider/catalog aggregates. Public review feed strips stable review/user/course IDs. Instructor dashboard → profile.instructorDashboard → owned Course plus immutable Purchase line items in eligible financial states → chart, preserving historical price evidence. ContactUsForm → contactSupportApi → contact IP/email limits → ContactUs bounded validation → escaped contact template → configured recipient with customer reply-to → status toast. No arbitrary email destination or durable mail queue is supplied.

## 11. Purchase history and learner refund request

PurchaseHistory → coursePurchaseApi listMyPurchases → protected Student route → captured own Purchase projection with snapshots, provider/refund status and computed eligibility → history cards. Request form requires reason and exact confirmation → requestRefund verifies ownership, fulfilled status, stored refund window/policy, and prior decision → refund_requested with timestamp/note → 202 UI state. Repeated requests converge; rejected request does not automatically reopen. Request alone does not remove course access.

## 12. Admin payment/refund reconciliation

PaymentReconciliation feature → paymentReconciliationApi queue/action → Admin router → payments.resolvePaymentReview. Exact action confirmation and bounded note are required. A 60-second conditional lock serializes changes. Manual fulfill validates user/courses and reuses fulfillment. Reject refund records audit and restores eligible fulfilled state. Refund checks stored eligibility, timely learner-request evidence or explicit audited window override.

Before calling Razorpay refund, persist refund_pending/attempt evidence. Recover an existing matching refund from known ID or provider records before any new attempt; ambiguity stays pending/reviewable. Pending returns 202. Failed provider refund requires explicit retry_refund, preserving failed IDs. Once processed, persist that fact, then `revokeRefundedEntitlements` removes legacy mirrors/progress unless another qualifying purchase protects access; persist cleanup, terminalize matching sidecar, and finalize refunded/clear reservation keys. Despite its function name, legacy cleanup and the new Entitlement model are separate mechanisms. Retrying after crash resumes from persisted evidence rather than refunding blindly twice.

## 13. Profile, avatar, and resumable account deletion

Settings EditProfile/ChangeProfilePicture → profileSettingsApi → auth and upload as appropriate → profile.updateProfile allowlist or updateDisplayPicture Cloudinary image validation → User/Profile → updated Redux user/avatar. Server avoids overwriting absent fields; empty permitted fields can intentionally clear values.

DeleteAccount form → accountSecurityApi → deleteProfile with exact email/current password or fresh Google credential → reauthentication and active financial/instructor/Admin constraints → eligible-user lock and deletionPending → recheck purchases → remove enrollments/progress/reviews/OTP, blank profile, delete avatar asset → anonymize/inactivate User and clear credentials/provider/reset/session state → clear cookie. Financial/policy history is retained. Sidecar terminalization is non-gating. Failure leaves deletionPending and safe retry path; UI recognizes pending-deletion response even on a server error. New payment locks cannot silently bypass a pending deletion.

## 14. Enrollment audit and entitlement convergence

Operator invokes audit-enrollment-consistency CLI → validated Mongo target/read-only options → one aggregation cursor unions Purchase/User/Course/Progress evidence, majority/primary read and bounded runtime → pair classifier → aggregate/scenario samples and dry-run suggestions (never automatically safe) → documented exit code. Preflight reuses bounded reports along with environment/index/media/data checks.

Payment/refund/deletion sidecars → entitlementService → pure policy and persisted evidence checks → revision-fenced repository → provisioning/active/terminal episodes. Only post-boundary purchases qualify. Recovery CLI or scheduled wrapper obtains DB time, sweeps expired leases/aged handoffs, catches up bounded raw Purchase pages, claims due episodes, rechecks evidence/legacy mirrors, activates or terminalizes/retries/hands off. It makes no provider call, does not repair mirrors, and cannot grant actual product access because no authorization reader was switched. Checkpoint writes are atomic/private; an external scheduler supplies invocation. No historical migration is secretly performed at startup.
