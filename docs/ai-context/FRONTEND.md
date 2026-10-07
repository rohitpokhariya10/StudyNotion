# Frontend implementation

All paths below are relative to `apps/web` unless explicitly qualified. See [FILE_MAP](FILE_MAP.md) for every component, hook, adapter, and test.

## Boot and component hierarchy

`index.html` supplies the DOM root and imports `src/app/main.jsx`. `bootstrap.jsx` renders with `createRoot` and StrictMode. `app/providers/AppProviders.jsx` supplies Redux, BrowserRouter, application ErrorBoundary, and toast presentation. `App.jsx` composes SessionBootstrap, AppShell and AppRouter. `widgets/app-shell/AppShell.jsx` owns Navbar, RouteErrorBoundary and the Suspense fallback around route children. Pages place Footer where needed; this is client composition, not a server layout engine.

Pages are lazy imports in the router. There is no SSR, server component layer, Next.js runtime, or framework loader/action data router. Vite builds browser modules; Nginx serves the static bundle. Tailwind 4 is integrated through the Vite plugin and `shared/styles/globals.css` with CSS theme tokens. React 19 does not by itself make this application fully typed or server rendered.

## Routes and composition

`src/app/router/AppRouter.jsx` is the complete source of route truth.

| Routes                                                                                                        | Screen / boundary                                            |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `/`, `/about`, `/contact`                                                                                     | Home, about, contact pages; public                           |
| `/catalog/:catalogName`, `/courses/:courseId`                                                                 | v2 catalog and v1 public course details                      |
| `/terms`, `/privacy-policy`, `/refund-policy`, `/cookie-policy`                                               | Shared legal-page presentation                               |
| `/login`, `/signup`, `/verify-email`                                                                          | OpenRoute; authenticated users redirected                    |
| `/forgot-password`, `/update-password`                                                                        | OpenRoute password recovery screens                          |
| `/accept-terms`                                                                                               | PrivateRoute with policy-pending exception                   |
| `/dashboard`                                                                                                  | Redirect to `/dashboard/my-profile`                          |
| `/dashboard/my-profile`, `/dashboard/settings`                                                                | Signed-in user profile/settings                              |
| `/dashboard/Settings`                                                                                         | Case-sensitive compatibility redirect preserving search/hash |
| `/dashboard/instructor`, `/dashboard/my-courses`, `/dashboard/add-course`, `/dashboard/edit-course/:courseId` | Instructor-only screens                                      |
| `/dashboard/enrolled-courses`, `/dashboard/cart`, `/dashboard/purchases`                                      | Student-only screens                                         |
| `/dashboard/instructor-approvals`, `/dashboard/payment-reconciliation`                                        | Admin-only screens                                           |
| `/view-course/:courseId/section/:sectionId/sub-section/:subSectionId`                                         | Private learning layout and Student lesson screen            |
| `*`                                                                                                           | Not-found page                                               |

PrivateRoute waits while session status is checking, preserves a safe internal return path, sends deletion-pending users to settings, and sends policy-pending users to acceptance. OpenRoute redirects signed-in users. RoleRoute checks the current profile role for UI navigation; backend roles/ownership remain mandatory. `shared/lib/routing/internalRedirect.js` rejects unsafe redirects. `widgets/dashboard-sidebar/model/links.js` controls role-specific navigation labels, not API permissions.

## State ownership

`app/store/index.js` configures the store, and `rootReducer.js` registers `auth`, `profile`, `cart`, `course`, `viewCourse`, `catalogApi`, and `learningApi`, with RTK middleware.

| State                                                 | Location                                                                    | Behavior                                                                                                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Session status, pending signup, policy/deletion flags | `entities/user/model/authSlice.js`                                          | Checking/authenticated/anonymous; `token` is boolean compatibility state, not a JWT                                                           |
| Safe current user                                     | `entities/user/model/profileSlice.js`                                       | Populated from server profile/session DTOs                                                                                                    |
| Cart                                                  | `entities/cart/model/cartSlice.js`                                          | Persists course metadata in localStorage, recomputes totals, validates restored entries; reducers also perform persistence/toast side effects |
| Authoring wizard                                      | `entities/course/model/courseSlice.js`                                      | Step, current course, edit flag and loading state                                                                                             |
| Old learning state                                    | `entities/learning/model/legacyViewCourseSlice.js`                          | Still registered; active learner screens use RTK Query instead                                                                                |
| Catalog/category server state                         | `entities/catalog/api/catalogApi.js`                                        | Credentialed fetch, parsed contracts, query-key caches; categories retained longer                                                            |
| Learning/progress server state                        | `entities/learning/api/learningApi.js`                                      | Strict response parsing; successful mutation patches cached canonical progress                                                                |
| Filters                                               | `features/course-filter/model/catalogFilters.js`, `pages/catalog/index.jsx` | URL search parameters are committed state; local draft inputs applied on submit                                                               |
| Playback                                              | `features/lesson-playback/ui/VideoDetails.jsx`                              | Local expiring URL/loading/error/playback state; no durable URL persistence                                                                   |
| Checkout request key                                  | `features/course-purchase/lib/checkoutIdempotency.js`                       | Session storage keyed by user and sorted course set                                                                                           |

