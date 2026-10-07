# Authentication and authorization

## Sources and boundaries

Backend: `apps/api/controllers/Auth.js`, `resetPassword.js`, `profile.js`; `middleware/auth.js`; `utils/auth.js`, `validation.js`, `policyAcceptance.js`, `googleIdentity.js`; `models/User.js`, `OTP.js`, `Profile.js`; `routes/user.js`.

Frontend: `apps/web/src/features/authentication/{api,model,routing,ui}`, `SessionBootstrap.jsx`, `entities/user/model`, and auth/recovery pages. Authentication identifies a User; authorization additionally checks current DB role, account state, ownership/enrollment, and requested resource relationships.

## Registration and OTP

SignupForm gathers Student/Instructor identity, password/confirmation, and three affirmative policy fields (`acceptTerms`, `acknowledgePrivacy`, `confirmEligibility`). `authApi` requests OTP then stores pending signup data in Redux for VerifyEmail. `Auth.js::sendotp` normalizes/validates email, rejects an existing account, generates a cryptographically random six-digit value, stores HMAC-SHA256 of email and OTP under the separate OTP secret, resets attempts, and sets a ten-minute expiry. Email sends through Resend; send failure removes the challenge. Local development can explicitly return the OTP; production forbids that configuration.

`signup` validates names/email, allows only Student/Instructor, requires matching strong passwords and affirmative policy acceptance, loads the hidden OTP hash, checks application expiry and attempts (maximum five), and compares the hash safely. Mongo TTL cleanup is asynchronous, so application expiry checks are necessary. Passwords use bcrypt cost 12 with uppercase/lowercase/digit, minimum eight characters and at most 72 UTF-8 bytes. User/Profile creation compensates profile creation on failure. Successful signup removes the OTP; it does not issue a login session. Students are approved; instructors enter Pending/unapproved state. Signup is not a general Admin creation route.

## Login and cookie session

`login` selects the hidden password and provider fields, verifies bcrypt (with a dummy hash for absent users), rejects inactive/unapproved accounts, projects safe user data, and calls `utils/auth.js::issueSession`. JWT algorithm is restricted to HS256, issuer `studynotion-api`, audience `studynotion-web`, lifetime 12 hours. Claims include ID, email, accountType, and sessionVersion. Claim role is not trusted over the database on later requests.

Cookie default name is `studynotion_session`, path `/`, HttpOnly, 12-hour max-age; production requires Secure, explicit SameSite posture, and validates any optional domain. Legacy cookie variants are cleared. No refresh token, refresh endpoint, rotating token store, or server session collection exists.

`readSessionToken` supports Bearer first, configured cookie next, then old `token` cookie for compatibility. The application browser uses credentialed requests and strips Authorization headers in its Axios adapter. JWTs are not returned for browser storage by the normal session flow; `auth.token` in Redux is a boolean. The browser removes old localStorage identity/token entries, fetches `/profile/getUserDetails` on restoration, and builds state from the safe response.

## Protected request decision

```text
Cookie / compatible Bearer value
  → verify algorithm, signature, issuer, audience, expiration
  → validate user ID and reload User
  → require active, approved, matching sessionVersion
  → deletion and policy gates
  → current DB role middleware
  → controller ownership / enrollment / relationship checks
```

`middleware/auth.js::auth` places a limited identity on req.user and marks private responses no-store. `isStudent`, `isInstructor`, and `isAdmin` enforce current role. Missing/invalid session yields 401; role/access denial generally 403. Deletion-pending account state uses 423; outdated policy acceptance uses 428. Recovery exceptions allow current-profile read and account-deletion retry; policy acceptance itself is allowed for policy-pending users. Exact allowlisted paths are in middleware and should not be broadened accidentally.

Frontend `PrivateRoute`, `OpenRoute`, and `RoleRoute` make UI behavior consistent, but cannot authorize a direct HTTP request. `internalRedirect` limits post-login destinations to internal paths. Session response integration reacts to server status and clears private learning cache on session loss.

## Google identity

GoogleSignInButton loads Google's browser identity script through a single loader. The browser submits a credential to `/auth/google`; `googleLogin` verifies it server-side against GOOGLE_CLIENT_ID with the bounded Google helper, then requires a verified email and subject. It finds by googleId or normalized email, rejects conflicting existing provider linkage, links an eligible matching local identity, or creates a new Student after policy consent. Existing roles are retained; Google sign-in is not instructor/admin self-promotion. Disabled staging Google configuration removes the button and server capability consistently.

Account deletion may use fresh Google reauthentication for a Google-only user. `profile.js::deleteAccount` verifies subject/email/audience and issuance time against the configured-in-code short freshness window, also rejecting excessive future skew. Local accounts use current password reauthentication. These are destructive-account gates, distinct from ordinary Google sign-in.

## Logout and password changes

`logout` does not require the general auth middleware because expired/invalid cookies should still be cleared. A valid current session causes a conditional sessionVersion increment, revoking all tokens from that version. Invalid/missing tokens clear local cookies. A DB revocation failure returns 503 and retains the session for retry; the browser should not pretend logout succeeded.

`changePassword` verifies the old password, checks new strength, writes bcrypt hash, increments sessionVersion, and issues a fresh cookie for the current browser; other sessions become stale. Notification email is best effort.

`resetPasswordToken` always gives a generic response for eligible/unknown email lookup, generates a random 32-byte challenge, stores only its SHA-256 hash with a 30-minute expiry, and emails an APP_URL link with the challenge in the URL fragment. Mail failure removes the matching pending challenge. `resetPassword` validates token/password/confirmation and atomically matches hash plus future expiry, changes hash/provider state, increments sessionVersion, and removes reset fields. It does not auto-login. Fragment use avoids sending the challenge in the initial page HTTP URL, but the browser still submits it to the reset API.

## Policies, deletion, and security implications

`utils/policyAcceptance.js` defines versioned policy stamps (current source version 2026-07-18), with immutable acceptance audit entries and source. Signup/general-policy consent and checkout/refund-policy snapshots are distinct. Pending-policy users can recover/accept policies but cannot bypass the gate through another API version.

Deletion first verifies identity, refuses Admin self-deletion and instructors with course history, blocks unresolved financial work, and acquires a resumable deletion lock. Pending state restricts use while mirrors/progress/reviews/profile/media are removed and User is anonymized/inactivated. Purchase and policy history remain. Failures leave a retriable restricted state. See FEATURE_FLOWS for ordering.

HttpOnly reduces direct JavaScript token access, not every consequence of XSS. Unsafe browser-origin checks plus cookie posture provide CSRF defenses; there is no synchronizer-token implementation. Missing Origin is allowed for non-browser callers when Fetch Metadata does not identify cross-site use, so exact origin and proxy configuration matter. SessionVersion provides revocation but requires a DB read per protected request. Strong password hashing does not remove the need for login/reset/OTP rate limits. No MFA, social-provider refresh management, or device/session management screen was found.