Catalog RTK queries retain ordinary unused results for 60 seconds and categories for 300 seconds, and support reconnect refresh. Cursor pages are accumulated/deduplicated in the catalog page. This client cache does not imply an API/Redis catalog cache. Learning mutation cache updates happen after confirmation (`queryFulfilled`), not optimistic completion before the server accepts it.

## API communication

`shared/api/endpoints.js` owns v1 URLs and derives v2 only from a base ending `/api/v1`. Production bundles require a configured base; relative `/api/v1` supports same-origin releases. `shared/api/httpClient.js::apiConnector` uses Axios with credentials, strips Authorization headers, sets normal requests to a 15-second deadline and FormData requests to 120 seconds, and normalizes failures via `apiErrorModel.js`.

Feature/entity API modules own transport and user-facing orchestration. Catalog/learning use `fetchBaseQuery` with credentials and a 15-second timeout rather than Axios. Both transports participate in session response handling. `features/authentication/model/sessionResponseIntegration.js` handles 401 (clear session/cart/learning cache), 423 (deletion pending), and 428 (policy action needed). Public catalog cache need not be cleared as private learning state does.

`features/authentication/api/authApi.js` implements thunks including login, signUp, OTP, Google sign-in, restoration, policy acceptance, and logout. SessionBootstrap runs restoration once per mounted bootstrap with a ref protecting the StrictMode effect cycle. Browser auth restoration calls `/profile/getUserDetails`; no browser JWT decoder is an authority. Old localStorage identity entries are removed. That cleanup has an unguarded storage path recorded as a candidate failure under restricted storage.

## Forms and UI behavior

Authentication uses controlled values and dedicated policy/OTP widgets. Many profile, contact, course, lesson, and password forms use react-hook-form. Client validation improves feedback; server validation is independently authoritative. `VerificationCodeInput` implements keyboard/paste behavior. `PolicyAcknowledgement` and `CheckoutPolicyAcknowledgement` collect distinct consent contexts.

Authoring composition is `pages/course-create` → `features/course-authoring/ui/AddCourse` → `RenderSteps` → information, builder, publish stages. NestedView, SubSectionModal, Upload, ChipInput, and RequirementsField manage curriculum/files/list values. Multipart lists are JSON-encoded; uploaded media travels through the API. PublishCourse changes server lifecycle status after server curriculum validation. CourseInformationForm's category object/string comparison deserves a later targeted fix, not an audit-time refactor.

Shared primitives include buttons/links, FormField, ConfirmationModal, StatusPanel, PageLoadingFallback, ErrorBoundary, and SafeMarkdown. Modal tests cover keyboard/focus behavior. SafeMarkdown skips raw HTML, restricts links, and excludes images. Avatar helpers generate local deterministic SVG data images and normalize older avatar references without remote identity leakage. Temporary file previews are released by their owning components.

## Loading, failures, performance

Lazy pages use Suspense; transport-driven screens expose loading, empty, error, retry, and missing/access-denied states. RouteErrorBoundary allows localized recovery; ErrorBoundary catches rendering failures and forwards sanitized reports to `shared/lib/errorMonitoring.js`. No production reporter vendor is installed in the checked-in composition. Toasts communicate mutation success/failure, but they do not replace server state.

Catalog paginates 12 items at a time, uses opaque server cursors, retains prior cards while loading, and reads URL filters for navigation. Native video playback asks for a signed URL per selected lesson; on an expiry-like media error it refreshes once, preserves position, and then offers explicit retry. The player shows completion action after ended, but the server validates enrollment/lesson membership rather than watch-time evidence.

Marketing course cards under `pages/home` use curated local examples; `entities/course/ui/CourseCard.jsx` represents actual catalog data. Instructor charts consume server-computed financial/enrollment summaries. Footer/navigation models contain editorial links. Those are separate from role gates and live metrics.

## Verification and limits

45 Vitest files / 199 passing tests in this audit, including routing/session behavior, transport, catalog, player/navigation, UI interactions, policy and purchase screens. TypeScript checking passed but `allowJs: true` and `checkJs: false` leave JS internals unchecked. Playwright covers mocked catalog/learning browsers and an optional live stack; neither was run during this documentation task. See [TESTING](TESTING.md).
