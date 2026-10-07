# Complete file map

Baseline: `7b367c0`, 2026-10-04. This indexes all 491 meaningful source/config/text paths, then the lock/OpenAPI artifacts and all other tracked asset paths. Each source entry supplies responsibility, imports/dependencies, declared exports, named functions/components, direct static consumers, and selected named calls. Functional input → processing → output is explained for major operations in BACKEND, AUTHENTICATION, API_MAP and FEATURE_FLOWS. Test behavior is fully indexed in TESTING.

Import consumers include tests and re-export barrels, not a proof that a function executes at runtime. Dynamic module mutation, dependency injection, callbacks, provider scripts, HTTP entry points, npm scripts and file-path configuration can be additional callers. “No static importer” is not a dead-code finding. Function line numbers refer to this audit snapshot. Call names are a navigation index, not a source-code dump; internal built-ins/UI setters may be omitted. Generated/binary source contents are not duplicated.

## Root

### [.dockerignore](../../.dockerignore)

Excludes private/development/generated material from Docker contexts.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

### [.editorconfig](../../.editorconfig)

Editor whitespace/newline convention.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

### [.gitattributes](../../.gitattributes)

Git text/binary/line-ending policy.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

## .github

### [.github/dependabot.yml](../../.github/dependabot.yml)

Weekly npm/GitHub Actions dependency update proposals.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

### [.github/workflows/ci.yml](../../.github/workflows/ci.yml)

Five independent code/contracts/test/build/container verification jobs; no deploy.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

### [.github/workflows/security.yml](../../.github/workflows/security.yml)

Current-file secret scan, dependency review/audit and CodeQL security jobs.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

## Root

### [.gitignore](../../.gitignore)

Repository generated/private/local exclusions.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

### [.nvmrc](../../.nvmrc)

Pins development Node major target 24.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

### [.prettierignore](../../.prettierignore)

Formatting exclusions for generated/output artifacts.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

## .vscode

### [.vscode/settings.json](../../.vscode/settings.json)

Workspace editor formatting/lint preferences.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

## Root

### [README.md](../../README.md)

Root product/workspace/development overview; deployment assertions require source/live corroboration.

- **Consumer / connection:** Repository guidance; not executed.

## apps/api/.env.example

### [apps/api/.env.example](../../apps/api/.env.example)

Environment-name template for .env.example; private values are not copied or inferred.

- **Declared variable names only:** `NODE_ENV`, `DEPLOYMENT_TIER`, `LOG_LEVEL`, `PORT`, `FRONTEND_ORIGINS`, `APP_URL`, `PUBLIC_API_URL`, `BRAND_NAME`, `BRAND_LOGO_URL`, `SUPPORT_EMAIL`, `MONGODB_URI`, `REDIS_URL`, `REDIS_CONNECT_TIMEOUT_MS`, `REDIS_COMMAND_TIMEOUT_MS`, `JWT_SECRET`, `OTP_SECRET`, `ALLOW_DEV_OTP`, `TRUST_PROXY`, `JSON_BODY_LIMIT`, `FORM_BODY_LIMIT`, `UPLOAD_MAX_BYTES`, `REQUEST_TIMEOUT_MS`, `SHUTDOWN_TIMEOUT_MS`, `MONGODB_MAX_POOL_SIZE`, `MONGODB_MIN_POOL_SIZE`, `MONGODB_SERVER_SELECTION_TIMEOUT_MS`, `MONGODB_CONNECT_TIMEOUT_MS`, `MONGODB_OPERATION_TIMEOUT_MS`, `MONGODB_SOCKET_TIMEOUT_MS`, `MONGODB_WAIT_QUEUE_TIMEOUT_MS`, `MONGODB_AUTO_INDEX`, `COOKIE_NAME`, `COOKIE_DOMAIN`, `COOKIE_SAME_SITE`, `COOKIE_SECURE`, `FOLDER_NAME`, `MEDIA_URL_TTL_SECONDS`, `CHECKOUT_TTL_SECONDS`, `RAZORPAY_TIMEOUT_MS`, `GOOGLE_TIMEOUT_MS`, `REFUND_WINDOW_DAYS`, `ENTITLEMENT_SIDECAR_STARTED_AT`, `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `CONTACT_RECIPIENT`, `GOOGLE_CLIENT_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

## apps/api/.env.production.example

### [apps/api/.env.production.example](../../apps/api/.env.production.example)

Environment-name template for .env.production.example; private values are not copied or inferred.

- **Declared variable names only:** `NODE_ENV`, `DEPLOYMENT_TIER`, `LOG_LEVEL`, `PORT`, `FRONTEND_ORIGINS`, `APP_URL`, `PUBLIC_API_URL`, `BRAND_NAME`, `BRAND_LOGO_URL`, `SUPPORT_EMAIL`, `MONGODB_URI`, `REDIS_URL`, `REDIS_CONNECT_TIMEOUT_MS`, `REDIS_COMMAND_TIMEOUT_MS`, `JWT_SECRET`, `OTP_SECRET`, `ALLOW_DEV_OTP`, `TRUST_PROXY`, `JSON_BODY_LIMIT`, `FORM_BODY_LIMIT`, `UPLOAD_MAX_BYTES`, `REQUEST_TIMEOUT_MS`, `SHUTDOWN_TIMEOUT_MS`, `MONGODB_MAX_POOL_SIZE`, `MONGODB_MIN_POOL_SIZE`, `MONGODB_SERVER_SELECTION_TIMEOUT_MS`, `MONGODB_CONNECT_TIMEOUT_MS`, `MONGODB_OPERATION_TIMEOUT_MS`, `MONGODB_SOCKET_TIMEOUT_MS`, `MONGODB_WAIT_QUEUE_TIMEOUT_MS`, `MONGODB_AUTO_INDEX`, `COOKIE_NAME`, `COOKIE_DOMAIN`, `COOKIE_SAME_SITE`, `COOKIE_SECURE`, `GOOGLE_CLIENT_ID`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `CONTACT_RECIPIENT`, `RAZORPAY_KEY_ID`, `RAZORPAY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`, `FOLDER_NAME`, `MEDIA_URL_TTL_SECONDS`, `CHECKOUT_TTL_SECONDS`, `RAZORPAY_TIMEOUT_MS`, `GOOGLE_TIMEOUT_MS`, `REFUND_WINDOW_DAYS`, `ENTITLEMENT_SIDECAR_STARTED_AT`.

## apps/api/.env.staging.example

### [apps/api/.env.staging.example](../../apps/api/.env.staging.example)

Environment-name template for .env.staging.example; private values are not copied or inferred.

- **Declared variable names only:** `NODE_ENV`, `DEPLOYMENT_TIER`, `LOG_LEVEL`, `PORT`, `FRONTEND_ORIGINS`, `APP_URL`, `PUBLIC_API_URL`, `BRAND_NAME`, `BRAND_LOGO_URL`, `SUPPORT_EMAIL`, `MONGODB_URI`, `REDIS_URL`, `REDIS_CONNECT_TIMEOUT_MS`, `REDIS_COMMAND_TIMEOUT_MS`, `JWT_SECRET`, `OTP_SECRET`, `ALLOW_DEV_OTP`, `TRUST_PROXY`, `JSON_BODY_LIMIT`, `FORM_BODY_LIMIT`, `UPLOAD_MAX_BYTES`, `REQUEST_TIMEOUT_MS`, `SHUTDOWN_TIMEOUT_MS`, `MONGODB_MAX_POOL_SIZE`, `MONGODB_MIN_POOL_SIZE`, `MONGODB_SERVER_SELECTION_TIMEOUT_MS`, `MONGODB_CONNECT_TIMEOUT_MS`, `MONGODB_OPERATION_TIMEOUT_MS`, `MONGODB_SOCKET_TIMEOUT_MS`, `MONGODB_WAIT_QUEUE_TIMEOUT_MS`, `MONGODB_AUTO_INDEX`, `COOKIE_NAME`, `COOKIE_DOMAIN`, `COOKIE_SAME_SITE`, `COOKIE_SECURE`, `GOOGLE_CLIENT_ID`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `CONTACT_RECIPIENT`, `RAZORPAY_KEY_ID`, `RAZORPAY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`, `FOLDER_NAME`, `MEDIA_URL_TTL_SECONDS`, `CHECKOUT_TTL_SECONDS`, `RAZORPAY_TIMEOUT_MS`, `GOOGLE_TIMEOUT_MS`, `REFUND_WINDOW_DAYS`, `ENTITLEMENT_SIDECAR_STARTED_AT`.

## apps/api/.env.staging.seed.example

### [apps/api/.env.staging.seed.example](../../apps/api/.env.staging.seed.example)

Environment-name template for .env.staging.seed.example; private values are not copied or inferred.

- **Declared variable names only:** `STUDYNOTION_DEMO_SEED_MODE`, `STUDYNOTION_DISPOSABLE_SEED_CONFIRM`, `STUDYNOTION_DEMO_ADMIN_EMAIL`, `STUDYNOTION_DEMO_ADMIN_PASSWORD`, `STUDYNOTION_DEMO_INSTRUCTOR_EMAIL`, `STUDYNOTION_DEMO_INSTRUCTOR_PASSWORD`, `STUDYNOTION_DEMO_STUDENT_EMAIL`, `STUDYNOTION_DEMO_STUDENT_PASSWORD`, `STUDYNOTION_DEMO_VIDEO_PUBLIC_ID`, `STUDYNOTION_DEMO_VIDEO_FORMAT`.

## apps/api/.gitignore

### [apps/api/.gitignore](../../apps/api/.gitignore)

Repository configuration/support source; inspect listed exports/imports and owning package before changing.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

## apps/api/Dockerfile

### [apps/api/Dockerfile](../../apps/api/Dockerfile)

Workspace-aware image construction and unprivileged runtime/health configuration; see DOCKER.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

## apps/api/README.md

### [apps/api/README.md](../../apps/api/README.md)

Directory/workspace responsibility guide: StudyNotion API. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

## apps/api/app

### [apps/api/app/createApp.js](../../apps/api/app/createApp.js)

Builds Express middleware, request metadata/security, health endpoints and terminal handlers without listening.

- **Imports / dependencies:** `crypto`, `cors`, `express`, `helmet`, `../config/cloudinary`, `../config/database`, `../config/env`, `../config/redis`, `./registerRoutes`, `../shared/http/errorHandler`, `../shared/http/notFoundHandler`, `../utils/logger`.
- **Exports:** `module.exports=createApp`.
- **Named functions / components:** `createApp (L18)`; `operationalMetadata (L43)`; `origin (L51)`.
- **Direct static consumers:** [apps/api/app/index.js](../../apps/api/app/index.js); [apps/api/bootstrap/createApiRuntime.js](../../apps/api/bootstrap/createApiRuntime.js).
- **Selected calls / effects:** `app.use`, `req.get`, `app.get`, `express`, `app.disable`, `app.set`, `helmet`, `crypto.randomUUID`, `res.setHeader`, `createHttpRequestLogger`, `process.uptime`, `cors`, `allowedOrigins.has`, `origin.replace`, `callback`, `res.status`, `operationalMetadata`, `database.isReady`, `redis.isReady`, `isCloudinaryConfigured`, `isShuttingDown`, `res.json`, `registerRoutes`.

### [apps/api/app/index.js](../../apps/api/app/index.js)

Repository configuration/support source; inspect listed exports/imports and owning package before changing.

- **Imports / dependencies:** `./createApp`, `./registerRoutes`.
- **Exports:** `module.exports=...,...`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js)

Registers raw payment webhook before parsers, versioned limits/envelopes/origin checks and all router mounts.

- **Imports / dependencies:** `cookie-parser`, `express`, `../config/env`, `../controllers/payments`, `../middleware/rateLimiters`, `../middleware/trustedOrigin`, `../routes/Admin`, `../routes/CatalogV2`, `../routes/Contact`, `../routes/Course`, `../routes/LearningV2`, `../routes/Payments`, `../routes/profile`, `../routes/user`, `../shared/http/v2ErrorEnvelope`.
- **Exports:** `module.exports=registerRoutes`.
- **Named functions / components:** `registerRoutes (L23)`.
- **Direct static consumers:** [apps/api/app/createApp.js](../../apps/api/app/createApp.js); [apps/api/app/index.js](../../apps/api/app/index.js); [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js).
- **Selected calls / effects:** `app.post`, `app.use`, `express.raw`, `express.json`, `express.urlencoded`, `cookieParser`.

## apps/api/bootstrap

### [apps/api/bootstrap/createApiRuntime.js](../../apps/api/bootstrap/createApiRuntime.js)

Wires app, infrastructure dependencies and lifecycle into a testable runtime.

- **Imports / dependencies:** `../app/createApp`, `./createServerLifecycle`.
- **Exports:** `module.exports=createApiRuntime`.
- **Named functions / components:** `createApiRuntime (L4)`.
- **Direct static consumers:** [apps/api/bootstrap/index.js](../../apps/api/bootstrap/index.js).
- **Selected calls / effects:** `createApp`, `createServerLifecycle`.

### [apps/api/bootstrap/createServerLifecycle.js](../../apps/api/bootstrap/createServerLifecycle.js)

Connects dependencies before HTTP listen; manages readiness, timeouts and bounded graceful shutdown.

- **Imports / dependencies:** `../config/cloudinary`, `../config/database`, `../config/env`, `../config/redis`, `../utils/logger`.
- **Exports:** `module.exports=createServerLifecycle`.
- **Named functions / components:** `createServerLifecycle (L15)`; `startServer (L22)`; `closeHttpServer (L39)`; `captureCleanupFailure (L45)`; `shutdown (L54)`.
- **Direct static consumers:** [apps/api/bootstrap/createApiRuntime.js](../../apps/api/bootstrap/createApiRuntime.js); [apps/api/bootstrap/index.js](../../apps/api/bootstrap/index.js).
- **Selected calls / effects:** `services.database.connect`, `services.redis.connect`, `services.redis.disconnect`, `services.database.disconnect`, `services.cloudinaryConnect`, `app.listen`, `services.logger.info`, `resolve`, `server.close`, `reject`, `cleanup`, `setTimeout`, `services.logger.error`, `process.exit`, `forceExit.unref`, `captureCleanupFailure`, `Promise.all`, `failures.map`, `clearTimeout`.

### [apps/api/bootstrap/index.js](../../apps/api/bootstrap/index.js)

Repository configuration/support source; inspect listed exports/imports and owning package before changing.

- **Imports / dependencies:** `./createApiRuntime`, `./createServerLifecycle`.
- **Exports:** `module.exports=...,...`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/index.js](../../apps/api/index.js); [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

## apps/api/config

### [apps/api/config/cloudinary.js](../../apps/api/config/cloudinary.js)

Configures Cloudinary credentials/security and exposes configuration readiness.

- **Imports / dependencies:** `cloudinary`, `../utils/logger`.
- **Exports:** `module.exports=cloudinaryConnect,isCloudinaryConfigured`.
- **Named functions / components:** `hasCredentials (L7)`; `cloudinaryConnect (L14)`.
- **Direct static consumers:** [apps/api/app/createApp.js](../../apps/api/app/createApp.js); [apps/api/bootstrap/createServerLifecycle.js](../../apps/api/bootstrap/createServerLifecycle.js).
- **Selected calls / effects:** `hasCredentials`, `logger.warn`, `cloudinary.config`, `logger.info`.

### [apps/api/config/database.js](../../apps/api/config/database.js)

Mongoose connection options/events, bounded operations and readiness/cleanup.

- **Imports / dependencies:** `mongoose`, `./env`, `../utils/logger`.
- **Exports:** `module.exports=connect,disconnect,isReady`.
- **Named functions / components:** `connect (L31)`; `disconnect (L59)`; `isReady (L72)`.
- **Direct static consumers:** [apps/api/app/createApp.js](../../apps/api/app/createApp.js); [apps/api/bootstrap/createServerLifecycle.js](../../apps/api/bootstrap/createServerLifecycle.js); [apps/api/test/database-config.test.js](../../apps/api/test/database-config.test.js).
- **Selected calls / effects:** `mongoose.connection.on`, `mongoose.connect`, `mongoose.disconnect`, `mongoose.set`, `logger.info`, `logger.warn`, `logger.error`.

### [apps/api/config/env.js](../../apps/api/config/env.js)

Fail-fast environment contract: tiers, private providers, same-site cookies/origins, proxy count, TLS dependencies and bounded runtime options.

- **Imports / dependencies:** `../utils/mongoDeployment`, `../utils/deploymentNetwork`, `tldts`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** `isEmail (L102)`; `emailAddressFrom (L107)`; `isValidCookieDomain (L113)`; `isValidMediaFolder (L134)`; `readInteger (L341)`; `readBoolean (L351)`; `readSize (L359)`; `parseOrigins (L367)`; `domainContains (L475)`; `parseTrustProxy (L508)`.
- **Direct static consumers:** [apps/api/app/createApp.js](../../apps/api/app/createApp.js); [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js); [apps/api/bootstrap/createServerLifecycle.js](../../apps/api/bootstrap/createServerLifecycle.js); [apps/api/config/database.js](../../apps/api/config/database.js); [apps/api/config/razorpay.js](../../apps/api/config/razorpay.js); [apps/api/config/redis.js](../../apps/api/config/redis.js); [apps/api/controllers/Auth.js](../../apps/api/controllers/Auth.js); [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js); [apps/api/controllers/resetPassword.js](../../apps/api/controllers/resetPassword.js); [apps/api/middleware/trustedOrigin.js](../../apps/api/middleware/trustedOrigin.js); [apps/api/middleware/upload.js](../../apps/api/middleware/upload.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/test/learning-v2.integration.test.js](../../apps/api/test/learning-v2.integration.test.js); [apps/api/utils/auth.js](../../apps/api/utils/auth.js); [apps/api/utils/googleIdentity.js](../../apps/api/utils/googleIdentity.js); [apps/api/utils/purchaseLifecycle.js](../../apps/api/utils/purchaseLifecycle.js).
- **Selected calls / effects:** `entitlementSidecarStartedAt.getTime`, `supportedNodeEnvironments.has`, `missing.join`, `normalized.match`, `isLoopbackHostname`, `folder.startsWith`, `folder.endsWith`, `folder.includes`, `placeholderPattern.test`, `placeholders.join`, `process.env.BRAND_NAME.trim`, `validateProductionMongoUri`, `isEmail`, `process.env.EMAIL_REPLY_TO.trim`, `emailAddressFrom`, `Number.isFinite`, `entitlementSidecarStartedAt.toISOString`, `Date.now`, `isValidMediaFolder`, `Number.isInteger`, `origin.trim`, `parseOrigins`, `frontendOrigins.includes`, `getDomain`, `applicationSites.some`, `isValidCookieDomain`, `cookieDomain.replace`, `hostname.endsWith`, `domainContains`, `cookieName.startsWith`, `readBoolean`, `readInteger`.

### [apps/api/config/loadEnvironment.js](../../apps/api/config/loadEnvironment.js)

Loads only API-owned local environment file; avoids old root/server fallback.

- **Imports / dependencies:** `node:path`, `dotenv`.
- **Exports:** `module.exports=apiEnvironmentPath,loadEnvironment`.
- **Named functions / components:** `loadEnvironment (L7)`.
- **Direct static consumers:** [apps/api/index.js](../../apps/api/index.js); [apps/api/scripts/audit-enrollment-consistency.js](../../apps/api/scripts/audit-enrollment-consistency.js); [apps/api/scripts/backfill-security-fields.js](../../apps/api/scripts/backfill-security-fields.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/scripts/provision-admin.js](../../apps/api/scripts/provision-admin.js); [apps/api/scripts/reconcile-entitlements.js](../../apps/api/scripts/reconcile-entitlements.js); [apps/api/scripts/schedule-entitlement-recovery.js](../../apps/api/scripts/schedule-entitlement-recovery.js); [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/environment-loader.test.js](../../apps/api/test/environment-loader.test.js).
- **Selected calls / effects:** `path.resolve`, `configure`.

### [apps/api/config/razorpay.js](../../apps/api/config/razorpay.js)

Constructs optional configured Razorpay SDK client used by payment controller.

- **Imports / dependencies:** `razorpay`, `./env`, `../utils/logger`.
- **Exports:** `exports.instance=instance`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js).
- **Selected calls / effects:** `logger.warn`.

### [apps/api/config/redis.js](../../apps/api/config/redis.js)

Rate-limit Redis connection/ping/readiness and bounded command lifecycle; no product cache.

- **Imports / dependencies:** `redis`, `./env`, `../utils/deadline`, `../utils/logger`.
- **Exports:** `module.exports=connect,disconnect,isConfigured,isReady,sendCommand`.
- **Named functions / components:** `isConfigured (L9)`; `commandTimeoutMs (L11)`; `getClient (L13)`; `reconnectStrategy (L24)`; `connect (L36)`; `disconnect (L61)`; `isReady (L74)`; `sendCommand (L76)`.
- **Direct static consumers:** [apps/api/app/createApp.js](../../apps/api/app/createApp.js); [apps/api/bootstrap/createServerLifecycle.js](../../apps/api/bootstrap/createServerLifecycle.js); [apps/api/middleware/rateLimiters.js](../../apps/api/middleware/rateLimiters.js); [apps/api/test/catalog-v2.integration.test.js](../../apps/api/test/catalog-v2.integration.test.js); [apps/api/test/learning-v2.integration.test.js](../../apps/api/test/learning-v2.integration.test.js); [apps/api/test/redis-deadline.test.js](../../apps/api/test/redis-deadline.test.js).
- **Selected calls / effects:** `redisClient.connect`, `redisClient.destroy`, `isConfigured`, `createClient`, `commandTimeoutMs`, `client.on`, `logger.error`, `getClient`, `withDeadline`, `redisClient.ping`, `logger.info`, `redisClient.sendCommand`.

## apps/api/controllers

### [apps/api/controllers/Admin.js](../../apps/api/controllers/Admin.js)

Paginated pending instructor queue and audited idempotent approval/rejection transitions.

- **Imports / dependencies:** `mongoose`, `../models/User`, `../utils/logger`.
- **Exports:** `exports.listPendingInstructors`; `exports.approveInstructor=CallExpression`; `exports.rejectInstructor=CallExpression`.
- **Named functions / components:** `pendingInstructorFilter (L24)`; `parsePositiveInteger (L34)`; `normalizeReviewNote (L47)`; `deriveApprovalStatus (L50)`; `findInstructor (L58)`; `exports.listPendingInstructors (L67)`; `reviewInstructor (L118)`.
- **Direct static consumers:** [apps/api/routes/Admin.js](../../apps/api/routes/Admin.js).
- **Selected calls / effects:** `User.findOne`, `User.find`, `User.countDocuments`, `User.findOneAndUpdate`, `Number.isSafeInteger`, `value.trim`, `parsePositiveInteger`, `res.status`, `pendingInstructorFilter`, `Promise.all`, `logger.error`, `logger.errorMetadata`, `normalizeReviewNote`, `mongoose.isValidObjectId`, `findInstructor`, `deriveApprovalStatus`, `decision.toLowerCase`, `currentStatus.toLowerCase`, `reviewInstructor`.

### [apps/api/controllers/Auth.js](../../apps/api/controllers/Auth.js)

Registration/OTP, local/Google login, policy acceptance, password change, logout; safe DTOs, session cookies and revocation.

- **Imports / dependencies:** `bcryptjs`, `crypto`, `../mail/templates/emailVerificationTemplate`, `../mail/templates/passwordUpdate`, `../models/OTP`, `../models/Profile`, `../models/User`, `../config/env`, `../utils/auth`, `../utils/mailSender`, `../utils/googleIdentity`, `../utils/logger`, `../utils/policyAcceptance`, `../utils/validation`.
- **Exports:** `exports.signup`; `exports.login`; `exports.googleLogin`; `exports.sendotp`; `exports.changePassword`; `exports.acceptPolicies`; `exports.logout`.
- **Named functions / components:** `hashOtp (L38)`; `otpMatches (L44)`; `setPrivateNoStore (L53)`; `toPublicAuthenticatedUser (L58)`; `sendAuthenticatedResponse (L76)`; `exports.signup (L94)`; `exports.login (L224)`; `exports.googleLogin (L268)`; `exports.sendotp (L391)`; `exports.changePassword (L451)`; `exports.acceptPolicies (L511)`; `exports.logout (L548)`.
- **Direct static consumers:** [apps/api/routes/user.js](../../apps/api/routes/user.js).
- **Selected calls / effects:** `User.findById`, `issueSession`, `OTP.findOne`, `OTP.updateOne`, `Profile.create`, `User.create`, `Profile.findByIdAndDelete`, `OTP.deleteOne`, `User.findOne`, `ticket.getPayload`, `User.updateOne`, `OTP.findOneAndUpdate`, `mailSender`, `user.save`, `readSessionToken`, `clearSession`, `verifySessionToken`, `Buffer.from`, `crypto.timingSafeEqual`, `res.setHeader`, `user.toJSON`, `setPrivateNoStore`, `res.status`, `hasCurrentPolicyAcceptance`, `toPublicAuthenticatedUser`, `normalizeEmail`, `normalizePersonName`, `isValidEmail`, `ALLOWED_PUBLIC_ACCOUNT_TYPES.has`, `hasAffirmativePolicyAcceptance`, `isStrongPassword`, `User.exists`.

### [apps/api/controllers/CatalogV2.js](../../apps/api/controllers/CatalogV2.js)

Adapts parsed catalog query and request ID to catalog service and v2 errors.

- **Imports / dependencies:** `../domains/catalog/catalogErrors`, `../domains/catalog/catalogService`, `../utils/logger`.
- **Exports:** `exports.listCatalogCourses`.
- **Named functions / components:** `exports.listCatalogCourses (L10)`.
- **Direct static consumers:** [apps/api/routes/CatalogV2.js](../../apps/api/routes/CatalogV2.js).
- **Selected calls / effects:** `listCatalogCourses`, `performance.now`, `logger.warn`, `res.setHeader`, `res.status`, `sendV2Error`, `logger.error`, `logger.errorMetadata`.

### [apps/api/controllers/Category.js](../../apps/api/controllers/Category.js)

Admin category creation and sanitized public category/legacy category-page queries.

- **Imports / dependencies:** `../models/Category`, `../models/Course`, `mongoose`, `../utils/logger`.
- **Exports:** `exports.createCategory`; `exports.showAllCategories`; `exports.categoryPageDetails`; `exports._test=publicCategory,publicCourse,topSellingPipeline`.
- **Named functions / components:** `getRandomInt (L6)`; `publicCourse (L31)`; `publicCategory (L48)`; `exports.createCategory (L56)`; `exports.showAllCategories (L89)`; `exports.categoryPageDetails (L123)`.
- **Direct static consumers:** [apps/api/routes/Course.js](../../apps/api/routes/Course.js); [apps/api/test/category-privacy.test.js](../../apps/api/test/category-privacy.test.js).
- **Selected calls / effects:** `Category.create`, `Category.find`, `Course.aggregate`, `countsByCategory.get`, `Category.findById`, `Course.distinct`, `Course.find`, `topSellingById.get`, `mostSellingCourses.map`, `course.toObject`, `value.ratingAndReviews.map`, `category.toObject`, `res.status`, `logger.error`, `logger.errorMetadata`, `Promise.all`, `publishedCounts.map`, `categories.map`, `category._id.toString`, `mongoose.isValidObjectId`, `getRandomInt`, `topSellingRanks.map`, `topSellingDocuments.map`, `publicCategory`.

### [apps/api/controllers/ContactUs.js](../../apps/api/controllers/ContactUs.js)

Bounded validated contact input and escaped mail to configured recipient.

- **Imports / dependencies:** `../mail/templates/contactFormRes`, `../utils/logger`, `../utils/mailSender`.
- **Exports:** `exports.contactUsController`.
- **Named functions / components:** `readText (L9)`; `exports.contactUsController (L12)`.
- **Direct static consumers:** [apps/api/routes/Contact.js](../../apps/api/routes/Contact.js); [apps/api/test/contact-security.test.js](../../apps/api/test/contact-security.test.js).
- **Selected calls / effects:** `mailSender`, `value.trim`, `readText`, `countryCode.replace`, `EMAIL_PATTERN.test`, `COUNTRY_CODE_PATTERN.test`, `PHONE_PATTERN.test`, `res.status`, `contactUsEmail`, `logger.error`, `logger.errorMetadata`.

### [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js)

Owned authoring, public/protected projections, publish readiness, playback signing, archive-or-delete lifecycle.

- **Imports / dependencies:** `../models/Course`, `../models/Category`, `../models/Section`, `../models/Subsection`, `../models/User`, `../models/Purchase`, `../models/RatingandReview`, `../utils/imageUploader`, `../models/CourseProgress`, `../utils/secToDuration`, `mongoose`, `../config/env`, `../utils/courseLifecycle`, `../utils/courseDto`, `../utils/logger`, `../utils/purchaseLifecycle`.
- **Exports:** `exports.createCourse`; `exports.editCourse`; `exports.getAllCourses`; `exports.getCourseDetails`; `exports.getFullCourseDetails`; `exports.getLessonPlaybackUrl`; `exports.getInstructorCourses`; `exports.deleteCourse`; `exports._test=normalizeCourseMetadata,sanitizeEntitledCourse,sanitizeInstructorCourse`.
- **Named functions / components:** `resolveCourseAccess (L29)`; `sanitizeEntitledCourse (L68)`; `normalizeRequiredText (L95)`; `normalizeRequiredList (L101)`; `normalizeCourseMetadata (L111)`; `exports.createCourse (L154)`; `exports.editCourse (L347)`; `exports.getAllCourses (L604)`; `exports.getCourseDetails (L695)`; `exports.getFullCourseDetails (L756)`; `exports.getLessonPlaybackUrl (L870)`; `exports.getInstructorCourses (L961)`; `exports.deleteCourse (L988)`; `archiveCourse (L1019)`.
- **Direct static consumers:** [apps/api/routes/Course.js](../../apps/api/routes/Course.js); [apps/api/test/course-management-lifecycle.test.js](../../apps/api/test/course-management-lifecycle.test.js); [apps/api/test/course-playback-security.test.js](../../apps/api/test/course-playback-security.test.js).
- **Selected calls / effects:** `Course.findById`, `User.findById`, `Category.findById`, `Course.create`, `User.findByIdAndUpdate`, `Category.findByIdAndUpdate`, `Course.findByIdAndDelete`, `sanitizeInstructorCourse`, `Course.findOne`, `normalizeCourseMetadata`, `isCoursePublishReady`, `Category.updateOne`, `course.save`, `Course.find`, `allCourses.map`, `sanitizeEntitledCourse`, `resolveCourseAccess`, `CourseProgress.findOne`, `SubSection.findById`, `instructorCourses.map`, `confirmationCourseName.trim`, `Course.updateOne`, `archiveCourse`, `Purchase.exists`, `Section.findById`, `SubSection.findByIdAndDelete`, `Section.findByIdAndDelete`, `CourseProgress.find`, `User.updateMany`, `CourseProgress.deleteMany`, `RatingAndReview.deleteMany`, `Purchase.deleteMany`.

### [apps/api/controllers/LearningV2.js](../../apps/api/controllers/LearningV2.js)

Adapts authenticated parsed course/lesson input to learning service and v2 errors.

- **Imports / dependencies:** `../domains/learning/learningErrors`, `../domains/learning/learningService`, `../utils/logger`.
- **Exports:** `exports.getLearningCourse`; `exports.markLessonComplete`.
- **Named functions / components:** `executeLearningRequest (L13)`; `exports.getLearningCourse (L42)`; `exports.markLessonComplete (L55)`.
- **Direct static consumers:** [apps/api/routes/LearningV2.js](../../apps/api/routes/LearningV2.js).
- **Selected calls / effects:** `getLearningCourse`, `performance.now`, `operation`, `logger.warn`, `res.setHeader`, `res.status`, `sendV2Error`, `logger.error`, `logger.errorMetadata`, `executeLearningRequest`, `markLessonComplete`.

### [apps/api/controllers/RatingandReview.js](../../apps/api/controllers/RatingandReview.js)

Enrollment-gated unique reviews, average aggregation and identifier-minimized public review feed.

- **Imports / dependencies:** `../models/RatingandReview`, `../models/Course`, `mongoose`, `../utils/logger`.
- **Exports:** `exports.createRating`; `exports.getAverageRating`; `exports.getAllRatingReview`.
- **Named functions / components:** `exports.createRating (L7)`; `exports.getAverageRating (L82)`; `exports.getAllRatingReview (L130)`.
- **Direct static consumers:** [apps/api/routes/Course.js](../../apps/api/routes/Course.js); [apps/api/test/rating-contract.test.js](../../apps/api/test/rating-contract.test.js); [apps/api/test/review-privacy.test.js](../../apps/api/test/review-privacy.test.js).
- **Selected calls / effects:** `Course.findOne`, `RatingAndReview.create`, `Course.findByIdAndUpdate`, `RatingAndReview.aggregate`, `RatingAndReview.find`, `mongoose.isValidObjectId`, `Number.isInteger`, `res.status`, `logger.error`, `logger.errorMetadata`, `allReviews.map`, `document.toObject`.

### [apps/api/controllers/Section.js](../../apps/api/controllers/Section.js)

Owned course-section changes and financially constrained curriculum deletion.

- **Imports / dependencies:** `../models/Section`, `../models/Course`, `../models/Subsection`, `../models/CourseProgress`, `../models/Purchase`, `../utils/imageUploader`, `../utils/courseLifecycle`, `../utils/courseDto`, `../utils/logger`, `mongoose`.
- **Exports:** `exports.createSection`; `exports.updateSection`; `exports.deleteSection`.
- **Named functions / components:** `exports.createSection (L12)`; `exports.updateSection (L107)`; `exports.deleteSection (L182)`.
- **Direct static consumers:** [apps/api/routes/Course.js](../../apps/api/routes/Course.js); [apps/api/test/curriculum-deletion-security.test.js](../../apps/api/test/curriculum-deletion-security.test.js).
- **Selected calls / effects:** `Course.findOne`, `Section.create`, `Course.findOneAndUpdate`, `Section.findByIdAndDelete`, `sanitizeInstructorCourse`, `Section.findByIdAndUpdate`, `Course.findById`, `Purchase.exists`, `Section.findById`, `SubSection.find`, `Course.findByIdAndUpdate`, `SubSection.deleteMany`, `CourseProgress.updateMany`, `req.body.sectionName.trim`, `mongoose.isValidObjectId`, `res.status`, `logger.error`, `logger.errorMetadata`, `Promise.all`, `unpublishIfIncomplete`, `Promise.allSettled`, `deleteAssetFromCloudinary`.

### [apps/api/controllers/Subsection.js](../../apps/api/controllers/Subsection.js)

Owned lesson upload/edit/deletion with authenticated media metadata, membership checks and cleanup.

- **Imports / dependencies:** `../models/Course`, `../models/Section`, `../models/Subsection`, `../models/CourseProgress`, `../models/Purchase`, `mongoose`, `../utils/imageUploader`, `../utils/courseLifecycle`, `../utils/logger`.
- **Exports:** `exports.createSubSection`; `exports.updateSubSection`; `exports.deleteSubSection`.
- **Named functions / components:** `courseVideoFolder (L15)`; `readText (L18)`; `findOwnedSection (L24)`; `exports.createSubSection (L37)`; `exports.updateSubSection (L129)`; `exports.deleteSubSection (L260)`.
- **Direct static consumers:** [apps/api/routes/Course.js](../../apps/api/routes/Course.js); [apps/api/test/curriculum-deletion-security.test.js](../../apps/api/test/curriculum-deletion-security.test.js).
- **Selected calls / effects:** `Course.findOne`, `Section.findOne`, `SubSection.create`, `Section.findByIdAndUpdate`, `SubSection.findByIdAndDelete`, `SubSection.findById`, `subSection.save`, `Section.findById`, `Purchase.exists`, `CourseProgress.updateMany`, `value.trim`, `Promise.all`, `readText`, `mongoose.isValidObjectId`, `res.status`, `findOwnedSection`, `uploadImageToCloudinary`, `courseVideoFolder`, `deleteAssetFromCloudinary`, `logger.error`, `logger.errorMetadata`, `unpublishIfIncomplete`.

### [apps/api/controllers/courseProgress.js](../../apps/api/controllers/courseProgress.js)

Compatibility v1 mark-complete path: enrollment/current lesson checks and idempotent progress; commented percentage code is not live.

- **Imports / dependencies:** `mongoose`, `../models/Section`, `../models/CourseProgress`, `../models/Course`, `../utils/logger`.
- **Exports:** `exports.updateCourseProgress`.
- **Named functions / components:** `exports.updateCourseProgress (L7)`.
- **Direct static consumers:** [apps/api/routes/Course.js](../../apps/api/routes/Course.js); [apps/api/test/course-progress-v1-characterization.test.js](../../apps/api/test/course-progress-v1-characterization.test.js); [apps/api/test/mongoose-9-compatibility.test.js](../../apps/api/test/mongoose-9-compatibility.test.js).
- **Selected calls / effects:** `Course.findOne`, `CourseProgress.findOneAndUpdate`, `mongoose.isValidObjectId`, `res.status`, `Section.exists`, `logger.error`, `logger.errorMetadata`.

### [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js)

Server-priced checkout reservations, provider verification/webhook, fulfillment, learner refund/history and Admin reconciliation state machines.

- **Imports / dependencies:** `crypto`, `mongoose`, `../config/razorpay`, `../config/env`, `../models/Course`, `../models/CourseProgress`, `../models/Purchase`, `../models/User`, `../utils/logger`, `../utils/mailSender`, `../mail/templates/courseEnrollmentEmail`, `../mail/templates/paymentSuccessEmail`, `../utils/policyAcceptance`, `../utils/purchaseLifecycle`, `../domains/entitlement/entitlementService`.
- **Exports:** `exports.getCheckoutConfig`; `exports.capturePayment`; `exports.razorpayWebhook`; `exports.verifyPayment`; `exports.requestRefund`; `exports.listMyPurchases`; `exports.listPaymentReviews`; `exports.resolvePaymentReview`; `exports.sendPaymentSuccessEmail`.
- **Named functions / components:** `safeLogIdentifier (L43)`; `logPaymentFailure (L48)`; `boundedCourseCount (L72)`; `entitlementEventFields (L75)`; `logEntitlementEvent (L89)`; `runEntitlementSidecar (L98)`; `paymentUnavailable (L118)`; `paymentFailed (L124)`; `exports.getCheckoutConfig (L127)`; `callRazorpay (L143)`; `signaturesMatch (L160)`; `normalizeCourseIds (L177)`; `readIdempotencyKey (L193)`; `courseSetsMatch (L202)`; `checkoutResponse (L212)`; `checkoutIsExpired (L226)`; `holdCapturedPaymentForReview (L241)`; `recoverProviderOrder (L271)`; `respondForExistingCheckout (L307)`; `fulfillPurchase (L345)`; `reconcileUnfulfilledCapturedPayment (L521)`; `exports.capturePayment (L544)`; `exports.razorpayWebhook (L820)`; `exports.verifyPayment (L952)`; `refundDeadline (L1042)`; `exports.requestRefund (L1055)`; `exports.listMyPurchases (L1151)`; `paymentReviewDto (L1235)`; `parseReviewPagination (L1274)`; `exports.listPaymentReviews (L1290)`; `recoverPurchaseRefund (L1339)`; `revokeRefundedEntitlements (L1363)`; `exports.resolvePaymentReview (L1408)`; `exports.sendPaymentSuccessEmail (L1943)`; `enrollStudent (L1999)`; `sendEnrollmentEmails (L2096)`.
- **Direct static consumers:** [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js); [apps/api/routes/Admin.js](../../apps/api/routes/Admin.js); [apps/api/routes/Payments.js](../../apps/api/routes/Payments.js); [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js).
- **Selected calls / effects:** `boundedCourseCount`, `req.get`, `Purchase.findOneAndUpdate`, `Purchase.findByIdAndUpdate`, `runEntitlementSidecar`, `reserveForPurchase`, `activateForPurchase`, `now.getTime`, `Purchase.findOne`, `logEntitlementEvent`, `sendEnrollmentEmails`, `normalizeCourseIds`, `Course.find`, `coursesById.get`, `orderedCourses.some`, `orderedCourses.map`, `User.findOneAndUpdate`, `lockNow.getTime`, `Purchase.create`, `User.updateOne`, `Course.countDocuments`, `instance.orders.create`, `fulfillPurchase`, `instance.payments.fetch`, `Purchase.find`, `Purchase.countDocuments`, `instance.payments.fetchMultipleRefund`, `matchingRefunds.find`, `Purchase.exists`, `revocableCourses.push`, `CourseProgress.distinct`, `Course.updateMany`.

### [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js)

Safe profile/avatar/enrolled/revenue projections and reauthenticated resumable deletion/anonymization.

- **Imports / dependencies:** `bcryptjs`, `crypto`, `../models/Course`, `../models/CourseProgress`, `../models/OTP`, `../models/Profile`, `../models/Purchase`, `../models/RatingandReview`, `../models/User`, `../utils/auth`, `../utils/googleIdentity`, `../utils/logger`, `../utils/imageUploader`, `../utils/secToDuration`, `../utils/validation`, `../utils/purchaseLifecycle`, `../domains/entitlement/entitlementService`.
- **Exports:** `exports.updateProfile`; `exports.deleteAccount`; `exports.getAllUserDetails`; `exports.updateDisplayPicture`; `exports.getEnrolledCourses`; `exports.instructorDashboard`; `exports._test=buildEnrolledCourseDto,buildProfileUpdates,ProfileValidationError`.
- **Named functions / components:** `runAccountDeletionSidecar (L33)`; `hasOwn (L58)`; `readString (L61)`; `readDateOfBirth (L75)`; `readContactNumber (L105)`; `buildProfileUpdates (L117)`; `buildEnrolledCourseDto (L158)`; `exports.updateProfile (L195)`; `exports.deleteAccount (L258)`; `exports.getAllUserDetails (L581)`; `exports.updateDisplayPicture (L616)`; `exports.getEnrolledCourses (L686)`; `exports.instructorDashboard (L742)`.
- **Direct static consumers:** [apps/api/routes/profile.js](../../apps/api/routes/profile.js); [apps/api/test/profile-security.test.js](../../apps/api/test/profile-security.test.js).
- **Selected calls / effects:** `today.getUTCFullYear`, `today.getUTCMonth`, `today.getUTCDate`, `date.getUTCFullYear`, `date.getUTCMonth`, `date.getUTCDate`, `date.getTime`, `User.findById`, `Profile.findByIdAndUpdate`, `Profile.findById`, `Profile.create`, `User.findByIdAndUpdate`, `Profile.findByIdAndDelete`, `ticket.getPayload`, `Course.exists`, `Purchase.exists`, `User.findOneAndUpdate`, `lockNow.getTime`, `User.updateOne`, `RatingAndReview.find`, `Course.updateMany`, `CourseProgress.deleteMany`, `RatingAndReview.deleteMany`, `OTP.deleteMany`, `clearSession`, `CourseProgress.find`, `buildEnrolledCourseDto`, `progressByCourse.get`, `Course.find`, `Purchase.find`, `ownedCourseIds.has`, `revenueByCourse.set`.

### [apps/api/controllers/resetPassword.js](../../apps/api/controllers/resetPassword.js)

Generic email reset issuance and atomic hashed single-use password reset with session revocation.

- **Imports / dependencies:** `bcryptjs`, `crypto`, `../config/env`, `../mail/templates/templateUtils`, `../models/User`, `../utils/logger`, `../utils/mailSender`, `../utils/validation`.
- **Exports:** `exports.resetPasswordToken`; `exports.resetPassword`.
- **Named functions / components:** `hashToken (L19)`; `exports.resetPasswordToken (L22)`; `exports.resetPassword (L92)`.
- **Direct static consumers:** [apps/api/routes/user.js](../../apps/api/routes/user.js).
- **Selected calls / effects:** `crypto.createHash`, `User.findOne`, `User.updateOne`, `mailSender`, `User.findOneAndUpdate`, `normalizeEmail`, `isValidEmail`, `res.status`, `crypto.randomBytes`, `hashToken`, `Date.now`, `emailLayout`, `resetUrl.toString`, `logger.error`, `logger.errorMetadata`, `isStrongPassword`, `bcrypt.hash`.

## apps/api/domains

### [apps/api/domains/catalog/catalogCursor.js](../../apps/api/domains/catalog/catalogCursor.js)

Opaque versioned keyset cursor bound to normalized filter fingerprint and stable sort/ID tie break.

- **Imports / dependencies:** `crypto`, `./catalogErrors`.
- **Exports:** `module.exports=SORT_DEFINITIONS,decodeCatalogCursor,encodeCatalogCursor,filterFingerprint`.
- **Named functions / components:** `normalizedFilterState (L17)`; `filterFingerprint (L30)`; `invalidCursor (L37)`; `normalizeCursorValue (L44)`; `encodeCatalogCursor (L55)`; `decodeCatalogCursor (L70)`.
- **Direct static consumers:** [apps/api/domains/catalog/catalogRepository.js](../../apps/api/domains/catalog/catalogRepository.js); [apps/api/domains/catalog/catalogService.js](../../apps/api/domains/catalog/catalogService.js); [apps/api/test/catalog-v2-repository.test.js](../../apps/api/test/catalog-v2-repository.test.js); [apps/api/test/catalog-v2-service.test.js](../../apps/api/test/catalog-v2-service.test.js).
- **Selected calls / effects:** `date.getTime`, `normalizedFilterState`, `Number.isNaN`, `invalidCursor`, `date.toISOString`, `Number.isFinite`, `OBJECT_ID_PATTERN.test`, `filterFingerprint`, `normalizeCursorValue`, `Buffer.from`.

### [apps/api/domains/catalog/catalogErrors.js](../../apps/api/domains/catalog/catalogErrors.js)

Catalog error type and stable public v2 failure mapping.

- **Imports / dependencies:** `../../shared/http/v2ErrorEnvelope`.
- **Exports:** `module.exports=CatalogApiError,createV2ErrorEnvelope,isV2Request,normalizeV2ErrorEnvelope,sendV2Error`.
- **Named functions / components:** `constructor (L2)`.
- **Direct static consumers:** [apps/api/controllers/CatalogV2.js](../../apps/api/controllers/CatalogV2.js); [apps/api/domains/catalog/catalogCursor.js](../../apps/api/domains/catalog/catalogCursor.js); [apps/api/domains/catalog/catalogService.js](../../apps/api/domains/catalog/catalogService.js); [apps/api/routes/CatalogV2.js](../../apps/api/routes/CatalogV2.js); [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js); [apps/api/test/catalog-v2-service.test.js](../../apps/api/test/catalog-v2-service.test.js).
- **Selected calls / effects:** `super`.

### [apps/api/domains/catalog/catalogMapper.js](../../apps/api/domains/catalog/catalogMapper.js)

Maps aggregate data into public contract fields, normalized rating/duration/level/language.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=mapCatalogCourse`.
- **Named functions / components:** `positiveInteger (L4)`; `mapInstructor (L9)`; `mapCategory (L26)`; `mapCatalogCourse (L32)`.
- **Direct static consumers:** [apps/api/domains/catalog/catalogService.js](../../apps/api/domains/catalog/catalogService.js); [apps/api/test/catalog-v2-service.test.js](../../apps/api/test/catalog-v2-service.test.js).
- **Selected calls / effects:** `Number.isFinite`, `value.trim`, `instructor.image.trim`, `category.name.trim`, `document.language.trim`, `document._id.toString`, `mapInstructor`, `mapCategory`, `positiveInteger`, `VALID_LEVELS.has`, `LANGUAGE_PATTERN.test`.

### [apps/api/domains/catalog/catalogRepository.js](../../apps/api/domains/catalog/catalogRepository.js)

Published-course aggregation, indexed base filters, conditional computed metrics and keyset paging.

- **Imports / dependencies:** `mongoose`, `../../models/Category`, `../../models/Course`, `../../models/RatingandReview`, `../../models/Section`, `../../models/Subsection`, `../../models/User`, `./catalogCursor`.
- **Exports:** `module.exports=buildCatalogPipeline,listPublishedCourses`.
- **Named functions / components:** `buildBaseMatch (L11)`; `buildComputedMatch (L27)`; `buildCursorMatch (L47)`; `ratingStages (L64)`; `durationStages (L98)`; `buildCatalogPipeline (L188)`; `listPublishedCourses (L279)`.
- **Direct static consumers:** [apps/api/domains/catalog/catalogService.js](../../apps/api/domains/catalog/catalogService.js); [apps/api/test/catalog-v2-repository.test.js](../../apps/api/test/catalog-v2-repository.test.js); [apps/api/test/catalog-v2.integration.test.js](../../apps/api/test/catalog-v2.integration.test.js); [apps/api/test/mongoose-models.integration.test.js](../../apps/api/test/mongoose-models.integration.test.js).
- **Selected calls / effects:** `Course.aggregate`, `buildComputedMatch`, `buildCursorMatch`, `buildBaseMatch`, `pipeline.push`, `ratingStages`, `durationStages`, `buildCatalogPipeline`.

### [apps/api/domains/catalog/catalogService.js](../../apps/api/domains/catalog/catalogService.js)

Decode cursor → repository limit+1 → DTO/pageInfo → validate public response.

- **Imports / dependencies:** `@studynotion/contracts`, `./catalogCursor`, `./catalogErrors`, `./catalogMapper`, `./catalogRepository`.
- **Exports:** `module.exports=listCatalogCourses`.
- **Named functions / components:** `listCatalogCourses (L8)`.
- **Direct static consumers:** [apps/api/controllers/CatalogV2.js](../../apps/api/controllers/CatalogV2.js); [apps/api/test/catalog-v2-service.test.js](../../apps/api/test/catalog-v2-service.test.js).
- **Selected calls / effects:** `repository.listPublishedCourses`, `catalogCourseListResponseSchema.safeParse`, `decodeCatalogCursor`, `documents.slice`, `encodeCatalogCursor`, `pageDocuments.map`.

### [apps/api/domains/enrollment/enrollmentConsistency.js](../../apps/api/domains/enrollment/enrollmentConsistency.js)

Pure evidence classifier for duplicated enrollment scenarios and corruption/deletion exceptions.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=ENROLLMENT_DIVERGENCE_SCENARIOS,EnrollmentConsistencyInputError,INACTIVE_ACTIVE_COURSE_STATUSES,MAX_PAIR_COUNT,MIRROR_STATES,PURCHASE_STATUSES,QUALIFYING_COMMERCIAL_STATUSES,REFUND_PENDING_ORIGINS,REFERENCE_STATES,classifyEnrollmentPairState,mapEnrollmentConsistencyDryRun`.
- **Named functions / components:** `constructor (L110)`; `isPlainObject (L117)`; `deepFreeze (L123)`; `assertKnownKeys (L131)`; `normalizeObjectId (L141)`; `normalizeReference (L150)`; `normalizeCount (L168)`; `normalizeStatusCounts (L177)`; `normalizeRefundPendingOriginCounts (L192)`; `normalizePairState (L207)`; `sumObjectCounts (L387)`; `sumCounts (L391)`; `selectMirrorState (L394)`; `selectScenarios (L406)`; `issue (L451)`; `financialEvidence (L453)`; `evaluatePairState (L468)`; `summarizeIssues (L894)`; `classifyEnrollmentPairState (L902)`; `addCourseMirror (L913)`; `addUserMirror (L919)`; `removeCourseMirror (L925)`; `removeUserMirror (L931)`; `removeProgress (L937)`; `removeProgressMirror (L942)`; `residualLearnerStateWrites (L947)`; `residualRuntimeLearnerStateWrites (L957)`; `proposalForIssue (L966)`; `mapEnrollmentConsistencyDryRun (L1130)`.
- **Direct static consumers:** [apps/api/domains/enrollment/enrollmentConsistencyRepository.js](../../apps/api/domains/enrollment/enrollmentConsistencyRepository.js); [apps/api/domains/enrollment/enrollmentConsistencyService.js](../../apps/api/domains/enrollment/enrollmentConsistencyService.js); [apps/api/test/enrollment-consistency-repository.test.js](../../apps/api/test/enrollment-consistency-repository.test.js); [apps/api/test/enrollment-consistency.integration.test.js](../../apps/api/test/enrollment-consistency.integration.test.js); [apps/api/test/enrollment-consistency.test.js](../../apps/api/test/enrollment-consistency.test.js).
- **Selected calls / effects:** `input.userAccountType.trim`, `inactiveActiveCourseStatuses.join`, `removeCourseMirror`, `removeProgress`, `removeProgressMirror`, `addCourseMirror`, `OPTIONAL_PAIR_STATE_KEYS.has`, `super`, `deepFreeze`, `allowedKeys.has`, `OBJECT_ID_PATTERN.test`, `value.toLowerCase`, `normalizeObjectId`, `Number.isSafeInteger`, `isPlainObject`, `assertKnownKeys`, `PURCHASE_STATUSES.map`, `normalizeCount`, `REFUND_PENDING_ORIGINS.map`, `normalizeReference`, `normalizeStatusCounts`, `normalizeRefundPendingOriginCounts`, `sumObjectCounts`, `sumCounts`, `statuses.reduce`, `scenarios.push`, `normalizePairState`, `INACTIVE_ACTIVE_COURSE_STATUSES.filter`, `USER_ACCOUNT_TYPES.has`, `selectMirrorState`, `selectScenarios`, `issues.push`.

### [apps/api/domains/enrollment/enrollmentConsistencyReport.js](../../apps/api/domains/enrollment/enrollmentConsistencyReport.js)

Bounded samples, aggregate/scenario output and never-automatic dry-run repair proposals.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=EnrollmentConsistencyReportValidationError,MAX_REPORT_MAP_ENTRIES,MAX_REPORT_SAMPLES,assertEnrollmentConsistencyReport`.
- **Named functions / components:** `constructor (L31)`; `fail (L38)`; `isPlainObject (L42)`; `assertPlainObject (L48)`; `assertExactKeys (L52)`; `assertCount (L62)`; `checkedSum (L68)`; `validateCountMap (L79)`; `parseTimestamp (L95)`; `assertEnrollmentConsistencyReport (L107)`.
- **Direct static consumers:** [apps/api/scripts/audit-enrollment-consistency.js](../../apps/api/scripts/audit-enrollment-consistency.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js).
- **Selected calls / effects:** `report.requestId.trim`, `super`, `isPlainObject`, `fail`, `expectedKeys.has`, `Number.isSafeInteger`, `assertPlainObject`, `MAP_KEY_PATTERN.test`, `assertCount`, `checkedSum`, `entries.map`, `Date.parse`, `Number.isFinite`, `assertExactKeys`, `REPORT_MODES.has`, `REPORT_STATUSES.has`, `parseTimestamp`, `validateCountMap`.

### [apps/api/domains/enrollment/enrollmentConsistencyRepository.js](../../apps/api/domains/enrollment/enrollmentConsistencyRepository.js)

Read-only streamed union aggregation of Purchase/User/Course/Progress references and evidence.

- **Imports / dependencies:** `../../models/Course`, `../../models/CourseProgress`, `../../models/Purchase`, `../../models/User`, `./enrollmentConsistency`.
- **Exports:** `module.exports=AUDIT_QUERY_COMMENT,PURCHASE_STATUSES,buildEnrollmentConsistencyPipeline,createEnrollmentConsistencyRepository,mapPairState`.
- **Named functions / components:** `counterName (L16)`; `referenceStateExpression (L22)`; `nullableObjectIdExpression (L30)`; `purchasePairStages (L34)`; `mirrorPairStages (L98)`; `sourceCount (L122)`; `nonUserCourseEvidenceCount (L128)`; `studentUserCourseCount (L134)`; `duplicateSourceReferenceCount (L144)`; `purchaseStatusCount (L160)`; `unknownPurchaseStatusCount (L175)`; `refundPendingOriginCount (L190)`; `refundOriginCounterName (L217)`; `buildEnrollmentConsistencyPipeline (L220)`; `nonNegativeInteger (L407)`; `safeObjectId (L414)`; `statusCounts (L429)`; `refundPendingOriginCounts (L437)`; `mapPairState (L445)`; `validatePositiveInteger (L511)`; `createEnrollmentConsistencyRepository (L517)`; `configuredAggregation (L525)`; `streamPairStates (L534)`.
- **Direct static consumers:** [apps/api/domains/enrollment/enrollmentConsistencyService.js](../../apps/api/domains/enrollment/enrollmentConsistencyService.js); [apps/api/test/enrollment-consistency-repository.test.js](../../apps/api/test/enrollment-consistency-repository.test.js); [apps/api/test/enrollment-consistency.integration.test.js](../../apps/api/test/enrollment-consistency.integration.test.js).
- **Selected calls / effects:** `unknownPurchaseStatusCount`, `nonUserCourseEvidenceCount`, `studentUserCourseCount`, `PurchaseModel.aggregate`, `buildEnrollmentConsistencyPipeline`, `part.slice`, `nullableObjectIdExpression`, `referenceStateExpression`, `counterName`, `sourceCount`, `duplicateSourceReferenceCount`, `purchaseStatusCount`, `refundOriginCounterName`, `refundPendingOriginCount`, `purchasePairStages`, `mirrorPairStages`, `PURCHASE_STATUSES.flatMap`, `REFUND_PENDING_ORIGINS.flatMap`, `Number.isFinite`, `value.toHexString`, `value.toString`, `OBJECT_ID_PATTERN.test`, `candidate.toLowerCase`, `PURCHASE_STATUSES.map`, `nonNegativeInteger`, `REFUND_PENDING_ORIGINS.map`, `safeObjectId`, `SAFE_ACCOUNT_TYPES.has`, `statusCounts`, `refundPendingOriginCounts`, `Number.isSafeInteger`, `validatePositiveInteger`.

### [apps/api/domains/enrollment/enrollmentConsistencyService.js](../../apps/api/domains/enrollment/enrollmentConsistencyService.js)

Coordinates streamed read-only classification and report generation.

- **Imports / dependencies:** `node:crypto`, `../../utils/logger`, `./enrollmentConsistency`, `./enrollmentConsistencyRepository`.
- **Exports:** `module.exports=MAX_SAMPLE_LIMIT,createEnrollmentConsistencyService,pairReportDto,reportStatus`.
- **Named functions / components:** `sumStatusCounts (L15)`; `compareText (L18)`; `sortedCounts (L20)`; `pairReportDto (L25)`; `validateSampleLimit (L44)`; `validateMode (L52)`; `reportStatus (L58)`; `createEnrollmentConsistencyService (L64)`; `audit (L70)`.
- **Direct static consumers:** [apps/api/scripts/audit-enrollment-consistency.js](../../apps/api/scripts/audit-enrollment-consistency.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/test/enrollment-consistency-service.test.js](../../apps/api/test/enrollment-consistency-service.test.js); [apps/api/test/enrollment-consistency.integration.test.js](../../apps/api/test/enrollment-consistency.integration.test.js).
- **Selected calls / effects:** `createEnrollmentConsistencyRepository`, `classifyEnrollmentPairState`, `scenarioCounts.get`, `issueCounts.get`, `mapEnrollmentConsistencyDryRun`, `PURCHASE_STATUSES.reduce`, `counts.entries`, `compareText`, `sumStatusCounts`, `Number.isSafeInteger`, `createRequestId`, `validateMode`, `validateSampleLimit`, `clock`, `targetLogger.info`, `repository.streamPairStates`, `scenarioCounts.set`, `issueCounts.set`, `samples.push`, `pairReportDto`, `targetLogger.error`, `logger.errorMetadata`, `reportStatus`, `sortedCounts`, `targetLogger.warn`.

### [apps/api/domains/entitlement/entitlementPolicy.js](../../apps/api/domains/entitlement/entitlementPolicy.js)

Pure state, transition, immutability and revision rules; vocabulary includes future access/replacement work.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=AUDIT_ACTIONS,AUDIT_OUTCOME_CODES,AUDIT_STATUSES,ENTITLEMENT_CANCELLATION_REASONS,ENTITLEMENT_POLICY_ERROR_CODES,ENTITLEMENT_RECONCILIATION_CODES,ENTITLEMENT_REPLACEMENT_ABANDON_REASONS,ENTITLEMENT_REPLACEMENT_DECISIONS,ENTITLEMENT_REPLACEMENT_OUTCOMES,ENTITLEMENT_REVOCATION_REASONS,ENTITLEMENT_SOURCES,ENTITLEMENT_STATUSES,EntitlementPolicyError,assertAuditTransition,assertEntitlementMutation,assertEntitlementOperationAuditMutation,assertEntitlementOperationAuditState,assertEntitlementState,assertTransition,canTransition,canTransitionAudit,isAccessGranting,isTerminal`.
- **Named functions / components:** `constructor (L146)`; `fail (L153)`; `isObject (L157)`; `isPresent (L160)`; `assertObject (L162)`; `assertEnum (L166)`; `assertAbsent (L172)`; `assertPresent (L180)`; `assertDate (L188)`; `assertDateWhenPresent (L194)`; `assertSafeInteger (L198)`; `assertTrimmedString (L209)`; `referenceKey (L220)`; `comparableValue (L228)`; `valuesEqual (L235)`; `assertReference (L238)`; `assertTimestampsWhenPresent (L247)`; `assertLifecycleShape (L252)`; `isRefundTerminal (L335)`; `assertReplacementShape (L341)`; `assertOperationalShape (L442)`; `assertEntitlementState (L521)`; `canTransition (L554)`; `assertTransition (L557)`; `isTerminal (L567)`; `isAccessGranting (L569)`; `changedFields (L578)`; `assertImmutableFields (L581)`; `assertWriteOnceFields (L589)`; `assertReplacementMutation (L600)`; `assertProvisioningOperationalMutation (L649)`; `assertTerminalOperationalMutation (L778)`; `assertLifecycleMutation (L859)`; `assertEntitlementMutation (L872)`; `canTransitionAudit (L907)`; `assertAuditTransition (L910)`; `assertEntitlementOperationAuditState (L920)`; `assertEntitlementOperationAuditMutation (L976)`.
- **Direct static consumers:** [apps/api/domains/entitlement/entitlementRecoveryService.js](../../apps/api/domains/entitlement/entitlementRecoveryService.js); [apps/api/domains/entitlement/entitlementRepository.js](../../apps/api/domains/entitlement/entitlementRepository.js); [apps/api/domains/entitlement/entitlementService.js](../../apps/api/domains/entitlement/entitlementService.js); [apps/api/models/Entitlement.js](../../apps/api/models/Entitlement.js); [apps/api/models/EntitlementOperationAudit.js](../../apps/api/models/EntitlementOperationAudit.js); [apps/api/test/entitlement-policy.test.js](../../apps/api/test/entitlement-policy.test.js); [apps/api/test/entitlement-service.test.js](../../apps/api/test/entitlement-service.test.js).
- **Selected calls / effects:** `value.getTime`, `state.revokedAt.getTime`, `state.grantedAt.getTime`, `assertEntitlementState`, `state.completedAt.getTime`, `state.requestedAt.getTime`, `assertEntitlementOperationAuditState`, `super`, `isObject`, `fail`, `values.includes`, `values.join`, `isPresent`, `Number.isNaN`, `assertDate`, `Number.isSafeInteger`, `value.trim`, `referenceKey`, `comparableValue`, `assertDateWhenPresent`, `assertAbsent`, `assertPresent`, `assertEnum`, `REPLACEMENT_FIELDS.some`, `isRefundTerminal`, `assertReference`, `valuesEqual`, `assertSafeInteger`, `assertTrimmedString`, `assertObject`, `assertLifecycleShape`, `assertOperationalShape`.

### [apps/api/domains/entitlement/entitlementPurchaseEvidence.js](../../apps/api/domains/entitlement/entitlementPurchaseEvidence.js)

Validates persisted post-boundary native IDs, financial sets/amounts/status/timestamps before sidecar writes.

- **Imports / dependencies:** `mongoose`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** `validDate (L24)`; `referenceKey (L27)`; `referencesEqual (L40)`; `persistedObjectId (L46)`; `validLineItem (L48)`; `analyzePurchaseCourseEvidence (L55)`; `purchaseHasVerifiedCapture (L102)`; `purchaseIsInSidecarCohort (L107)`; `purchaseHasActivationEvidence (L115)`; `purchaseHasProcessedRefundEvidence (L120)`; `purchaseFinancialState (L162)`; `purchaseAllowsActivation (L217)`; `purchaseMatchesEpisode (L238)`.
- **Direct static consumers:** [apps/api/domains/entitlement/entitlementRecoveryService.js](../../apps/api/domains/entitlement/entitlementRecoveryService.js); [apps/api/domains/entitlement/entitlementRepository.js](../../apps/api/domains/entitlement/entitlementRepository.js); [apps/api/domains/entitlement/entitlementService.js](../../apps/api/domains/entitlement/entitlementService.js); [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/entitlement-purchase-evidence.test.js](../../apps/api/test/entitlement-purchase-evidence.test.js); [apps/api/test/seed-safety.test.js](../../apps/api/test/seed-safety.test.js).
- **Selected calls / effects:** `value.getTime`, `analyzePurchaseCourseEvidence`, `Number.isFinite`, `referenceKey`, `persistedObjectId`, `purchase.courses.every`, `purchase.courses.map`, `purchase.lineItems.every`, `courseIds.every`, `purchase.lineItems.filter`, `validDate`, `purchaseHasVerifiedCapture`, `purchaseHasActivationEvidence`, `PURCHASE_STATUSES.has`, `NON_SIDECAR_PURCHASE_STATUSES.has`, `purchaseHasProcessedRefundEvidence`, `purchaseAllowsActivation`, `purchaseIsInSidecarCohort`, `referencesEqual`, `courseEvidence.courseIds.includes`.

### [apps/api/domains/entitlement/entitlementRecoveryService.js](../../apps/api/domains/entitlement/entitlementRecoveryService.js)

Bounded catch-up/retry/lease sweep/manual handoff; does not call providers or repair legacy authorization.

- **Imports / dependencies:** `node:crypto`, `../../utils/logger`, `./entitlementPolicy`, `./entitlementPurchaseEvidence`, `./entitlementRepository`, `./entitlementService`.
- **Exports:** `module.exports=INITIAL_RECOVERY_DELAY_MS,RECOVERY_DEFAULT_BATCH_SIZE,RECOVERY_BATCH_BUDGET_MS,RECOVERY_LEASE_MS,RECOVERY_MAX_AGE_MS,RECOVERY_MAX_ATTEMPTS,RECOVERY_MAX_BATCH_SIZE,RETRY_DELAYS_MS,accountDeletionCancellationPostState,accountDeletionRevocationPostState,activationPostState,ageHandoffPostState,classifyRecoveryEvidence,createEntitlementRecoveryService,failureReleasePostState,refundCancellationPostState,sanitizeCatchUpReport,sanitizeOperationalStatus,validateBatchSize,validateContinuation`.
- **Named functions / components:** `isDate (L41)`; `hasOwn (L44)`; `asDate (L47)`; `asNow (L53)`; `validateBatchSize (L55)`; `validateContinuation (L68)`; `referenceKey (L78)`; `referenceMatches (L86)`; `referenceCount (L89)`; `userMatchesEpisode (L94)`; `courseMatchesEpisode (L104)`; `userIsCompletedDeletionTombstone (L107)`; `legacyGrantIsComplete (L133)`; `classifyRecoveryEvidence (L138)`; `cloneEpisode (L219)`; `advanceEpisode (L221)`; `activationPostState (L229)`; `refundCancellationPostState (L236)`; `accountDeletionCancellationPostState (L270)`; `accountDeletionRevocationPostState (L286)`; `ageHandoffPostState (L294)`; `retryDelayForAttempt (L299)`; `failureReleasePostState (L306)`; `safeLog (L332)`; `validateCount (L341)`; `sanitizeCatchUpReport (L348)`; `emptyCatchUpCounts (L365)`; `sanitizeOperationalStatus (L373)`; `createDefaultDependencies (L462)`; `createEntitlementRecoveryService (L475)`; `invokeFailpoint (L504)`; `readDatabaseTime (L505)`; `assertBoundaryEpisode (L508)`; `assertProvisioningRecoveryShape (L521)`; `assertClaimedEpisode (L550)`; `assertYoungClaimedEpisode (L568)`; `assertAgedProvisioningEpisode (L578)`; `transitionEpisode (L593)`; `deadlineReached (L616)`; `deadlineOutcome (L618)`; `releaseClaim (L620)`; `processClaimedEpisode (L650)`; `claimDueProvisioning (L721)`; `sweepExpiredLease (L762)`; `handoffAgedProvisioning (L796)`; `runBoundaryCatchUp (L823)`; `getOperationalStatus (L872)`; `runBatch (L881)`.
- **Direct static consumers:** [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/scripts/reconcile-entitlements.js](../../apps/api/scripts/reconcile-entitlements.js); [apps/api/scripts/schedule-entitlement-recovery.js](../../apps/api/scripts/schedule-entitlement-recovery.js); [apps/api/test/entitlement-recovery-service.test.js](../../apps/api/test/entitlement-recovery-service.test.js); [apps/api/test/entitlement-repository.test.js](../../apps/api/test/entitlement-repository.test.js); [apps/api/test/entitlement-stage2.integration.test.js](../../apps/api/test/entitlement-stage2.integration.test.js).
- **Selected calls / effects:** `value.getTime`, `assertEntitlementMutation`, `now.getTime`, `createEntitlementRepository`, `createEntitlementService`, `claimed.reconciliationLeaseUntil.getTime`, `repository.findExpiredProvisioningLease`, `repository.findAgedProvisioning`, `sidecarService.catchUpBoundaryPurchases`, `repository.getRecoveryOperationalStatus`, `startedAt.getTime`, `completedAt.getTime`, `Number.isFinite`, `isDate`, `asDate`, `clock`, `Number.isSafeInteger`, `CONTINUATION_PATTERN.test`, `referenceKey`, `values.filter`, `referenceMatches`, `hasOwn`, `referenceCount`, `purchaseMatchesEpisode`, `userIsCompletedDeletionTombstone`, `purchaseFinancialState`, `purchaseHasProcessedRefundEvidence`, `purchaseAllowsActivation`, `userMatchesEpisode`, `courseMatchesEpisode`, `legacyGrantIsComplete`, `cloneEpisode`.

### [apps/api/domains/entitlement/entitlementRepository.js](../../apps/api/domains/entitlement/entitlementRepository.js)

Explicit private projections, DB-time bounded scans, current-episode uniqueness and revision/lease compare-and-set writes.

- **Imports / dependencies:** `node:async_hooks`, `mongoose`, `../../models/Course`, `../../models/CourseProgress`, `../../models/Entitlement`, `../../models/Purchase`, `../../models/User`, `./entitlementPolicy`, `./entitlementPurchaseEvidence`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** `currentOperationSignal (L112)`; `runWithEntitlementOperationSignal (L113)`; `hasOwn (L123)`; `comparable (L126)`; `valuesEqual (L137)`; `validDate (L138)`; `purchaseBoundaryEvidenceValid (L140)`; `policyValidEpisode (L148)`; `exactEpisodeIdentity (L157)`; `exactRefundTerminal (L164)`; `exactAccountDeletionTerminal (L191)`; `exactCompletedDeletionUser (L206)`; `classifyBoundaryPurchaseDocument (L231)`; `summarizeBoundaryCandidates (L339)`; `internalLean (L384)`; `plainInternalDocument (L390)`; `selectedLean (L402)`; `configureOperationalQuery (L408)`; `boundedDocuments (L426)`; `boundedLimit (L438)`; `assertOperationalEpisodeShape (L446)`; `exactOptionalField (L480)`; `transitionUpdate (L484)`; `createEntitlementRepository (L507)`; `findPurchaseEpisodes (L514)`; `findCurrentPairEpisodes (L522)`; `readDatabaseTime (L531)`; `transitionEpisode (L551)`; `createBoundaryPurchaseAggregate (L672)`; `findBoundaryPurchaseCandidates (L903)`; `explainBoundaryPurchaseCandidates (L922)`; `scanBoundaryPurchaseStatus (L932)`; `evaluateLifecycleStatusPage (L965)`; `scanLifecycleOperationalStatus (L1189)`.
- **Direct static consumers:** [apps/api/domains/entitlement/entitlementRecoveryService.js](../../apps/api/domains/entitlement/entitlementRecoveryService.js); [apps/api/domains/entitlement/entitlementService.js](../../apps/api/domains/entitlement/entitlementService.js); [apps/api/test/entitlement-repository.test.js](../../apps/api/test/entitlement-repository.test.js); [apps/api/test/entitlement-stage2.integration.test.js](../../apps/api/test/entitlement-stage2.integration.test.js).
- **Selected calls / effects:** `operationContext.getStore`, `value.getTime`, `analyzePurchaseCourseEvidence`, `assertEntitlementState`, `episode.cancelledAt.getTime`, `purchase.refundProcessedAt.getTime`, `episode.grantedAt.getTime`, `purchase.fulfilledAt.getTime`, `episode.revokedAt.getTime`, `purchase.refundEntitlementsRevokedAt.getTime`, `terminalAt.getTime`, `courseIds.find`, `exactByCourse.has`, `exactByCourse.set`, `exactByCourse.get`, `EntitlementModel.find`, `result.localTime.getTime`, `assertEntitlementMutation`, `EntitlementModel.findOneAndUpdate`, `mongoose.Types.ObjectId.createFromTime`, `startedAt.getTime`, `PurchaseModel.schema.path`, `PurchaseModel.aggregate`, `createBoundaryPurchaseAggregate`, `classifyBoundaryPurchaseDocument`, `findBoundaryPurchaseCandidates`, `validPurchaseEpisodes.push`, `validPurchaseEpisodes.map`, `UserModel.find`, `CourseModel.find`, `CourseProgressModel.find`, `PurchaseModel.find`.

### [apps/api/domains/entitlement/entitlementService.js](../../apps/api/domains/entitlement/entitlementService.js)

Non-gating reserve/activate/refund/deletion sidecar orchestration with fresh evidence and deadline context.

- **Imports / dependencies:** `../../utils/logger`, `./entitlementRepository`, `./entitlementPolicy`, `./entitlementPurchaseEvidence`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** `constructor (L43)`; `fail (L50)`; `hasOwn (L54)`; `parseSidecarStartedAt (L57)`; `resolveNow (L82)`; `safeRequestId (L93)`; `boundedDuration (L98)`; `clockMilliseconds (L101)`; `boundedCount (L107)`; `errorReason (L110)`; `emit (L115)`; `exactPurchaseCourseIds (L123)`; `userIsEligible (L147)`; `isCompletedDeletionTombstone (L157)`; `episodeMatches (L183)`; `validEpisodeState (L189)`; `exactActiveEpisode (L198)`; `exactAccountDeletionEpisode (L205)`; `episodeByCourse (L220)`; `includesId (L223)`; `without (L226)`; `provisioningEpisode (L232)`; `refundTerminalEpisode (L247)`; `accountDeletionTerminalEpisode (L277)`; `createEntitlementService (L311)`; `configuredBoundary (L324)`; `requireBoundary (L343)`; `isBoundaryPurchase (L354)`; `assertWithinDeadline (L358)`; `repositoryCall (L373)`; `reserveForPurchase (L378)`; `activateForPurchase (L541)`; `terminalizeProcessedRefund (L728)`; `loadCompletedDeletionEvidence (L798)`; `terminalizeAccountDeletion (L948)`; `terminalizeDeletedPurchase (L1070)`; `catchUpBoundaryPurchases (L1235)`; `runNonAuthoritativeSidecar (L1379)`.
- **Direct static consumers:** [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/domains/entitlement/entitlementRecoveryService.js](../../apps/api/domains/entitlement/entitlementRecoveryService.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/test/entitlement-service.test.js](../../apps/api/test/entitlement-service.test.js); [apps/api/test/entitlement-stage2.integration.test.js](../../apps/api/test/entitlement-stage2.integration.test.js).
- **Selected calls / effects:** `value.getTime`, `analyzePurchaseCourseEvidence`, `assertEntitlementState`, `episode.grantedAt.getTime`, `fulfilledAt.getTime`, `purchase.fulfilledAt.getTime`, `episode.revokedAt.getTime`, `user.deletionStartedAt.getTime`, `episode.cancelledAt.getTime`, `now.getTime`, `deadlineAt.getTime`, `exactPurchaseCourseIds`, `isBoundaryPurchase`, `existingCourseIds.has`, `repository.findPurchaseEpisodes`, `episodeByCourse`, `existingByCourse.get`, `repository.findCurrentPairEpisodes`, `existingByCourse.has`, `repository.insertEntitlementEpisodes`, `convergedByCourse.get`, `repository.findCurrentPairEpisode`, `repository.loadPurchaseEvidence`, `byCourse.has`, `refreshedCourseIds.some`, `evidence.purchase.paidAt.getTime`, `purchase.paidAt.getTime`, `evidence.purchase.fulfilledAt.getTime`, `coursesById.get`, `progressCourseIds.has`, `byCourse.get`, `operationNow.getTime`.

### [apps/api/domains/learning/learningErrors.js](../../apps/api/domains/learning/learningErrors.js)

Learning error vocabulary and stable v2 response adapter.

- **Imports / dependencies:** `../../shared/http/v2ErrorEnvelope`.
- **Exports:** `module.exports=LearningApiError,sendV2Error`.
- **Named functions / components:** `constructor (L2)`.
- **Direct static consumers:** [apps/api/controllers/LearningV2.js](../../apps/api/controllers/LearningV2.js); [apps/api/domains/learning/learningService.js](../../apps/api/domains/learning/learningService.js); [apps/api/routes/LearningV2.js](../../apps/api/routes/LearningV2.js); [apps/api/test/learning-v2-service.test.js](../../apps/api/test/learning-v2-service.test.js).
- **Selected calls / effects:** `super`.

### [apps/api/domains/learning/learningMapper.js](../../apps/api/domains/learning/learningMapper.js)

Canonicalizes ordered surviving curriculum, deduplicates IDs and computes intersected completion percent.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=curriculumLessonIds,mapLearningCourseState,mapLearningCurriculum,mapLearningProgress`.
- **Named functions / components:** `idOf (L1)`; `text (L6)`; `label (L8)`; `durationSeconds (L10)`; `isoDateTime (L17)`; `mapLearningCurriculum (L23)`; `curriculumLessonIds (L68)`; `mapLearningProgress (L73)`; `mapLearningCourseState (L96)`.
- **Direct static consumers:** [apps/api/domains/learning/learningService.js](../../apps/api/domains/learning/learningService.js); [apps/api/test/learning-v2-mapper.test.js](../../apps/api/test/learning-v2-mapper.test.js).
- **Selected calls / effects:** `date.getTime`, `sectionsById.get`, `lessonsById.get`, `mapLearningProgress`, `id.toLowerCase`, `value.trim`, `text`, `Number.isFinite`, `Number.isNaN`, `date.toISOString`, `sections.map`, `idOf`, `lessons.map`, `seenSectionIds.has`, `seenSectionIds.add`, `seenLessonIds.has`, `seenLessonIds.add`, `mappedLessons.push`, `label`, `durationSeconds`, `curriculum.push`, `curriculum.flatMap`, `curriculumLessonIds`, `validLessonIds.filter`, `storedCompletedIds.has`, `isoDateTime`.

### [apps/api/domains/learning/learningRepository.js](../../apps/api/domains/learning/learningRepository.js)

Current Course enrollment authorization, curriculum/progress reads, race-safe unique completion upsert.

- **Imports / dependencies:** `../../models/Course`, `../../models/CourseProgress`, `../../models/Section`, `../../models/Subsection`.
- **Exports:** `module.exports=courseExists,findCourseProgress,findCurriculum,findEntitledCourse,markLessonComplete`.
- **Named functions / components:** `uniqueIds (L9)`; `findEntitledCourse (L13)`; `courseExists (L18)`; `findCurriculum (L21)`; `findCourseProgress (L40)`; `updateCompletedLesson (L45)`; `markLessonComplete (L58)`.
- **Direct static consumers:** [apps/api/domains/learning/learningService.js](../../apps/api/domains/learning/learningService.js).
- **Selected calls / effects:** `Course.findOne`, `Course.exists`, `Section.find`, `SubSection.find`, `CourseProgress.findOne`, `CourseProgress.findOneAndUpdate`, `value.toString`, `uniqueIds`, `sections.flatMap`, `updateCompletedLesson`.

### [apps/api/domains/learning/learningService.js](../../apps/api/domains/learning/learningService.js)

Course access and lesson-membership decisions, mapper orchestration and strict response validation.

- **Imports / dependencies:** `@studynotion/contracts/learning`, `./learningErrors`, `./learningMapper`, `./learningRepository`.
- **Exports:** `module.exports=getLearningCourse,markLessonComplete`.
- **Named functions / components:** `resolveEntitledCourse (L15)`; `parseResponse (L33)`; `getLearningCourse (L45)`; `markLessonComplete (L68)`.
- **Direct static consumers:** [apps/api/controllers/LearningV2.js](../../apps/api/controllers/LearningV2.js); [apps/api/test/learning-v2-service.test.js](../../apps/api/test/learning-v2-service.test.js).
- **Selected calls / effects:** `repository.findEntitledCourse`, `resolveEntitledCourse`, `repository.findCurriculum`, `repository.findCourseProgress`, `mapLearningCourseState`, `mapLearningProgress`, `repository.courseExists`, `schema.safeParse`, `Promise.all`, `mapLearningCurriculum`, `parseResponse`, `lessonId.toLowerCase`, `curriculumLessonIds`, `repository.markLessonComplete`.

## apps/api/index.js

### [apps/api/index.js](../../apps/api/index.js)

Process entry: loads API-owned environment, composes runtime, and handles startup/fatal signals.

- **Imports / dependencies:** `./config/loadEnvironment`, `./bootstrap`, `./utils/logger`.
- **Exports:** `module.exports=app,shutdown,startServer`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js); [apps/api/test/catalog-v2-http.test.js](../../apps/api/test/catalog-v2-http.test.js); [apps/api/test/catalog-v2.integration.test.js](../../apps/api/test/catalog-v2.integration.test.js); [apps/api/test/http-contract.test.js](../../apps/api/test/http-contract.test.js); [apps/api/test/learning-v2.integration.test.js](../../apps/api/test/learning-v2.integration.test.js).
- **Selected calls / effects:** `loadEnvironment`, `createApiRuntime`, `startServer`, `logger.error`, `shutdown`, `process.once`, `logger.errorMetadata`.

## apps/api/mail

### [apps/api/mail/templates/contactFormRes.js](../../apps/api/mail/templates/contactFormRes.js)

Escaped transactional email contactFormRes markup/branding helper consumed by mail-producing controllers; no transport itself.

- **Imports / dependencies:** `./templateUtils`.
- **Exports:** `exports.contactUsEmail`.
- **Named functions / components:** `exports.contactUsEmail (L3)`.
- **Direct static consumers:** [apps/api/controllers/ContactUs.js](../../apps/api/controllers/ContactUs.js).
- **Selected calls / effects:** `escapeHtml`.

### [apps/api/mail/templates/courseEnrollmentEmail.js](../../apps/api/mail/templates/courseEnrollmentEmail.js)

Escaped transactional email courseEnrollmentEmail markup/branding helper consumed by mail-producing controllers; no transport itself.

- **Imports / dependencies:** `./templateUtils`.
- **Exports:** `exports.courseEnrollmentEmail`.
- **Named functions / components:** `exports.courseEnrollmentEmail (L3)`.
- **Direct static consumers:** [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js).
- **Selected calls / effects:** `branding`, `emailLayout`, `escapeHtml`.

### [apps/api/mail/templates/emailVerificationTemplate.js](../../apps/api/mail/templates/emailVerificationTemplate.js)

Escaped transactional email emailVerificationTemplate markup/branding helper consumed by mail-producing controllers; no transport itself.

- **Imports / dependencies:** `./templateUtils`.
- **Exports:** `module.exports`.
- **Named functions / components:** `module.exports (L3)`.
- **Direct static consumers:** [apps/api/controllers/Auth.js](../../apps/api/controllers/Auth.js).
- **Selected calls / effects:** `emailLayout`, `escapeHtml`.

### [apps/api/mail/templates/passwordUpdate.js](../../apps/api/mail/templates/passwordUpdate.js)

Escaped transactional email passwordUpdate markup/branding helper consumed by mail-producing controllers; no transport itself.

- **Imports / dependencies:** `./templateUtils`.
- **Exports:** `exports.passwordUpdated`.
- **Named functions / components:** `exports.passwordUpdated (L3)`.
- **Direct static consumers:** [apps/api/controllers/Auth.js](../../apps/api/controllers/Auth.js).
- **Selected calls / effects:** `emailLayout`, `escapeHtml`.

### [apps/api/mail/templates/paymentSuccessEmail.js](../../apps/api/mail/templates/paymentSuccessEmail.js)

Escaped transactional email paymentSuccessEmail markup/branding helper consumed by mail-producing controllers; no transport itself.

- **Imports / dependencies:** `./templateUtils`.
- **Exports:** `exports.paymentSuccessEmail`.
- **Named functions / components:** `exports.paymentSuccessEmail (L3)`.
- **Direct static consumers:** [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js).
- **Selected calls / effects:** `Number.isFinite`, `normalizedAmount.toFixed`, `emailLayout`, `escapeHtml`.

### [apps/api/mail/templates/templateUtils.js](../../apps/api/mail/templates/templateUtils.js)

Escaped transactional email templateUtils markup/branding helper consumed by mail-producing controllers; no transport itself.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=branding,emailLayout,escapeHtml`.
- **Named functions / components:** `escapeHtml (L1)`; `safeHttpUrl (L13)`; `branding (L24)`; `emailLayout (L43)`.
- **Direct static consumers:** [apps/api/controllers/resetPassword.js](../../apps/api/controllers/resetPassword.js); [apps/api/mail/templates/contactFormRes.js](../../apps/api/mail/templates/contactFormRes.js); [apps/api/mail/templates/courseEnrollmentEmail.js](../../apps/api/mail/templates/courseEnrollmentEmail.js); [apps/api/mail/templates/emailVerificationTemplate.js](../../apps/api/mail/templates/emailVerificationTemplate.js); [apps/api/mail/templates/passwordUpdate.js](../../apps/api/mail/templates/passwordUpdate.js); [apps/api/mail/templates/paymentSuccessEmail.js](../../apps/api/mail/templates/paymentSuccessEmail.js).
- **Selected calls / effects:** `url.toString`, `safeHttpUrl`, `branding`, `escapeHtml`.

## apps/api/middleware

### [apps/api/middleware/auth.js](../../apps/api/middleware/auth.js)

Verifies JWT plus current User/sessionVersion; policy/deletion gates and DB-derived role helpers.

- **Imports / dependencies:** `../models/User`, `../utils/auth`, `../utils/logger`, `../utils/policyAcceptance`.
- **Exports:** `exports.auth`; `exports.isStudent=CallExpression`; `exports.isInstructor=CallExpression`; `exports.isAdmin=CallExpression`.
- **Named functions / components:** `exports.auth (L17)`; `requireAccountType (L118)`.
- **Direct static consumers:** [apps/api/routes/Admin.js](../../apps/api/routes/Admin.js); [apps/api/routes/Course.js](../../apps/api/routes/Course.js); [apps/api/routes/LearningV2.js](../../apps/api/routes/LearningV2.js); [apps/api/routes/Payments.js](../../apps/api/routes/Payments.js); [apps/api/routes/profile.js](../../apps/api/routes/profile.js); [apps/api/routes/user.js](../../apps/api/routes/user.js); [apps/api/test/session-security.test.js](../../apps/api/test/session-security.test.js).
- **Selected calls / effects:** `readSessionToken`, `verifySessionToken`, `User.findById`, `res.status`, `User.db.base.isValidObjectId`, `Number.isInteger`, `hasCurrentPolicyAcceptance`, `user._id.toString`, `res.setHeader`, `DELETION_PENDING_ALLOWED_PATHS.has`, `POLICY_PENDING_ALLOWED_PATHS.has`, `logger.error`, `logger.errorMetadata`, `requireAccountType`.

### [apps/api/middleware/rateLimiters.js](../../apps/api/middleware/rateLimiters.js)

Distributed Redis or local memory rate-limit stores; API and sensitive route windows with hashed identities.

- **Imports / dependencies:** `crypto`, `express-rate-limit`, `rate-limit-redis`, `../config/redis`.
- **Exports:** `exports.apiLimiter=CallExpression`; `exports.loginIpLimiter=CallExpression`; `exports.loginIdentityLimiter=CallExpression`; `exports.signupIpLimiter=CallExpression`; `exports.signupIdentityLimiter=CallExpression`; `exports.otpIpLimiter=CallExpression`; `exports.otpIdentityLimiter=CallExpression`; `exports.passwordResetIpLimiter=CallExpression`; `exports.passwordResetIdentityLimiter=CallExpression`; `exports.contactIpLimiter=CallExpression`; `exports.contactIdentityLimiter=CallExpression`; `exports.paymentLimiter=CallExpression`; `exports.webhookLimiter=CallExpression`; `exports.hashRateLimitIdentity=hashRateLimitIdentity`; `exports._test=DeferredRedisStore`.
- **Named functions / components:** `init (L9)`; `ensureScripts (L16)`; `increment (L32)`; `get (L37)`; `hashRateLimitIdentity (L43)`; `requestIpKey (L46)`; `identityKey (L53)`; `authenticatedUserKey (L61)`; `sharedStore (L66)`; `createLimiter (L74)`.
- **Direct static consumers:** [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js); [apps/api/routes/Contact.js](../../apps/api/routes/Contact.js); [apps/api/routes/Payments.js](../../apps/api/routes/Payments.js); [apps/api/routes/user.js](../../apps/api/routes/user.js); [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js); [apps/api/test/rate-limit-store.test.js](../../apps/api/test/rate-limit-store.test.js).
- **Selected calls / effects:** `super.get`, `crypto.createHash`, `this.loadIncrementScript`, `this.loadGetScript`, `Promise.all`, `this.ensureScripts`, `super.increment`, `ipKeyGenerator`, `hashRateLimitIdentity`, `value.trim`, `requestIpKey`, `redis.isConfigured`, `sharedStore`, `rateLimit`, `createLimiter`, `identityKey`.

### [apps/api/middleware/trustedOrigin.js](../../apps/api/middleware/trustedOrigin.js)

Rejects untrusted browser origins/cross-site fetch metadata on unsafe methods.

- **Imports / dependencies:** `../config/env`.
- **Exports:** `exports.requireTrustedBrowserOrigin`.
- **Named functions / components:** `rejectRequest (L6)`; `exports.requireTrustedBrowserOrigin (L15)`.
- **Direct static consumers:** [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js); [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js).
- **Selected calls / effects:** `req.get`, `res.status`, `SAFE_METHODS.has`, `rejectRequest`, `trustedOrigins.has`.

### [apps/api/middleware/upload.js](../../apps/api/middleware/upload.js)

Authenticated-route multipart limits, temporary disk files and response-close cleanup.

- **Imports / dependencies:** `node:fs/promises`, `node:os`, `node:path`, `express-fileupload`, `../config/env`, `../utils/logger`.
- **Exports:** `module.exports=cleanupAfterResponse,cleanupUploadedTempFiles,parseSingleUpload,uploadMiddleware`.
- **Named functions / components:** `uploadedFiles (L11)`; `cleanupUploadedTempFiles (L16)`; `cleanupAfterResponse (L47)`; `cleanup (L49)`.
- **Direct static consumers:** [apps/api/routes/Course.js](../../apps/api/routes/Course.js); [apps/api/routes/profile.js](../../apps/api/routes/profile.js); [apps/api/test/media-upload.test.js](../../apps/api/test/media-upload.test.js).
- **Selected calls / effects:** `path.resolve`, `os.tmpdir`, `Promise.allSettled`, `uploadedFiles`, `candidatePath.startsWith`, `logger.error`, `fs.unlink`, `logger.errorMetadata`, `cleanupUploadedTempFiles`, `res.once`, `fileUpload`.

## apps/api/models

### [apps/api/models/Category.js](../../apps/api/models/Category.js)

Mongoose Category persisted schema, field constraints, indexes and serialization; see DATABASE for entity relationships and consumers.

- **Imports / dependencies:** `mongoose`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/controllers/Category.js](../../apps/api/controllers/Category.js); [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/domains/catalog/catalogRepository.js](../../apps/api/domains/catalog/catalogRepository.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/catalog-v2.integration.test.js](../../apps/api/test/catalog-v2.integration.test.js); [apps/api/test/mongoose-9-compatibility.test.js](../../apps/api/test/mongoose-9-compatibility.test.js); [apps/api/test/mongoose-models.integration.test.js](../../apps/api/test/mongoose-models.integration.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js).
- **Selected calls / effects:** `mongoose.model`.

### [apps/api/models/Course.js](../../apps/api/models/Course.js)

Mongoose Course persisted schema, field constraints, indexes and serialization; see DATABASE for entity relationships and consumers.

- **Imports / dependencies:** `mongoose`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/controllers/Category.js](../../apps/api/controllers/Category.js); [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/RatingandReview.js](../../apps/api/controllers/RatingandReview.js); [apps/api/controllers/Section.js](../../apps/api/controllers/Section.js); [apps/api/controllers/Subsection.js](../../apps/api/controllers/Subsection.js); [apps/api/controllers/courseProgress.js](../../apps/api/controllers/courseProgress.js); [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/domains/catalog/catalogRepository.js](../../apps/api/domains/catalog/catalogRepository.js); [apps/api/domains/enrollment/enrollmentConsistencyRepository.js](../../apps/api/domains/enrollment/enrollmentConsistencyRepository.js); [apps/api/domains/entitlement/entitlementRepository.js](../../apps/api/domains/entitlement/entitlementRepository.js); [apps/api/domains/learning/learningRepository.js](../../apps/api/domains/learning/learningRepository.js); [apps/api/scripts/backfill-security-fields.js](../../apps/api/scripts/backfill-security-fields.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/catalog-v2-http.test.js](../../apps/api/test/catalog-v2-http.test.js); [apps/api/test/catalog-v2.integration.test.js](../../apps/api/test/catalog-v2.integration.test.js); [apps/api/test/enrollment-consistency.integration.test.js](../../apps/api/test/enrollment-consistency.integration.test.js); [apps/api/test/entitlement-stage2.integration.test.js](../../apps/api/test/entitlement-stage2.integration.test.js); [apps/api/test/learning-v2.integration.test.js](../../apps/api/test/learning-v2.integration.test.js); [apps/api/test/model-validation.test.js](../../apps/api/test/model-validation.test.js); [apps/api/test/mongoose-9-compatibility.test.js](../../apps/api/test/mongoose-9-compatibility.test.js); [apps/api/test/mongoose-models.integration.test.js](../../apps/api/test/mongoose-models.integration.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js); [apps/api/utils/courseLifecycle.js](../../apps/api/utils/courseLifecycle.js).
- **Selected calls / effects:** `courseSchema.index`, `mongoose.model`.

### [apps/api/models/CourseProgress.js](../../apps/api/models/CourseProgress.js)

Mongoose CourseProgress persisted schema, field constraints, indexes and serialization; see DATABASE for entity relationships and consumers.

- **Imports / dependencies:** `mongoose`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/Section.js](../../apps/api/controllers/Section.js); [apps/api/controllers/Subsection.js](../../apps/api/controllers/Subsection.js); [apps/api/controllers/courseProgress.js](../../apps/api/controllers/courseProgress.js); [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/domains/enrollment/enrollmentConsistencyRepository.js](../../apps/api/domains/enrollment/enrollmentConsistencyRepository.js); [apps/api/domains/entitlement/entitlementRepository.js](../../apps/api/domains/entitlement/entitlementRepository.js); [apps/api/domains/learning/learningRepository.js](../../apps/api/domains/learning/learningRepository.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/enrollment-consistency.integration.test.js](../../apps/api/test/enrollment-consistency.integration.test.js); [apps/api/test/entitlement-stage2.integration.test.js](../../apps/api/test/entitlement-stage2.integration.test.js); [apps/api/test/learning-v2.integration.test.js](../../apps/api/test/learning-v2.integration.test.js); [apps/api/test/mongoose-9-compatibility.test.js](../../apps/api/test/mongoose-9-compatibility.test.js); [apps/api/test/mongoose-models.integration.test.js](../../apps/api/test/mongoose-models.integration.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js).
- **Selected calls / effects:** `courseProgress.index`, `mongoose.model`.

### [apps/api/models/Entitlement.js](../../apps/api/models/Entitlement.js)

Mongoose Entitlement persisted schema, field constraints, indexes and serialization; see DATABASE for entity relationships and consumers.

- **Imports / dependencies:** `mongoose`, `../domains/entitlement/entitlementPolicy`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** `validateEntitlementState (L175)`; `redactPrivateFields (L183)`.
- **Direct static consumers:** [apps/api/domains/entitlement/entitlementRepository.js](../../apps/api/domains/entitlement/entitlementRepository.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/test/entitlement-model.test.js](../../apps/api/test/entitlement-model.test.js); [apps/api/test/entitlement-models.integration.test.js](../../apps/api/test/entitlement-models.integration.test.js); [apps/api/test/entitlement-stage2.integration.test.js](../../apps/api/test/entitlement-stage2.integration.test.js); [apps/api/test/mongoose-9-compatibility.test.js](../../apps/api/test/mongoose-9-compatibility.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js).
- **Selected calls / effects:** `assertEntitlementState`, `entitlementSchema.pre`, `this.invalidate`, `entitlementSchema.set`, `entitlementSchema.index`, `mongoose.model`.

### [apps/api/models/EntitlementOperationAudit.js](../../apps/api/models/EntitlementOperationAudit.js)

Mongoose EntitlementOperationAudit persisted schema, field constraints, indexes and serialization; see DATABASE for entity relationships and consumers.

- **Imports / dependencies:** `mongoose`, `../domains/entitlement/entitlementPolicy`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** `validateEntitlementOperationAuditState (L103)`; `redactPrivateFields (L112)`.
- **Direct static consumers:** [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/test/entitlement-model.test.js](../../apps/api/test/entitlement-model.test.js); [apps/api/test/entitlement-models.integration.test.js](../../apps/api/test/entitlement-models.integration.test.js); [apps/api/test/entitlement-stage2.integration.test.js](../../apps/api/test/entitlement-stage2.integration.test.js); [apps/api/test/mongoose-9-compatibility.test.js](../../apps/api/test/mongoose-9-compatibility.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js).
- **Selected calls / effects:** `assertEntitlementOperationAuditState`, `entitlementOperationAuditSchema.pre`, `this.invalidate`, `entitlementOperationAuditSchema.set`, `entitlementOperationAuditSchema.index`, `mongoose.model`.

### [apps/api/models/OTP.js](../../apps/api/models/OTP.js)

Mongoose OTP persisted schema, field constraints, indexes and serialization; see DATABASE for entity relationships and consumers.

- **Imports / dependencies:** `mongoose`.
- **Exports:** `module.exports=OTP`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/controllers/Auth.js](../../apps/api/controllers/Auth.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/test/mongoose-9-compatibility.test.js](../../apps/api/test/mongoose-9-compatibility.test.js); [apps/api/test/mongoose-models.integration.test.js](../../apps/api/test/mongoose-models.integration.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js).
- **Selected calls / effects:** `mongoose.model`.

### [apps/api/models/Profile.js](../../apps/api/models/Profile.js)

Mongoose Profile persisted schema, field constraints, indexes and serialization; see DATABASE for entity relationships and consumers.

- **Imports / dependencies:** `mongoose`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/controllers/Auth.js](../../apps/api/controllers/Auth.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/scripts/backfill-security-fields.js](../../apps/api/scripts/backfill-security-fields.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/scripts/provision-admin.js](../../apps/api/scripts/provision-admin.js); [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/mongoose-models.integration.test.js](../../apps/api/test/mongoose-models.integration.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js).
- **Selected calls / effects:** `mongoose.model`.

### [apps/api/models/Purchase.js](../../apps/api/models/Purchase.js)

Mongoose Purchase persisted schema, field constraints, indexes and serialization; see DATABASE for entity relationships and consumers.

- **Imports / dependencies:** `mongoose`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/Section.js](../../apps/api/controllers/Section.js); [apps/api/controllers/Subsection.js](../../apps/api/controllers/Subsection.js); [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/domains/enrollment/enrollmentConsistencyRepository.js](../../apps/api/domains/enrollment/enrollmentConsistencyRepository.js); [apps/api/domains/entitlement/entitlementRepository.js](../../apps/api/domains/entitlement/entitlementRepository.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/enrollment-consistency.integration.test.js](../../apps/api/test/enrollment-consistency.integration.test.js); [apps/api/test/entitlement-stage2.integration.test.js](../../apps/api/test/entitlement-stage2.integration.test.js); [apps/api/test/mongoose-9-compatibility.test.js](../../apps/api/test/mongoose-9-compatibility.test.js); [apps/api/test/mongoose-models.integration.test.js](../../apps/api/test/mongoose-models.integration.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js); [apps/api/utils/purchaseLifecycle.js](../../apps/api/utils/purchaseLifecycle.js).
- **Selected calls / effects:** `purchaseSchema.index`, `mongoose.model`.

### [apps/api/models/RatingandReview.js](../../apps/api/models/RatingandReview.js)

Mongoose RatingandReview persisted schema, field constraints, indexes and serialization; see DATABASE for entity relationships and consumers.

- **Imports / dependencies:** `mongoose`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/RatingandReview.js](../../apps/api/controllers/RatingandReview.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/domains/catalog/catalogRepository.js](../../apps/api/domains/catalog/catalogRepository.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/catalog-v2.integration.test.js](../../apps/api/test/catalog-v2.integration.test.js); [apps/api/test/mongoose-9-compatibility.test.js](../../apps/api/test/mongoose-9-compatibility.test.js); [apps/api/test/mongoose-models.integration.test.js](../../apps/api/test/mongoose-models.integration.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js).
- **Selected calls / effects:** `ratingAndReviewSchema.index`, `mongoose.model`.

### [apps/api/models/Section.js](../../apps/api/models/Section.js)

Mongoose Section persisted schema, field constraints, indexes and serialization; see DATABASE for entity relationships and consumers.

- **Imports / dependencies:** `mongoose`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/Section.js](../../apps/api/controllers/Section.js); [apps/api/controllers/Subsection.js](../../apps/api/controllers/Subsection.js); [apps/api/controllers/courseProgress.js](../../apps/api/controllers/courseProgress.js); [apps/api/domains/catalog/catalogRepository.js](../../apps/api/domains/catalog/catalogRepository.js); [apps/api/domains/learning/learningRepository.js](../../apps/api/domains/learning/learningRepository.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/catalog-v2.integration.test.js](../../apps/api/test/catalog-v2.integration.test.js); [apps/api/test/learning-v2.integration.test.js](../../apps/api/test/learning-v2.integration.test.js); [apps/api/test/model-validation.test.js](../../apps/api/test/model-validation.test.js); [apps/api/test/mongoose-models.integration.test.js](../../apps/api/test/mongoose-models.integration.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js); [apps/api/utils/courseLifecycle.js](../../apps/api/utils/courseLifecycle.js).
- **Selected calls / effects:** `mongoose.model`.

### [apps/api/models/Subsection.js](../../apps/api/models/Subsection.js)

Mongoose Subsection persisted schema, field constraints, indexes and serialization; see DATABASE for entity relationships and consumers.

- **Imports / dependencies:** `mongoose`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/Section.js](../../apps/api/controllers/Section.js); [apps/api/controllers/Subsection.js](../../apps/api/controllers/Subsection.js); [apps/api/domains/catalog/catalogRepository.js](../../apps/api/domains/catalog/catalogRepository.js); [apps/api/domains/learning/learningRepository.js](../../apps/api/domains/learning/learningRepository.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/catalog-v2.integration.test.js](../../apps/api/test/catalog-v2.integration.test.js); [apps/api/test/learning-v2.integration.test.js](../../apps/api/test/learning-v2.integration.test.js); [apps/api/test/model-validation.test.js](../../apps/api/test/model-validation.test.js); [apps/api/test/mongoose-models.integration.test.js](../../apps/api/test/mongoose-models.integration.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js); [apps/api/utils/courseLifecycle.js](../../apps/api/utils/courseLifecycle.js).
- **Selected calls / effects:** `mongoose.model`.

### [apps/api/models/User.js](../../apps/api/models/User.js)

Mongoose User persisted schema, field constraints, indexes and serialization; see DATABASE for entity relationships and consumers.

- **Imports / dependencies:** `mongoose`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** `required (L67)`; `default (L120)`; `default (L127)`.
- **Direct static consumers:** [apps/api/controllers/Admin.js](../../apps/api/controllers/Admin.js); [apps/api/controllers/Auth.js](../../apps/api/controllers/Auth.js); [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/controllers/resetPassword.js](../../apps/api/controllers/resetPassword.js); [apps/api/domains/catalog/catalogRepository.js](../../apps/api/domains/catalog/catalogRepository.js); [apps/api/domains/enrollment/enrollmentConsistencyRepository.js](../../apps/api/domains/enrollment/enrollmentConsistencyRepository.js); [apps/api/domains/entitlement/entitlementRepository.js](../../apps/api/domains/entitlement/entitlementRepository.js); [apps/api/middleware/auth.js](../../apps/api/middleware/auth.js); [apps/api/scripts/backfill-security-fields.js](../../apps/api/scripts/backfill-security-fields.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/scripts/provision-admin.js](../../apps/api/scripts/provision-admin.js); [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/catalog-v2.integration.test.js](../../apps/api/test/catalog-v2.integration.test.js); [apps/api/test/enrollment-consistency.integration.test.js](../../apps/api/test/enrollment-consistency.integration.test.js); [apps/api/test/entitlement-stage2.integration.test.js](../../apps/api/test/entitlement-stage2.integration.test.js); [apps/api/test/learning-v2.integration.test.js](../../apps/api/test/learning-v2.integration.test.js); [apps/api/test/mongoose-9-compatibility.test.js](../../apps/api/test/mongoose-9-compatibility.test.js); [apps/api/test/mongoose-models.integration.test.js](../../apps/api/test/mongoose-models.integration.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js).
- **Selected calls / effects:** `userSchema.set`, `userSchema.index`, `mongoose.model`.

## apps/api/modules

### [apps/api/modules/README.md](../../apps/api/modules/README.md)

Future backend module migration placeholder, not implemented modules.

- **Consumer / connection:** Repository guidance; not executed.

## apps/api/package.json

### [apps/api/package.json](../../apps/api/package.json)

Workspace manifest, dependency ownership and executable npm scripts; see DEPENDENCIES and TESTING.

- **Script entry points:** `pretest`, `start`, `dev`, `seed`, `preflight:production`, `enrollment:audit`, `entitlement:recover`, `entitlement:recover:scheduled`, `db:backfill-security`, `db:indexes`, `admin:provision`, `test:integration`, `test`.
- **Consumers:** npm workspace install/run, Dockerfiles, GitHub workflows; see DEPENDENCIES for every package.

## apps/api/routes

### [apps/api/routes/Admin.js](../../apps/api/routes/Admin.js)

Express Admin route/middleware registrations; dispatches imported handlers. Full method/input/role map is in API_MAP.

- **Imports / dependencies:** `express`, `../controllers/Admin`, `../middleware/auth`, `../controllers/payments`.
- **Exports:** `module.exports=router`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js).
- **Selected calls / effects:** `router.use`, `router.get`, `router.patch`, `router.post`, `express.Router`.

### [apps/api/routes/CatalogV2.js](../../apps/api/routes/CatalogV2.js)

Express CatalogV2 route/middleware registrations; dispatches imported handlers. Full method/input/role map is in API_MAP.

- **Imports / dependencies:** `express`, `@studynotion/contracts/catalog`, `../controllers/CatalogV2`, `../domains/catalog/catalogErrors`, `../shared/http/validateV2Request`.
- **Exports:** `module.exports=router`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js); [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js).
- **Selected calls / effects:** `router.get`, `router.use`, `express.Router`, `validateV2Request`, `sendV2Error`.

### [apps/api/routes/Contact.js](../../apps/api/routes/Contact.js)

Express Contact route/middleware registrations; dispatches imported handlers. Full method/input/role map is in API_MAP.

- **Imports / dependencies:** `express`, `../controllers/ContactUs`, `../middleware/rateLimiters`.
- **Exports:** `module.exports=router`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js).
- **Selected calls / effects:** `router.post`, `express.Router`.

### [apps/api/routes/Course.js](../../apps/api/routes/Course.js)

Express Course route/middleware registrations; dispatches imported handlers. Full method/input/role map is in API_MAP.

- **Imports / dependencies:** `express`, `../controllers/Course`, `../controllers/Category`, `../controllers/Section`, `../controllers/Subsection`, `../controllers/RatingandReview`, `../controllers/courseProgress`, `../middleware/auth`, `../middleware/upload`.
- **Exports:** `module.exports=router`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js).
- **Selected calls / effects:** `router.post`, `router.get`, `router.delete`, `express.Router`.

### [apps/api/routes/LearningV2.js](../../apps/api/routes/LearningV2.js)

Express LearningV2 route/middleware registrations; dispatches imported handlers. Full method/input/role map is in API_MAP.

- **Imports / dependencies:** `express`, `@studynotion/contracts/learning`, `../controllers/LearningV2`, `../domains/learning/learningErrors`, `../middleware/auth`, `../shared/http/validateV2Request`.
- **Exports:** `module.exports=router`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js); [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js); [apps/api/test/learning-v2-http.test.js](../../apps/api/test/learning-v2-http.test.js).
- **Selected calls / effects:** `router.get`, `router.put`, `router.use`, `express.Router`, `validateV2Request`, `sendV2Error`.

### [apps/api/routes/Payments.js](../../apps/api/routes/Payments.js)

Express Payments route/middleware registrations; dispatches imported handlers. Full method/input/role map is in API_MAP.

- **Imports / dependencies:** `express`, `../controllers/payments`, `../middleware/auth`, `../middleware/rateLimiters`.
- **Exports:** `module.exports=router`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js).
- **Selected calls / effects:** `router.get`, `router.post`, `express.Router`.

### [apps/api/routes/profile.js](../../apps/api/routes/profile.js)

Express profile route/middleware registrations; dispatches imported handlers. Full method/input/role map is in API_MAP.

- **Imports / dependencies:** `express`, `../middleware/auth`, `../middleware/upload`, `../controllers/profile`.
- **Exports:** `module.exports=router`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js).
- **Selected calls / effects:** `router.delete`, `router.put`, `router.get`, `express.Router`.

### [apps/api/routes/user.js](../../apps/api/routes/user.js)

Express user route/middleware registrations; dispatches imported handlers. Full method/input/role map is in API_MAP.

- **Imports / dependencies:** `express`, `../controllers/Auth`, `../controllers/resetPassword`, `../middleware/auth`, `../middleware/rateLimiters`.
- **Exports:** `module.exports=router`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js).
- **Selected calls / effects:** `router.post`, `express.Router`.

## apps/api/scripts

### [apps/api/scripts/audit-enrollment-consistency.js](../../apps/api/scripts/audit-enrollment-consistency.js)

Operational CLI audit-enrollment-consistency; validates target/options and performs the explicit job described in BACKEND/DEPLOYMENT; never assume read-only.

- **Imports / dependencies:** `mongoose`, `../config/loadEnvironment`, `../domains/enrollment/enrollmentConsistencyService`, `../domains/enrollment/enrollmentConsistencyReport`, `../utils/logger`, `../utils/mongoDeployment`.
- **Exports:** `module.exports=EXIT_CODES,EnrollmentAuditConfigurationError,EnrollmentAuditReportError,HELP_TEXT,classifyOperationalError,createOperationalLogger,mongoOptions,parseArguments,run`.
- **Named functions / components:** `constructor (L39)`; `constructor (L47)`; `parseInteger (L54)`; `parseArguments (L64)`; `mongoOptions (L100)`; `classifyOperationalError (L102)`; `createOperationalLogger (L118)`; `run (L123)`; `main (L156)`.
- **Direct static consumers:** [apps/api/test/enrollment-consistency-service.test.js](../../apps/api/test/enrollment-consistency-service.test.js).
- **Selected calls / effects:** `logger.createLogger`, `mongoose.connect.bind`, `mongoose.disconnect.bind`, `assertEnrollmentConsistencyReport`, `super`, `Number.isSafeInteger`, `parseInteger`, `mongoJobOptions`, `stream.write`, `process.argv.slice`, `createOperationalLogger`, `parseArguments`, `validateMongoUriForEnvironment`, `connect`, `mongoOptions`, `serviceFactory`, `disconnect`, `loadEnvironment`, `run`, `process.stdout.write`, `classifyOperationalError`, `logger.errorMetadata`, `process.stderr.write`, `main`.

### [apps/api/scripts/backfill-security-fields.js](../../apps/api/scripts/backfill-security-fields.js)

Operational CLI backfill-security-fields; validates target/options and performs the explicit job described in BACKEND/DEPLOYMENT; never assume read-only.

- **Imports / dependencies:** `../config/loadEnvironment`, `mongoose`, `../models/Profile`, `../models/Course`, `../models/User`, `../utils/logger`, `../utils/mongoDeployment`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `run (L16)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `mongoose.connect`, `users.updateMany`, `courses.updateMany`, `Profile.find`, `Profile.create`, `users.updateOne`, `Profile.findByIdAndDelete`, `mongoose.disconnect`, `loadEnvironment`, `validateMongoUriForEnvironment`, `mongoJobOptions`, `existingProfileIds.map`, `rawUsers.filter`, `existingProfileIdSet.has`, `run`, `logger.error`, `logger.errorMetadata`.

### [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js)

Operational CLI create-indexes; validates target/options and performs the explicit job described in BACKEND/DEPLOYMENT; never assume read-only.

- **Imports / dependencies:** `../config/loadEnvironment`, `mongoose`, `../utils/logger`, `../utils/mongoDeployment`, `../models/User`, `../models/OTP`, `../models/Course`, `../models/Category`, `../models/Profile`, `../models/Section`, `../models/Subsection`, `../models/CourseProgress`, `../models/RatingandReview`, `../models/Purchase`, `../models/Entitlement`, `../models/EntitlementOperationAudit`.
- **Exports:** `module.exports=INDEX_CONFIRMATION,IndexConfigurationError,getOperation,main,models,mongoOptions,run,startCli,verifyDeclaredIndexes`.
- **Named functions / components:** `constructor (L31)`; `mongoOptions (L38)`; `getOperation (L40)`; `verifyDeclaredIndexes (L50)`; `run (L73)`; `main (L125)`; `startCli (L143)`.
- **Direct static consumers:** [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/test/create-indexes.test.js](../../apps/api/test/create-indexes.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js).
- **Selected calls / effects:** `mongoose.connect.bind`, `model.createIndexes`, `mongoose.disconnect.bind`, `logger.createRuntimeLogger`, `super`, `mongoJobOptions`, `INDEX_OPERATIONS.has`, `model.diffIndexes`, `reports.push`, `reports.reduce`, `validateMongoUriForEnvironment`, `getOperation`, `usesProductionPosture`, `connect`, `mongoOptions`, `verifyDeclaredIndexes`, `missingModels.join`, `write`, `runIndexes`, `targetLogger.error`, `logger.errorMetadata`, `disconnect`, `loadRuntimeEnvironment`, `runMain`, `createTargetLogger`, `startCli`.

### [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js)

Operational CLI preflight-production; validates target/options and performs the explicit job described in BACKEND/DEPLOYMENT; never assume read-only.

- **Imports / dependencies:** `../config/loadEnvironment`, `mongoose`, `../models/Category`, `../models/Course`, `../models/CourseProgress`, `../models/OTP`, `../models/Profile`, `../models/Purchase`, `../models/RatingandReview`, `../models/Section`, `../models/Subsection`, `../models/User`, `../domains/enrollment/enrollmentConsistencyService`, `../domains/enrollment/enrollmentConsistencyReport`, `../domains/entitlement/entitlementRecoveryService`, `../domains/entitlement/entitlementService`, `../utils/courseLifecycle`, `../utils/logger`, `./create-indexes`, `../config/env`.
- **Exports:** `module.exports=EntitlementPreflightReportError,EnrollmentPreflightReportError,PREFLIGHT_ENROLLMENT_SAMPLE_LIMIT,PREFLIGHT_EXIT_CODES,classifyPreflightResult,entitlementRecoveryForPreflight,enrollmentConsistencyForPreflight,isPublishedLessonMetadataValid,main,parsePreflightSidecarStartedAt,run,startCli,validateRuntimeConfiguration,validateEntitlementRecoveryReport,verifyPreflightIndexes`.
- **Named functions / components:** `constructor (L45)`; `constructor (L53)`; `createPreflightLogger (L60)`; `validateEnrollmentConsistencyReport (L66)`; `parsePreflightSidecarStartedAt (L76)`; `isRecord (L121)`; `hasExactKeys (L124)`; `isStrictIsoTimestamp (L134)`; `validateEntitlementRecoveryReport (L145)`; `validCount (L146)`; `classifyPreflightResult (L190)`; `entitlementRecoveryForPreflight (L205)`; `enrollmentConsistencyForPreflight (L221)`; `duplicateGroupCount (L236)`; `duplicateArrayGroupCount (L246)`; `validateRuntimeConfiguration (L262)`; `verifyPreflightIndexes (L284)`; `run (L289)`; `countFacet (L570)`; `main (L917)`; `startCli (L942)`.
- **Direct static consumers:** [apps/api/test/enrollment-consistency-service.test.js](../../apps/api/test/enrollment-consistency-service.test.js); [apps/api/test/preflight-configuration.test.js](../../apps/api/test/preflight-configuration.test.js); [apps/api/test/preflight-lesson.test.js](../../apps/api/test/preflight-lesson.test.js); [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js).
- **Selected calls / effects:** `logger.createRuntimeLogger`, `assertEnrollmentConsistencyReport`, `now.getTime`, `parsed.getTime`, `validateEnrollmentConsistencyReport`, `validateEntitlementRecoveryReport`, `model.aggregate`, `mongoose.connect`, `Course.find`, `publishedCourses.flatMap`, `Section.find`, `Category.find`, `Purchase.distinct`, `entitledCourses.flatMap`, `SubSection.find`, `entitledCourses.map`, `Course.aggregate`, `User.aggregate`, `User.find`, `allCourses.map`, `User.collection.countDocuments`, `OTP.collection.countDocuments`, `entitledCourses.filter`, `entitledCourseIdSet.has`, `publishedCourses.filter`, `allCourses.filter`, `categoriesById.get`, `coursesById.get`, `createEnrollmentConsistencyService`, `createEntitlementRecoveryService`, `mongoose.disconnect.bind`, `super`.

### [apps/api/scripts/provision-admin.js](../../apps/api/scripts/provision-admin.js)

Operational CLI provision-admin; validates target/options and performs the explicit job described in BACKEND/DEPLOYMENT; never assume read-only.

- **Imports / dependencies:** `../config/loadEnvironment`, `bcryptjs`, `mongoose`, `../models/Profile`, `../models/User`, `../utils/policyAcceptance`, `../utils/logger`, `../utils/mongoDeployment`, `../utils/validation`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `run (L23)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `mongoose.connect`, `Profile.create`, `User.create`, `Profile.findByIdAndDelete`, `mongoose.disconnect`, `loadEnvironment`, `normalizeEmail`, `normalizePersonName`, `isValidEmail`, `isStrongPassword`, `validateMongoUriForEnvironment`, `mongoJobOptions`, `User.exists`, `bcrypt.hash`, `createPolicyAcceptance`, `run`, `logger.error`, `logger.errorMetadata`.

### [apps/api/scripts/reconcile-entitlements.js](../../apps/api/scripts/reconcile-entitlements.js)

Operational CLI reconcile-entitlements; validates target/options and performs the explicit job described in BACKEND/DEPLOYMENT; never assume read-only.

- **Imports / dependencies:** `mongoose`, `../config/loadEnvironment`, `../domains/entitlement/entitlementRecoveryService`, `../utils/logger`, `../utils/mongoDeployment`.
- **Exports:** `module.exports=ENTITLEMENT_RECOVERY_CONFIRMATION,EXIT_CODES,EntitlementRecoveryConfigurationError,EntitlementRecoveryReportError,HELP_TEXT,classifyOperationalError,main,mongoOptions,parseArguments,parseStrictIsoTimestamp,run,validateRecoveryReport,validateStatusReport`.
- **Named functions / components:** `constructor (L49)`; `constructor (L57)`; `parseInteger (L64)`; `parseArguments (L74)`; `parseStrictIsoTimestamp (L143)`; `mongoOptions (L170)`; `isRecord (L178)`; `exactKeys (L181)`; `validCount (L193)`; `validTimestamp (L195)`; `validateRecoveryReport (L206)`; `validateStatusReport (L287)`; `classifyOperationalError (L337)`; `run (L356)`; `main (L418)`.
- **Direct static consumers:** [apps/api/scripts/schedule-entitlement-recovery.js](../../apps/api/scripts/schedule-entitlement-recovery.js); [apps/api/test/reconcile-entitlements.test.js](../../apps/api/test/reconcile-entitlements.test.js).
- **Selected calls / effects:** `parsed.getTime`, `now.getTime`, `mongoose.connect.bind`, `mongoose.disconnect.bind`, `service.getOperationalStatus`, `super`, `Number.isSafeInteger`, `parseInteger`, `Date.now`, `Number.isFinite`, `parsed.toISOString`, `mongoJobOptions`, `isRecord`, `actual.some`, `exactKeys`, `catchUpKeys.push`, `validTimestamp`, `validCount`, `catchUpCounts.some`, `recoveryCounts.some`, `countKeys.some`, `truncatedKeys.some`, `process.argv.slice`, `parseArguments`, `mongoUrl.trim`, `parseStrictIsoTimestamp`, `clock`, `validateMongoUriForEnvironment`, `connect`, `mongoOptions`, `serviceFactory`, `validateStatusReport`.

### [apps/api/scripts/schedule-entitlement-recovery.js](../../apps/api/scripts/schedule-entitlement-recovery.js)

Operational CLI schedule-entitlement-recovery; validates target/options and performs the explicit job described in BACKEND/DEPLOYMENT; never assume read-only.

- **Imports / dependencies:** `node:crypto`, `node:path`, `node:fs/promises`, `../config/loadEnvironment`, `../domains/entitlement/entitlementRecoveryService`, `../utils/logger`, `../utils/imageReference`, `./reconcile-entitlements`.
- **Exports:** `module.exports=CHECKPOINT_FILE_MODE,CHECKPOINT_SCHEMA_VERSION,ScheduledRecoveryCheckpointError,ScheduledRecoveryConfigurationError,classifyScheduledRecoveryError,main,parseBatchSize,parseCheckpointDocument,parseCheckpointPath,parseImageDigest,parseSchedulerConfiguration,readCheckpoint,runScheduledRecovery,safeRecoveryReport,writeCheckpoint`.
- **Named functions / components:** `constructor (L26)`; `constructor (L34)`; `checkpointError (L41)`; `parseBatchSize (L47)`; `parseImageDigest (L67)`; `parseCheckpointPath (L76)`; `parseSchedulerConfiguration (L94)`; `assertPrivateCheckpointDirectory (L109)`; `parseCheckpointDocument (L133)`; `readCheckpoint (L159)`; `checkpointDocument (L188)`; `writeCheckpoint (L194)`; `safeRecoveryReport (L237)`; `runScheduledRecovery (L264)`; `classifyScheduledRecoveryError (L297)`; `main (L307)`.
- **Direct static consumers:** [apps/api/test/schedule-entitlement-recovery.test.js](../../apps/api/test/schedule-entitlement-recovery.test.js).
- **Selected calls / effects:** `process.getuid`, `process.getgid`, `super`, `Number.isSafeInteger`, `isImmutableImageReference`, `value.trim`, `path.isAbsolute`, `path.parse`, `path.normalize`, `parseBatchSize`, `parseCheckpointPath`, `parseImageDigest`, `fs.lstat`, `path.dirname`, `checkpointError`, `metadata.isDirectory`, `metadata.isSymbolicLink`, `keys.some`, `CANONICAL_OBJECT_ID.test`, `assertPrivateCheckpointDirectory`, `metadata.isFile`, `parseCheckpointDocument`, `fs.readFile`, `path.join`, `path.basename`, `crypto.randomBytes`, `fs.open`, `handle.writeFile`, `checkpointDocument`, `handle.sync`, `handle.close`, `fs.chmod`.

### [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js)

Operational CLI seed; validates target/options and performs the explicit job described in BACKEND/DEPLOYMENT; never assume read-only.

- **Imports / dependencies:** `node:crypto`, `bcryptjs`, `mongoose`, `../config/loadEnvironment`, `../models/Category`, `../models/Course`, `../models/CourseProgress`, `../models/Profile`, `../models/Purchase`, `../models/RatingandReview`, `../models/Section`, `../models/Subsection`, `../models/User`, `../domains/entitlement/entitlementPurchaseEvidence`, `../utils/policyAcceptance`, `../utils/seedSafety`, `../utils/mongoDeployment`.
- **Exports:** `module.exports=createDemoSeedConfiguration,createSyntheticPurchaseDocument,runSeedCli,seedDemoData`.
- **Named functions / components:** `requiredEnvironmentValue (L101)`; `readAccount (L109)`; `parseSidecarBoundary (L136)`; `readStagingMedia (L156)`; `createDemoSeedConfiguration (L212)`; `makeThumbnail (L260)`; `hasDemoSeedProvenance (L273)`; `createDemoUser (L279)`; `seedDemoCourse (L351)`; `createSyntheticPurchaseDocument (L449)`; `referenceKey (L496)`; `sameReferences (L497)`; `purchaseMatchesSyntheticDocument (L505)`; `seedSyntheticPurchase (L534)`; `readSeedDatabaseTime (L571)`; `seedDemoData (L585)`; `runSeedCli (L691)`.
- **Direct static consumers:** [apps/api/test/seed-safety.test.js](../../apps/api/test/seed-safety.test.js).
- **Selected calls / effects:** `parsed.getTime`, `User.findOne`, `User.updateOne`, `User.findById`, `Profile.create`, `User.create`, `Category.findOneAndUpdate`, `Course.findOneAndUpdate`, `SubSection.findOneAndUpdate`, `Section.findOneAndUpdate`, `RatingAndReview.findOneAndUpdate`, `Course.updateOne`, `Category.updateOne`, `createSyntheticPurchaseDocument`, `Purchase.findOneAndUpdate`, `analyzePurchaseCourseEvidence`, `result.localTime.getTime`, `configurationCheckedAt.getTime`, `mongoose.connect`, `demoCourses.entries`, `seededCourses.push`, `seedDemoCourse`, `CourseProgress.findOneAndUpdate`, `seededCourses.map`, `seedSyntheticPurchase`, `mongoose.disconnect`, `value.trim`, `requiredEnvironmentValue`, `Buffer.byteLength`, `STRICT_ISO_TIMESTAMP.test`, `Number.isFinite`, `parsed.toISOString`.

## apps/api/shared

### [apps/api/shared/http/errorHandler.js](../../apps/api/shared/http/errorHandler.js)

HTTP boundary errorHandler: reusable request/error/not-found/envelope composition for the API.

- **Imports / dependencies:** `../../utils/logger`, `./v2ErrorEnvelope`.
- **Exports:** `module.exports=createErrorHandler,errorHandler`.
- **Named functions / components:** `createErrorHandler (L4)`; `errorHandler (L5)`.
- **Direct static consumers:** [apps/api/app/createApp.js](../../apps/api/app/createApp.js); [apps/api/shared/http/index.js](../../apps/api/shared/http/index.js); [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js); [apps/api/test/learning-v2-http.test.js](../../apps/api/test/learning-v2-http.test.js); [apps/api/test/v2-request-validation.test.js](../../apps/api/test/v2-request-validation.test.js).
- **Selected calls / effects:** `httpLogger.getRequestRoute`, `isV2Request`, `sendV2Error`, `httpLogger.error`, `res.status`, `createErrorHandler`.

### [apps/api/shared/http/index.js](../../apps/api/shared/http/index.js)

HTTP boundary index: reusable request/error/not-found/envelope composition for the API.

- **Imports / dependencies:** `./v2ErrorEnvelope`, `./validateV2Request`, `./errorHandler`, `./notFoundHandler`.
- **Exports:** `module.exports=...,...,...,...`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/api/shared/http/notFoundHandler.js](../../apps/api/shared/http/notFoundHandler.js)

HTTP boundary notFoundHandler: reusable request/error/not-found/envelope composition for the API.

- **Imports / dependencies:** `./v2ErrorEnvelope`.
- **Exports:** `module.exports=notFoundHandler`.
- **Named functions / components:** `notFoundHandler (L3)`.
- **Direct static consumers:** [apps/api/app/createApp.js](../../apps/api/app/createApp.js); [apps/api/shared/http/index.js](../../apps/api/shared/http/index.js); [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js).
- **Selected calls / effects:** `isV2Request`, `sendV2Error`, `res.status`.

### [apps/api/shared/http/v2ErrorEnvelope.js](../../apps/api/shared/http/v2ErrorEnvelope.js)

HTTP boundary v2ErrorEnvelope: reusable request/error/not-found/envelope composition for the API.

- **Imports / dependencies:** `@studynotion/contracts`.
- **Exports:** `module.exports=createV2ErrorEnvelope,isV2Request,normalizeV2ErrorEnvelope,preserveSessionControlCode,sendV2Error,statusCodeToErrorCode`.
- **Named functions / components:** `statusCodeToErrorCode (L6)`; `preserveSessionControlCode (L21)`; `createV2ErrorEnvelope (L28)`; `sendV2Error (L50)`; `normalizeV2ErrorEnvelope (L60)`; `res.json (L62)`; `isV2Request (L92)`.
- **Direct static consumers:** [apps/api/app/registerRoutes.js](../../apps/api/app/registerRoutes.js); [apps/api/domains/catalog/catalogErrors.js](../../apps/api/domains/catalog/catalogErrors.js); [apps/api/domains/learning/learningErrors.js](../../apps/api/domains/learning/learningErrors.js); [apps/api/shared/http/errorHandler.js](../../apps/api/shared/http/errorHandler.js); [apps/api/shared/http/index.js](../../apps/api/shared/http/index.js); [apps/api/shared/http/notFoundHandler.js](../../apps/api/shared/http/notFoundHandler.js); [apps/api/shared/http/validateV2Request.js](../../apps/api/shared/http/validateV2Request.js); [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js); [apps/api/test/learning-v2-http.test.js](../../apps/api/test/learning-v2-http.test.js); [apps/api/test/v2-request-validation.test.js](../../apps/api/test/v2-request-validation.test.js).
- **Selected calls / effects:** `preserveSessionControlCode`, `requestIdSchema.safeParse`, `apiErrorResponseSchema.safeParse`, `res.setHeader`, `createV2ErrorEnvelope`, `res.json.bind`, `originalJson`, `statusCodeToErrorCode`, `req.path.toLowerCase`, `requestPath.startsWith`.

### [apps/api/shared/http/validateV2Request.js](../../apps/api/shared/http/validateV2Request.js)

HTTP boundary validateV2Request: reusable request/error/not-found/envelope composition for the API.

- **Imports / dependencies:** `./v2ErrorEnvelope`.
- **Exports:** `module.exports=validateV2Request,validationDetails`.
- **Named functions / components:** `stripControlCharacters (L28)`; `safeText (L31)`; `validationDetails (L34)`; `normalizeRule (L42)`; `validateV2Request (L58)`.
- **Direct static consumers:** [apps/api/routes/CatalogV2.js](../../apps/api/routes/CatalogV2.js); [apps/api/routes/LearningV2.js](../../apps/api/routes/LearningV2.js); [apps/api/shared/http/index.js](../../apps/api/shared/http/index.js); [apps/api/test/v2-request-validation.test.js](../../apps/api/test/v2-request-validation.test.js).
- **Selected calls / effects:** `SOURCES.map`, `stripControlCharacters`, `issues.slice`, `safeText`, `issue.path.map`, `SOURCE_NAMES.has`, `normalizeRule`, `rule.schema.safeParse`, `sendV2Error`, `validationDetails`.

## apps/api/test

### [apps/api/test/admin-instructor.test.js](../../apps/api/test/admin-instructor.test.js)

Regression/characterization tests for admin-instructor.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `pendingRecords (L11)`; `queryFor (L20)`; `select (L25)`; `populate (L28)`; `sort (L31)`; `skip (L34)`; `limit (L38)`; `lean (L42)`; `then (L48)`; `createResponse (L140)`; `status (L143)`; `json (L147)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `records.find`, `records.filter`, `value.slice`, `Promise.resolve`, `queryFor`, `pendingRecords`, `require.resolve`, `beforeEach`, `test`, `createResponse`, `listPendingInstructors`, `assert.equal`, `assert.deepEqual`, `response.body.data.instructors.map`, `approveInstructor`, `assert.ok`, `assert.match`, `rejectInstructor`.
- **Test focus:** pending instructor listing is paginated and includes legacy applications; approval records the admin audit and is idempotent; rejection requires a reason, writes audit fields, and cannot reverse approval.

### [apps/api/test/app-composition.test.js](../../apps/api/test/app-composition.test.js)

Regression/characterization tests for app-composition.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../index`, `../app/registerRoutes`, `../bootstrap`, `../controllers/payments`, `../domains/catalog/catalogErrors`, `../middleware/rateLimiters`, `../middleware/trustedOrigin`, `../routes/CatalogV2`, `../routes/LearningV2`, `../shared/http/errorHandler`, `../shared/http/notFoundHandler`, `../shared/http/v2ErrorEnvelope`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `createResponse (L30)`; `json (L35)`; `setHeader (L39)`; `status (L42)`; `post (L62)`; `use (L65)`; `error (L154)`; `getRequestRoute (L157)`; `close (L181)`; `cloudinaryConnect (L194)`; `connect (L198)`; `disconnect (L201)`; `error (L211)`; `info (L212)`; `connect (L217)`; `disconnect (L220)`; `listen (L226)`; `cloudinaryConnect (L273)`; `connect (L275)`; `disconnect (L276)`; `error (L286)`; `info (L289)`; `connect (L292)`; `disconnect (L293)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `name.toLowerCase`, `test`, `assert.deepEqual`, `assert.equal`, `stack.at`, `calls.push`, `registerRoutes`, `calls.map`, `createResponse`, `notFoundHandler`, `createErrorHandler`, `logEvents.push`, `handler`, `callback`, `createServerLifecycle`, `startServer`, `shutdown`, `calls.slice`, `errors.push`, `assert.match`.
- **Test focus:** index keeps the public compatibility bootstrap surface; route registration preserves webhook, parser, limiter, and route order; catalog error imports remain adapters to shared HTTP behavior; shared terminal handlers preserve v1 and v2 boundary envelopes (all cases indexed in TESTING).

### [apps/api/test/auth-contract.test.js](../../apps/api/test/auth-contract.test.js)

Regression/characterization tests for auth-contract.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `objectId (L20)`; `safeUser (L21)`; `queryFor (L26)`; `select (L27)`; `populate (L30)`; `then (L33)`; `select (L69)`; `verifyIdToken (L138)`; `installMock (L153)`; `createResponse (L176)`; `status (L182)`; `json (L186)`; `cookie (L190)`; `clearCookie (L194)`; `setHeader (L198)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `users.get`, `Promise.resolve`, `users.has`, `objectId`, `users.set`, `users.values`, `queryFor`, `safeUser`, `googleVerifications.push`, `require.resolve`, `installMock`, `deliveries.push`, `this.cookies.push`, `this.clearedCookies.push`, `name.toLowerCase`, `test`, `createResponse`, `sendotp`, `assert.equal`, `assert.match`, `assert.notEqual`, `signup`, `login`, `logout`, `assert.ok`, `logoutResponse.clearedCookies.some`, `googleLogin`, `assert.deepEqual`, `Date.now`.
- **Test focus:** OTP, signup, and local login preserve the frontend contract; authenticated responses expose deletion recovery state outside the user DTO; first-time Google signup requires affirmative policy acknowledgement; Google credential exchange returns the same authenticated user shape (all cases indexed in TESTING).

### [apps/api/test/catalog-v2-contract.test.js](../../apps/api/test/catalog-v2-contract.test.js)

Regression/characterization tests for catalog-v2-contract.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `@studynotion/contracts`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `catalogCourseListQuerySchema.parse`, `catalogCourseListResponseSchema.safeParse`, `catalogCourseListQuerySchema.safeParse`, `test`, `assert.equal`, `createOpenApiDocument`, `assert.match`.
- **Test focus:** catalog query normalizes search and chooses deterministic defaults; catalog query accepts its maximum page size and validated filters; OpenAPI scalar patterns match runtime case and cursor acceptance; catalog responses reject cursors outside the request contract (all cases indexed in TESTING).

### [apps/api/test/catalog-v2-http.test.js](../../apps/api/test/catalog-v2-http.test.js)

Regression/characterization tests for catalog-v2-http.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `@studynotion/contracts`, `../models/Course`, `../index`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `Course.aggregate (L18)`; `option (L21)`; `exec (L24)`; `requireListener (L59)`; `requestJson (L65)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `result.response.headers.get`, `missing.response.headers.get`, `invalidJson.response.headers.get`, `before`, `app.listen`, `reject`, `resolve`, `server.address`, `after`, `server.close`, `t.skip`, `fetch`, `response.json`, `test`, `requireListener`, `requestJson`, `assert.equal`, `assert.deepEqual`, `apiErrorResponseSchema.safeParse`, `assert.notEqual`, `assert.match`.
- **Test focus:** v2 catalog returns the stable success and request-id envelope; v2 catalog validates search, pagination, category, and sort; v2 catalog exposes standard 404 and internal error envelopes; v2 parser, CORS, and origin failures retain the standard envelope (all cases indexed in TESTING).

### [apps/api/test/catalog-v2-repository.test.js](../../apps/api/test/catalog-v2-repository.test.js)

Regression/characterization tests for catalog-v2-repository.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `@studynotion/contracts`, `../domains/catalog/catalogCursor`, `../domains/catalog/catalogRepository`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `catalogCourseListQuerySchema.parse`, `pipeline.find`, `pipeline.findIndex`, `test`, `buildCatalogPipeline`, `assert.equal`, `assert.deepEqual`, `firstMatch.category.toString`, `pipeline.at`.
- **Test focus:** catalog repository begins with a Published-only canonical Course match; all six catalog sorts have an explicit stable _id tie-break; catalog projection excludes source enrollment, review, and curriculum data; default indexed sorts page before expensive public DTO lookups (all cases indexed in TESTING).

### [apps/api/test/catalog-v2-service.test.js](../../apps/api/test/catalog-v2-service.test.js)

Regression/characterization tests for catalog-v2-service.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `@studynotion/contracts`, `../domains/catalog/catalogCursor`, `../domains/catalog/catalogErrors`, `../domains/catalog/catalogMapper`, `../domains/catalog/catalogService`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `course (L10)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `catalogCourseListQuerySchema.parse`, `listCatalogCourses`, `mapCatalogCourse`, `test`, `course`, `assert.equal`, `decodeCatalogCursor`, `assert.throws`, `assert.deepEqual`, `serialized.includes`.
- **Test focus:** catalog service returns limit-sized pages and a filter-bound cursor; catalog service returns a stable empty page; catalog mapper exposes only the stable public card DTO.

### [apps/api/test/catalog-v2.integration.test.js](../../apps/api/test/catalog-v2.integration.test.js)

Regression/characterization tests for catalog-v2 real-service integration.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `mongoose`, `../config/redis`, `@studynotion/contracts`, `../models/Course`, `../models/Category`, `../models/RatingandReview`, `../models/Section`, `../models/Subsection`, `../models/User`, `../domains/catalog/catalogRepository`, `../index`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `findIndexScan (L6)`; `winningPlanFromExplain (L18)`; `executionStatsFromExplain (L23)`; `assertDisposableMongoUri (L28)`; `assertDisposableRedisUri (L50)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `mongoose.connect`, `redis.connect`, `Course.createIndexes`, `Category.createIndexes`, `RatingAndReview.createIndexes`, `Course.collection.insertMany`, `Course.collection.indexes`, `catalogCourseListQuerySchema.parse`, `mongoose.connection.dropDatabase`, `redis.disconnect`, `mongoose.disconnect`, `findIndexScan`, `value.startsWith`, `url.pathname.slice`, `test`, `assertDisposableMongoUri`, `assertDisposableRedisUri`, `redis.sendCommand`, `Promise.all`, `Category.collection.insertMany`, `User.collection.insertMany`, `SubSection.collection.insertOne`, `Section.collection.insertOne`, `RatingAndReview.collection.insertOne`, `app.listen`, `reject`, `resolve`, `server.address`, `fetch`, `response.json`, `assert.equal`, `assert.deepEqual`.
- **Test focus:** v2 catalog runs through real MongoDB indexes and Redis-backed middleware; integration URI guards reject production-looking targets.

### [apps/api/test/category-privacy.test.js](../../apps/api/test/category-privacy.test.js)

Regression/characterization tests for category-privacy.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../controllers/Category`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `installMock (L7)`; `select (L17)`; `sort (L20)`; `response (L32)`; `json (L35)`; `status (L39)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `controller._test.publicCourse`, `require.resolve`, `installMock`, `test`, `response`, `controller.showAllCategories`, `assert.equal`, `assert.deepEqual`, `controller._test.topSellingPipeline.at`.
- **Test focus:** public categories expose published counts without course IDs; catalog course DTOs remove enrollment and reviewer identities; top-selling catalog ranking is bounded inside MongoDB.

### [apps/api/test/contact-security.test.js](../../apps/api/test/contact-security.test.js)

Regression/characterization tests for contact-security.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../controllers/ContactUs`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `createResponse (L4)`; `json (L7)`; `status (L11)`; `installMock (L17)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `require.resolve`, `installMock`, `deliveries.push`, `test`, `createResponse`, `contactUsController`, `assert.equal`, `assert.deepEqual`, `assert.match`, `assert.doesNotMatch`.
- **Test focus:** contact submissions reject malformed PII without sending email; contact submissions go to support with a safe user reply-to.

### [apps/api/test/course-lifecycle.test.js](../../apps/api/test/course-lifecycle.test.js)

Regression/characterization tests for course-lifecycle.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../utils/courseLifecycle`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `lesson (L7)`; `installMock (L18)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `isCoursePublishReady`, `require.resolve`, `installMock`, `test`, `assert.equal`, `lesson`.
- **Test focus:** a course without sections cannot be published; publish readiness rejects dangling sections and empty sections; every referenced section and lesson must exist before publishing; publish readiness rejects insecure or invalid lesson metadata.

### [apps/api/test/course-management-lifecycle.test.js](../../apps/api/test/course-management-lifecycle.test.js)

Regression/characterization tests for course-management-lifecycle.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../controllers/Course`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `purchaseExists (L13)`; `installMock (L16)`; `queryForCourse (L21)`; `response (L98)`; `json (L101)`; `status (L105)`; `freshCourse (L111)`; `purchaseExists (L233)`; `purchaseExists (L256)`; `purchaseExists (L292)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `queryForCourse`, `controller.createCourse`, `freshCourse`, `controller.editCourse`, `controller.deleteCourse`, `modelOperations.find`, `require.resolve`, `modelOperations.push`, `categoryOperations.push`, `purchaseExists`, `installMock`, `test`, `response`, `assert.equal`, `assert.deepEqual`, `categoryOperations.at`, `modelOperations.some`.
- **Test focus:** new courses cannot bypass curriculum validation by starting Published; editing a category moves the denormalized course reference; a failed course save rolls category membership back; course edits cannot publish incomplete or zero-priced metadata (all cases indexed in TESTING).

### [apps/api/test/course-playback-security.test.js](../../apps/api/test/course-playback-security.test.js)

Regression/characterization tests for course-playback-security.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../controllers/Course`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `installMock (L19)`; `createResponse (L74)`; `json (L77)`; `status (L81)`; `request (L87)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `controller.getLessonPlaybackUrl`, `controller._test.sanitizeEntitledCourse`, `controller._test.sanitizeInstructorCourse`, `require.resolve`, `installMock`, `test`, `createResponse`, `request`, `assert.equal`, `assert.deepEqual`.
- **Test focus:** an enrolled learner receives a fresh minimal signed playback response; playback rejects non-entitled users and cross-course lesson IDs; production playback never returns a legacy public media URL; entitled course DTOs expose enrollment counts but no learner IDs (all cases indexed in TESTING).

### [apps/api/test/course-progress-v1-characterization.test.js](../../apps/api/test/course-progress-v1-characterization.test.js)

Regression/characterization tests for course-progress-v1-characterization.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../controllers/courseProgress`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `installMock (L14)`; `findOne (L20)`; `select (L22)`; `lean (L24)`; `exists (L41)`; `findOneAndUpdate (L51)`; `createResponse (L69)`; `json (L72)`; `status (L76)`; `createRequest (L82)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `updateCourseProgress`, `require.resolve`, `assert.deepEqual`, `assert.equal`, `updateCalls.push`, `completedVideos.includes`, `completedVideos.push`, `installMock`, `test.beforeEach`, `test`, `createResponse`, `createRequest`.
- **Test focus:** v1 progress retains its response and idempotent add-to-set behavior; v1 progress rejects a non-enrolled learner before writing; v1 progress rejects a lesson outside the enrolled course before writing.

### [apps/api/test/create-indexes.test.js](../../apps/api/test/create-indexes.test.js)

Regression/characterization tests for create-indexes.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../scripts/create-indexes`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `test`, `assert.rejects`, `run`, `assert.equal`, `writes.push`, `assert.deepEqual`, `main`, `events.push`.
- **Test focus:** production index creation requires an explicit backup-first confirmation; index creation requires confirmation in every runtime tier; index creation rejects empty or mistyped runtime modes before connecting; production index jobs require automatic index creation to remain disabled (all cases indexed in TESTING).

### [apps/api/test/curriculum-deletion-security.test.js](../../apps/api/test/curriculum-deletion-security.test.js)

Regression/characterization tests for curriculum-deletion-security.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../controllers/Section`, `../controllers/Subsection`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `installMock (L13)`; `response (L77)`; `json (L80)`; `status (L84)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `sectionController.deleteSection`, `subSectionController.deleteSubSection`, `sectionController.createSection`, `operations.find`, `sectionController.updateSection`, `subSectionController.createSubSection`, `subSectionController.updateSubSection`, `require.resolve`, `operations.push`, `installMock`, `test`, `response`, `assert.equal`, `assert.deepEqual`, `operations.includes`.
- **Test focus:** published curriculum cannot be physically deleted during checkout; adding an empty section atomically moves a Published course to Draft; archived courses reject section and lesson mutations; paid curriculum stays immutable even after it is moved to Draft (all cases indexed in TESTING).

### [apps/api/test/database-config.test.js](../../apps/api/test/database-config.test.js)

Regression/characterization tests for database-config.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:events`, `node:test`, `../config/database`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `installMock (L24)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `database.connect`, `calls.find`, `database.disconnect`, `calls.push`, `connection.emit`, `require.resolve`, `installMock`, `logs.push`, `test`, `assert.deepEqual`, `assert.equal`, `database.isReady`, `logs.some`.
- **Test focus:** Mongo deadlines use supported client and Mongoose options; Mongo connection signals immediately update readiness and emit safe log events.

### [apps/api/test/enrollment-consistency-repository.test.js](../../apps/api/test/enrollment-consistency-repository.test.js)

Regression/characterization tests for enrollment-consistency-repository.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../domains/enrollment/enrollmentConsistency`, `../domains/enrollment/enrollmentConsistencyRepository`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `buildEnrollmentConsistencyPipeline`, `pipeline.find`, `mapEnrollmentConsistencyDryRun`, `test`, `assert.deepEqual`, `assert.equal`, `pipeline.filter`, `serialized.includes`, `pipeline.some`, `$match.$or.some`, `mapPairState`, `result.issues.map`, `result.proposals.every`.
- **Test focus:** enrollment repository uses one bounded read-only aggregation shape; repository mapping is strict, media-free, and preserves raw duplicate counts; repository mapping keeps missing-user defaults ineligible; repository mapping treats malformed security defaults as unknown and preserves financial integrity counts (all cases indexed in TESTING).

### [apps/api/test/enrollment-consistency-service.test.js](../../apps/api/test/enrollment-consistency-service.test.js)

Regression/characterization tests for enrollment-consistency-service.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../domains/enrollment/enrollmentConsistencyService`, `../scripts/audit-enrollment-consistency`, `../scripts/preflight-production`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `validEntitlementReport (L26)`; `pairState (L55)`; `repositoryWith (L78)`; `streamPairStates (L79)`; `capturingLogger (L84)`; `record (L86)`; `validEnrollmentReport (L98)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `createEnrollmentConsistencyService`, `captured.events.find`, `validEnrollmentReport`, `validEntitlementReport`, `events.push`, `record`, `test`, `capturingLogger`, `ticks.shift`, `repositoryWith`, `pairState`, `assert.equal`, `assert.deepEqual`, `captured.events.map`, `report.samples.every`, `report.samples.map`, `classification.scenarios.map`, `captured.events.some`, `parseArguments`, `assert.throws`, `run`, `calls.push`, `assert.match`, `assert.rejects`, `classifyOperationalError`, `classifyPreflightResult`, `entitlementRecoveryForPreflight`, `assert.notEqual`, `enrollmentConsistencyForPreflight`, `preflightMain`.
- **Test focus:** consistency service returns a bounded healthy read-only report; consistency service reports scenario-only pairs with financial evidence without changing severity; consistency service distinguishes warnings, blocking issues, and dry-run truncation; dry-run telemetry labels scenario-only evidence as sampled pairs (all cases indexed in TESTING).

### [apps/api/test/enrollment-consistency.integration.test.js](../../apps/api/test/enrollment-consistency.integration.test.js)

Regression/characterization tests for enrollment-consistency real-service integration.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `mongoose`, `../models/Course`, `../models/CourseProgress`, `../models/Purchase`, `../models/User`, `../domains/enrollment/enrollmentConsistency`, `../domains/enrollment/enrollmentConsistencyRepository`, `../domains/enrollment/enrollmentConsistencyService`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `assertDisposableMongoUri (L60)`; `walk (L107)`; `explainEvidence (L119)`; `createCapturingLogger (L151)`; `record (L153)`; `addPair (L250)`; `clientListener (L569)`; `dropGuardedDatabase (L571)`; `collections (L577)`; `snapshotCollections (L584)`; `assertSnapshotEqual (L594)`; `aggregate (L599)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `documents.users.push`, `mongoose.connection.dropDatabase`, `collection.find`, `Purchase.aggregate`, `mongoose.connect`, `mongoose.connection.getClient`, `Course.collection.insertMany`, `Purchase.collection.insertMany`, `CourseProgress.collection.insertMany`, `collection.countDocuments`, `CourseProgress.collection.indexes`, `createEnrollmentConsistencyRepository`, `createEnrollmentConsistencyService`, `fixtures.get`, `selectedKeys.get`, `selectedStates.get`, `classifyEnrollmentPairState`, `mapEnrollmentConsistencyDryRun`, `allPairStates.find`, `buildEnrollmentConsistencyPipeline`, `commands.find`, `evidence.lookups.find`, `mongoose.disconnect`, `authority.includes`, `ALLOWED_MONGO_HOSTS.has`, `decodeURIComponent`, `url.pathname.slice`, `DATABASE_PATTERN.test`, `visitor`, `value.forEach`, `walk`, `cursors.push`.
- **Test focus:** enrollment integration MongoDB guard rejects unsafe targets; enrollment audit characterizes real MongoDB divergence without writes.

### [apps/api/test/enrollment-consistency.test.js](../../apps/api/test/enrollment-consistency.test.js)

Regression/characterization tests for enrollment-consistency.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../domains/enrollment/enrollmentConsistency`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `pairState (L19)`; `issueCodes (L46)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `classifyEnrollmentPairState`, `mapEnrollmentConsistencyDryRun`, `result.proposals.find`, `result.issues.map`, `test`, `assert.deepEqual`, `assert.equal`, `t.test`, `pairState`, `issueCodes`, `result.canonicalState.scenarios.map`, `withMirrors.proposals.every`, `result.proposals.every`, `proposal.proposedWrites.some`, `action.startsWith`, `invalidRole.proposals.some`, `proposedWrites.some`, `duplicateContextualOwnership.proposals.some`, `PURCHASE_STATUSES.map`, `malformedUser.proposals.every`, `result.proposals.map`, `courseId.toUpperCase`, `userId.toUpperCase`, `structuredClone`, `first.proposals.every`, `invalidStates.push`, `assert.throws`.
- **Test focus:** commercial statuses are centralized and exclude in-flight and refunded purchases; classifies mirror presence independently from commercial justification; characterizes the documented A-F scenarios without treating every scenario as entitlement; all and only qualifying immutable purchase histories justify mirrors (all cases indexed in TESTING).

### [apps/api/test/entitlement-model.test.js](../../apps/api/test/entitlement-model.test.js)

Regression/characterization tests for entitlement-model.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `mongoose`, `../models/Entitlement`, `../models/EntitlementOperationAudit`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `ids (L11)`; `provisioningState (L21)`; `auditRequest (L33)`; `expectValid (L47)`; `expectInvalid (L51)`; `indexesByName (L55)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `now.getTime`, `Entitlement.schema.path`, `EntitlementOperationAudit.schema.path`, `ids`, `assert.rejects`, `test`, `assert.equal`, `assert.ok`, `indexesByName`, `assert.deepEqual`, `expectValid`, `provisioningState`, `invalidStates.entries`, `assert.throws`, `privateState.toJSON`, `privateState.toObject`, `leasedState.toJSON`, `leasedState.toObject`, `auditRequest`, `expectInvalid`, `audit.toJSON`, `audit.toObject`.
- **Test focus:** Entitlement declares the exact ADR identity, privacy, and schema options; Entitlement declares only the seven approved named indexes; Entitlement accepts each lifecycle state and provisioning work mode; Entitlement rejects invalid lifecycle, provenance, recovery, and numeric shapes (all cases indexed in TESTING).

### [apps/api/test/entitlement-models.integration.test.js](../../apps/api/test/entitlement-models.integration.test.js)

Regression/characterization tests for entitlement-models real-service integration.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:child_process`, `node:path`, `node:test`, `mongoose`, `../models/Entitlement`, `../models/EntitlementOperationAudit`.
- **Exports:** `module.exports=assertDisposableMongoUri`.
- **Named functions / components:** `assertDisposableMongoUri (L18)`; `expectDuplicateKey (L65)`; `normalizeIndexKey (L75)`; `assertIndex (L77)`; `findIndexScan (L95)`; `winningPlanFromExplain (L107)`; `assertQueryUsesIndex (L112)`; `episodeInput (L190)`; `dropGuardedDatabase (L215)`; `runControlledIndexCreation (L221)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `indexes.find`, `mongoose.connection.dropDatabase`, `mongoose.connect`, `Entitlement.collection.createIndex`, `Entitlement.collection.indexes`, `EntitlementOperationAudit.collection.indexes`, `Entitlement.create`, `Entitlement.countDocuments`, `Entitlement.find`, `competingResults.find`, `Entitlement.findOneAndUpdate`, `casResults.find`, `completedAt.getTime`, `Entitlement.findById`, `persistedActivation.grantedAt.getTime`, `selectedEntitlement.toJSON`, `EntitlementOperationAudit.create`, `EntitlementOperationAudit.findById`, `now.getTime`, `EntitlementOperationAudit.findOneAndUpdate`, `auditCasResults.find`, `EntitlementOperationAudit.find`, `Entitlement.collection.updateOne`, `mongoose.disconnect`, `path.resolve`, `authority.includes`, `ALLOWED_MONGO_HOSTS.has`, `decodeURIComponent`, `url.pathname.slice`, `DATABASE_PATTERN.test`, `assert.rejects`, `assert.equal`.
- **Test focus:** Entitlement integration MongoDB guard rejects unsafe targets; Entitlement persistence enforces lifecycle, privacy, indexes, and concurrency on MongoDB 8.

### [apps/api/test/entitlement-policy.test.js](../../apps/api/test/entitlement-policy.test.js)

Regression/characterization tests for entitlement-policy.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../domains/entitlement/entitlementPolicy`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `commonEntitlement (L53)`; `provisioning (L68)`; `active (L75)`; `revoked (L82)`; `cancelled (L92)`; `requestedAudit (L101)`; `terminalAudit (L117)`; `expectPolicyError (L126)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `commonEntitlement`, `assertEntitlementState`, `assertEntitlementMutation`, `assertEntitlementOperationAuditState`, `assertEntitlementOperationAuditMutation`, `requestedAudit`, `assert.throws`, `assert.equal`, `assert.match`, `test`, `assert.deepEqual`, `canTransition`, `legal.has`, `assertTransition`, `expectPolicyError`, `isTerminal`, `provisioning`, `active`, `revoked`, `cancelled`, `isAccessGranting`, `t.test`, `assert.doesNotThrow`, `canTransitionAudit`, `assertAuditTransition`, `terminalAudit`.
- **Test focus:** publishes frozen allowlists from the approved ADR contract; implements the exhaustive Entitlement lifecycle matrix; accepts all four valid lifecycle state shapes and grants access only to valid active state; rejects invalid core provenance, concurrency, and lifecycle shapes (all cases indexed in TESTING).

### [apps/api/test/entitlement-purchase-evidence.test.js](../../apps/api/test/entitlement-purchase-evidence.test.js)

Regression/characterization tests for entitlement-purchase-evidence.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `mongoose`, `../domains/entitlement/entitlementPurchaseEvidence`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `purchase (L21)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `boundary.getTime`, `analyzePurchaseCourseEvidence`, `test`, `assert.deepEqual`, `purchase`, `assert.equal`, `purchaseHasVerifiedCapture`, `purchaseHasActivationEvidence`, `purchaseIsInSidecarCohort`, `purchaseMatchesEpisode`, `purchaseAllowsActivation`, `purchaseHasProcessedRefundEvidence`, `purchaseFinancialState`.
- **Test focus:** exact Purchase evidence accepts one immutable line for every unique Course; exact Purchase evidence normalizes native ObjectIds without recursion; exact Purchase evidence rejects malformed bundle-wide and boundary evidence; activation semantics preserve learner refunds and reject processed refunds (all cases indexed in TESTING).

### [apps/api/test/entitlement-recovery-service.test.js](../../apps/api/test/entitlement-recovery-service.test.js)

Regression/characterization tests for entitlement-recovery-service.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `mongoose`, `../domains/entitlement/entitlementRecoveryService`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `provisioningEpisode (L31)`; `claimedEpisode (L48)`; `validEvidence (L60)`; `completedDeletionUser (L94)`; `error (L114)`; `info (L115)`; `warn (L116)`; `withDatabaseTime (L119)`; `readDatabaseTime (L121)`; `catchUpBoundaryPurchases (L127)`; `classifyEvidence (L140)`; `findAgedProvisioning (L441)`; `transitionEpisode (L447)`; `findAgedProvisioning (L477)`; `transitionEpisode (L485)`; `claimDueProvisioning (L514)`; `loadGrantEvidence (L548)`; `transitionEpisode (L551)`; `loadGrantEvidence (L578)`; `loadGrantEvidence (L638)`; `transitionEpisode (L641)`; `findExpiredProvisioningLease (L662)`; `transitionEpisode (L666)`; `getRecoveryOperationalStatus (L866)`; `claimDueProvisioning (L911)`; `findAgedProvisioning (L914)`; `findExpiredProvisioningLease (L917)`; `catchUpBoundaryPurchases (L922)`; `claimDueProvisioning (L970)`; `findAgedProvisioning (L974)`; `findExpiredProvisioningLease (L978)`; `catchUpBoundaryPurchases (L984)`; `error (L1000)`; `info (L1001)`; `warn (L1002)`; `claimDueProvisioning (L1046)`; `findAgedProvisioning (L1050)`; `findExpiredProvisioningLease (L1054)`; `transitionEpisode (L1060)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `NOW.getTime`, `active.grantedAt.getTime`, `FULFILLED_AT.getTime`, `revoked.grantedAt.getTime`, `revoked.revokedAt.getTime`, `terminalAt.getTime`, `next.nextReconciliationAt.getTime`, `manual.manualReviewRequiredAt.getTime`, `next.manualReviewRequiredAt.getTime`, `createEntitlementRecoveryService`, `input.createdAfter.getTime`, `BOUNDARY.getTime`, `input.createdBefore.getTime`, `databaseNow.getTime`, `service.getOperationalStatus`, `observedNow.getTime`, `observedDeadline.getTime`, `PURCHASE_ID.toString`, `provisioningEpisode`, `databaseClock`, `classifyRecoveryEvidence`, `test`, `claimedEpisode`, `classifyEvidence`, `validEvidence`, `assert.deepEqual`, `activationPostState`, `assert.equal`, `refundCancellationPostState`, `assert.throws`, `completedDeletionUser`, `accountDeletionCancellationPostState`.
- **Test focus:** recovery evidence activates only complete trusted fulfillment at Purchase.fulfilledAt; recovery evidence keeps pending learner refunds active but rejects incomplete legacy mirrors; processed refund and exact completed-deletion tombstone cancel provisioning without inference; completed deletion revokes an active episode and retains its grant timestamp (all cases indexed in TESTING).

### [apps/api/test/entitlement-repository.test.js](../../apps/api/test/entitlement-repository.test.js)

Regression/characterization tests for entitlement-repository.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `mongoose`, `../domains/entitlement/entitlementRepository`, `../domains/entitlement/entitlementRecoveryService`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `constructor (L18)`; `comment (L23)`; `lean (L28)`; `limit (L33)`; `maxTimeMS (L38)`; `hint (L43)`; `select (L48)`; `setOptions (L53)`; `sort (L58)`; `provisioning (L64)`; `dependencies (L81)`; `fakeAggregation (L89)`; `option (L90)`; `then (L94)`; `operationalRepository (L101)`; `documentsById (L111)`; `find (L121)`; `aggregate (L138)`; `find (L147)`; `validBoundaryPurchase (L167)`; `validPurchaseEpisode (L191)`; `find (L212)`; `findOneAndUpdate (L259)`; `findOne (L305)`; `findOneAndUpdate (L309)`; `findOne (L351)`; `insertMany (L385)`; `option (L409)`; `then (L413)`; `aggregate (L421)`; `malformedBoundaryPurchaseCases (L499)`; `createFixture (L598)`; `lifecycleEpisodes (L626)`; `onLifecycleQuery (L631)`; `boundaryDocuments (L707)`; `onBoundaryPipeline (L795)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `now.getTime`, `boundary.getTime`, `createEntitlementRepository`, `repository.findPurchaseEpisodes`, `repository.findAgedProvisioning`, `mongoose.Types.ObjectId.createFromTime`, `createdAfter.getTime`, `createdBefore.getTime`, `repository.insertEntitlementEpisodes`, `validBoundaryPurchase`, `repository.findBoundaryPurchaseCandidates`, `calls.pipeline.findIndex`, `entitlementLookup.pipeline.findIndex`, `malformedBoundaryPurchaseCases`, `repository.getRecoveryOperationalStatus`, `validPurchaseEpisode`, `fixture.repository.getRecoveryOperationalStatus`, `pipeline.find`, `boundaryPipeline.findIndex`, `Promise.resolve`, `result`, `ids.map`, `value.toString`, `documents.filter`, `expected.has`, `document._id.toString`, `lifecycleEpisodes`, `onLifecycleQuery`, `onBoundaryPipeline`, `boundaryDocuments`, `fakeAggregation`, `documentsById`.
- **Test focus:** internal repository reads explicitly select every private operational field; transition CAS fences identity, revision, exact lease, validity, and deployment boundary; automatic claim uses both inclusive deployment and exclusive 24-hour age fences; aged recovery lookup uses an exact timestamp fence inside a bounded _id_ range (all cases indexed in TESTING).

### [apps/api/test/entitlement-service.test.js](../../apps/api/test/entitlement-service.test.js)

Regression/characterization tests for entitlement-service.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `mongoose`, `../domains/entitlement/entitlementService`, `../domains/entitlement/entitlementPolicy`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `clone (L22)`; `purchase (L37)`; `createMemoryRepository (L55)`; `findEpisodes (L83)`; `findBoundaryPurchaseCandidates (L96)`; `findCurrentPairEpisode (L118)`; `findCurrentPairEpisodes (L128)`; `findCurrentStudentEpisodes (L138)`; `findPurchaseEpisodes (L161)`; `insertEntitlementEpisodes (L164)`; `loadActivationEvidence (L201)`; `loadDeletionEvidence (L215)`; `loadPurchaseEvidence (L218)`; `loadReservationEvidence (L221)`; `readDatabaseTime (L227)`; `transitionEpisode (L230)`; `createCapturingLogger (L256)`; `record (L258)`; `incompleteRepository.loadActivationEvidence (L562)`; `changedRepository.loadActivationEvidence (L583)`; `repository.findBoundaryPurchaseCandidates (L1234)`; `error (L1257)`; `info (L1258)`; `warn (L1259)`; `repository.loadReservationEvidence (L1319)`; `repository.findPurchaseEpisodes (L1324)`; `repository.loadReservationEvidence (L1355)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `now.getTime`, `initialPurchases.map`, `selectedPurchaseId.toString`, `episodes.find`, `assertEntitlementState`, `courses.get`, `purchases.get`, `assertEntitlementMutation`, `episodes.findIndex`, `createEntitlementService`, `service.reserveForPurchase`, `repository.purchases.get`, `episode.nextReconciliationAt.getTime`, `sidecarStartedAt.getTime`, `service.activateForPurchase`, `changedService.reserveForPurchase`, `changedService.activateForPurchase`, `refundAt.getTime`, `deletedEpisode.revokedAt.getTime`, `unconfiguredService.catchUpBoundaryPurchases`, `service.catchUpBoundaryPurchases`, `newPurchase._id.toString`, `oldPurchase._id.toString`, `preBoundaryInFlightPurchase._id.toString`, `observedDeadline.getTime`, `value.toString`, `value.map`, `clone`, `purchase`, `initialEpisodes.map`, `entry._id.toString`, `episode.purchaseId.toString`.
- **Test focus:** reservation creates one scheduled episode per trusted Purchase line and replay converges; reservation rejects ambiguous lines, ineligible Students, and another current Purchase; reservation fails closed without a valid boundary and rejects historical Purchases; activation reloads authoritative evidence, proves every legacy mirror, and exact-CAS activates (all cases indexed in TESTING).

### [apps/api/test/entitlement-stage2.integration.test.js](../../apps/api/test/entitlement-stage2.integration.test.js)

Regression/characterization tests for entitlement-stage2 real-service integration.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:child_process`, `node:crypto`, `node:path`, `node:test`, `mongoose`, `../models/Course`, `../models/CourseProgress`, `../models/Entitlement`, `../models/EntitlementOperationAudit`, `../models/Purchase`, `../models/User`, `../domains/entitlement/entitlementRecoveryService`, `../domains/entitlement/entitlementRepository`, `../domains/entitlement/entitlementService`.
- **Exports:** `module.exports=assertDisposableMongoUri`.
- **Named functions / components:** `assertDisposableMongoUri (L20)`; `findIndexScan (L68)`; `findStage (L80)`; `winningPlanFromExplain (L90)`; `executionStatsFromExplain (L95)`; `assertQueryUsesIndex (L99)`; `error (L183)`; `errorMetadata (L184)`; `info (L187)`; `warn (L188)`; `nextFixtureName (L193)`; `purchaseDocument (L198)`; `insertStudent (L225)`; `insertCourse (L248)`; `insertPurchase (L261)`; `grantLegacy (L266)`; `setPurchaseFulfilled (L292)`; `runControlledIndexCreation (L302)`; `dropGuardedDatabase (L329)`; `recovery (L373)`; `restoreControllerEnvironment (L549)`; `installMock (L595)`; `createControllerResponse (L623)`; `json (L626)`; `status (L630)`; `Course.updateMany (L840)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `wallClock.getTime`, `boundary.getTime`, `Course.collection.insertOne`, `Purchase.collection.insertOne`, `CourseProgress.collection.updateOne`, `User.collection.updateOne`, `Course.collection.updateOne`, `Purchase.collection.updateOne`, `mongoose.connection.dropDatabase`, `mongoose.connect`, `Entitlement.collection.createIndex`, `Entitlement.collection.indexes`, `createEntitlementRepository`, `createEntitlementService`, `createEntitlementRecoveryService`, `boundaryCourses.push`, `insertCourse`, `preBoundaryPurchases.push`, `insertPurchase`, `boundaryCourses.entries`, `boundaryPurchases.push`, `Entitlement.countDocuments`, `preBoundaryPurchases.map`, `sidecar.reserveForPurchase`, `controllerRaceAt.getTime`, `deliveredEnrollmentEmails.push`, `paymentsController.verifyPayment`, `Purchase.findById`, `User.findById`, `controllerCourse._id.toString`, `Course.findById`, `CourseProgress.find`.
- **Test focus:** Entitlement Stage 2 integration MongoDB guard rejects unsafe targets; Entitlement Stage 2 sidecars and recovery converge safely on MongoDB 8.

### [apps/api/test/environment-loader.test.js](../../apps/api/test/environment-loader.test.js)

Regression/characterization tests for environment-loader.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:path`, `node:test`, `../config/loadEnvironment`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `configure (L17)`; `loaderModule.exports.loadEnvironment (L38)`; `error (L63)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `test`, `assert.equal`, `path.resolve`, `loadEnvironment`, `calls.push`, `assert.deepEqual`, `require.resolve`, `startCli`, `modulePath.endsWith`.
- **Test focus:** environment loading uses the API-owned environment file; environment loading delegates one quiet load without inspecting values; importing operational modules does not load a repository environment; operational CLI entry points load runtime logging after their environment.

### [apps/api/test/google-identity-timeout.test.js](../../apps/api/test/google-identity-timeout.test.js)

Regression/characterization tests for google-identity-timeout.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../utils/googleIdentity`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `installMock (L4)`; `constructor (L10)`; `verifyIdToken (L14)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `require.resolve`, `installMock`, `test`, `Date.now`, `assert.rejects`, `verifyGoogleIdToken`, `assert.ok`.
- **Test focus:** Google identity verification has a bounded deadline.

### [apps/api/test/http-contract.test.js](../../apps/api/test/http-contract.test.js)

Regression/characterization tests for http-contract.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:crypto`, `node:test`, `../package.json`, `../index`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `requestJson (L43)`; `requireListener (L48)`; `assertOperationalMetadata (L54)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `logout.response.headers.get`, `before`, `app.listen`, `reject`, `resolve`, `server.address`, `after`, `server.close`, `fetch`, `response.json`, `t.skip`, `assert.equal`, `Number.isInteger`, `assert.ok`, `test`, `requireListener`, `requestJson`, `assertOperationalMetadata`, `assert.deepEqual`, `assert.match`, `form.append`.
- **Test focus:** health and public auth routes expose stable JSON envelopes; protected payment routes reject an absent session before provider access; unauthenticated multipart uploads are rejected before file parsing; unsafe cross-site browser requests are rejected even without Origin (all cases indexed in TESTING).

### [apps/api/test/image-reference.test.js](../../apps/api/test/image-reference.test.js)

Regression/characterization tests for image-reference.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:child_process`, `node:path`, `node:test`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `validate (L7)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `path.resolve`, `spawnSync`, `test`, `validate`, `assert.equal`, `assert.notEqual`, `assert.match`.
- **Test focus:** operations host gate accepts only immutable sha256 image references.

### [apps/api/test/learning-v2-http.test.js](../../apps/api/test/learning-v2-http.test.js)

Regression/characterization tests for learning-v2-http.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `express`, `../routes/LearningV2`, `../shared/http/errorHandler`, `../shared/http/v2ErrorEnvelope`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `installMock (L13)`; `auth (L19)`; `isStudent (L27)`; `getLearningCourse (L39)`; `markLessonComplete (L58)`; `requireListener (L127)`; `requestJson (L133)`; `studentHeaders (L138)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `req.get`, `app.use`, `app.get`, `getResult.response.headers.get`, `require.resolve`, `installMock`, `res.status`, `serviceCalls.push`, `express`, `res.setHeader`, `express.json`, `before`, `app.listen`, `reject`, `resolve`, `server.address`, `after`, `server.close`, `t.skip`, `fetch`, `response.json`, `test`, `requireListener`, `requestJson`, `assert.equal`, `studentHeaders`, `assert.deepEqual`.
- **Test focus:** learning v2 authenticates before parameter validation; learning v2 rejects non-students and invalid route parameters; learning v2 rejects unknown query fields and mutation bodies; learning v2 routes reach the validated controller before the v2 catch-all (all cases indexed in TESTING).

### [apps/api/test/learning-v2-mapper.test.js](../../apps/api/test/learning-v2-mapper.test.js)

Regression/characterization tests for learning-v2-mapper.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../domains/learning/learningMapper`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `mapLearningCourseState`, `test`, `ids.course.toUpperCase`, `mapLearningCurriculum`, `assert.deepEqual`, `curriculum.map`, `curriculum.flatMap`, `section.lessons.map`, `assert.equal`.
- **Test focus:** learning mapper preserves source order while removing duplicate and dangling relations; learning mapper gives legacy labels and deterministic zero-lesson progress; learning mapper supplies a usable title for a legacy unnamed extant lesson.

### [apps/api/test/learning-v2-service.test.js](../../apps/api/test/learning-v2-service.test.js)

Regression/characterization tests for learning-v2-service.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../domains/learning/learningErrors`, `../domains/learning/learningService`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `course (L18)`; `curriculum (L26)`; `repository (L44)`; `request (L56)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `getLearningCourse`, `curriculum`, `course`, `test`, `assert.rejects`, `request`, `repository`, `assert.equal`, `assert.deepEqual`, `serialized.includes`, `completed.add`, `ids.lesson.toUpperCase`, `markLessonComplete`.
- **Test focus:** learning service distinguishes a missing course from denied enrollment; learning service returns only canonical current progress; learning completion is repeat-safe and normalizes uppercase ObjectIds; learning completion rejects a lesson from another course before persistence (all cases indexed in TESTING).

### [apps/api/test/learning-v2.integration.test.js](../../apps/api/test/learning-v2.integration.test.js)

Regression/characterization tests for learning-v2 real-service integration.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `mongoose`, `../config/redis`, `../config/env`, `../models/Course`, `../models/CourseProgress`, `../models/Section`, `../models/Subsection`, `../models/User`, `../index`, `../utils/auth`, `../utils/policyAcceptance`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `findIndexScan (L6)`; `assertDisposableMongoUri (L18)`; `assertDisposableRedisUri (L43)`; `userDocument (L114)`; `sessionCookieFor (L138)`; `clearCookie (L142)`; `cookie (L143)`; `requestJson (L156)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `issueSession`, `mongoose.connect`, `redis.connect`, `CourseProgress.createIndexes`, `Course.collection.insertMany`, `CourseProgress.collection.insertOne`, `enrolled.response.headers.get`, `ids.zeroCourse.toString`, `CourseProgress.exists`, `CourseProgress.collection.findOne`, `storedLegacyProgress.completedVideos.filter`, `CourseProgress.countDocuments`, `CourseProgress.collection.indexes`, `progressIndexes.find`, `mongoose.connection.dropDatabase`, `redis.disconnect`, `mongoose.disconnect`, `findIndexScan`, `value.startsWith`, `url.pathname.slice`, `test`, `assertDisposableMongoUri`, `assertDisposableRedisUri`, `name.toLowerCase`, `createPolicyAcceptance`, `userDocument`, `assert.equal`, `encodeURIComponent`, `fetch`, `response.json`, `redis.sendCommand`, `User.collection.insertMany`.
- **Test focus:** learning v2 enforces entitlement and idempotent progress with real services; learning integration URI guards reject production-looking targets.

### [apps/api/test/live-e2e-environment.test.js](../../apps/api/test/live-e2e-environment.test.js)

Regression/characterization tests for live-e2e-environment.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../../../e2e/live-environment.cjs`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `test`, `resolveLiveEnvironment`, `assert.equal`, `assert.deepEqual`, `assert.throws`.
- **Test focus:** live E2E defaults use the canonical loopback origin and local accounts; loopback live E2E follows configured demo identities; public live E2E targets fail closed without explicit credentials; public live E2E targets use only injected live credentials.

### [apps/api/test/logger.test.js](../../apps/api/test/logger.test.js)

Regression/characterization tests for logger.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:events`, `node:test`, `../utils/logger`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `fixedNow (L17)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `test`, `createRuntimeLogger`, `lines.push`, `runtimeLogger.info`, `runtimeLogger.warn`, `assert.equal`, `assert.deepEqual`, `createLogger`, `output.push`, `logger.debug`, `logger.info`, `logger.warn`, `logger.error`, `output.map`, `serialized.includes`, `errorMetadata`, `createHttpRequestLogger`, `times.shift`, `middleware`, `response.emit`, `assert.throws`.
- **Test focus:** runtime logger derives level and metadata from an explicit environment; structured logger emits stable JSON metadata and respects levels; structured logger safely serializes errors and redacts secrets; structured logger omits error causes and redacts common payment and identity fields (all cases indexed in TESTING).

### [apps/api/test/media-upload.test.js](../../apps/api/test/media-upload.test.js)

Regression/characterization tests for media-upload.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:fs/promises`, `node:os`, `node:path`, `node:test`, `cloudinary`, `../utils/imageUploader`, `../middleware/upload`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `withFixture (L22)`; `cloudinary.uploader.upload (L54)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `fs.mkdtemp`, `path.join`, `os.tmpdir`, `fs.writeFile`, `callback`, `fs.rm`, `test`, `Buffer.from`, `withFixture`, `validateMediaFile`, `assert.rejects`, `uploadImageToCloudinary`, `assert.equal`, `fs.access`, `cleanupUploadedTempFiles`, `cloudinary.config`, `createPrivateMediaUrl`, `assert.match`.
- **Test focus:** media validation accepts matching signatures and rejects MIME spoofing; completed uploads remove their temporary file; route cleanup removes unconsumed and incorrectly named upload fields; private course-media links are signed, authenticated, and expiring.

### [apps/api/test/model-validation.test.js](../../apps/api/test/model-validation.test.js)

Regression/characterization tests for model-validation.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../models/Course`, `../models/Section`, `../models/Subsection`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `test`, `assert.rejects`, `course.validate`, `section.validate`, `subSection.validate`, `assert.equal`.
- **Test focus:** course and lesson schemas enforce bounded production inputs; course, section, and lesson schemas maintain timestamps.

### [apps/api/test/mongo-deployment.test.js](../../apps/api/test/mongo-deployment.test.js)

Regression/characterization tests for mongo-deployment.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../utils/mongoDeployment`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `test`, `assert.deepEqual`, `validateProductionMongoUri`, `assert.throws`, `assert.doesNotThrow`, `validateMongoUriForEnvironment`, `assert.equal`, `mongoJobOptions`.
- **Test focus:** production MongoDB validation accepts authenticated TLS SRV and replica-set URIs; production MongoDB validation rejects missing auth, TLS, database, and loopback; production MongoDB validation rejects TLS verification bypasses; production MongoDB validation requires durable writes and primary reads (all cases indexed in TESTING).

### [apps/api/test/mongoose-9-compatibility.test.js](../../apps/api/test/mongoose-9-compatibility.test.js)

Regression/characterization tests for mongoose-9-compatibility.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `mongoose`, `../models/Category`, `../models/Course`, `../models/CourseProgress`, `../models/Entitlement`, `../models/EntitlementOperationAudit`, `../models/OTP`, `../models/Purchase`, `../models/RatingandReview`, `../models/User`, `../controllers/courseProgress`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `json (L31)`; `status (L35)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `updateCourseProgress`, `test`, `assert.equal`, `mongoose.version.startsWith`, `mongoose.isValidObjectId`, `mongoose.isObjectIdOrHexString`, `Buffer.alloc`, `assert.throws`, `assert.deepEqual`, `model.schema.indexes`.
- **Test focus:** Mongoose 9 rejects numeric ObjectIds while preserving valid identifiers; numeric public course identifiers retain the generic 400 response; Mongoose 9 index declarations preserve semantics without background.

### [apps/api/test/mongoose-models.integration.test.js](../../apps/api/test/mongoose-models.integration.test.js)

Regression/characterization tests for mongoose-models real-service integration.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:perf_hooks`, `node:path`, `node:test`, `mongoose`, `../models/Category`, `../models/Course`, `../models/CourseProgress`, `../models/OTP`, `../models/Profile`, `../models/Purchase`, `../models/RatingandReview`, `../models/Section`, `../models/Subsection`, `../models/User`, `../domains/catalog/catalogRepository`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `assertDisposableMongoUri (L8)`; `expectDuplicateKey (L30)`; `timeOperation (L38)`; `mongodbDriverVersion (L45)`; `purchaseInput (L424)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `mongoose.connect`, `mongoose.connection.dropDatabase`, `model.createIndexes`, `Profile.create`, `User.create`, `User.findById`, `User.collection.findOne`, `User.findOneAndUpdate`, `OTP.create`, `OTP.findById`, `OTP.findOne`, `expiredOtp.expiresAt.getTime`, `Category.create`, `SubSection.create`, `Section.create`, `Section.findByIdAndUpdate`, `Section.findById`, `Course.create`, `Category.updateOne`, `User.updateOne`, `Course.findById`, `Course.find`, `publicCourses.map`, `RatingAndReview.create`, `Course.updateOne`, `CourseProgress.findOneAndUpdate`, `CourseProgress.findOne`, `CourseProgress.create`, `Purchase.create`, `Purchase.findById`, `purchase.save`, `Purchase.findOneAndUpdate`.
- **Test focus:** core StudyNotion models preserve validation, indexes, relationships, and query behavior; Mongoose integration URI guards reject production-looking targets.

### [apps/api/test/payment-security.test.js](../../apps/api/test/payment-security.test.js)

Regression/characterization tests for payment-security.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:crypto`, `node:test`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `createResponse (L15)`; `status (L18)`; `json (L22)`; `installMock (L28)`; `installOptionalMock (L38)`; `assertSingleLegacyFulfillment (L56)`; `assertSingleLegacyRevocation (L80)`; `entitlementMethodNames (L92)`; `loadPaymentsController (L94)`; `setHeader (L415)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `controller.getCheckoutConfig`, `controller.verifyPayment`, `controller.requestRefund`, `controller.listMyPurchases`, `require.resolve`, `installMock`, `assert.equal`, `events.filter`, `assert.deepEqual`, `calls.map`, `Date.now`, `events.push`, `courseId.toString`, `query.status.$in.includes`, `logs.push`, `entitlementServiceMethods.map`, `entitlementCalls.push`, `operation`, `installOptionalMock`, `test`, `loadPaymentsController`, `createResponse`, `controller.capturePayment`, `events.map`, `events.some`, `assertSingleLegacyFulfillment`, `entitlementMethodNames`, `logs.filter`, `observedDeadlines.push`, `Buffer.from`, `name.toLowerCase`, `controller.razorpayWebhook`.
- **Test focus:** capture persists the server-priced purchase before creating an order; checkout requires affirmative purchase-policy acknowledgement; checkout rejects a policy snapshot the learner did not currently view; checkout config exposes the server-owned policy contract (all cases indexed in TESTING).

### [apps/api/test/preflight-configuration.test.js](../../apps/api/test/preflight-configuration.test.js)

Regression/characterization tests for preflight-configuration.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../scripts/preflight-production`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `test`, `validateRuntimeConfiguration`, `assert.equal`, `assert.throws`, `verifyPreflightIndexes`, `assert.deepEqual`.
- **Test focus:** production preflight validates the complete runtime contract before data checks; disposable preflight fixtures do not require production provider credentials; production preflight cannot silently run with an omitted or mistyped runtime; production preflight index verification is read only and reports missing indexes.

### [apps/api/test/preflight-lesson.test.js](../../apps/api/test/preflight-lesson.test.js)

Regression/characterization tests for preflight-lesson.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../scripts/preflight-production`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `test`, `assert.equal`, `isPublishedLessonMetadataValid`, `parsePreflightSidecarStartedAt`, `assert.throws`.
- **Test focus:** production preflight validates published lesson metadata and duration; production preflight rejects a materially future Entitlement boundary.

### [apps/api/test/preflight-production.integration.test.js](../../apps/api/test/preflight-production.integration.test.js)

Regression/characterization tests for preflight-production real-service integration.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:fs`, `node:os`, `node:path`, `node:test`, `../scripts/preflight-production`, `mongoose`, `../models/Category`, `../models/Course`, `../models/CourseProgress`, `../models/Entitlement`, `../models/EntitlementOperationAudit`, `../models/OTP`, `../models/Profile`, `../models/Purchase`, `../models/RatingandReview`, `../models/Section`, `../models/Subsection`, `../models/User`, `../scripts/create-indexes`.
- **Exports:** `module.exports=assertDisposableMongoUri`.
- **Named functions / components:** `assertDisposableMongoUri (L36)`; `loadPreflightWithoutRepositoryEnvironment (L83)`; `nonZeroCounts (L95)`; `restoreEnvironment (L153)`; `collections (L197)`; `snapshotCollections (L212)`; `clientListener (L366)`; `dropGuardedDatabase (L368)`; `runScenario (L374)`; `console.log (L394)`; `process.stderr.write (L395)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `collection.find`, `mongoose.connection.dropDatabase`, `mongoose.connect`, `mongoose.connection.getClient`, `Course.collection.insertMany`, `CourseProgress.collection.insertMany`, `Purchase.collection.insertMany`, `model.createIndexes`, `Purchase.collection.insertOne`, `Entitlement.collection.insertOne`, `stage2At.getTime`, `Entitlement.collection.updateOne`, `Entitlement.collection.deleteOne`, `Purchase.collection.deleteOne`, `Entitlement.collection.insertMany`, `Entitlement.collection.deleteMany`, `CourseProgress.collection.deleteOne`, `CourseProgress.collection.insertOne`, `User.collection.updateOne`, `Purchase.collection.updateOne`, `Course.collection.updateOne`, `mongoose.disconnect`, `authority.includes`, `ALLOWED_MONGO_HOSTS.has`, `decodeURIComponent`, `url.pathname.slice`, `DATABASE_PATTERN.test`, `process.cwd`, `mkdtempSync`, `join`, `tmpdir`, `process.chdir`.
- **Test focus:** production preflight integration MongoDB guard rejects unsafe targets; production preflight reports enrollment states without mutating MongoDB.

### [apps/api/test/production-cookie.test.js](../../apps/api/test/production-cookie.test.js)

Regression/characterization tests for production-cookie.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:child_process`, `node:path`, `node:test`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `events.find`, `path.resolve`, `test`, `spawnSync`, `assert.equal`, `assert.deepEqual`.
- **Test focus:** production session issue and clearing preserve the hardened cookie contract.

### [apps/api/test/production-env.test.js](../../apps/api/test/production-env.test.js)

Regression/characterization tests for production-env.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:child_process`, `node:path`, `node:test`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `loadEnv (L44)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `path.resolve`, `spawnSync`, `test`, `loadEnv`, `assert.equal`, `assert.notEqual`, `assert.match`, `assert.doesNotMatch`, `result.stdout.trim`.
- **Test focus:** production configuration accepts structurally valid provider settings; runtime mode rejects NODE_ENV typos instead of disabling production safeguards; production runtimes require an explicit deployment tier; staging requires Razorpay test mode and may disable Google sign-in (all cases indexed in TESTING).

### [apps/api/test/profile-security.test.js](../../apps/api/test/profile-security.test.js)

Regression/characterization tests for profile-security.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `bcryptjs`, `../controllers/profile`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `installMock (L25)`; `installOptionalMock (L30)`; `entitlementService.runNonAuthoritativeSidecar (L60)`; `verifyIdToken (L134)`; `createResponse (L153)`; `json (L157)`; `status (L161)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `failedEntitlementMethods.has`, `profileController._test.buildEnrolledCourseDto`, `failedEntitlementMethods.add`, `profileController.deleteAccount`, `failedEntitlementMethods.delete`, `calls.find`, `bcrypt.hashSync`, `require.resolve`, `installMock`, `entitlementCalls.push`, `operation`, `installOptionalMock`, `calls.push`, `test`, `profileController._test.buildProfileUpdates`, `assert.equal`, `assert.throws`, `createResponse`, `assert.deepEqual`, `assert.ok`, `calls.some`, `entitlementCalls.filter`, `Date.now`, `profileController.instructorDashboard`.
- **Test focus:** profile input is normalized and rejects invalid dates and enum values; enrolled course DTOs contain content and own progress without learner IDs; account deletion anonymizes identity and removes learner-owned data; account deletion requires the current local password (all cases indexed in TESTING).

### [apps/api/test/public-production-env.test.js](../../apps/api/test/public-production-env.test.js)

Regression/characterization tests for public-production-env.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:child_process`, `node:fs`, `node:path`, `node:test`, `../../web/scripts/deployment-network.mjs`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `validatePublicEnv (L20)`; `readExampleEnv (L27)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `path.resolve`, `spawnSync`, `fs.readFileSync`, `path.join`, `line.startsWith`, `line.indexOf`, `line.slice`, `test`, `validatePublicEnv`, `assert.equal`, `assert.match`, `assert.notEqual`, `readExampleEnv`, `name.startsWith`, `import`, `resolveNginxApiOrigin`, `assert.throws`.
- **Test focus:** public production configuration accepts HTTPS and live provider identifiers; public staging configuration requires a test key and can hide Google sign-in; public production configuration requires Google and a live payment key; public deployment tier is explicit and enumerated (all cases indexed in TESTING).

### [apps/api/test/purchase-lifecycle.test.js](../../apps/api/test/purchase-lifecycle.test.js)

Regression/characterization tests for purchase-lifecycle.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../utils/purchaseLifecycle`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `installMock (L6)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `require.resolve`, `installMock`, `updates.push`, `test`, `Date.now`, `releaseStaleCheckoutLocks`, `assert.equal`, `assert.deepEqual`, `assert.ok`.
- **Test focus:** stale checkout locks are expired within the requested account and course scope.

### [apps/api/test/rate-limit-store.test.js](../../apps/api/test/rate-limit-store.test.js)

Regression/characterization tests for rate-limit-store.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../middleware/rateLimiters`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `test`, `hashRateLimitIdentity`, `assert.match`, `assert.equal`, `hashed.includes`, `assert.notEqual`.
- **Test focus:** rate-limit keys never expose email, user, or IP identities.

### [apps/api/test/rating-contract.test.js](../../apps/api/test/rating-contract.test.js)

Regression/characterization tests for rating-contract.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../controllers/RatingandReview`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `installMock (L4)`; `json (L18)`; `status (L22)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `require.resolve`, `installMock`, `test`, `getAverageRating`, `assert.equal`.
- **Test focus:** rating GET without a query or body courseId returns 400.

### [apps/api/test/reconcile-entitlements.test.js](../../apps/api/test/reconcile-entitlements.test.js)

Regression/characterization tests for reconcile-entitlements.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../scripts/reconcile-entitlements`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `validRecoveryReport (L36)`; `validStatusReport (L48)`; `runBatch (L237)`; `getOperationalStatus (L282)`; `runBatch (L299)`; `getOperationalStatus (L353)`; `runBatch (L386)`; `runBatch (L420)`; `getOperationalStatus (L435)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `test`, `assert.deepEqual`, `parseArguments`, `assert.throws`, `assert.equal`, `parseStrictIsoTimestamp`, `mongoOptions`, `run`, `assert.match`, `calls.push`, `validRecoveryReport`, `assert.rejects`, `assert.fail`, `sidecarStartedAt.toISOString`, `validStatusReport`, `classifyOperationalError`.
- **Test focus:** Entitlement recovery CLI parses only bounded one-shot options; sidecar boundary accepts only an exact valid UTC ISO timestamp; MongoDB runner timeouts stay strictly below the 60-second recovery lease; --help is offline and needs no repository environment (all cases indexed in TESTING).

### [apps/api/test/recovery-host-validation.test.js](../../apps/api/test/recovery-host-validation.test.js)

Regression/characterization tests for recovery-host-validation.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:fs`, `node:os`, `node:path`, `node:test`, `../../../scripts/validate-recovery-host.cjs`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `test`, `fs.realpathSync`, `fs.mkdtempSync`, `path.join`, `os.tmpdir`, `context.after`, `fs.rmSync`, `fs.writeFileSync`, `fs.mkdirSync`, `validateRecoveryHost`, `path.resolve`, `assert.deepEqual`, `assert.throws`, `parseEnvironmentFile`, `validContents.replace`.
- **Test focus:** recovery host validation accepts only a private least-privilege file; recovery host validation rejects provider secrets and permissive files; recovery host validation mirrors the worker's exact MongoDB deadlines.

### [apps/api/test/redis-deadline.test.js](../../apps/api/test/redis-deadline.test.js)

Regression/characterization tests for redis-deadline.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../utils/deadline`, `redis`, `../config/redis`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `isOpen (L38)`; `isReady (L41)`; `on (L44)`; `connect (L45)`; `ping (L48)`; `sendCommand (L51)`; `quit (L54)`; `destroy (L58)`; `redisPackage.createClient (L64)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `redis.connect`, `redis.disconnect`, `test`, `assert.rejects`, `withDeadline`, `assert.equal`, `redis.sendCommand`, `redis.isReady`.
- **Test focus:** Redis operations fail within their explicit deadline; Redis applies the configured deadline to every runtime command.

### [apps/api/test/release-pair.test.js](../../apps/api/test/release-pair.test.js)

Regression/characterization tests for release-pair.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:child_process`, `node:path`, `node:test`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `validatePair (L24)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `path.resolve`, `spawnSync`, `test`, `validatePair`, `assert.equal`, `assert.match`, `assert.notEqual`.
- **Test focus:** release pair accepts the matching same-origin staging contract; release pair preserves the supported separate-origin contract; release pair rejects tier, API origin, and public provider drift; release pair independently enforces tier-specific provider contracts (all cases indexed in TESTING).

### [apps/api/test/reset-password-security.test.js](../../apps/api/test/reset-password-security.test.js)

Regression/characterization tests for reset-password-security.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:crypto`, `node:test`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `queryFor (L16)`; `installMock (L54)`; `createResponse (L74)`; `status (L77)`; `json (L81)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `crypto.createHash`, `queryFor`, `updates.push`, `require.resolve`, `installMock`, `deliveries.push`, `test`, `Date.now`, `createResponse`, `resetPasswordToken`, `assert.equal`, `html.match`, `assert.ok`, `html.includes`, `assert.notEqual`, `assert.match`, `crypto.randomBytes`, `resetPassword`.
- **Test focus:** reset links keep the bearer token out of request paths and logs; unknown reset emails receive the same generic success response; a reset token is consumed atomically and cannot be replayed; expired reset tokens fail without changing the session version (all cases indexed in TESTING).

### [apps/api/test/review-privacy.test.js](../../apps/api/test/review-privacy.test.js)

Regression/characterization tests for review-privacy.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../controllers/RatingandReview`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `installMock (L4)`; `json (L39)`; `status (L43)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `require.resolve`, `installMock`, `test`, `getAllRatingReview`, `assert.equal`.
- **Test focus:** public review feed omits stable reviewer, review, and course IDs.

### [apps/api/test/schedule-entitlement-recovery.test.js](../../apps/api/test/schedule-entitlement-recovery.test.js)

Regression/characterization tests for schedule-entitlement-recovery.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:fs/promises`, `node:os`, `node:path`, `node:test`, `../scripts/schedule-entitlement-recovery`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `recoveryReport (L32)`; `privateCheckpoint (L59)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `mkdtemp`, `path.join`, `os.tmpdir`, `chmod`, `t.after`, `rm`, `test`, `assert.equal`, `parseBatchSize`, `assert.throws`, `path.parse`, `process.cwd`, `parseCheckpointPath`, `path.normalize`, `parseImageDigest`, `privateCheckpoint`, `readCheckpoint`, `assert.rejects`, `writeFile`, `symlink`, `writeCheckpoint`, `stat`, `assert.deepEqual`, `readdir`, `name.endsWith`, `readFile`, `runScheduledRecovery`, `calls.push`, `recoveryReport`, `assert.doesNotMatch`, `main`, `assert.match`.
- **Test focus:** scheduled recovery configuration requires an absolute path and bounded batch; checkpoint storage is exact-mode, strict-shape, and symlink refusing; checkpoint replacement is atomic, mode 0600, and represents wraparound without deletion; scheduled recovery advances and wraps the private cursor without returning it (all cases indexed in TESTING).

### [apps/api/test/seed-safety.test.js](../../apps/api/test/seed-safety.test.js)

Regression/characterization tests for seed-safety.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:path`, `node:child_process`, `node:test`, `mongoose`, `../domains/entitlement/entitlementPurchaseEvidence`, `../scripts/seed`, `../utils/seedSafety`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `demoEnvironment (L25)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `createSyntheticPurchaseDocument`, `analyzePurchaseCourseEvidence`, `path.resolve`, `path.join`, `test`, `spawnSync`, `assert.equal`, `assert.match`, `assert.doesNotMatch`, `assert.throws`, `assertSafeSeedTarget`, `createDemoSeedConfiguration`, `demoEnvironment`, `assert.deepEqual`, `purchaseIsInSidecarCohort`, `purchaseAllowsActivation`, `assert.fail`.
- **Test focus:** demo admin provisioning is disabled in production; the production deployment tier always refuses the demo seed; production-style staging requires every independent disposable guard; demo identities are injected and local media remains explicitly local (all cases indexed in TESTING).

### [apps/api/test/session-security.test.js](../../apps/api/test/session-security.test.js)

Regression/characterization tests for session-security.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `../middleware/auth`, `../utils/auth`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `createResponse (L55)`; `cookie (L61)`; `clearCookie (L65)`; `setHeader (L69)`; `status (L73)`; `json (L77)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `issueSession`, `verifySessionToken`, `clearSession`, `require.resolve`, `this.cookies.push`, `this.clearedCookies.push`, `name.toLowerCase`, `test`, `createResponse`, `assert.equal`, `assert.ok`, `res.clearedCookies.some`, `auth`, `assert.fail`, `assert.deepEqual`, `res.clearedCookies.map`.
- **Test focus:** session tokens carry a revocable version and use hardened cookies; auth accepts the current session version and rejects it after revocation; logout cleanup clears both current and legacy cookie names; a pending deletion restricts the account while allowing a safe retry (all cases indexed in TESTING).

### [apps/api/test/v2-request-validation.test.js](../../apps/api/test/v2-request-validation.test.js)

Regression/characterization tests for v2-request-validation.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `express`, `@studynotion/contracts`, `../shared/http/v2ErrorEnvelope`, `../shared/http/errorHandler`, `../shared/http/validateV2Request`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `respondWithValidatedInput (L40)`; `requireListener (L87)`; `requestJson (L93)`; `json (L196)`; `setHeader (L200)`; `json (L230)`; `setHeader (L234)`; `json (L265)`; `setHeader (L269)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `app.use`, `app.post`, `preserveSessionControlCode`, `validateV2Request`, `express`, `res.setHeader`, `express.json`, `res.status`, `before`, `app.listen`, `reject`, `resolve`, `server.address`, `after`, `server.close`, `t.skip`, `fetch`, `response.json`, `test`, `requireListener`, `requestJson`, `assert.equal`, `assert.deepEqual`, `apiErrorResponseSchema.safeParse`, `validationDetails`, `name.toLowerCase`, `normalizeV2ErrorEnvelope`, `createV2ErrorEnvelope`, `assert.throws`, `statusCodeToErrorCode`.
- **Test focus:** route-local validation parses into locals without mutating Express query input; strict v2 validation rejects unknown and invalid params, query, and body fields; malformed encoded route parameters use the stable v2 envelope; validation issue details are bounded and strip control characters (all cases indexed in TESTING).

## apps/api/utils

### [apps/api/utils/auth.js](../../apps/api/utils/auth.js)

JWT sign/verify and HttpOnly cookie issue/clear/read compatibility.

- **Imports / dependencies:** `jsonwebtoken`, `../config/env`.
- **Exports:** `exports.issueSession`; `exports.clearSession`; `exports.readSessionToken`; `exports.verifySessionToken`.
- **Named functions / components:** `readBearerToken (L7)`; `createSessionToken (L13)`; `sessionCookieOptions (L32)`; `clearCookie (L41)`; `exports.issueSession (L55)`; `exports.clearSession (L62)`; `exports.readSessionToken (L67)`; `exports.verifySessionToken (L73)`.
- **Direct static consumers:** [apps/api/controllers/Auth.js](../../apps/api/controllers/Auth.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/middleware/auth.js](../../apps/api/middleware/auth.js); [apps/api/test/learning-v2.integration.test.js](../../apps/api/test/learning-v2.integration.test.js); [apps/api/test/session-security.test.js](../../apps/api/test/session-security.test.js).
- **Selected calls / effects:** `jwt.sign`, `createSessionToken`, `req.get`, `jwt.verify`, `authorization.match`, `user._id.toString`, `Number.isInteger`, `sessionCookieOptions`, `res.clearCookie`, `res.cookie`, `clearCookie`, `readBearerToken`.

### [apps/api/utils/courseDto.js](../../apps/api/utils/courseDto.js)

Projects course/curriculum/instructor details without accidental private media/learner exposure.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=sanitizeInstructorCourse`.
- **Named functions / components:** `asPlainObject (L1)`; `sanitizeInstructorCourse (L6)`.
- **Direct static consumers:** [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/Section.js](../../apps/api/controllers/Section.js).
- **Selected calls / effects:** `document.toObject`, `asPlainObject`, `course.ratingAndReviews.map`.

### [apps/api/utils/courseLifecycle.js](../../apps/api/utils/courseLifecycle.js)

Publication readiness, history retention and curriculum deletion policy; shared by authoring controllers.

- **Imports / dependencies:** `../models/Course`, `../models/Section`, `../models/Subsection`.
- **Exports:** `module.exports=isCoursePublishReady,isLessonPublishReady,unpublishIfIncomplete`.
- **Named functions / components:** `normalizeIds (L5)`; `validRequiredText (L9)`; `isLessonPublishReady (L14)`; `isCoursePublishReady (L30)`; `unpublishIfIncomplete (L66)`.
- **Direct static consumers:** [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/Section.js](../../apps/api/controllers/Section.js); [apps/api/controllers/Subsection.js](../../apps/api/controllers/Subsection.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/test/course-lifecycle.test.js](../../apps/api/test/course-lifecycle.test.js).
- **Selected calls / effects:** `Section.find`, `SubSection.find`, `Course.findById`, `isCoursePublishReady`, `Course.updateOne`, `values.filter`, `value.toString`, `value.trim`, `validRequiredText`, `lesson.videoUrl.trim`, `Number.isFinite`, `normalizeIds`, `sections.flatMap`, `sections.some`, `subsection._id.toString`, `sections.every`, `realIds.has`, `subsectionId.toString`.

### [apps/api/utils/deadline.js](../../apps/api/utils/deadline.js)

Bounded asynchronous operation timeout/abort helper.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=withDeadline`.
- **Named functions / components:** `withDeadline (L1)`.
- **Direct static consumers:** [apps/api/config/redis.js](../../apps/api/config/redis.js); [apps/api/test/redis-deadline.test.js](../../apps/api/test/redis-deadline.test.js).
- **Selected calls / effects:** `Promise.race`, `setTimeout`, `reject`, `clearTimeout`.

### [apps/api/utils/deploymentNetwork.js](../../apps/api/utils/deploymentNetwork.js)

Production host/loopback classification, including encoded/address edge cases.

- **Imports / dependencies:** `node:net`.
- **Exports:** `module.exports=isLoopbackHostname,normalizeHostname`.
- **Named functions / components:** `normalizeHostname (L3)`; `mappedIpv4 (L10)`; `isLoopbackHostname (L28)`.
- **Direct static consumers:** [apps/api/config/env.js](../../apps/api/config/env.js); [apps/api/utils/mongoDeployment.js](../../apps/api/utils/mongoDeployment.js).
- **Selected calls / effects:** `Number.parseInt`, `dotted.slice`, `octets.every`, `normalizeHostname`, `hostname.endsWith`, `isIP`, `hostname.startsWith`, `mappedIpv4`, `mapped.every`.

### [apps/api/utils/googleIdentity.js](../../apps/api/utils/googleIdentity.js)

Bounded server Google ID-token verification; identity proof belongs on server.

- **Imports / dependencies:** `google-auth-library`, `../config/env`.
- **Exports:** `module.exports=verifyGoogleIdToken`.
- **Named functions / components:** `verifyGoogleIdToken (L12)`.
- **Direct static consumers:** [apps/api/controllers/Auth.js](../../apps/api/controllers/Auth.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/test/google-identity-timeout.test.js](../../apps/api/test/google-identity-timeout.test.js).
- **Selected calls / effects:** `googleClient.verifyIdToken`, `setTimeout`, `reject`, `Promise.race`, `clearTimeout`.

### [apps/api/utils/imageReference.js](../../apps/api/utils/imageReference.js)

Strict immutable digest image-reference validation for one-shot recovery deployment.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=isImmutableImageReference`.
- **Named functions / components:** `hasValidRegistryPort (L6)`; `isImmutableImageReference (L17)`.
- **Direct static consumers:** [apps/api/scripts/schedule-entitlement-recovery.js](../../apps/api/scripts/schedule-entitlement-recovery.js); [scripts/validate-image-reference.mjs](../../scripts/validate-image-reference.mjs).
- **Selected calls / effects:** `component.lastIndexOf`, `component.slice`, `REGISTRY_HOST.test`, `value.trim`, `value.split`, `SHA256_DIGEST.test`, `imageName.includes`, `imageName.split`, `components.some`, `hasValidRegistryPort`, `components.shift`, `components.every`, `IMAGE_PATH_COMPONENT.test`.

### [apps/api/utils/imageUploader.js](../../apps/api/utils/imageUploader.js)

File signature/type validation, public image/private video upload, signed playback and asset/temp cleanup.

- **Imports / dependencies:** `node:fs/promises`, `cloudinary`, `./logger`.
- **Exports:** `module.exports=MediaUploadError,createPrivateMediaUrl,deleteAssetFromCloudinary,uploadImageToCloudinary,validateMediaFile`.
- **Named functions / components:** `constructor (L16)`; `normalizeMimeType (L23)`; `detectMimeType (L30)`; `readFileSignature (L75)`; `validateMediaFile (L86)`; `normalizeFolder (L121)`; `hasCloudinaryCredentials (L131)`; `uploadImageToCloudinary (L138)`; `deleteAssetFromCloudinary (L201)`; `createPrivateMediaUrl (L219)`.
- **Direct static consumers:** [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/Section.js](../../apps/api/controllers/Section.js); [apps/api/controllers/Subsection.js](../../apps/api/controllers/Subsection.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/test/media-upload.test.js](../../apps/api/test/media-upload.test.js).
- **Selected calls / effects:** `cloudinary.uploader.upload`, `cloudinary.uploader.destroy`, `super`, `mimeType.trim`, `buffer.subarray`, `Buffer.from`, `buffer.toString`, `fs.open`, `Buffer.alloc`, `handle.read`, `signature.subarray`, `handle.close`, `normalizeMimeType`, `allowedMimeTypes.has`, `detectMimeType`, `readFileSignature`, `hasCloudinaryCredentials`, `validateMediaFile`, `normalizeFolder`, `Number.isFinite`, `fs.unlink`, `logger.error`, `logger.errorMetadata`, `Number.isInteger`, `cloudinary.utils.private_download_url`, `Date.now`.

### [apps/api/utils/logger.js](../../apps/api/utils/logger.js)

Structured level-aware JSON logging, secret redaction, safe error metadata and once-only request completion logs.

- **Imports / dependencies:** `../package.json`.
- **Exports:** `module.exports=CallExpression`.
- **Named functions / components:** `defaultLevelFor (L20)`; `sanitizeString (L36)`; `isSensitiveKey (L59)`; `redactValue (L62)`; `defaultWrite (L111)`; `validateLevel (L117)`; `createLogger (L127)`; `log (L143)`; `createRuntimeLogger (L176)`; `errorMetadata (L197)`; `getRequestRoute (L211)`; `createHttpRequestLogger (L218)`; `recordRequest (L223)`.
- **Direct static consumers:** [apps/api/app/createApp.js](../../apps/api/app/createApp.js); [apps/api/bootstrap/createServerLifecycle.js](../../apps/api/bootstrap/createServerLifecycle.js); [apps/api/config/cloudinary.js](../../apps/api/config/cloudinary.js); [apps/api/config/database.js](../../apps/api/config/database.js); [apps/api/config/razorpay.js](../../apps/api/config/razorpay.js); [apps/api/config/redis.js](../../apps/api/config/redis.js); [apps/api/controllers/Admin.js](../../apps/api/controllers/Admin.js); [apps/api/controllers/Auth.js](../../apps/api/controllers/Auth.js); [apps/api/controllers/CatalogV2.js](../../apps/api/controllers/CatalogV2.js); [apps/api/controllers/Category.js](../../apps/api/controllers/Category.js); [apps/api/controllers/ContactUs.js](../../apps/api/controllers/ContactUs.js); [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/LearningV2.js](../../apps/api/controllers/LearningV2.js); [apps/api/controllers/RatingandReview.js](../../apps/api/controllers/RatingandReview.js); [apps/api/controllers/Section.js](../../apps/api/controllers/Section.js); [apps/api/controllers/Subsection.js](../../apps/api/controllers/Subsection.js); [apps/api/controllers/courseProgress.js](../../apps/api/controllers/courseProgress.js); [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/controllers/resetPassword.js](../../apps/api/controllers/resetPassword.js); [apps/api/domains/enrollment/enrollmentConsistencyService.js](../../apps/api/domains/enrollment/enrollmentConsistencyService.js); [apps/api/domains/entitlement/entitlementRecoveryService.js](../../apps/api/domains/entitlement/entitlementRecoveryService.js); [apps/api/domains/entitlement/entitlementService.js](../../apps/api/domains/entitlement/entitlementService.js); [apps/api/index.js](../../apps/api/index.js); [apps/api/middleware/auth.js](../../apps/api/middleware/auth.js); [apps/api/middleware/upload.js](../../apps/api/middleware/upload.js); [apps/api/scripts/audit-enrollment-consistency.js](../../apps/api/scripts/audit-enrollment-consistency.js); [apps/api/scripts/backfill-security-fields.js](../../apps/api/scripts/backfill-security-fields.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/scripts/preflight-production.js](../../apps/api/scripts/preflight-production.js); [apps/api/scripts/provision-admin.js](../../apps/api/scripts/provision-admin.js); [apps/api/scripts/reconcile-entitlements.js](../../apps/api/scripts/reconcile-entitlements.js); [apps/api/scripts/schedule-entitlement-recovery.js](../../apps/api/scripts/schedule-entitlement-recovery.js); [apps/api/shared/http/errorHandler.js](../../apps/api/shared/http/errorHandler.js); [apps/api/test/logger.test.js](../../apps/api/test/logger.test.js); [apps/api/utils/imageUploader.js](../../apps/api/utils/imageUploader.js).
- **Selected calls / effects:** `defaultLevelFor`, `sanitized.slice`, `sensitiveKeyPattern.test`, `sanitizeString`, `value.toString`, `value.toISOString`, `Buffer.isBuffer`, `state.seen.has`, `state.seen.add`, `redactValue`, `entries.push`, `isSensitiveKey`, `stream.write`, `validateLevel`, `now`, `write`, `log`, `createLogger`, `createRuntimeLogger`, `targetLogger.info`, `getRequestRoute`, `Number.isInteger`, `res.once`, `recordRequest`.

### [apps/api/utils/mailSender.js](../../apps/api/utils/mailSender.js)

Native-fetch Resend transactional transport with timeout, sender/recipient configuration and per-send idempotency.

- **Imports / dependencies:** `crypto`.
- **Exports:** `module.exports=mailSender`.
- **Named functions / components:** `mailSender (L3)`.
- **Direct static consumers:** [apps/api/controllers/Auth.js](../../apps/api/controllers/Auth.js); [apps/api/controllers/ContactUs.js](../../apps/api/controllers/ContactUs.js); [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js); [apps/api/controllers/resetPassword.js](../../apps/api/controllers/resetPassword.js).
- **Selected calls / effects:** `fetch`, `crypto.randomUUID`, `AbortSignal.timeout`, `response.json`.

### [apps/api/utils/mongoDeployment.js](../../apps/api/utils/mongoDeployment.js)

Mongo URI/TLS/deployment validation and bounded job connection options.

- **Imports / dependencies:** `mongodb-connection-string-url`, `./deploymentNetwork`.
- **Exports:** `module.exports=isLoopbackHostname,mongoJobOptions,MongoDeploymentConfigurationError,usesProductionPosture,validateMongoUriForEnvironment,validateProductionMongoUri`.
- **Named functions / components:** `constructor (L15)`; `configurationError (L22)`; `normalizeHostname (L25)`; `validateProductionMongoUri (L44)`; `usesProductionPosture (L157)`; `validateMongoUriForEnvironment (L186)`; `readTimeout (L191)`; `mongoJobOptions (L203)`.
- **Direct static consumers:** [apps/api/config/env.js](../../apps/api/config/env.js); [apps/api/scripts/audit-enrollment-consistency.js](../../apps/api/scripts/audit-enrollment-consistency.js); [apps/api/scripts/backfill-security-fields.js](../../apps/api/scripts/backfill-security-fields.js); [apps/api/scripts/create-indexes.js](../../apps/api/scripts/create-indexes.js); [apps/api/scripts/provision-admin.js](../../apps/api/scripts/provision-admin.js); [apps/api/scripts/reconcile-entitlements.js](../../apps/api/scripts/reconcile-entitlements.js); [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/mongo-deployment.test.js](../../apps/api/test/mongo-deployment.test.js); [apps/api/utils/seedSafety.js](../../apps/api/utils/seedSafety.js).
- **Selected calls / effects:** `parameters.get`, `super`, `configurationError`, `normalizeDeploymentHostname`, `value.trim`, `value.includes`, `decodeURIComponent`, `connectionString.pathname.replace`, `databaseName.includes`, `SYSTEM_DATABASES.has`, `databaseName.toLowerCase`, `connectionString.hosts.map`, `hosts.some`, `rawName.toLowerCase`, `parameters.has`, `parameters.set`, `usesProductionPosture`, `validateProductionMongoUri`, `Number.isSafeInteger`, `readTimeout`.

### [apps/api/utils/policyAcceptance.js](../../apps/api/utils/policyAcceptance.js)

Current policy versions and immutable general/checkout acceptance semantics.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=CURRENT_PRIVACY_NOTICE_VERSION,CURRENT_REFUND_POLICY_VERSION,CURRENT_TERMS_VERSION,createPolicyAcceptance,hasAffirmativePolicyAcceptance,hasCurrentPolicyAcceptance`.
- **Named functions / components:** `hasAffirmativePolicyAcceptance (L5)`; `hasCurrentPolicyAcceptance (L10)`; `createPolicyAcceptance (L20)`.
- **Direct static consumers:** [apps/api/controllers/Auth.js](../../apps/api/controllers/Auth.js); [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js); [apps/api/middleware/auth.js](../../apps/api/middleware/auth.js); [apps/api/scripts/provision-admin.js](../../apps/api/scripts/provision-admin.js); [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/learning-v2.integration.test.js](../../apps/api/test/learning-v2.integration.test.js).
- **Selected calls / effects:** `user.policyAcceptances.some`.

### [apps/api/utils/purchaseLifecycle.js](../../apps/api/utils/purchaseLifecycle.js)

Unpaid reservation expiry and lifecycle predicates shared by authoring/deletion/payments.

- **Imports / dependencies:** `../config/env`, `../models/Purchase`.
- **Exports:** `module.exports=releaseStaleCheckoutLocks`.
- **Named functions / components:** `releaseStaleCheckoutLocks (L4)`.
- **Direct static consumers:** [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/payments.js](../../apps/api/controllers/payments.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/test/purchase-lifecycle.test.js](../../apps/api/test/purchase-lifecycle.test.js).
- **Selected calls / effects:** `Purchase.updateMany`, `Date.now`, `Promise.all`.

### [apps/api/utils/secToDuration.js](../../apps/api/utils/secToDuration.js)

Converts numeric seconds into display duration; used in course responses.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=convertSecondsToDuration`.
- **Named functions / components:** `convertSecondsToDuration (L2)`.
- **Direct static consumers:** [apps/api/controllers/Course.js](../../apps/api/controllers/Course.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/api/utils/seedSafety.js](../../apps/api/utils/seedSafety.js)

Disposable target and explicit confirmation checks before demo data mutation.

- **Imports / dependencies:** `node:net`, `mongodb-connection-string-url`, `./mongoDeployment`.
- **Exports:** `module.exports=assertSafeSeedTarget,DISPOSABLE_SEED_CONFIRMATION,isLoopbackHostname,SeedSafetyError`.
- **Named functions / components:** `constructor (L12)`; `normalizeMongoHostname (L18)`; `parseMongoTarget (L40)`; `isLoopbackHostname (L89)`; `assertSafeSeedTarget (L94)`.
- **Direct static consumers:** [apps/api/scripts/seed.js](../../apps/api/scripts/seed.js); [apps/api/test/seed-safety.test.js](../../apps/api/test/seed-safety.test.js).
- **Selected calls / effects:** `super`, `value.trim`, `normalized.includes`, `rawHosts.map`, `decodeURIComponent`, `connectionString.pathname.replace`, `DATABASE_NAME_PATTERN.test`, `SYSTEM_DATABASES.has`, `databaseName.toLowerCase`, `net.isIP`, `hostname.startsWith`, `parseMongoTarget`, `DISPOSABLE_DATABASE_PATTERN.test`, `validateProductionMongoUri`, `target.hostnames.every`.

### [apps/api/utils/validation.js](../../apps/api/utils/validation.js)

Normalized identity/name/password and constrained input helpers.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=isPasswordWithinBcryptLimit,isStrongPassword,isValidEmail,normalizeEmail,normalizePersonName`.
- **Named functions / components:** `normalizeEmail (L5)`; `isValidEmail (L8)`; `normalizePersonName (L13)`; `isPasswordWithinBcryptLimit (L26)`; `isStrongPassword (L31)`.
- **Direct static consumers:** [apps/api/controllers/Auth.js](../../apps/api/controllers/Auth.js); [apps/api/controllers/profile.js](../../apps/api/controllers/profile.js); [apps/api/controllers/resetPassword.js](../../apps/api/controllers/resetPassword.js); [apps/api/scripts/provision-admin.js](../../apps/api/scripts/provision-admin.js).
- **Selected calls / effects:** `value.trim`, `normalizeEmail`, `EMAIL_PATTERN.test`, `CONTROL_CHARACTERS.test`, `Buffer.byteLength`, `isPasswordWithinBcryptLimit`.

## apps/web/.env.example

### [apps/web/.env.example](../../apps/web/.env.example)

Environment-name template for .env.example; private values are not copied or inferred.

- **Declared variable names only:** `VITE_DEPLOYMENT_TIER`, `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_RAZORPAY_KEY_ID`, `VITE_SUPPORT_EMAIL`, `VITE_LEGAL_ENTITY_NAME`, `VITE_LEGAL_ADDRESS`, `VITE_LEGAL_JURISDICTION`.

## apps/web/.env.production.example

### [apps/web/.env.production.example](../../apps/web/.env.production.example)

Environment-name template for .env.production.example; private values are not copied or inferred.

- **Declared variable names only:** `VITE_DEPLOYMENT_TIER`, `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_RAZORPAY_KEY_ID`, `VITE_SUPPORT_EMAIL`, `VITE_LEGAL_ENTITY_NAME`, `VITE_LEGAL_ADDRESS`, `VITE_LEGAL_JURISDICTION`.

## apps/web/.env.staging.example

### [apps/web/.env.staging.example](../../apps/web/.env.staging.example)

Environment-name template for .env.staging.example; private values are not copied or inferred.

- **Declared variable names only:** `VITE_DEPLOYMENT_TIER`, `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_RAZORPAY_KEY_ID`, `VITE_SUPPORT_EMAIL`, `VITE_LEGAL_ENTITY_NAME`, `VITE_LEGAL_ADDRESS`, `VITE_LEGAL_JURISDICTION`.

## apps/web/Dockerfile

### [apps/web/Dockerfile](../../apps/web/Dockerfile)

Workspace-aware image construction and unprivileged runtime/health configuration; see DOCKER.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

## apps/web/index.html

### [apps/web/index.html](../../apps/web/index.html)

Static HTML SPA root/module entry.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

## apps/web/nginx.conf

### [apps/web/nginx.conf](../../apps/web/nginx.conf)

Unprivileged static SPA serving, security/cache headers, health and task-loopback API proxy.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

## apps/web/package.json

### [apps/web/package.json](../../apps/web/package.json)

Workspace manifest, dependency ownership and executable npm scripts; see DEPENDENCIES and TESTING.

- **Script entry points:** `dev`, `build`, `build:local`, `nginx:render`, `preview`, `test`, `test:watch`, `typecheck`.
- **Consumers:** npm workspace install/run, Dockerfiles, GitHub workflows; see DEPENDENCIES for every package.

## apps/web/public

### [apps/web/public/_redirects](../../apps/web/public/_redirects)

Static-host SPA fallback compatibility file; Nginx uses its own config.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

### [apps/web/public/manifest.json](../../apps/web/public/manifest.json)

Browser application branding metadata, not a service-worker implementation.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

### [apps/web/public/robots.txt](../../apps/web/public/robots.txt)

Crawler policy static asset.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

## apps/web/scripts

### [apps/web/scripts/deployment-network.mjs](../../apps/web/scripts/deployment-network.mjs)

Web build/deployment deployment-network validation/rendering CLI/helper; used by build or image generation.

- **Imports / dependencies:** `node:net`.
- **Exports:** `isLoopbackHostname`; `resolveNginxApiOrigin`.
- **Named functions / components:** `normalizeHostname (L3)`; `mappedIpv4 (L10)`; `isLoopbackHostname (L28)`; `resolveNginxApiOrigin (L49)`.
- **Direct static consumers:** [apps/api/test/public-production-env.test.js](../../apps/api/test/public-production-env.test.js); [apps/web/scripts/render-nginx-config.mjs](../../apps/web/scripts/render-nginx-config.mjs); [apps/web/scripts/validate-public-env.mjs](../../apps/web/scripts/validate-public-env.mjs).
- **Selected calls / effects:** `Number.parseInt`, `dotted.slice`, `octets.every`, `normalizeHostname`, `hostname.endsWith`, `isIP`, `hostname.startsWith`, `mappedIpv4`, `mapped.every`, `rawApiBaseUrl.replace`, `parsedApiUrl.pathname.replace`, `isLoopbackHostname`.

### [apps/web/scripts/render-nginx-config.mjs](../../apps/web/scripts/render-nginx-config.mjs)

Web build/deployment render-nginx-config validation/rendering CLI/helper; used by build or image generation.

- **Imports / dependencies:** `node:fs/promises`, `./deployment-network.mjs`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `resolveNginxApiOrigin`, `readFile`, `source.includes`, `source.replaceAll`, `writeFile`.

### [apps/web/scripts/validate-public-env.mjs](../../apps/web/scripts/validate-public-env.mjs)

Web build/deployment validate-public-env validation/rendering CLI/helper; used by build or image generation.

- **Imports / dependencies:** `node:url`, `vite`, `./deployment-network.mjs`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `fileURLToPath`, `loadEnv`, `required.filter`, `missing.join`, `names.indexOf`, `placeholderPattern.test`, `placeholders.join`, `env.VITE_API_BASE_URL.trim`, `rawApiBaseUrl.replace`, `apiUrl.pathname.replace`, `isLoopbackHostname`.

## apps/web/src

### [apps/web/src/app/App.jsx](../../apps/web/src/app/App.jsx)

Composes SessionBootstrap, AppShell and AppRouter; shell owns suspense and route error boundary.

- **Imports / dependencies:** `@/shared/styles/globals.css`, `@/app/router/AppRouter`, `@/features/authentication`, `@/widgets/app-shell`.
- **Exports:** `default App`.
- **Named functions / components:** `App (L7)`.
- **Direct static consumers:** [apps/web/src/app/App.test.jsx](../../apps/web/src/app/App.test.jsx); [apps/web/src/app/bootstrap.jsx](../../apps/web/src/app/bootstrap.jsx); [apps/web/src/app/composition.test.jsx](../../apps/web/src/app/composition.test.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/app/App.test.jsx](../../apps/web/src/app/App.test.jsx)

Regression/characterization tests for App.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/app/App`, `@reduxjs/toolkit`, `@testing-library/react`, `react-redux`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `LocationProbe (L39)`; `renderApp (L60)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.findByText`, `screen.getByTestId`, `vi.mock`, `importOriginal`, `useLocation`, `configureStore`, `render`, `describe`, `it`, `renderApp`, `expect`, `unmount`.
- **Test focus:** dashboard route normalization; redirects the dashboard index to the profile; redirects the legacy case-sensitive settings bookmark to its canonical path; keeps deletion and policy gates ahead of the dashboard index.

### [apps/web/src/app/README.md](../../apps/web/src/app/README.md)

Directory/workspace responsibility guide: Application composition. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [apps/web/src/app/bootstrap.jsx](../../apps/web/src/app/bootstrap.jsx)

Creates React root with StrictMode and application provider composition.

- **Imports / dependencies:** `@/app/App`, `@/app/providers/AppProviders`, `react`, `react-dom/client`.
- **Exports:** `createApplicationElement`; `mountApplication`.
- **Named functions / components:** `createApplicationElement (L6)`; `mountApplication (L14)`.
- **Direct static consumers:** [apps/web/src/app/main.jsx](../../apps/web/src/app/main.jsx).
- **Selected calls / effects:** `ReactDOM.createRoot`, `root.render`, `createApplicationElement`.

### [apps/web/src/app/composition.test.jsx](../../apps/web/src/app/composition.test.jsx)

Regression/characterization tests for composition.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/app/App`, `@/app/store`, `@/entities/catalog`, `@/entities/learning`, `@/entities/user`, `@/shared/api/httpClient`, `@/shared/ui/Button`, `@/shared/ui/ErrorBoundary`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `store.dispatch`, `setSession`, `store.getState`, `learningApi.endpoints.getLearningCourse.select`, `afterEach`, `learningApi.util.resetApiState`, `describe`, `it`, `expect`, `learningApi.util.upsertQueryData`.
- **Test focus:** frontend application composition; exposes the canonical application and shared primitives; preserves every Redux reducer key; clears enrolled learning data when the session ends.

### [apps/web/src/app/main.jsx](../../apps/web/src/app/main.jsx)

Browser entry calls mountApplication with the root DOM element; global styles enter through App.

- **Imports / dependencies:** `@/app/bootstrap`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `document.getElementById`, `mountApplication`.

### [apps/web/src/app/providers/AppProviders.jsx](../../apps/web/src/app/providers/AppProviders.jsx)

Redux/Router/error boundary/toast provider composition.

- **Imports / dependencies:** `@/app/store`, `@/shared/ui/ErrorBoundary`, `react-hot-toast`, `react-redux`, `react-router`.
- **Exports:** `default AppProviders`.
- **Named functions / components:** `AppProviders (L7)`.
- **Direct static consumers:** [apps/web/src/app/bootstrap.jsx](../../apps/web/src/app/bootstrap.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx)

Lazy public/auth/dashboard/learning routes, role gates and legacy settings redirect.

- **Imports / dependencies:** `@/entities/user`, `@/features/authentication`, `react`, `react-router`, `@/pages/about`, `@/pages/course-create`, `@/pages/cart`, `@/pages/catalog`, `@/pages/contact`, `@/pages/course-details`, `@/pages/dashboard`, `@/pages/course-edit`, `@/pages/enrolled-courses`, `@/pages/not-found`, `@/pages/forgot-password`, `@/pages/home`, `@/pages/instructor-dashboard`, `@/pages/instructor-approvals`, `@/pages/payment-reconciliation`, `@/pages/legal`, `@/pages/login`, `@/pages/instructor-courses`, `@/pages/profile`, `@/pages/policy-acceptance`, `@/pages/purchase-history`, `@/pages/settings`, `@/pages/signup`, `@/pages/update-password`, `@/pages/verify-email`, `@/pages/lesson`, `@/pages/learning`.
- **Exports:** `default AppRouter`.
- **Named functions / components:** `LegacySettingsRedirect (L36)`; `AppRouter (L44)`.
- **Direct static consumers:** [apps/web/src/app/App.jsx](../../apps/web/src/app/App.jsx); [apps/web/src/app/router/AppRouter.parity.test.jsx](../../apps/web/src/app/router/AppRouter.parity.test.jsx).
- **Selected calls / effects:** `lazy`, `import`, `useLocation`.

### [apps/web/src/app/router/AppRouter.parity.test.jsx](../../apps/web/src/app/router/AppRouter.parity.test.jsx)

Regression/characterization tests for AppRouter.parity.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/app/router/AppRouter`, `@/app/store/rootReducer`, `@/entities/user`, `@/features/authentication`, `@reduxjs/toolkit`, `@testing-library/react`, `react`, `react-redux`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `authenticatedState (L83)`; `LocationProbe (L97)`; `renderRouterWithStore (L119)`; `renderRouter (L131)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.findByRole`, `screen.getByLabelText`, `createSessionResponseHandler`, `handleSessionResponse`, `vi.mock`, `useLocation`, `render`, `configureStore`, `renderRouterWithStore`, `describe`, `it.each`, `renderRouter`, `expect`, `it`, `authenticatedState`, `screen.queryByRole`, `act`, `waitFor`.
- **Test focus:** Router 8 public route parity; maps %s without changing its URL; Router 8 authentication redirect parity; preserves pathname, search, and hash when an expired session reaches a protected route (all cases indexed in TESTING).

### [apps/web/src/app/store/index.js](../../apps/web/src/app/store/index.js)

Configures Redux store, query middleware and session-response integration.

- **Imports / dependencies:** `@/app/store/rootReducer`, `@/entities/catalog`, `@/entities/learning`, `@/entities/user`, `@/features/authentication`, `@reduxjs/toolkit`, `@reduxjs/toolkit/query`.
- **Exports:** `store`.
- **Named functions / components:** `resetLearningCacheOnSessionEnd (L10)`.
- **Direct static consumers:** [apps/web/src/app/composition.test.jsx](../../apps/web/src/app/composition.test.jsx); [apps/web/src/app/providers/AppProviders.jsx](../../apps/web/src/app/providers/AppProviders.jsx).
- **Selected calls / effects:** `setSession.match`, `installSessionResponseIntegration`, `dispatch`, `learningApi.util.resetApiState`, `configureStore`, `getDefaultMiddleware`, `setupListeners`.

### [apps/web/src/app/store/rootReducer.js](../../apps/web/src/app/store/rootReducer.js)

Registers user/cart/authoring/legacy learning and RTK Query reducer namespaces.

- **Imports / dependencies:** `@/entities/cart`, `@/entities/catalog`, `@/entities/course`, `@/entities/learning`, `@/entities/user`, `@reduxjs/toolkit`.
- **Exports:** `default rootReducer`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.parity.test.jsx](../../apps/web/src/app/router/AppRouter.parity.test.jsx); [apps/web/src/app/store/index.js](../../apps/web/src/app/store/index.js).
- **Selected calls / effects:** `combineReducers`.

### [apps/web/src/entities/README.md](../../apps/web/src/entities/README.md)

Directory/workspace responsibility guide: Entities. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [apps/web/src/entities/cart/index.js](../../apps/web/src/entities/cart/index.js)

Public export surface for entities/cart; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./model/cartSlice`.
- **Exports:** `cartReducer`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/store/rootReducer.js](../../apps/web/src/app/store/rootReducer.js); [apps/web/src/features/authentication/api/authApi.js](../../apps/web/src/features/authentication/api/authApi.js); [apps/web/src/features/authentication/model/sessionResponseIntegration.js](../../apps/web/src/features/authentication/model/sessionResponseIntegration.js); [apps/web/src/features/authentication/model/sessionResponseIntegration.test.js](../../apps/web/src/features/authentication/model/sessionResponseIntegration.test.js); [apps/web/src/features/course-purchase/api/coursePurchaseApi.js](../../apps/web/src/features/course-purchase/api/coursePurchaseApi.js); [apps/web/src/features/course-purchase/ui/RenderCartCourses.jsx](../../apps/web/src/features/course-purchase/ui/RenderCartCourses.jsx); [apps/web/src/pages/course-details/index.jsx](../../apps/web/src/pages/course-details/index.jsx); [apps/web/src/widgets/navbar/ui/Navbar.test.jsx](../../apps/web/src/widgets/navbar/ui/Navbar.test.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/entities/cart/model/cartSlice.js](../../apps/web/src/entities/cart/model/cartSlice.js)

Cart mutations, validated local persistence, recomputed totals and toast side effects.

- **Imports / dependencies:** `@reduxjs/toolkit`, `react-hot-toast`.
- **Exports:** `{ addToCart, removeFromCart, resetCart }`; `default `.
- **Named functions / components:** `getStorage (L4)`; `readCart (L14)`; `persistCart (L24)`.
- **Direct static consumers:** [apps/web/src/entities/cart/index.js](../../apps/web/src/entities/cart/index.js); [apps/web/src/entities/cart/model/cartSlice.test.js](../../apps/web/src/entities/cart/model/cartSlice.test.js).
- **Selected calls / effects:** `state.cart.findIndex`, `getStorage`, `cart.reduce`, `storage.setItem`, `readCart`, `storedCart.reduce`, `createSlice`, `toast.error`, `state.cart.push`, `persistCart`, `toast.success`, `state.cart.splice`.

### [apps/web/src/entities/cart/model/cartSlice.test.js](../../apps/web/src/entities/cart/model/cartSlice.test.js)

Regression/characterization tests for cartSlice.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `vitest`, `@/entities/cart/model/cartSlice`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `vi.mock`, `vi.fn`, `beforeEach`, `window.localStorage.clear`, `vi.resetModules`, `describe`, `it`, `window.localStorage.setItem`, `import`, `expect`, `cartReducer`.
- **Test focus:** cart persistence; recovers safely from malformed browser storage; derives totals from course data instead of trusting stored totals.

### [apps/web/src/entities/catalog/api/catalogApi.js](../../apps/web/src/entities/catalog/api/catalogApi.js)

Credentialed RTK Query categories/catalog cache with schema parsing and stable error mapping.

- **Imports / dependencies:** `@/shared/api/apiErrorModel`, `@/shared/api/endpoints`, `@reduxjs/toolkit/query/react`, `@studynotion/contracts/catalog`.
- **Exports:** `CATALOG_PAGE_SIZE`; `CATALOG_REQUEST_TIMEOUT_MS`; `catalogBaseQueryConfig`; `buildCatalogQueryParams`; `parseCatalogResponse`; `parseCategoryResponse`; `getCatalogErrorPresentation`; `catalogApi`; `{ useGetCatalogCategoriesQuery, useGetCoursesInfiniteQuery }`.
- **Named functions / components:** `optionalString (L15)`; `optionalSearchString (L18)`; `optionalNumber (L21)`; `buildCatalogQueryParams (L27)`; `parseCatalogResponse (L53)`; `parseCategoryResponse (L62)`; `getCatalogErrorPresentation (L84)`.
- **Direct static consumers:** [apps/web/src/entities/catalog/index.js](../../apps/web/src/entities/catalog/index.js).
- **Selected calls / effects:** `catalogCourseListResponseSchema.safeParse`, `value.trim`, `optionalString`, `Number.isFinite`, `optionalSearchString`, `optionalNumber`, `category.name.trim`, `getSafeApiErrorEnvelopePresentation`, `createApi`, `fetchBaseQuery`, `build.query`, `build.infiniteQuery`, `buildCatalogQueryParams`.

### [apps/web/src/entities/catalog/api/catalogApi.test.js](../../apps/web/src/entities/catalog/api/catalogApi.test.js)

Regression/characterization tests for catalogApi.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/entities/catalog`, `@/shared/api/endpoints`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `describe`, `it`, `expect`, `deriveApiVersionBaseUrl`, `catalogApi.reducer`, `buildCatalogQueryParams`, `parseCatalogResponse`, `parseCategoryResponse`, `getCatalogErrorPresentation`.
- **Test focus:** catalog API configuration; derives v2 without changing the existing v1 base; keeps cookie credentials, timeout, reducer, and middleware API isolated; serializes normalized filters and an opaque cursor (all cases indexed in TESTING).

### [apps/web/src/entities/catalog/index.js](../../apps/web/src/entities/catalog/index.js)

Public export surface for entities/catalog; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./api/catalogApi`, `./lib/catalogPresentation`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/composition.test.jsx](../../apps/web/src/app/composition.test.jsx); [apps/web/src/app/store/index.js](../../apps/web/src/app/store/index.js); [apps/web/src/app/store/rootReducer.js](../../apps/web/src/app/store/rootReducer.js); [apps/web/src/entities/catalog/api/catalogApi.test.js](../../apps/web/src/entities/catalog/api/catalogApi.test.js); [apps/web/src/entities/course/ui/CourseCard.jsx](../../apps/web/src/entities/course/ui/CourseCard.jsx); [apps/web/src/pages/catalog/index.jsx](../../apps/web/src/pages/catalog/index.jsx); [apps/web/src/widgets/navbar/ui/Navbar.jsx](../../apps/web/src/widgets/navbar/ui/Navbar.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/entities/catalog/lib/catalogPresentation.js](../../apps/web/src/entities/catalog/lib/catalogPresentation.js)

entities/catalog domain transformation/utility `catalogPresentation`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `formatCatalogPrice`; `formatCatalogDuration`; `formatCatalogLanguage`; `formatCatalogLevel`.
- **Named functions / components:** `formatCatalogPrice (L1)`; `formatCatalogDuration (L17)`; `formatCatalogLanguage (L29)`; `formatCatalogLevel (L40)`.
- **Direct static consumers:** [apps/web/src/entities/catalog/index.js](../../apps/web/src/entities/catalog/index.js).
- **Selected calls / effects:** `Number.isFinite`, `Number.isInteger`, `amount.toLocaleString`, `language.trim`, `code.toUpperCase`, `level.trim`, `value.charAt`, `value.slice`.

### [apps/web/src/entities/course/api/courseApi.js](../../apps/web/src/entities/course/api/courseApi.js)

v1 course/section/lesson/media/review adapters and compatibility progress calls.

- **Imports / dependencies:** `@/shared/api/endpoints`, `@/shared/api/httpClient`, `react-hot-toast`.
- **Exports:** `getLessonPlaybackUrl`; `fetchCourseDetails`; `fetchCourseCategories`; `addCourseDetails`; `editCourseDetails`; `createSection`; `createSubSection`; `updateSection`; `updateSubSection`; `deleteSection`; `deleteSubSection`; `fetchInstructorCourses`; `deleteCourse`; `getFullDetailsOfCourse`; `markLectureAsComplete`; `createRating`.
- **Named functions / components:** `getErrorMessage (L24)`; `getLessonPlaybackUrl (L27)`; `fetchCourseDetails (L49)`; `fetchCourseCategories (L73)`; `addCourseDetails (L88)`; `editCourseDetails (L109)`; `createSection (L130)`; `createSubSection (L150)`; `updateSection (L170)`; `updateSubSection (L190)`; `deleteSection (L210)`; `deleteSubSection (L229)`; `fetchInstructorCourses (L249)`; `deleteCourse (L273)`; `getFullDetailsOfCourse (L297)`; `markLectureAsComplete (L329)`; `createRating (L350)`.
- **Direct static consumers:** [apps/web/src/entities/course/api/courseApi.test.js](../../apps/web/src/entities/course/api/courseApi.test.js); [apps/web/src/entities/course/index.js](../../apps/web/src/entities/course/index.js).
- **Selected calls / effects:** `apiConnector`, `toast.loading`, `toast.dismiss`, `toast.error`, `getErrorMessage`, `toast.success`.

### [apps/web/src/entities/course/api/courseApi.test.js](../../apps/web/src/entities/course/api/courseApi.test.js)

Regression/characterization tests for courseApi.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/entities/course/api/courseApi`, `@/shared/api/httpClient`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `apiConnector.mockResolvedValue`, `deleteCourse`, `vi.mock`, `vi.fn`, `describe`, `beforeEach`, `vi.clearAllMocks`, `it`, `expect`, `getLessonPlaybackUrl`, `expect.stringContaining`.
- **Test focus:** lesson playback URL requests; requests a fresh URL for the active enrolled lesson; rejects malformed playback responses; course lifecycle requests (all cases indexed in TESTING).

### [apps/web/src/entities/course/index.js](../../apps/web/src/entities/course/index.js)

Public export surface for entities/course; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./api/courseApi`, `./model/courseSlice`, `./model/courseStatus`, `./ui/CourseCard`, `./ui/CourseAccordionBar`.
- **Exports:** `courseReducer`; `CourseCard`; `CourseAccordionBar`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/store/rootReducer.js](../../apps/web/src/app/store/rootReducer.js); [apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/CourseBuilderForm.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/CourseBuilderForm.jsx); [apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/NestedView.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/NestedView.jsx); [apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/SubSectionModal.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/SubSectionModal.jsx); [apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm.jsx); [apps/web/src/features/course-authoring/ui/AddCourse/PublishCourse/index.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/PublishCourse/index.jsx); [apps/web/src/features/course-authoring/ui/EditCourse/index.jsx](../../apps/web/src/features/course-authoring/ui/EditCourse/index.jsx); [apps/web/src/features/course-purchase/api/coursePurchaseApi.js](../../apps/web/src/features/course-purchase/api/coursePurchaseApi.js); [apps/web/src/features/course-review/ui/CourseReviewModal.jsx](../../apps/web/src/features/course-review/ui/CourseReviewModal.jsx); [apps/web/src/features/lesson-playback/ui/VideoDetails.jsx](../../apps/web/src/features/lesson-playback/ui/VideoDetails.jsx); [apps/web/src/pages/catalog/index.jsx](../../apps/web/src/pages/catalog/index.jsx); [apps/web/src/pages/course-details/index.jsx](../../apps/web/src/pages/course-details/index.jsx); [apps/web/src/pages/instructor-courses/index.jsx](../../apps/web/src/pages/instructor-courses/index.jsx); [apps/web/src/pages/instructor-courses/ui/CoursesTable.jsx](../../apps/web/src/pages/instructor-courses/ui/CoursesTable.jsx); [apps/web/src/pages/instructor-dashboard/index.jsx](../../apps/web/src/pages/instructor-dashboard/index.jsx); [apps/web/src/widgets/dashboard-sidebar/ui/SidebarLink.jsx](../../apps/web/src/widgets/dashboard-sidebar/ui/SidebarLink.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/entities/course/model/courseSlice.js](../../apps/web/src/entities/course/model/courseSlice.js)

entities/course state/constants `courseSlice`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@reduxjs/toolkit`.
- **Exports:** `{ setStep, setCourse, setEditCourse, setPaymentLoading, resetCourseState, }`; `default `.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/entities/course/index.js](../../apps/web/src/entities/course/index.js).
- **Selected calls / effects:** `createSlice`.

### [apps/web/src/entities/course/model/courseStatus.js](../../apps/web/src/entities/course/model/courseStatus.js)

entities/course state/constants `courseStatus`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `COURSE_STATUS`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/entities/course/index.js](../../apps/web/src/entities/course/index.js).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/entities/course/ui/CourseAccordionBar.jsx](../../apps/web/src/entities/course/ui/CourseAccordionBar.jsx)

entities/course presentation/interaction component `CourseAccordionBar`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/course/ui/CourseSubSectionAccordion`, `react`, `react-icons/ai`.
- **Exports:** `default CourseAccordionBar`.
- **Named functions / components:** `CourseAccordionBar (L5)`.
- **Direct static consumers:** [apps/web/src/entities/course/index.js](../../apps/web/src/entities/course/index.js); [apps/web/src/entities/course/ui/CourseAccordionBar.test.jsx](../../apps/web/src/entities/course/ui/CourseAccordionBar.test.jsx).
- **Selected calls / effects:** `useId`, `handleActive`.

### [apps/web/src/entities/course/ui/CourseAccordionBar.test.jsx](../../apps/web/src/entities/course/ui/CourseAccordionBar.test.jsx)

Regression/characterization tests for CourseAccordionBar.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/entities/course/ui/CourseAccordionBar`, `@testing-library/react`, `@testing-library/user-event`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByRole`, `trigger.getAttribute`, `document.getElementById`, `describe`, `it`, `userEvent.setup`, `vi.fn`, `render`, `expect`, `user.click`, `rerender`.
- **Test focus:** CourseAccordionBar; uses an accessible button and exposes its expanded state.

### [apps/web/src/entities/course/ui/CourseCard.jsx](../../apps/web/src/entities/course/ui/CourseCard.jsx)

entities/course presentation/interaction component `CourseCard`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/catalog`, `@/entities/review`, `react`, `react-router`.
- **Exports:** `default Course_Card`.
- **Named functions / components:** `Course_Card (L14)`.
- **Direct static consumers:** [apps/web/src/entities/course/index.js](../../apps/web/src/entities/course/index.js); [apps/web/src/entities/course/ui/CourseCard.test.jsx](../../apps/web/src/entities/course/ui/CourseCard.test.jsx).
- **Selected calls / effects:** `useState`, `GetAvgRating`, `formatCatalogDuration`, `formatCatalogLanguage`, `formatCatalogLevel`, `setFailedImageUrl`, `Number.isFinite`, `ratingAverage.toFixed`, `ratingCount.toLocaleString`, `formatCatalogPrice`.

### [apps/web/src/entities/course/ui/CourseCard.test.jsx](../../apps/web/src/entities/course/ui/CourseCard.test.jsx)

Regression/characterization tests for CourseCard.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/entities/course/ui/CourseCard`, `@testing-library/react`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `renderCard (L30)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByRole`, `screen.getByText`, `render`, `describe`, `it`, `renderCard`, `expect`, `screen.queryByText`, `fireEvent.error`, `container.querySelector`.
- **Test focus:** catalog course card; links the stable DTO to the existing course-detail route; does not invent optional metadata or ratings; shows an accessible fallback when a thumbnail fails (all cases indexed in TESTING).

### [apps/web/src/entities/course/ui/CourseSubSectionAccordion.jsx](../../apps/web/src/entities/course/ui/CourseSubSectionAccordion.jsx)

entities/course presentation/interaction component `CourseSubSectionAccordion`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react-icons/hi`.
- **Exports:** `default CourseSubSectionAccordion`.
- **Named functions / components:** `CourseSubSectionAccordion (L3)`.
- **Direct static consumers:** [apps/web/src/entities/course/ui/CourseAccordionBar.jsx](../../apps/web/src/entities/course/ui/CourseAccordionBar.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/entities/learning/api/learningApi.js](../../apps/web/src/entities/learning/api/learningApi.js)

Credentialed curriculum/progress RTK Query, schema validation and confirmed cache update.

- **Imports / dependencies:** `@/shared/api/apiErrorModel`, `@/shared/api/endpoints`, `@/shared/api/httpClient`, `@reduxjs/toolkit/query/react`, `@studynotion/contracts/learning`.
- **Exports:** `LEARNING_REQUEST_TIMEOUT_MS`; `learningBaseQueryConfig`; `learningBaseQuery`; `parseLearningCourseResponse`; `parseLearningProgressResponse`; `getLearningErrorPresentation`; `learningApi`; `{ useGetLearningCourseQuery, useMarkLessonCompleteMutation }`.
- **Named functions / components:** `learningBaseQuery (L20)`; `parseContractResponse (L33)`; `idsMatch (L39)`; `parseLearningCourseResponse (L42)`; `parseLearningProgressResponse (L57)`; `getLearningErrorPresentation (L72)`; `onQueryStarted (L102)`.
- **Direct static consumers:** [apps/web/src/entities/learning/api/learningApi.test.js](../../apps/web/src/entities/learning/api/learningApi.test.js); [apps/web/src/entities/learning/index.js](../../apps/web/src/entities/learning/index.js).
- **Selected calls / effects:** `signalSessionResponseError`, `parseLearningCourseResponse`, `parseLearningProgressResponse`, `learningApi.util.updateQueryData`, `fetchBaseQuery`, `rawLearningBaseQuery`, `schema.safeParse`, `parseContractResponse`, `idsMatch`, `getSafeApiErrorEnvelopePresentation`, `createApi`, `build.query`, `learningEndpoints.COURSE_API`, `build.mutation`, `learningEndpoints.LESSON_PROGRESS_API`, `dispatch`.

### [apps/web/src/entities/learning/api/learningApi.test.js](../../apps/web/src/entities/learning/api/learningApi.test.js)

Regression/characterization tests for learningApi.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/entities/learning/api/learningApi`, `@/shared/api/endpoints`, `@/shared/api/httpClient`, `@reduxjs/toolkit`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `progress (L20)`; `learningCourse (L30)`; `successEnvelope (L60)`; `jsonResponse (L66)`; `createLearningStore (L72)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `registerSessionResponseHandler`, `unregisterSessionHandler`, `parseLearningCourseResponse`, `learningCourse`, `parseLearningProgressResponse`, `learningApi.endpoints.getLearningCourse.initiate`, `learningApi.endpoints.getLearningCourse.select`, `store.getState`, `progress`, `configureStore`, `getDefaultMiddleware`, `describe`, `vi.fn`, `beforeEach`, `sessionHandler.mockClear`, `afterEach`, `vi.unstubAllGlobals`, `it`, `expect`, `learningEndpoints.COURSE_API`, `learningEndpoints.LESSON_PROGRESS_API`, `successEnvelope`, `COURSE_ID.toUpperCase`, `jsonResponse`, `vi.stubGlobal`, `createLearningStore`, `learningApi.endpoints.markLessonComplete.initiate`, `it.each`.
- **Test focus:** learning API boundary; uses encoded V2 URLs with cookie credentials and a bounded timeout; accepts only a self-consistent, media-free learning state for the requested course; rejects inconsistent progress instead of coercing counts or percentages (all cases indexed in TESTING).

### [apps/web/src/entities/learning/index.js](../../apps/web/src/entities/learning/index.js)

Public export surface for entities/learning; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./api/learningApi`, `./lib/courseNavigation`, `./model/legacyViewCourseSlice`.
- **Exports:** `legacyViewCourseReducer`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/composition.test.jsx](../../apps/web/src/app/composition.test.jsx); [apps/web/src/app/store/index.js](../../apps/web/src/app/store/index.js); [apps/web/src/app/store/rootReducer.js](../../apps/web/src/app/store/rootReducer.js); [apps/web/src/features/lesson-playback/ui/VideoDetails.jsx](../../apps/web/src/features/lesson-playback/ui/VideoDetails.jsx); [apps/web/src/pages/enrolled-courses/index.jsx](../../apps/web/src/pages/enrolled-courses/index.jsx); [apps/web/src/pages/learning/index.jsx](../../apps/web/src/pages/learning/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/entities/learning/lib/courseNavigation.js](../../apps/web/src/entities/learning/lib/courseNavigation.js)

entities/learning domain transformation/utility `courseNavigation`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `getFirstLessonPath`.
- **Named functions / components:** `getFirstLessonPath (L1)`.
- **Direct static consumers:** [apps/web/src/entities/learning/index.js](../../apps/web/src/entities/learning/index.js); [apps/web/src/entities/learning/lib/courseNavigation.test.js](../../apps/web/src/entities/learning/lib/courseNavigation.test.js).
- **Selected calls / effects:** `course.courseContent.find`, `candidate.subSection.some`, `encodeURIComponent`.

### [apps/web/src/entities/learning/lib/courseNavigation.test.js](../../apps/web/src/entities/learning/lib/courseNavigation.test.js)

Regression/characterization tests for courseNavigation.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/entities/learning/lib/courseNavigation`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `describe`, `it`, `expect`, `getFirstLessonPath`.
- **Test focus:** enrolled course navigation; selects the first section that contains a real lesson; returns null instead of constructing a route with undefined IDs.

### [apps/web/src/entities/learning/model/legacyViewCourseSlice.js](../../apps/web/src/entities/learning/model/legacyViewCourseSlice.js)

Registered compatibility learning slice; current course/progress UI uses learningApi.

- **Imports / dependencies:** `@reduxjs/toolkit`.
- **Exports:** `{ setCourseSectionData, setEntireCourseData, setTotalNoOfLectures, setCompletedLectures, updateCompletedLectures, }`; `default `.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/entities/learning/index.js](../../apps/web/src/entities/learning/index.js).
- **Selected calls / effects:** `createSlice`.

### [apps/web/src/entities/purchase/index.js](../../apps/web/src/entities/purchase/index.js)

Public export surface for entities/purchase; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./lib/paymentPresentation`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.jsx](../../apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.jsx); [apps/web/src/pages/purchase-history/index.jsx](../../apps/web/src/pages/purchase-history/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/entities/purchase/lib/paymentPresentation.js](../../apps/web/src/entities/purchase/lib/paymentPresentation.js)

entities/purchase domain transformation/utility `paymentPresentation`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `PAYMENT_STATUS`; `getPaymentStatus`; `formatPaymentMoney`; `formatPaymentDate`; `getRefundDeadline`; `isRefundWindowElapsed`; `requiresRefundWindowOverride`.
- **Named functions / components:** `getPaymentStatus (L34)`; `formatPaymentMoney (L41)`; `formatPaymentDate (L55)`; `getRefundDeadline (L66)`; `isRefundWindowElapsed (L83)`; `requiresRefundWindowOverride (L86)`.
- **Direct static consumers:** [apps/web/src/entities/purchase/index.js](../../apps/web/src/entities/purchase/index.js); [apps/web/src/entities/purchase/lib/paymentPresentation.test.js](../../apps/web/src/entities/purchase/lib/paymentPresentation.test.js).
- **Selected calls / effects:** `date.getTime`, `recordedDeadline.getTime`, `deadline.getTime`, `Number.isFinite`, `Number.isNaN`, `Number.isInteger`, `Date.now`, `isRefundWindowElapsed`.

### [apps/web/src/entities/purchase/lib/paymentPresentation.test.js](../../apps/web/src/entities/purchase/lib/paymentPresentation.test.js)

Regression/characterization tests for paymentPresentation.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/entities/purchase/lib/paymentPresentation`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `describe`, `it`, `expect`, `requiresRefundWindowOverride`, `getRefundDeadline`.
- **Test focus:** refund-window presentation; requires override only before an out-of-window initial refund attempt; does not require override for a timely learner request reviewed later; does not require override when polling or retrying a provider attempt.

### [apps/web/src/entities/review/api/reviewApi.js](../../apps/web/src/entities/review/api/reviewApi.js)

entities/review HTTP adapter `reviewApi`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/api/endpoints`, `@/shared/api/httpClient`.
- **Exports:** `fetchPublicReviews`.
- **Named functions / components:** `fetchPublicReviews (L4)`.
- **Direct static consumers:** [apps/web/src/entities/review/index.js](../../apps/web/src/entities/review/index.js).
- **Selected calls / effects:** `apiConnector`.

### [apps/web/src/entities/review/index.js](../../apps/web/src/entities/review/index.js)

Public export surface for entities/review; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./api/reviewApi`, `./lib/averageRating`, `./ui/RatingStars`.
- **Exports:** `getAverageRating`; `RatingStars`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/entities/course/ui/CourseCard.jsx](../../apps/web/src/entities/course/ui/CourseCard.jsx); [apps/web/src/features/course-purchase/ui/RenderCartCourses.jsx](../../apps/web/src/features/course-purchase/ui/RenderCartCourses.jsx); [apps/web/src/pages/course-details/index.jsx](../../apps/web/src/pages/course-details/index.jsx); [apps/web/src/widgets/review-slider/ui/ReviewSlider.jsx](../../apps/web/src/widgets/review-slider/ui/ReviewSlider.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/entities/review/lib/averageRating.js](../../apps/web/src/entities/review/lib/averageRating.js)

entities/review domain transformation/utility `averageRating`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `default GetAvgRating`.
- **Named functions / components:** `GetAvgRating (L1)`.
- **Direct static consumers:** [apps/web/src/entities/review/index.js](../../apps/web/src/entities/review/index.js).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/entities/review/ui/RatingStars.jsx](../../apps/web/src/entities/review/ui/RatingStars.jsx)

entities/review presentation/interaction component `RatingStars`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react-icons/ti`.
- **Exports:** `default RatingStars`.
- **Named functions / components:** `RatingStars (L7)`.
- **Direct static consumers:** [apps/web/src/entities/review/index.js](../../apps/web/src/entities/review/index.js).
- **Selected calls / effects:** `rating.toFixed`.

### [apps/web/src/entities/user/api/profileApi.js](../../apps/web/src/entities/user/api/profileApi.js)

entities/user HTTP adapter `profileApi`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/user/lib/avatar`, `@/entities/user/model/authSlice`, `@/entities/user/model/profileSlice`, `@/shared/api/endpoints`, `@/shared/api/httpClient`, `react-hot-toast`.
- **Exports:** `getUserDetails`; `getUserEnrolledCourses`; `getInstructorData`.
- **Named functions / components:** `getUserDetails (L14)`; `getUserEnrolledCourses (L41)`; `getInstructorData (L63)`.
- **Direct static consumers:** [apps/web/src/entities/user/index.js](../../apps/web/src/entities/user/index.js).
- **Selected calls / effects:** `apiConnector`, `setSession`, `toast.loading`, `dispatch`, `setLoading`, `getAvatarSource`, `setUser`, `toast.error`, `toast.dismiss`.

### [apps/web/src/entities/user/index.js](../../apps/web/src/entities/user/index.js)

Public export surface for entities/user; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./api/profileApi`, `./lib/avatar`, `./model/accountTypes`, `./model/authSlice`, `./model/profileSlice`.
- **Exports:** `authReducer`; `setAuthChecking`; `setAuthLoading`; `setPolicyAcceptanceRequired`; `setSession`; `setSignupData`; `profileReducer`; `setProfileLoading`; `setUser`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/composition.test.jsx](../../apps/web/src/app/composition.test.jsx); [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx); [apps/web/src/app/router/AppRouter.parity.test.jsx](../../apps/web/src/app/router/AppRouter.parity.test.jsx); [apps/web/src/app/store/index.js](../../apps/web/src/app/store/index.js); [apps/web/src/app/store/rootReducer.js](../../apps/web/src/app/store/rootReducer.js); [apps/web/src/features/authentication/api/accountSecurityApi.js](../../apps/web/src/features/authentication/api/accountSecurityApi.js); [apps/web/src/features/authentication/api/authApi.js](../../apps/web/src/features/authentication/api/authApi.js); [apps/web/src/features/authentication/model/sessionResponseIntegration.js](../../apps/web/src/features/authentication/model/sessionResponseIntegration.js); [apps/web/src/features/authentication/model/sessionResponseIntegration.test.js](../../apps/web/src/features/authentication/model/sessionResponseIntegration.test.js); [apps/web/src/features/authentication/ui/ProfileDropdown.jsx](../../apps/web/src/features/authentication/ui/ProfileDropdown.jsx); [apps/web/src/features/authentication/ui/SignupForm.jsx](../../apps/web/src/features/authentication/ui/SignupForm.jsx); [apps/web/src/features/instructor-approval/ui/InstructorApprovals.jsx](../../apps/web/src/features/instructor-approval/ui/InstructorApprovals.jsx); [apps/web/src/features/profile-settings/api/profileSettingsApi.js](../../apps/web/src/features/profile-settings/api/profileSettingsApi.js); [apps/web/src/features/profile-settings/ui/ChangeProfilePicture.jsx](../../apps/web/src/features/profile-settings/ui/ChangeProfilePicture.jsx); [apps/web/src/pages/course-details/index.jsx](../../apps/web/src/pages/course-details/index.jsx); [apps/web/src/pages/enrolled-courses/index.jsx](../../apps/web/src/pages/enrolled-courses/index.jsx); [apps/web/src/pages/instructor-dashboard/index.jsx](../../apps/web/src/pages/instructor-dashboard/index.jsx); [apps/web/src/widgets/dashboard-sidebar/model/links.js](../../apps/web/src/widgets/dashboard-sidebar/model/links.js); [apps/web/src/widgets/navbar/ui/Navbar.jsx](../../apps/web/src/widgets/navbar/ui/Navbar.jsx); [apps/web/src/widgets/navbar/ui/Navbar.test.jsx](../../apps/web/src/widgets/navbar/ui/Navbar.test.jsx); [apps/web/src/widgets/review-slider/ui/ReviewSlider.jsx](../../apps/web/src/widgets/review-slider/ui/ReviewSlider.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/entities/user/lib/avatar.js](../../apps/web/src/entities/user/lib/avatar.js)

entities/user domain transformation/utility `avatar`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `getInitialsAvatar`; `getAvatarSource`; `setInitialsAvatarOnError`.
- **Named functions / components:** `avatarSeed (L12)`; `initialsFromSeed (L29)`; `hashSeed (L40)`; `getInitialsAvatar (L53)`; `getAvatarSource (L62)`; `setInitialsAvatarOnError (L80)`.
- **Direct static consumers:** [apps/web/src/entities/user/api/profileApi.js](../../apps/web/src/entities/user/api/profileApi.js); [apps/web/src/entities/user/index.js](../../apps/web/src/entities/user/index.js); [apps/web/src/entities/user/lib/avatar.test.js](../../apps/web/src/entities/user/lib/avatar.test.js).
- **Selected calls / effects:** `personOrName.trim`, `seed.match`, `words.at`, `characters.slice`, `character.codePointAt`, `avatarSeed`, `initialsFromSeed`, `hashSeed`, `encodeURIComponent`, `person.image.trim`, `getInitialsAvatar`.

### [apps/web/src/entities/user/lib/avatar.test.js](../../apps/web/src/entities/user/lib/avatar.test.js)

Regression/characterization tests for avatar.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/entities/user/lib/avatar`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `describe`, `it`, `getInitialsAvatar`, `decodeURIComponent`, `expect`, `getAvatarSource`.
- **Test focus:** local initials avatars; creates a deterministic inline SVG without embedding the full identity; supports a mononymous learner; replaces legacy external DiceBear profile URLs locally.

### [apps/web/src/entities/user/model/accountTypes.js](../../apps/web/src/entities/user/model/accountTypes.js)

entities/user state/constants `accountTypes`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `ACCOUNT_TYPE`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/entities/user/index.js](../../apps/web/src/entities/user/index.js).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/entities/user/model/authSlice.js](../../apps/web/src/entities/user/model/authSlice.js)

entities/user state/constants `authSlice`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@reduxjs/toolkit`.
- **Exports:** `{ setSignupData, setLoading, setAuthChecking, setPolicyAcceptanceRequired, setSession, }`; `default `.
- **Named functions / components:** `setSignupData (L18)`; `setLoading (L21)`; `setAuthChecking (L24)`; `setSession (L27)`; `setPolicyAcceptanceRequired (L34)`.
- **Direct static consumers:** [apps/web/src/entities/user/api/profileApi.js](../../apps/web/src/entities/user/api/profileApi.js); [apps/web/src/entities/user/index.js](../../apps/web/src/entities/user/index.js); [apps/web/src/entities/user/model/authSlice.test.js](../../apps/web/src/entities/user/model/authSlice.test.js).
- **Selected calls / effects:** `createSlice`.

### [apps/web/src/entities/user/model/authSlice.test.js](../../apps/web/src/entities/user/model/authSlice.test.js)

Regression/characterization tests for authSlice.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/entities/user/model/authSlice`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `setSession`, `describe`, `it`, `authReducer`, `expect`, `setAuthChecking`, `setPolicyAcceptanceRequired`.
- **Test focus:** auth session state; starts without a JavaScript-readable credential; tracks a verified cookie session without storing the credential; tracks a policy gate without treating it as a browser credential.

### [apps/web/src/entities/user/model/profileSlice.js](../../apps/web/src/entities/user/model/profileSlice.js)

entities/user state/constants `profileSlice`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@reduxjs/toolkit`.
- **Exports:** `{ setUser, setLoading }`; `default `.
- **Named functions / components:** `setUser (L12)`; `setLoading (L15)`.
- **Direct static consumers:** [apps/web/src/entities/user/api/profileApi.js](../../apps/web/src/entities/user/api/profileApi.js); [apps/web/src/entities/user/index.js](../../apps/web/src/entities/user/index.js).
- **Selected calls / effects:** `createSlice`.

### [apps/web/src/features/README.md](../../apps/web/src/features/README.md)

Directory/workspace responsibility guide: Features. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [apps/web/src/features/authentication/SessionBootstrap.jsx](../../apps/web/src/features/authentication/SessionBootstrap.jsx)

Restores cookie-backed session at app startup with StrictMode duplicate-effect guard.

- **Imports / dependencies:** `@/features/authentication/api/authApi`, `react`, `react-redux`.
- **Exports:** `default SessionBootstrap`.
- **Named functions / components:** `SessionBootstrap (L5)`.
- **Direct static consumers:** [apps/web/src/features/authentication/SessionBootstrap.test.jsx](../../apps/web/src/features/authentication/SessionBootstrap.test.jsx); [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js).
- **Selected calls / effects:** `restoreSession`, `useDispatch`, `useRef`, `useEffect`, `dispatch`.

### [apps/web/src/features/authentication/SessionBootstrap.test.jsx](../../apps/web/src/features/authentication/SessionBootstrap.test.jsx)

Regression/characterization tests for SessionBootstrap.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/authentication/api/authApi`, `@/features/authentication/SessionBootstrap`, `@testing-library/react`, `react`, `react-redux`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByText`, `vi.mock`, `vi.fn`, `describe`, `it`, `render`, `expect`.
- **Test focus:** SessionBootstrap; dispatches session restoration once under StrictMode.

### [apps/web/src/features/authentication/api/accountSecurityApi.js](../../apps/web/src/features/authentication/api/accountSecurityApi.js)

Authenticated password change and destructive account deletion via credentialed transport; reset issuance/completion live in authApi.

- **Imports / dependencies:** `@/entities/user`, `@/shared/api/endpoints`, `@/shared/api/httpClient`, `react-hot-toast`, `./authApi`.
- **Exports:** `changePassword`; `deleteProfile`.
- **Named functions / components:** `getErrorMessage (L10)`; `changePassword (L13)`; `deleteProfile (L31)`.
- **Direct static consumers:** [apps/web/src/features/authentication/api/accountSecurityApi.test.js](../../apps/web/src/features/authentication/api/accountSecurityApi.test.js); [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js); [apps/web/src/features/authentication/ui/DeleteAccount.jsx](../../apps/web/src/features/authentication/ui/DeleteAccount.jsx); [apps/web/src/features/authentication/ui/UpdatePassword.jsx](../../apps/web/src/features/authentication/ui/UpdatePassword.jsx).
- **Selected calls / effects:** `apiConnector`, `toast.loading`, `toast.success`, `toast.error`, `getErrorMessage`, `toast.dismiss`, `dispatch`, `logout`, `getState`, `setUser`.

### [apps/web/src/features/authentication/api/accountSecurityApi.test.js](../../apps/web/src/features/authentication/api/accountSecurityApi.test.js)

Regression/characterization tests for accountSecurityApi.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/shared/api/httpClient`, `vitest`, `./accountSecurityApi`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `getState (L55)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `apiConnector.mockResolvedValue`, `apiConnector.mockRejectedValue`, `vi.mock`, `vi.fn`, `describe`, `beforeEach`, `vi.clearAllMocks`, `it`, `expect`, `deleteProfile`, `expect.stringContaining`, `expect.any`, `expect.objectContaining`.
- **Test focus:** account deletion requests; sends the email and current password re-authentication contract; keeps a failed cleanup authenticated in restricted recovery mode.

### [apps/web/src/features/authentication/api/authApi.js](../../apps/web/src/features/authentication/api/authApi.js)

Auth/OTP/policy/session thunks, legacy localStorage cleanup, safe response commit and return navigation.

- **Imports / dependencies:** `@/entities/cart`, `@/entities/user`, `@/shared/api/endpoints`, `@/shared/api/httpClient`, `@/shared/lib/routing/internalRedirect`, `react-hot-toast`.
- **Exports:** `restoreSession`; `sendOtp`; `signUp`; `login`; `googleLogin`; `acceptCurrentPolicies`; `getPasswordResetToken`; `resetPassword`; `logout`.
- **Named functions / components:** `getErrorMessage (L27)`; `clearLegacyAuthStorage (L30)`; `withFallbackImage (L38)`; `readUser (L46)`; `commitSession (L49)`; `navigateAfterLogin (L74)`; `restoreSession (L95)`; `sendOtp (L122)`; `signUp (L158)`; `login (L187)`; `googleLogin (L219)`; `acceptCurrentPolicies (L256)`; `getPasswordResetToken (L296)`; `resetPassword (L320)`; `logout (L346)`.
- **Direct static consumers:** [apps/web/src/features/authentication/SessionBootstrap.jsx](../../apps/web/src/features/authentication/SessionBootstrap.jsx); [apps/web/src/features/authentication/SessionBootstrap.test.jsx](../../apps/web/src/features/authentication/SessionBootstrap.test.jsx); [apps/web/src/features/authentication/api/accountSecurityApi.js](../../apps/web/src/features/authentication/api/accountSecurityApi.js); [apps/web/src/features/authentication/api/authApi.test.js](../../apps/web/src/features/authentication/api/authApi.test.js); [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js); [apps/web/src/features/authentication/ui/GoogleSignInButton.jsx](../../apps/web/src/features/authentication/ui/GoogleSignInButton.jsx); [apps/web/src/features/authentication/ui/GoogleSignInButton.test.jsx](../../apps/web/src/features/authentication/ui/GoogleSignInButton.test.jsx); [apps/web/src/features/authentication/ui/LoginForm.jsx](../../apps/web/src/features/authentication/ui/LoginForm.jsx); [apps/web/src/features/authentication/ui/LoginForm.test.jsx](../../apps/web/src/features/authentication/ui/LoginForm.test.jsx); [apps/web/src/features/authentication/ui/ProfileDropdown.jsx](../../apps/web/src/features/authentication/ui/ProfileDropdown.jsx); [apps/web/src/features/authentication/ui/SignupForm.jsx](../../apps/web/src/features/authentication/ui/SignupForm.jsx).
- **Selected calls / effects:** `setSession`, `apiConnector`, `commitSession`, `window.localStorage.removeItem`, `getAvatarSource`, `withFallbackImage`, `readUser`, `dispatch`, `setUser`, `setPolicyAcceptanceRequired`, `clearLegacyAuthStorage`, `navigate`, `sanitizeInternalRedirect`, `setAuthChecking`, `toast.loading`, `setAuthLoading`, `toast.success`, `toast.error`, `getErrorMessage`, `toast.dismiss`, `setSignupData`, `navigateAfterLogin`, `getState`, `setEmailSent`, `resetCart`.

### [apps/web/src/features/authentication/api/authApi.test.js](../../apps/web/src/features/authentication/api/authApi.test.js)

Regression/characterization tests for authApi.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/authentication/api/authApi`, `@/shared/api/httpClient`, `react-hot-toast`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `sessionResponse (L24)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `apiConnector.mockResolvedValue`, `vi.mock`, `vi.fn`, `describe`, `beforeEach`, `vi.clearAllMocks`, `window.localStorage.clear`, `it`, `sessionResponse`, `expect`, `login`, `expect.stringContaining`, `googleLogin`, `acceptCurrentPolicies`, `sendOtp`, `expect.any`, `expect.anything`.
- **Test focus:** post-login navigation; returns a local login to the protected destination captured by PrivateRoute; carries a sanitized destination through the policy gate; rejects an unsafe destination and keeps deletion recovery authoritative (all cases indexed in TESTING).

### [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js)

Public export surface for features/authentication; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./SessionBootstrap`, `./api/accountSecurityApi`, `./api/authApi`, `./lib/policyAcknowledgement`, `./model/sessionResponseIntegration`, `./routing/OpenRoute`, `./routing/PrivateRoute`, `./routing/RoleRoute`, `./ui/DeleteAccount`, `./ui/PolicyAcknowledgement`, `./ui/ProfileDropdown`, `./ui/Template`, `./ui/UpdatePassword`, `./ui/VerificationCodeInput`.
- **Exports:** `SessionBootstrap`; `OpenRoute`; `PrivateRoute`; `RoleRoute`; `DeleteAccount`; `PolicyAcknowledgement`; `ProfileDropdown`; `Template`; `UpdatePassword`; `VerificationCodeInput`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/App.jsx](../../apps/web/src/app/App.jsx); [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx); [apps/web/src/app/router/AppRouter.parity.test.jsx](../../apps/web/src/app/router/AppRouter.parity.test.jsx); [apps/web/src/app/store/index.js](../../apps/web/src/app/store/index.js); [apps/web/src/pages/forgot-password/index.jsx](../../apps/web/src/pages/forgot-password/index.jsx); [apps/web/src/pages/login/index.jsx](../../apps/web/src/pages/login/index.jsx); [apps/web/src/pages/policy-acceptance/PolicyAcceptance.test.jsx](../../apps/web/src/pages/policy-acceptance/PolicyAcceptance.test.jsx); [apps/web/src/pages/policy-acceptance/index.jsx](../../apps/web/src/pages/policy-acceptance/index.jsx); [apps/web/src/pages/settings/index.jsx](../../apps/web/src/pages/settings/index.jsx); [apps/web/src/pages/signup/index.jsx](../../apps/web/src/pages/signup/index.jsx); [apps/web/src/pages/update-password/index.jsx](../../apps/web/src/pages/update-password/index.jsx); [apps/web/src/pages/verify-email/index.jsx](../../apps/web/src/pages/verify-email/index.jsx); [apps/web/src/widgets/dashboard-sidebar/ui/Sidebar.jsx](../../apps/web/src/widgets/dashboard-sidebar/ui/Sidebar.jsx); [apps/web/src/widgets/navbar/ui/Navbar.jsx](../../apps/web/src/widgets/navbar/ui/Navbar.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/features/authentication/lib/googleIdentity.js](../../apps/web/src/features/authentication/lib/googleIdentity.js)

features/authentication domain transformation/utility `googleIdentity`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `loadGoogleIdentityServices`.
- **Named functions / components:** `loadGoogleIdentityServices (L7)`; `cleanup (L19)`; `finish (L25)`; `handleLoad (L38)`; `handleError (L46)`.
- **Direct static consumers:** [apps/web/src/features/authentication/ui/GoogleReauthenticationButton.jsx](../../apps/web/src/features/authentication/ui/GoogleReauthenticationButton.jsx); [apps/web/src/features/authentication/ui/GoogleSignInButton.jsx](../../apps/web/src/features/authentication/ui/GoogleSignInButton.jsx); [apps/web/src/features/authentication/ui/GoogleSignInButton.test.jsx](../../apps/web/src/features/authentication/ui/GoogleSignInButton.test.jsx).
- **Selected calls / effects:** `document.getElementById`, `document.createElement`, `Promise.resolve`, `clearTimeout`, `script.removeEventListener`, `cleanup`, `script.remove`, `reject`, `resolve`, `finish`, `setTimeout`, `script.addEventListener`, `document.head.appendChild`.

### [apps/web/src/features/authentication/lib/policyAcknowledgement.js](../../apps/web/src/features/authentication/lib/policyAcknowledgement.js)

features/authentication domain transformation/utility `policyAcknowledgement`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `emptyPolicyAcknowledgement`; `hasCompletePolicyAcknowledgement`.
- **Named functions / components:** `hasCompletePolicyAcknowledgement (L7)`.
- **Direct static consumers:** [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js); [apps/web/src/features/authentication/ui/GoogleSignInButton.jsx](../../apps/web/src/features/authentication/ui/GoogleSignInButton.jsx); [apps/web/src/features/authentication/ui/PolicyAcknowledgement.test.jsx](../../apps/web/src/features/authentication/ui/PolicyAcknowledgement.test.jsx); [apps/web/src/features/authentication/ui/Template.jsx](../../apps/web/src/features/authentication/ui/Template.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/features/authentication/model/sessionResponseIntegration.js](../../apps/web/src/features/authentication/model/sessionResponseIntegration.js)

Maps transport 401/423/428 signals into session, cart and private cache state.

- **Imports / dependencies:** `@/entities/cart`, `@/entities/user`, `@/shared/api/httpClient`.
- **Exports:** `createSessionResponseHandler`; `installSessionResponseIntegration`.
- **Named functions / components:** `clearPersistedIdentityState (L12)`; `createSessionResponseHandler (L25)`; `installSessionResponseIntegration (L60)`.
- **Direct static consumers:** [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js); [apps/web/src/features/authentication/model/sessionResponseIntegration.test.js](../../apps/web/src/features/authentication/model/sessionResponseIntegration.test.js).
- **Selected calls / effects:** `setSession`, `registerSessionResponseHandler`, `createSessionResponseHandler`, `window.localStorage.removeItem`, `getState`, `clearPersistedIdentityState`, `dispatch`, `setUser`, `resetCart`, `setPolicyAcceptanceRequired`.

### [apps/web/src/features/authentication/model/sessionResponseIntegration.test.js](../../apps/web/src/features/authentication/model/sessionResponseIntegration.test.js)

Regression/characterization tests for sessionResponseIntegration.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/entities/cart`, `@/entities/user`, `@/features/authentication/model/sessionResponseIntegration`, `@/shared/api/httpClient`, `@reduxjs/toolkit`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `createAuthenticatedStore (L16)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `createSessionResponseHandler`, `store.getState`, `window.localStorage.getItem`, `configureStore`, `beforeEach`, `window.localStorage.clear`, `describe`, `it`, `createAuthenticatedStore`, `window.localStorage.setItem`, `handleSignal`, `expect`, `it.each`.
- **Test focus:** session response state integration; clears stale session, profile, cart, and legacy persisted state on 401; preserves a guest cart on an expected %s-session 401; enters deletion-recovery mode without discarding the session (all cases indexed in TESTING).

### [apps/web/src/features/authentication/routing/OpenRoute.jsx](../../apps/web/src/features/authentication/routing/OpenRoute.jsx)

features/authentication route gate `OpenRoute`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/lib/routing/internalRedirect`, `react-redux`, `react-router`.
- **Exports:** `default OpenRoute`.
- **Named functions / components:** `OpenRoute (L6)`.
- **Direct static consumers:** [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js); [apps/web/src/features/authentication/routing/OpenRoute.test.jsx](../../apps/web/src/features/authentication/routing/OpenRoute.test.jsx).
- **Selected calls / effects:** `useSelector`, `useLocation`, `sanitizeInternalRedirect`.

### [apps/web/src/features/authentication/routing/OpenRoute.test.jsx](../../apps/web/src/features/authentication/routing/OpenRoute.test.jsx)

Regression/characterization tests for OpenRoute.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/authentication/routing/OpenRoute`, `@reduxjs/toolkit`, `@testing-library/react`, `react-redux`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `Destination (L8)`; `renderOpenRoute (L20)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.findByLabelText`, `useLocation`, `configureStore`, `render`, `describe`, `it`, `renderOpenRoute`, `expect`.
- **Test focus:** OpenRoute authenticated navigation; preserves the protected destination during the login state transition; carries only a sanitized destination through the policy gate.

### [apps/web/src/features/authentication/routing/PrivateRoute.jsx](../../apps/web/src/features/authentication/routing/PrivateRoute.jsx)

features/authentication route gate `PrivateRoute`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react-redux`, `react-router`.
- **Exports:** `default PrivateRoute`.
- **Named functions / components:** `PrivateRoute (L5)`.
- **Direct static consumers:** [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js); [apps/web/src/features/authentication/routing/PrivateRoute.test.jsx](../../apps/web/src/features/authentication/routing/PrivateRoute.test.jsx).
- **Selected calls / effects:** `useSelector`, `useLocation`, `location.pathname.toLowerCase`.

### [apps/web/src/features/authentication/routing/PrivateRoute.test.jsx](../../apps/web/src/features/authentication/routing/PrivateRoute.test.jsx)

Regression/characterization tests for PrivateRoute.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/authentication/routing/PrivateRoute`, `@reduxjs/toolkit`, `@testing-library/react`, `react-redux`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `renderRoutes (L8)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.findByText`, `configureStore`, `render`, `describe`, `it`, `renderRoutes`, `expect`, `screen.queryByText`.
- **Test focus:** private account recovery routing; redirects a deletion-pending session away from normal account pages.

### [apps/web/src/features/authentication/routing/RoleRoute.jsx](../../apps/web/src/features/authentication/routing/RoleRoute.jsx)

features/authentication route gate `RoleRoute`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react-redux`, `react-router`.
- **Exports:** `default RoleRoute`.
- **Named functions / components:** `RoleRoute (L4)`.
- **Direct static consumers:** [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js).
- **Selected calls / effects:** `useSelector`, `allowedRoles.includes`.

### [apps/web/src/features/authentication/ui/DeleteAccount.jsx](../../apps/web/src/features/authentication/ui/DeleteAccount.jsx)

features/authentication presentation/interaction component `DeleteAccount`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/authentication/api/accountSecurityApi`, `@/features/authentication/ui/GoogleReauthenticationButton`, `react`, `react-icons/fi`, `react-redux`, `react-router`.
- **Exports:** `default DeleteAccount`.
- **Named functions / components:** `DeleteAccount (L8)`; `submitDeletion (L26)`; `handlePasswordDeletion (L38)`.
- **Direct static consumers:** [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js).
- **Selected calls / effects:** `useSelector`, `useDispatch`, `useNavigate`, `useState`, `providers.includes`, `confirmationEmail.trim`, `setDeleting`, `dispatch`, `deleteProfile`, `event.preventDefault`, `submitDeletion`, `setFormOpen`, `setConfirmationEmail`, `setCurrentPassword`.

### [apps/web/src/features/authentication/ui/GoogleReauthenticationButton.jsx](../../apps/web/src/features/authentication/ui/GoogleReauthenticationButton.jsx)

features/authentication presentation/interaction component `GoogleReauthenticationButton`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/authentication/lib/googleIdentity`, `react`.
- **Exports:** `default GoogleReauthenticationButton`.
- **Named functions / components:** `GoogleReauthenticationButton (L4)`.
- **Direct static consumers:** [apps/web/src/features/authentication/ui/DeleteAccount.jsx](../../apps/web/src/features/authentication/ui/DeleteAccount.jsx).
- **Selected calls / effects:** `useRef`, `useState`, `clientId.includes`, `useCallback`, `setLoadError`, `onCredential`, `useEffect`, `loadGoogleIdentityServices`, `google.accounts.id.initialize`, `buttonElement.replaceChildren`, `google.accounts.id.renderButton`.

### [apps/web/src/features/authentication/ui/GoogleSignInButton.jsx](../../apps/web/src/features/authentication/ui/GoogleSignInButton.jsx)

features/authentication presentation/interaction component `GoogleSignInButton`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/authentication/api/authApi`, `@/features/authentication/lib/googleIdentity`, `@/features/authentication/lib/policyAcknowledgement`, `@/shared/lib/routing/internalRedirect`, `react`, `react-hot-toast`, `react-redux`, `react-router`.
- **Exports:** `default GoogleSignInButton`.
- **Named functions / components:** `GoogleSignInButton (L10)`.
- **Direct static consumers:** [apps/web/src/features/authentication/ui/GoogleSignInButton.test.jsx](../../apps/web/src/features/authentication/ui/GoogleSignInButton.test.jsx); [apps/web/src/features/authentication/ui/Template.jsx](../../apps/web/src/features/authentication/ui/Template.jsx).
- **Selected calls / effects:** `useRef`, `useDispatch`, `useLocation`, `useNavigate`, `useState`, `clientId.includes`, `sanitizeInternalRedirect`, `useCallback`, `setLoadError`, `hasCompletePolicyAcknowledgement`, `toast.error`, `dispatch`, `googleLogin`, `useEffect`, `loadGoogleIdentityServices`, `google.accounts.id.initialize`, `buttonElement.replaceChildren`, `google.accounts.id.renderButton`.

### [apps/web/src/features/authentication/ui/GoogleSignInButton.test.jsx](../../apps/web/src/features/authentication/ui/GoogleSignInButton.test.jsx)

Regression/characterization tests for GoogleSignInButton.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/authentication/api/authApi`, `@/features/authentication/lib/googleIdentity`, `@/features/authentication/ui/GoogleSignInButton`, `@reduxjs/toolkit`, `@testing-library/react`, `react-redux`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `vi.mock`, `vi.fn`, `describe`, `beforeEach`, `vi.clearAllMocks`, `vi.stubEnv`, `loadGoogleIdentityServices.mockResolvedValue`, `afterEach`, `vi.unstubAllEnvs`, `it`, `configureStore`, `render`, `waitFor`, `expect`, `act`, `callback`, `expect.any`.
- **Test focus:** GoogleSignInButton redirect intent; passes PrivateRoute's sanitized destination to Google login.

### [apps/web/src/features/authentication/ui/LoginForm.jsx](../../apps/web/src/features/authentication/ui/LoginForm.jsx)

features/authentication presentation/interaction component `LoginForm`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/authentication/api/authApi`, `@/shared/lib/routing/internalRedirect`, `react`, `react-icons/ai`, `react-redux`, `react-router`.
- **Exports:** `default LoginForm`.
- **Named functions / components:** `LoginForm (L8)`; `handleOnChange (L21)`; `handleOnSubmit (L28)`.
- **Direct static consumers:** [apps/web/src/features/authentication/ui/LoginForm.test.jsx](../../apps/web/src/features/authentication/ui/LoginForm.test.jsx); [apps/web/src/features/authentication/ui/Template.jsx](../../apps/web/src/features/authentication/ui/Template.jsx).
- **Selected calls / effects:** `useNavigate`, `useLocation`, `useDispatch`, `useState`, `setFormData`, `e.preventDefault`, `sanitizeInternalRedirect`, `dispatch`, `login`, `setShowPassword`.

### [apps/web/src/features/authentication/ui/LoginForm.test.jsx](../../apps/web/src/features/authentication/ui/LoginForm.test.jsx)

Regression/characterization tests for LoginForm.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/authentication/api/authApi`, `@/features/authentication/ui/LoginForm`, `@reduxjs/toolkit`, `@testing-library/react`, `@testing-library/user-event`, `react-redux`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByRole`, `screen.getByLabelText`, `vi.mock`, `vi.fn`, `describe`, `beforeEach`, `vi.clearAllMocks`, `it`, `userEvent.setup`, `configureStore`, `render`, `user.type`, `user.click`, `expect`, `expect.any`.
- **Test focus:** LoginForm redirect intent; passes PrivateRoute's sanitized destination to local login.

### [apps/web/src/features/authentication/ui/PolicyAcknowledgement.jsx](../../apps/web/src/features/authentication/ui/PolicyAcknowledgement.jsx)

features/authentication presentation/interaction component `PolicyAcknowledgement`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react-router`.
- **Exports:** `default PolicyAcknowledgement`.
- **Named functions / components:** `PolicyAcknowledgement (L3)`; `update (L8)`.
- **Direct static consumers:** [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js); [apps/web/src/features/authentication/ui/PolicyAcknowledgement.test.jsx](../../apps/web/src/features/authentication/ui/PolicyAcknowledgement.test.jsx); [apps/web/src/features/authentication/ui/SignupForm.jsx](../../apps/web/src/features/authentication/ui/SignupForm.jsx).
- **Selected calls / effects:** `onChange`, `update`.

### [apps/web/src/features/authentication/ui/PolicyAcknowledgement.test.jsx](../../apps/web/src/features/authentication/ui/PolicyAcknowledgement.test.jsx)

Regression/characterization tests for PolicyAcknowledgement.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/authentication/lib/policyAcknowledgement`, `@/features/authentication/ui/PolicyAcknowledgement`, `@testing-library/react`, `@testing-library/user-event`, `react`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `Harness (L9)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByRole`, `screen.getByText`, `useState`, `describe`, `it`, `userEvent.setup`, `render`, `expect`, `user.click`.
- **Test focus:** PolicyAcknowledgement; requires three separate affirmative acknowledgements and links policies.

### [apps/web/src/features/authentication/ui/ProfileDropdown.jsx](../../apps/web/src/features/authentication/ui/ProfileDropdown.jsx)

features/authentication presentation/interaction component `ProfileDropdown`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/user`, `@/features/authentication/api/authApi`, `@/shared/hooks/useOnClickOutside`, `react`, `react-icons/ai`, `react-icons/vsc`, `react-redux`, `react-router`.
- **Exports:** `default ProfileDropdown`.
- **Named functions / components:** `ProfileDropdown (L10)`.
- **Direct static consumers:** [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js).
- **Selected calls / effects:** `useSelector`, `useDispatch`, `useNavigate`, `useState`, `useRef`, `useOnClickOutside`, `setOpen`, `getAvatarSource`, `setInitialsAvatarOnError`, `dispatch`, `logout`.

### [apps/web/src/features/authentication/ui/SignupForm.jsx](../../apps/web/src/features/authentication/ui/SignupForm.jsx)

features/authentication presentation/interaction component `SignupForm`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/user`, `@/features/authentication/api/authApi`, `@/features/authentication/ui/PolicyAcknowledgement`, `@/features/authentication/ui/Tab`, `react`, `react-hot-toast`, `react-icons/ai`, `react-redux`, `react-router`.
- **Exports:** `default SignupForm`.
- **Named functions / components:** `SignupForm (L11)`; `handleOnChange (L32)`; `handleOnSubmit (L40)`.
- **Direct static consumers:** [apps/web/src/features/authentication/ui/Template.jsx](../../apps/web/src/features/authentication/ui/Template.jsx).
- **Selected calls / effects:** `useNavigate`, `useDispatch`, `useState`, `setFormData`, `e.preventDefault`, `toast.error`, `dispatch`, `setSignupData`, `sendOtp`, `setShowPassword`, `setShowConfirmPassword`.

### [apps/web/src/features/authentication/ui/Tab.jsx](../../apps/web/src/features/authentication/ui/Tab.jsx)

features/authentication presentation/interaction component `Tab`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `default Tab`.
- **Named functions / components:** `Tab (L1)`.
- **Direct static consumers:** [apps/web/src/features/authentication/ui/SignupForm.jsx](../../apps/web/src/features/authentication/ui/SignupForm.jsx).
- **Selected calls / effects:** `tabData.map`, `setField`.

### [apps/web/src/features/authentication/ui/Template.jsx](../../apps/web/src/features/authentication/ui/Template.jsx)

features/authentication presentation/interaction component `Template`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/authentication/lib/policyAcknowledgement`, `@/features/authentication/ui/GoogleSignInButton`, `@/features/authentication/ui/LoginForm`, `@/features/authentication/ui/SignupForm`, `@/shared/assets/Images/frame.png`, `react`, `react-redux`.
- **Exports:** `default Template`.
- **Named functions / components:** `Template (L9)`.
- **Direct static consumers:** [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js); [apps/web/src/features/authentication/ui/Template.test.jsx](../../apps/web/src/features/authentication/ui/Template.test.jsx).
- **Selected calls / effects:** `useSelector`, `useState`, `googleClientId.includes`.

### [apps/web/src/features/authentication/ui/Template.test.jsx](../../apps/web/src/features/authentication/ui/Template.test.jsx)

Regression/characterization tests for Template.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/authentication/ui/Template`, `@reduxjs/toolkit`, `@testing-library/react`, `react-redux`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `renderTemplate (L18)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByText`, `screen.getByRole`, `vi.mock`, `configureStore`, `render`, `afterEach`, `vi.unstubAllEnvs`, `describe`, `it`, `vi.stubEnv`, `renderTemplate`, `expect`, `screen.queryByText`, `screen.queryByRole`.
- **Test focus:** Template Google Identity deployment state; removes the complete Google affordance when staging leaves it unconfigured; shows Google Identity only for a configured client.

### [apps/web/src/features/authentication/ui/UpdatePassword.jsx](../../apps/web/src/features/authentication/ui/UpdatePassword.jsx)

features/authentication presentation/interaction component `UpdatePassword`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/authentication/api/accountSecurityApi`, `@/shared/ui/IconBtn`, `react`, `react-hook-form`, `react-icons/ai`, `react-redux`, `react-router`.
- **Exports:** `default UpdatePassword`.
- **Named functions / components:** `UpdatePassword (L9)`; `submitPasswordForm (L22)`.
- **Direct static consumers:** [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js).
- **Selected calls / effects:** `useSelector`, `useNavigate`, `useState`, `useForm`, `changePassword`, `handleSubmit`, `register`, `setShowOldPassword`, `setShowNewPassword`, `navigate`.

### [apps/web/src/features/authentication/ui/VerificationCodeInput.jsx](../../apps/web/src/features/authentication/ui/VerificationCodeInput.jsx)

features/authentication presentation/interaction component `VerificationCodeInput`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react`.
- **Exports:** `default VerificationCodeInput`.
- **Named functions / components:** `digitsOnly (L5)`; `VerificationCodeInput (L7)`; `focusInput (L15)`; `insertDigits (L17)`; `removeDigit (L32)`.
- **Direct static consumers:** [apps/web/src/features/authentication/index.js](../../apps/web/src/features/authentication/index.js); [apps/web/src/features/authentication/ui/VerificationCodeInput.test.jsx](../../apps/web/src/features/authentication/ui/VerificationCodeInput.test.jsx).
- **Selected calls / effects:** `event.clipboardData.getData`, `value.replace`, `useRef`, `digitsOnly`, `useEffect`, `normalizedValue.slice`, `onChange`, `focusInput`, `insertDigits`, `event.currentTarget.select`, `event.preventDefault`, `removeDigit`.

### [apps/web/src/features/authentication/ui/VerificationCodeInput.test.jsx](../../apps/web/src/features/authentication/ui/VerificationCodeInput.test.jsx)

Regression/characterization tests for VerificationCodeInput.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/authentication/ui/VerificationCodeInput`, `@testing-library/react`, `@testing-library/user-event`, `react`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `ControlledVerificationCodeInput (L7)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByLabelText`, `useState`, `describe`, `it`, `userEvent.setup`, `render`, `expect`, `user.type`, `fireEvent.paste`, `user.keyboard`.
- **Test focus:** VerificationCodeInput; accepts six digits and advances focus; filters a pasted code to digits and caps it at six characters; moves backward and removes the previous digit on backspace.

### [apps/web/src/features/contact-support/api/contactSupportApi.js](../../apps/web/src/features/contact-support/api/contactSupportApi.js)

features/contact-support HTTP adapter `contactSupportApi`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/api/endpoints`, `@/shared/api/httpClient`.
- **Exports:** `sendContactMessage`.
- **Named functions / components:** `sendContactMessage (L4)`.
- **Direct static consumers:** [apps/web/src/features/contact-support/index.js](../../apps/web/src/features/contact-support/index.js); [apps/web/src/features/contact-support/ui/ContactUsForm.jsx](../../apps/web/src/features/contact-support/ui/ContactUsForm.jsx).
- **Selected calls / effects:** `apiConnector`.

### [apps/web/src/features/contact-support/index.js](../../apps/web/src/features/contact-support/index.js)

Public export surface for features/contact-support; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./api/contactSupportApi`, `./ui/ContactUsForm`.
- **Exports:** `ContactUsForm`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/about/ui/ContactFormSection.jsx](../../apps/web/src/pages/about/ui/ContactFormSection.jsx); [apps/web/src/pages/contact/ui/ContactForm.jsx](../../apps/web/src/pages/contact/ui/ContactForm.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/features/contact-support/ui/ContactUsForm.jsx](../../apps/web/src/features/contact-support/ui/ContactUsForm.jsx)

features/contact-support presentation/interaction component `ContactUsForm`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/contact-support/api/contactSupportApi`, `@/shared/config/countrycode.json`, `react`, `react-hook-form`, `react-hot-toast`.
- **Exports:** `default ContactUsForm`.
- **Named functions / components:** `ContactUsForm (L7)`; `submitContactForm (L16)`.
- **Direct static consumers:** [apps/web/src/features/contact-support/index.js](../../apps/web/src/features/contact-support/index.js).
- **Selected calls / effects:** `useState`, `useForm`, `setLoading`, `sendContactMessage`, `toast.success`, `reset`, `toast.error`, `handleSubmit`, `register`, `CountryCode.map`.

### [apps/web/src/features/course-authoring/index.js](../../apps/web/src/features/course-authoring/index.js)

Public export surface for features/course-authoring; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./ui/AddCourse`, `./ui/EditCourse`.
- **Exports:** `AddCourse`; `EditCourse`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/course-create/index.jsx](../../apps/web/src/pages/course-create/index.jsx); [apps/web/src/pages/course-edit/index.jsx](../../apps/web/src/pages/course-edit/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/CourseBuilderForm.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/CourseBuilderForm.jsx)

features/course-authoring component/helper `CourseBuilderForm`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/course`, `@/features/course-authoring/ui/AddCourse/CourseBuilder/NestedView`, `@/shared/ui/IconBtn`, `react`, `react-hook-form`, `react-hot-toast`, `react-icons/io5`, `react-icons/md`, `react-redux`.
- **Exports:** `default CourseBuilderForm`.
- **Named functions / components:** `CourseBuilderForm (L17)`; `onSubmit (L32)`; `cancelEdit (L66)`; `handleChangeEditSectionName (L71)`; `goToNext (L80)`; `goBack (L94)`.
- **Direct static consumers:** [apps/web/src/features/course-authoring/ui/AddCourse/RenderSteps.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/RenderSteps.jsx).
- **Selected calls / effects:** `setCourse`, `setEditCourse`, `useForm`, `useSelector`, `useState`, `useDispatch`, `setLoading`, `updateSection`, `createSection`, `dispatch`, `setEditSectionName`, `setValue`, `cancelEdit`, `toast.error`, `course.courseContent.some`, `setStep`, `handleSubmit`, `register`.

### [apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/NestedView.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/NestedView.jsx)

features/course-authoring component/helper `NestedView`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/course`, `@/features/course-authoring/ui/AddCourse/CourseBuilder/SubSectionModal`, `@/shared/ui/ConfirmationModal`, `react`, `react-icons/ai`, `react-icons/fa`, `react-icons/md`, `react-icons/ri`, `react-icons/rx`, `react-redux`.
- **Exports:** `default NestedView`.
- **Named functions / components:** `NestedView (L12)`; `handleDeleleSection (L22)`; `handleDeleteSubSection (L33)`.
- **Direct static consumers:** [apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/CourseBuilderForm.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/CourseBuilderForm.jsx).
- **Selected calls / effects:** `setCourse`, `useSelector`, `useDispatch`, `useState`, `deleteSection`, `dispatch`, `setConfirmationModal`, `deleteSubSection`, `course.courseContent.map`, `handleChangeEditSectionName`, `handleDeleleSection`, `section.subSection.map`, `setViewSubSection`, `setEditSubSection`, `handleDeleteSubSection`, `setAddSubsection`.

### [apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/SubSectionModal.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/SubSectionModal.jsx)

features/course-authoring component/helper `SubSectionModal`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/course`, `@/features/course-authoring/ui/AddCourse/Upload`, `@/shared/ui/IconBtn`, `react`, `react-hook-form`, `react-hot-toast`, `react-icons/rx`, `react-redux`.
- **Exports:** `default SubSectionModal`.
- **Named functions / components:** `SubSectionModal (L14)`; `isFormUpdated (L55)`; `handleEditSubsection (L69)`; `onSubmit (L100)`.
- **Direct static consumers:** [apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/NestedView.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/NestedView.jsx).
- **Selected calls / effects:** `setCourse`, `useForm`, `useDispatch`, `useState`, `useSelector`, `useEffect`, `setValue`, `getValues`, `formData.append`, `setLoading`, `updateSubSection`, `course.courseContent.map`, `dispatch`, `setModalData`, `isFormUpdated`, `toast.error`, `handleEditSubsection`, `createSubSection`, `handleSubmit`, `register`.

### [apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/ChipInput.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/ChipInput.jsx)

features/course-authoring component/helper `ChipInput`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react`, `react-icons/md`, `react-redux`.
- **Exports:** `default ChipInput`.
- **Named functions / components:** `ChipInput (L8)`; `handleKeyDown (L35)`; `handleDeleteChip (L53)`.
- **Direct static consumers:** [apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm.jsx).
- **Selected calls / effects:** `useSelector`, `useState`, `useEffect`, `register`, `setValue`, `event.preventDefault`, `event.target.value.trim`, `chips.includes`, `setChips`, `chips.filter`, `chips.map`, `handleDeleteChip`.

### [apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm.jsx)

features/course-authoring component/helper `CourseInformationForm`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/course`, `@/features/course-authoring/ui/AddCourse/CourseInformation/ChipInput`, `@/features/course-authoring/ui/AddCourse/CourseInformation/RequirementsField`, `@/features/course-authoring/ui/AddCourse/Upload`, `@/shared/ui/IconBtn`, `react`, `react-hook-form`, `react-hot-toast`, `react-icons/hi`, `react-icons/md`, `react-redux`.
- **Exports:** `default CourseInformationForm`.
- **Named functions / components:** `CourseInformationForm (L20)`; `getCategories (L36)`; `isFormUpdated (L62)`; `onSubmit (L82)`.
- **Direct static consumers:** [apps/web/src/features/course-authoring/ui/AddCourse/RenderSteps.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/RenderSteps.jsx).
- **Selected calls / effects:** `fetchCourseCategories`, `setCourseCategories`, `editCourseDetails`, `setCourse`, `addCourseDetails`, `useForm`, `useDispatch`, `useSelector`, `useState`, `useEffect`, `setLoading`, `setValue`, `getCategories`, `getValues`, `currentValues.courseTags.toString`, `course.tag.toString`, `currentValues.courseRequirements.toString`, `course.instructions.toString`, `isFormUpdated`, `formData.append`, `dispatch`, `setStep`, `toast.error`, `handleSubmit`, `register`.

### [apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/RequirementsField.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/RequirementsField.jsx)

features/course-authoring component/helper `RequirementsField`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react`, `react-redux`.
- **Exports:** `default RequirementsField`.
- **Named functions / components:** `RequirementsField (L4)`; `handleAddRequirement (L27)`; `handleRemoveRequirement (L34)`.
- **Direct static consumers:** [apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm.jsx).
- **Selected calls / effects:** `useSelector`, `useState`, `useEffect`, `register`, `setValue`, `setRequirementsList`, `setRequirement`, `updatedRequirements.splice`, `requirementsList.map`, `handleRemoveRequirement`.

### [apps/web/src/features/course-authoring/ui/AddCourse/PublishCourse/index.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/PublishCourse/index.jsx)

features/course-authoring component/helper `index`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/course`, `@/shared/ui/IconBtn`, `react`, `react-hook-form`, `react-redux`, `react-router`.
- **Exports:** `default PublishCourse`.
- **Named functions / components:** `PublishCourse (L13)`; `goBack (L28)`; `goToCourses (L32)`; `handleCoursePublish (L37)`; `onSubmit (L63)`.
- **Direct static consumers:** [apps/web/src/features/course-authoring/ui/AddCourse/RenderSteps.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/RenderSteps.jsx).
- **Selected calls / effects:** `resetCourseState`, `goToCourses`, `editCourseDetails`, `handleCoursePublish`, `useForm`, `useDispatch`, `useNavigate`, `useSelector`, `useState`, `useEffect`, `setValue`, `dispatch`, `setStep`, `navigate`, `getValues`, `formData.append`, `setLoading`, `handleSubmit`, `register`.

### [apps/web/src/features/course-authoring/ui/AddCourse/RenderSteps.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/RenderSteps.jsx)

features/course-authoring component/helper `RenderSteps`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/course-authoring/ui/AddCourse/CourseBuilder/CourseBuilderForm`, `@/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm`, `@/features/course-authoring/ui/AddCourse/PublishCourse`, `react`, `react-icons/fa`, `react-redux`.
- **Exports:** `default RenderSteps`.
- **Named functions / components:** `RenderSteps (L8)`.
- **Direct static consumers:** [apps/web/src/features/course-authoring/ui/AddCourse/index.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/index.jsx); [apps/web/src/features/course-authoring/ui/EditCourse/index.jsx](../../apps/web/src/features/course-authoring/ui/EditCourse/index.jsx).
- **Selected calls / effects:** `useSelector`, `steps.map`.

### [apps/web/src/features/course-authoring/ui/AddCourse/Upload.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/Upload.jsx)

features/course-authoring component/helper `Upload`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react`, `react-dropzone`, `react-hot-toast`, `react-icons/fi`.
- **Exports:** `default Upload`.
- **Named functions / components:** `Upload (L20)`; `onDrop (L36)`.
- **Direct static consumers:** [apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/SubSectionModal.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/SubSectionModal.jsx); [apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm.jsx).
- **Selected calls / effects:** `URL.createObjectURL`, `useState`, `useRef`, `URL.revokeObjectURL`, `setPreviewSource`, `setSelectedFile`, `useDropzone`, `rejections.some`, `dropErrors.some`, `toast.error`, `useEffect`, `register`, `setValue`, `getRootProps`, `getInputProps`.

### [apps/web/src/features/course-authoring/ui/AddCourse/index.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/index.jsx)

features/course-authoring component/helper `index`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/course-authoring/ui/AddCourse/RenderSteps`.
- **Exports:** `default AddCourse`.
- **Named functions / components:** `AddCourse (L3)`.
- **Direct static consumers:** [apps/web/src/features/course-authoring/index.js](../../apps/web/src/features/course-authoring/index.js).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/features/course-authoring/ui/EditCourse/index.jsx](../../apps/web/src/features/course-authoring/ui/EditCourse/index.jsx)

features/course-authoring component/helper `index`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/course`, `@/features/course-authoring/ui/AddCourse/RenderSteps`, `react`, `react-redux`, `react-router`.
- **Exports:** `default EditCourse`.
- **Named functions / components:** `EditCourse (L11)`.
- **Direct static consumers:** [apps/web/src/features/course-authoring/index.js](../../apps/web/src/features/course-authoring/index.js).
- **Selected calls / effects:** `getFullDetailsOfCourse`, `setEditCourse`, `setCourse`, `useDispatch`, `useParams`, `useSelector`, `useState`, `useEffect`, `setLoading`, `dispatch`.

### [apps/web/src/features/course-filter/index.js](../../apps/web/src/features/course-filter/index.js)

Public export surface for features/course-filter; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./model/catalogFilters`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/catalog/index.jsx](../../apps/web/src/pages/catalog/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/features/course-filter/model/catalogFilters.js](../../apps/web/src/features/course-filter/model/catalogFilters.js)

features/course-filter state/constants `catalogFilters`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `CATALOG_LEVELS`; `CATALOG_LANGUAGES`; `CATALOG_SORTS`; `categoryPathSlug`; `readCatalogFilters`; `catalogFiltersToSearchParams`; `countActiveCatalogFilters`; `durationPresetFromFilters`; `durationFiltersFromPreset`.
- **Named functions / components:** `normalizeText (L16)`; `allowedValue (L21)`; `boundedNumber (L23)`; `categoryPathSlug (L30)`; `readCatalogFilters (L37)`; `catalogFiltersToSearchParams (L87)`; `countActiveCatalogFilters (L113)`; `durationPresetFromFilters (L123)`; `durationFiltersFromPreset (L135)`.
- **Direct static consumers:** [apps/web/src/features/course-filter/index.js](../../apps/web/src/features/course-filter/index.js); [apps/web/src/features/course-filter/model/catalogFilters.test.js](../../apps/web/src/features/course-filter/model/catalogFilters.test.js).
- **Selected calls / effects:** `searchParams.get`, `value.trim`, `allowed.includes`, `Number.isFinite`, `normalizeText`, `allowedValue`, `boundedNumber`, `readCatalogFilters`, `params.set`.

### [apps/web/src/features/course-filter/model/catalogFilters.test.js](../../apps/web/src/features/course-filter/model/catalogFilters.test.js)

Regression/characterization tests for catalogFilters.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/course-filter/model/catalogFilters`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `describe`, `it`, `readCatalogFilters`, `expect`, `catalogFiltersToSearchParams`, `params.toString`, `categoryPathSlug`, `countActiveCatalogFilters`, `durationFiltersFromPreset`, `durationPresetFromFilters`.
- **Test focus:** catalog URL filters; normalizes valid filters and defaults searched lists to relevance; drops invalid values and relevance sorting without a query; does not send inverted ranges restored from a shared URL (all cases indexed in TESTING).

### [apps/web/src/features/course-purchase/api/coursePurchaseApi.js](../../apps/web/src/features/course-purchase/api/coursePurchaseApi.js)

Razorpay script loading/Checkout, server order/verification, purchase/refund requests and UI navigation.

- **Imports / dependencies:** `@/entities/cart`, `@/entities/course`, `@/features/course-purchase/lib/checkoutIdempotency`, `@/shared/api/endpoints`, `@/shared/api/httpClient`, `@/shared/assets/Logo/rzp_logo.png`, `react-hot-toast`.
- **Exports:** `BuyCourse`; `fetchCheckoutConfig`; `fetchPurchaseHistory`; `requestPurchaseRefund`.
- **Named functions / components:** `loadScript (L26)`; `finish (L36)`; `handleLoad (L47)`; `handleError (L48)`; `BuyCourse (L66)`; `fetchCheckoutConfig (L201)`; `fetchPurchaseHistory (L231)`; `requestPurchaseRefund (L255)`; `verifyPayment (L287)`; `sendPaymentSuccessEmail (L325)`.
- **Direct static consumers:** [apps/web/src/features/course-purchase/api/coursePurchaseApi.test.js](../../apps/web/src/features/course-purchase/api/coursePurchaseApi.test.js); [apps/web/src/features/course-purchase/index.js](../../apps/web/src/features/course-purchase/index.js); [apps/web/src/features/course-purchase/ui/RenderTotalAmount.jsx](../../apps/web/src/features/course-purchase/ui/RenderTotalAmount.jsx).
- **Selected calls / effects:** `document.createElement`, `apiConnector`, `Promise.resolve`, `document.querySelector`, `clearTimeout`, `script.removeEventListener`, `script.remove`, `resolve`, `finish`, `setTimeout`, `script.addEventListener`, `document.body.appendChild`, `toast.loading`, `dispatch`, `setPaymentLoading`, `razorpayKey.includes`, `Number.isInteger`, `loadScript`, `getCheckoutIdempotency`, `Number.isSafeInteger`, `Date.parse`, `Date.now`, `Number.isFinite`, `verifyPayment`, `clearCheckoutIdempotency`, `paymentObject.on`, `toast.error`, `paymentObject.open`, `toast.dismiss`, `config.termsVersion.trim`, `config.refundPolicyVersion.trim`, `reason.trim`.

### [apps/web/src/features/course-purchase/api/coursePurchaseApi.test.js](../../apps/web/src/features/course-purchase/api/coursePurchaseApi.test.js)

Regression/characterization tests for coursePurchaseApi.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/course-purchase/api/coursePurchaseApi`, `@/shared/api/httpClient`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `constructor (L29)`; `on (L33)`; `open (L35)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `apiConnector.mockResolvedValue`, `BuyCourse`, `fetchPurchaseHistory`, `requestPurchaseRefund`, `vi.mock`, `vi.fn`, `describe`, `beforeEach`, `vi.clearAllMocks`, `vi.stubEnv`, `window.sessionStorage.clear`, `afterEach`, `vi.unstubAllEnvs`, `it`, `Date.now`, `expect`, `expect.stringContaining`, `expect.stringMatching`, `fetchCheckoutConfig`, `expect.objectContaining`.
- **Test focus:** secure checkout creation; sends a reusable idempotency key when capturing an order; loads and validates the server checkout policy snapshot; uses the authenticated purchase history pagination contract (all cases indexed in TESTING).

### [apps/web/src/features/course-purchase/index.js](../../apps/web/src/features/course-purchase/index.js)

Public export surface for features/course-purchase; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./api/coursePurchaseApi`, `./lib/checkoutIdempotency`, `./ui/Cart`, `./ui/CheckoutPolicyAcknowledgement`.
- **Exports:** `Cart`; `CheckoutPolicyAcknowledgement`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/cart/index.jsx](../../apps/web/src/pages/cart/index.jsx); [apps/web/src/pages/course-details/index.jsx](../../apps/web/src/pages/course-details/index.jsx); [apps/web/src/pages/course-details/ui/CourseDetailsCard.jsx](../../apps/web/src/pages/course-details/ui/CourseDetailsCard.jsx); [apps/web/src/pages/legal/index.jsx](../../apps/web/src/pages/legal/index.jsx); [apps/web/src/pages/purchase-history/PurchaseHistory.test.jsx](../../apps/web/src/pages/purchase-history/PurchaseHistory.test.jsx); [apps/web/src/pages/purchase-history/index.jsx](../../apps/web/src/pages/purchase-history/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/features/course-purchase/lib/checkoutIdempotency.js](../../apps/web/src/features/course-purchase/lib/checkoutIdempotency.js)

features/course-purchase domain transformation/utility `checkoutIdempotency`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `getCheckoutIdempotency`; `clearCheckoutIdempotency`.
- **Named functions / components:** `randomKey (L3)`; `checkoutStorageKey (L19)`; `getCheckoutIdempotency (L24)`; `clearCheckoutIdempotency (L47)`.
- **Direct static consumers:** [apps/web/src/features/course-purchase/api/coursePurchaseApi.js](../../apps/web/src/features/course-purchase/api/coursePurchaseApi.js); [apps/web/src/features/course-purchase/index.js](../../apps/web/src/features/course-purchase/index.js); [apps/web/src/features/course-purchase/lib/checkoutIdempotency.test.js](../../apps/web/src/features/course-purchase/lib/checkoutIdempotency.test.js).
- **Selected calls / effects:** `globalThis.crypto.getRandomValues`, `normalizedCourses.join`, `window.sessionStorage.getItem`, `globalThis.crypto.randomUUID`, `byte.toString`, `Date.now`, `courses.map`, `checkoutStorageKey`, `randomKey`, `window.sessionStorage.setItem`, `window.sessionStorage.removeItem`.

### [apps/web/src/features/course-purchase/lib/checkoutIdempotency.test.js](../../apps/web/src/features/course-purchase/lib/checkoutIdempotency.test.js)

Regression/characterization tests for checkoutIdempotency.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/course-purchase/lib/checkoutIdempotency`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `window.sessionStorage.getItem`, `describe`, `beforeEach`, `window.sessionStorage.clear`, `it`, `getCheckoutIdempotency`, `expect`, `clearCheckoutIdempotency`.
- **Test focus:** checkout idempotency; reuses one key for retries of the same user and course set; clears the completed checkout key.

### [apps/web/src/features/course-purchase/ui/Cart.jsx](../../apps/web/src/features/course-purchase/ui/Cart.jsx)

features/course-purchase presentation/interaction component `Cart`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/course-purchase/ui/RenderCartCourses`, `@/features/course-purchase/ui/RenderTotalAmount`, `react-redux`.
- **Exports:** `default Cart`.
- **Named functions / components:** `Cart (L5)`.
- **Direct static consumers:** [apps/web/src/features/course-purchase/index.js](../../apps/web/src/features/course-purchase/index.js).
- **Selected calls / effects:** `useSelector`.

### [apps/web/src/features/course-purchase/ui/CheckoutPolicyAcknowledgement.jsx](../../apps/web/src/features/course-purchase/ui/CheckoutPolicyAcknowledgement.jsx)

features/course-purchase presentation/interaction component `CheckoutPolicyAcknowledgement`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react-router`.
- **Exports:** `default CheckoutPolicyAcknowledgement`.
- **Named functions / components:** `CheckoutPolicyAcknowledgement (L3)`.
- **Direct static consumers:** [apps/web/src/features/course-purchase/index.js](../../apps/web/src/features/course-purchase/index.js); [apps/web/src/features/course-purchase/ui/RenderTotalAmount.jsx](../../apps/web/src/features/course-purchase/ui/RenderTotalAmount.jsx).
- **Selected calls / effects:** `onChange`.

### [apps/web/src/features/course-purchase/ui/RenderCartCourses.jsx](../../apps/web/src/features/course-purchase/ui/RenderCartCourses.jsx)

features/course-purchase presentation/interaction component `RenderCartCourses`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/cart`, `@/entities/review`, `react-icons/ri`, `react-redux`.
- **Exports:** `default RenderCartCourses`.
- **Named functions / components:** `RenderCartCourses (L9)`.
- **Direct static consumers:** [apps/web/src/features/course-purchase/ui/Cart.jsx](../../apps/web/src/features/course-purchase/ui/Cart.jsx).
- **Selected calls / effects:** `useSelector`, `useDispatch`, `cart.map`, `GetAvgRating`, `averageRating.toFixed`, `dispatch`, `removeFromCart`.

### [apps/web/src/features/course-purchase/ui/RenderTotalAmount.jsx](../../apps/web/src/features/course-purchase/ui/RenderTotalAmount.jsx)

features/course-purchase presentation/interaction component `RenderTotalAmount`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/course-purchase/api/coursePurchaseApi`, `@/features/course-purchase/ui/CheckoutPolicyAcknowledgement`, `@/shared/ui/IconBtn`, `react`, `react-redux`, `react-router`.
- **Exports:** `default RenderTotalAmount`.
- **Named functions / components:** `RenderTotalAmount (L11)`; `handleBuyCourse (L44)`.
- **Direct static consumers:** [apps/web/src/features/course-purchase/ui/Cart.jsx](../../apps/web/src/features/course-purchase/ui/Cart.jsx).
- **Selected calls / effects:** `BuyCourse`, `useSelector`, `useNavigate`, `useDispatch`, `useState`, `useEffect`, `fetchCheckoutConfig`, `setPolicyConfig`, `setPolicyError`, `setPolicyLoading`, `cart.map`, `setCheckoutPolicyAccepted`, `setReloadKey`.

### [apps/web/src/features/course-review/index.js](../../apps/web/src/features/course-review/index.js)

Public export surface for features/course-review; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./ui/CourseReviewModal`, `./ui/RatingInput`.
- **Exports:** `CourseReviewModal`; `RatingInput`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/learning/index.jsx](../../apps/web/src/pages/learning/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/features/course-review/ui/CourseReviewModal.jsx](../../apps/web/src/features/course-review/ui/CourseReviewModal.jsx)

features/course-review presentation/interaction component `CourseReviewModal`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/course`, `@/features/course-review/ui/RatingInput`, `@/shared/ui/IconBtn`, `react-hook-form`, `react-icons/rx`, `react-redux`.
- **Exports:** `default CourseReviewModal`.
- **Named functions / components:** `CourseReviewModal (L8)`; `onSubmit (L24)`.
- **Direct static consumers:** [apps/web/src/features/course-review/index.js](../../apps/web/src/features/course-review/index.js).
- **Selected calls / effects:** `useSelector`, `useForm`, `useWatch`, `createRating`, `setReviewModal`, `handleSubmit`, `setValue`, `register`.

### [apps/web/src/features/course-review/ui/RatingInput.jsx](../../apps/web/src/features/course-review/ui/RatingInput.jsx)

features/course-review presentation/interaction component `RatingInput`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react-icons/ti`.
- **Exports:** `default RatingInput`.
- **Named functions / components:** `RatingInput (L5)`.
- **Direct static consumers:** [apps/web/src/features/course-review/index.js](../../apps/web/src/features/course-review/index.js); [apps/web/src/features/course-review/ui/CourseReviewModal.jsx](../../apps/web/src/features/course-review/ui/CourseReviewModal.jsx); [apps/web/src/features/course-review/ui/RatingInput.test.jsx](../../apps/web/src/features/course-review/ui/RatingInput.test.jsx).
- **Selected calls / effects:** `RATINGS.map`, `onChange`.

### [apps/web/src/features/course-review/ui/RatingInput.test.jsx](../../apps/web/src/features/course-review/ui/RatingInput.test.jsx)

Regression/characterization tests for RatingInput.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/course-review/ui/RatingInput`, `@testing-library/react`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByRole`, `describe`, `it`, `vi.fn`, `render`, `expect`, `fireEvent.click`.
- **Test focus:** RatingInput; exposes an accessible radio group and reports the selected rating; prevents changes while disabled.

### [apps/web/src/features/instructor-approval/api/instructorApprovalApi.js](../../apps/web/src/features/instructor-approval/api/instructorApprovalApi.js)

features/instructor-approval HTTP adapter `instructorApprovalApi`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/api/endpoints`, `@/shared/api/httpClient`.
- **Exports:** `fetchPendingInstructors`; `approveInstructor`; `rejectInstructor`.
- **Named functions / components:** `getErrorMessage (L4)`; `fetchPendingInstructors (L7)`; `approveInstructor (L30)`; `rejectInstructor (L46)`.
- **Direct static consumers:** [apps/web/src/features/instructor-approval/index.js](../../apps/web/src/features/instructor-approval/index.js); [apps/web/src/features/instructor-approval/ui/InstructorApprovals.jsx](../../apps/web/src/features/instructor-approval/ui/InstructorApprovals.jsx).
- **Selected calls / effects:** `apiConnector`, `getErrorMessage`, `adminEndpoints.APPROVE_INSTRUCTOR_API`, `adminEndpoints.REJECT_INSTRUCTOR_API`.

### [apps/web/src/features/instructor-approval/index.js](../../apps/web/src/features/instructor-approval/index.js)

Public export surface for features/instructor-approval; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./api/instructorApprovalApi`, `./ui/InstructorApprovals`.
- **Exports:** `InstructorApprovals`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/instructor-approvals/index.jsx](../../apps/web/src/pages/instructor-approvals/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/features/instructor-approval/ui/InstructorApprovals.jsx](../../apps/web/src/features/instructor-approval/ui/InstructorApprovals.jsx)

features/instructor-approval presentation/interaction component `InstructorApprovals`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/user`, `@/features/instructor-approval/api/instructorApprovalApi`, `react`, `react-hot-toast`.
- **Exports:** `default InstructorApprovals`.
- **Named functions / components:** `formatSubmittedAt (L12)`; `InstructorApprovals (L23)`; `completeReview (L57)`.
- **Direct static consumers:** [apps/web/src/features/instructor-approval/index.js](../../apps/web/src/features/instructor-approval/index.js).
- **Selected calls / effects:** `date.getTime`, `Number.isNaN`, `useState`, `useEffect`, `fetchPendingInstructors`, `setInstructors`, `setPagination`, `setLoadError`, `setLoading`, `toast.error`, `setActiveInstructorId`, `approveInstructor`, `rejectInstructor`, `toast.success`, `setPage`, `setReloadKey`, `instructors.map`, `getAvatarSource`, `setInitialsAvatarOnError`, `formatSubmittedAt`, `setRejectionReasons`, `completeReview`.

### [apps/web/src/features/lesson-playback/index.js](../../apps/web/src/features/lesson-playback/index.js)

Public export surface for features/lesson-playback; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./ui/VideoDetails`.
- **Exports:** `VideoDetails`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/lesson/index.jsx](../../apps/web/src/pages/lesson/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/features/lesson-playback/ui/VideoDetails.jsx](../../apps/web/src/features/lesson-playback/ui/VideoDetails.jsx)

features/lesson-playback presentation/interaction component `VideoDetails`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/course`, `@/entities/learning`, `react`, `react-router`.
- **Exports:** `default VideoDetails`.
- **Named functions / components:** `lessonPath (L9)`; `lessonDuration (L14)`; `VideoDetails (L20)`; `loadPlayback (L65)`; `refreshPlayback (L90)`; `restorePlaybackPosition (L107)`; `handleLessonCompletion (L114)`.
- **Direct static consumers:** [apps/web/src/features/lesson-playback/index.js](../../apps/web/src/features/lesson-playback/index.js); [apps/web/src/features/lesson-playback/ui/VideoDetails.test.jsx](../../apps/web/src/features/lesson-playback/ui/VideoDetails.test.jsx).
- **Selected calls / effects:** `learningCourse.curriculum.flatMap`, `lessonItems.findIndex`, `learningCourse.progress.completedLessonIds.includes`, `encodeURIComponent`, `useParams`, `useOutletContext`, `useRef`, `useState`, `useMarkLessonCompleteMutation`, `section.lessons.map`, `useEffect`, `setEndedVideoId`, `setPlaybackLoading`, `setPlaybackError`, `getLessonPlaybackUrl`, `setPlayback`, `loadPlayback`, `setPlaybackRefresh`, `playerRef.current.play`, `setCompletionNotice`, `markLessonComplete`, `getLearningErrorPresentation`, `lessonDuration`, `refreshPlayback`, `lessonPath`.

### [apps/web/src/features/lesson-playback/ui/VideoDetails.test.jsx](../../apps/web/src/features/lesson-playback/ui/VideoDetails.test.jsx)

Regression/characterization tests for VideoDetails.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/lesson-playback/ui/VideoDetails`, `@testing-library/react`, `@testing-library/user-event`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `buildLearningCourse (L49)`; `routeFor (L83)`; `LearningContext (L86)`; `renderVideoDetails (L90)`; `findVideo (L107)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `buildLearningCourse`, `screen.getByRole`, `playbackMocks.get.mockResolvedValue`, `screen.findByText`, `screen.getByText`, `screen.findByRole`, `vi.hoisted`, `vi.fn`, `vi.mock`, `importOriginal`, `routeFor`, `render`, `waitFor`, `expect`, `region.querySelector`, `describe`, `beforeEach`, `vi.clearAllMocks`, `learningMocks.unwrap.mockResolvedValue`, `learningMocks.mark.mockReturnValue`, `learningMocks.mutationHook.mockReturnValue`, `it`, `userEvent.setup`, `renderVideoDetails`, `findVideo`, `fireEvent.ended`, `user.click`, `screen.queryByRole`, `learningMocks.unwrap.mockRejectedValue`, `first.unmount`.
- **Test focus:** VideoDetails; loads protected playback separately and completes only after the video ends; does not repeat completion for a completed lesson and supports rewatch; keeps playback available and presents a safe completion failure with its request id (all cases indexed in TESTING).

### [apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.js](../../apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.js)

features/payment-reconciliation HTTP adapter `paymentReconciliationApi`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/api/endpoints`, `@/shared/api/httpClient`.
- **Exports:** `fetchPaymentReconciliation`; `resolvePaymentReconciliation`.
- **Named functions / components:** `getErrorMessage (L4)`; `fetchPaymentReconciliation (L7)`; `resolvePaymentReconciliation (L32)`.
- **Direct static consumers:** [apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.test.js](../../apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.test.js); [apps/web/src/features/payment-reconciliation/index.js](../../apps/web/src/features/payment-reconciliation/index.js); [apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.jsx](../../apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.jsx); [apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.test.jsx](../../apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.test.jsx).
- **Selected calls / effects:** `apiConnector`, `getErrorMessage`, `note.trim`, `adminEndpoints.RESOLVE_PAYMENT_RECONCILIATION_API`.

### [apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.test.js](../../apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.test.js)

Regression/characterization tests for paymentReconciliationApi.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/payment-reconciliation/api/paymentReconciliationApi`, `@/shared/api/httpClient`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `apiConnector.mockResolvedValue`, `vi.mock`, `vi.fn`, `describe`, `beforeEach`, `vi.clearAllMocks`, `it`, `expect`, `fetchPaymentReconciliation`, `expect.objectContaining`, `expect.any`, `expect.stringContaining`, `resolvePaymentReconciliation`.
- **Test focus:** payment reconciliation operations; loads the paginated admin queue; sends exact confirmations and audited refund overrides; uses the explicit learner refund rejection contract (all cases indexed in TESTING).

### [apps/web/src/features/payment-reconciliation/index.js](../../apps/web/src/features/payment-reconciliation/index.js)

Public export surface for features/payment-reconciliation; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./api/paymentReconciliationApi`, `./ui/PaymentReconciliation`.
- **Exports:** `PaymentReconciliation`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/payment-reconciliation/index.jsx](../../apps/web/src/pages/payment-reconciliation/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.jsx](../../apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.jsx)

features/payment-reconciliation presentation/interaction component `PaymentReconciliation`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/purchase`, `@/features/payment-reconciliation/api/paymentReconciliationApi`, `react`, `react-hot-toast`.
- **Exports:** `default PaymentReconciliation`.
- **Named functions / components:** `PaymentReconciliation (L17)`; `closeAction (L50)`; `openAction (L56)`; `submitAction (L62)`.
- **Direct static consumers:** [apps/web/src/features/payment-reconciliation/index.js](../../apps/web/src/features/payment-reconciliation/index.js); [apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.test.jsx](../../apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.test.jsx).
- **Selected calls / effects:** `setPurchases`, `useState`, `useEffect`, `fetchPaymentReconciliation`, `setPagination`, `setLoadError`, `setLoading`, `setReviewAction`, `setReviewNote`, `setOverrideRefundWindow`, `event.preventDefault`, `reviewNote.trim`, `toast.error`, `setSaving`, `resolvePaymentReconciliation`, `toast.success`, `closeAction`, `setPage`, `setReloadKey`, `purchases.map`, `getPaymentStatus`, `getRefundDeadline`, `requiresRefundWindowOverride`, `formatPaymentMoney`, `formatPaymentDate`, `openAction`, `submitAction`.

### [apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.test.jsx](../../apps/web/src/features/payment-reconciliation/ui/PaymentReconciliation.test.jsx)

Regression/characterization tests for PaymentReconciliation.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/payment-reconciliation/api/paymentReconciliationApi`, `@/features/payment-reconciliation/ui/PaymentReconciliation`, `@testing-library/react`, `@testing-library/user-event`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.findByText`, `screen.getByRole`, `screen.findByRole`, `vi.mock`, `vi.fn`, `describe`, `beforeEach`, `vi.clearAllMocks`, `fetchPaymentReconciliation.mockResolvedValue`, `resolvePaymentReconciliation.mockResolvedValue`, `it`, `userEvent.setup`, `render`, `expect`, `user.click`, `fireEvent.change`, `waitFor`.
- **Test focus:** PaymentReconciliation; offers an audited rejection without forcing every request to refund; uses the explicit retry path when Razorpay marked a refund failed.

### [apps/web/src/features/profile-settings/api/profileSettingsApi.js](../../apps/web/src/features/profile-settings/api/profileSettingsApi.js)

features/profile-settings HTTP adapter `profileSettingsApi`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/user`, `@/shared/api/endpoints`, `@/shared/api/httpClient`, `react-hot-toast`.
- **Exports:** `updateDisplayPicture`; `updateProfile`.
- **Named functions / components:** `getErrorMessage (L8)`; `withFallbackImage (L11)`; `updateDisplayPicture (L19)`; `updateProfile (L47)`.
- **Direct static consumers:** [apps/web/src/features/profile-settings/index.js](../../apps/web/src/features/profile-settings/index.js); [apps/web/src/features/profile-settings/ui/ChangeProfilePicture.jsx](../../apps/web/src/features/profile-settings/ui/ChangeProfilePicture.jsx); [apps/web/src/features/profile-settings/ui/EditProfile.jsx](../../apps/web/src/features/profile-settings/ui/EditProfile.jsx).
- **Selected calls / effects:** `apiConnector`, `getAvatarSource`, `toast.loading`, `toast.success`, `dispatch`, `setUser`, `withFallbackImage`, `toast.error`, `getErrorMessage`, `toast.dismiss`.

### [apps/web/src/features/profile-settings/index.js](../../apps/web/src/features/profile-settings/index.js)

Public export surface for features/profile-settings; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./api/profileSettingsApi`, `./ui/ChangeProfilePicture`, `./ui/EditProfile`.
- **Exports:** `ChangeProfilePicture`; `EditProfile`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/settings/index.jsx](../../apps/web/src/pages/settings/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/features/profile-settings/ui/ChangeProfilePicture.jsx](../../apps/web/src/features/profile-settings/ui/ChangeProfilePicture.jsx)

features/profile-settings presentation/interaction component `ChangeProfilePicture`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/user`, `@/features/profile-settings/api/profileSettingsApi`, `@/shared/ui/IconBtn`, `react`, `react-hot-toast`, `react-icons/fi`, `react-redux`.
- **Exports:** `default ChangeProfilePicture`.
- **Named functions / components:** `ChangeProfilePicture (L17)`; `handleClick (L28)`; `handleFileChange (L32)`; `previewFile (L49)`; `reader.onloadend (L52)`; `handleFileUpload (L57)`.
- **Direct static consumers:** [apps/web/src/features/profile-settings/index.js](../../apps/web/src/features/profile-settings/index.js).
- **Selected calls / effects:** `useSelector`, `useDispatch`, `useState`, `useRef`, `fileInputRef.current.click`, `ALLOWED_PROFILE_IMAGE_TYPES.has`, `toast.error`, `setImageFile`, `reader.readAsDataURL`, `setPreviewSource`, `setLoading`, `formData.append`, `dispatch`, `updateDisplayPicture`, `useEffect`, `previewFile`, `getAvatarSource`, `setInitialsAvatarOnError`.

### [apps/web/src/features/profile-settings/ui/EditProfile.jsx](../../apps/web/src/features/profile-settings/ui/EditProfile.jsx)

features/profile-settings presentation/interaction component `EditProfile`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/profile-settings/api/profileSettingsApi`, `@/shared/ui/IconBtn`, `react-hook-form`, `react-redux`, `react-router`.
- **Exports:** `default EditProfile`.
- **Named functions / components:** `EditProfile (L9)`; `submitProfileForm (L21)`.
- **Direct static consumers:** [apps/web/src/features/profile-settings/index.js](../../apps/web/src/features/profile-settings/index.js).
- **Selected calls / effects:** `useSelector`, `useNavigate`, `useDispatch`, `useForm`, `dispatch`, `updateProfile`, `handleSubmit`, `register`, `genders.map`, `navigate`.

### [apps/web/src/pages/README.md](../../apps/web/src/pages/README.md)

Directory/workspace responsibility guide: Pages. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [apps/web/src/pages/about/index.jsx](../../apps/web/src/pages/about/index.jsx)

about route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/pages/about/ui/ContactFormSection`, `@/pages/about/ui/LearningGrid`, `@/pages/about/ui/Quote`, `@/pages/about/ui/Stats`, `@/shared/assets/Images/aboutus1.webp`, `@/shared/assets/Images/aboutus2.webp`, `@/shared/assets/Images/aboutus3.webp`, `@/shared/assets/Images/FoundingStory.png`, `@/shared/ui/HighlightText`, `@/widgets/footer`, `@/widgets/review-slider`.
- **Exports:** `default About`.
- **Named functions / components:** `About (L13)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/about/ui/ContactFormSection.jsx](../../apps/web/src/pages/about/ui/ContactFormSection.jsx)

pages/about presentation/interaction component `ContactFormSection`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/contact-support`.
- **Exports:** `default ContactFormSection`.
- **Named functions / components:** `ContactFormSection (L3)`.
- **Direct static consumers:** [apps/web/src/pages/about/index.jsx](../../apps/web/src/pages/about/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/about/ui/LearningGrid.jsx](../../apps/web/src/pages/about/ui/LearningGrid.jsx)

pages/about presentation/interaction component `LearningGrid`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/ui/HighlightText`, `@/shared/ui/LinkButton`.
- **Exports:** `default LearningGrid`.
- **Named functions / components:** `LearningGrid (L46)`.
- **Direct static consumers:** [apps/web/src/pages/about/index.jsx](../../apps/web/src/pages/about/index.jsx).
- **Selected calls / effects:** `LearningGridArray.map`.

### [apps/web/src/pages/about/ui/Quote.jsx](../../apps/web/src/pages/about/ui/Quote.jsx)

pages/about presentation/interaction component `Quote`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/ui/HighlightText`.
- **Exports:** `default Quote`.
- **Named functions / components:** `Quote (L3)`.
- **Direct static consumers:** [apps/web/src/pages/about/index.jsx](../../apps/web/src/pages/about/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/about/ui/Stats.jsx](../../apps/web/src/pages/about/ui/Stats.jsx)

pages/about presentation/interaction component `Stats`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `default StatsComponenet`.
- **Named functions / components:** `StatsComponenet (L8)`.
- **Direct static consumers:** [apps/web/src/pages/about/index.jsx](../../apps/web/src/pages/about/index.jsx).
- **Selected calls / effects:** `Stats.map`.

### [apps/web/src/pages/cart/index.jsx](../../apps/web/src/pages/cart/index.jsx)

cart route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/course-purchase`.
- **Exports:** `default`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/catalog/Catalog.test.jsx](../../apps/web/src/pages/catalog/Catalog.test.jsx)

Regression/characterization tests for Catalog.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/pages/catalog`, `@testing-library/react`, `@testing-library/user-event`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `coursesResult (L67)`; `LocationProbe (L88)`; `renderCatalog (L93)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByRole`, `screen.getByText`, `screen.getByLabelText`, `vi.hoisted`, `vi.fn`, `vi.mock`, `importOriginal`, `useLocation`, `render`, `describe`, `beforeEach`, `vi.clearAllMocks`, `apiMocks.categories.mockReturnValue`, `apiMocks.courses.mockReturnValue`, `coursesResult`, `it`, `renderCatalog`, `expect`, `screen.queryByRole`, `userEvent.setup`, `user.type`, `user.click`, `user.selectOptions`, `waitFor`, `expect.objectContaining`, `first.unmount`.
- **Test focus:** Catalog; shows a named, layout-matched initial loading state; keeps the loading state while a changed query has no current data; renders a semantic populated grid and end state (all cases indexed in TESTING).

### [apps/web/src/pages/catalog/index.jsx](../../apps/web/src/pages/catalog/index.jsx)

catalog route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/entities/catalog`, `@/entities/course`, `@/features/course-filter`, `@/shared/ui/Button`, `@/shared/ui/FormField`, `@/shared/ui/StatusPanel`, `@/widgets/footer`, `react`, `react-router`.
- **Exports:** `default Catalog`.
- **Named functions / components:** `CatalogHero (L34)`; `CatalogSkeleton (L70)`; `Catalog (L104)`; `setDraftFilters (L125)`; `setFilterError (L136)`; `applyFilters (L179)`; `clearFilters (L204)`; `updateSort (L209)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx); [apps/web/src/pages/catalog/Catalog.test.jsx](../../apps/web/src/pages/catalog/Catalog.test.jsx).
- **Selected calls / effects:** `useGetCoursesInfiniteQuery`, `useParams`, `useSearchParams`, `searchParams.toString`, `useMemo`, `readCatalogFilters`, `useState`, `setDraftState`, `updater`, `setFilterErrorState`, `useGetCatalogCategoriesQuery`, `categoryPathSlug`, `catalogName.toLowerCase`, `seen.has`, `seen.add`, `countActiveCatalogFilters`, `durationPresetFromFilters`, `event.preventDefault`, `setFilterError`, `searchParams.has`, `setSearchParams`, `catalogFiltersToSearchParams`, `getCatalogErrorPresentation`, `window.history.back`, `setDraftFilters`, `setMobileFiltersOpen`, `durationFiltersFromPreset`, `updateSort`, `SORT_OPTIONS.map`, `courses.map`, `fetchNextPage`.

### [apps/web/src/pages/contact/index.jsx](../../apps/web/src/pages/contact/index.jsx)

contact route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/pages/contact/ui/ContactDetails`, `@/pages/contact/ui/ContactForm`, `@/widgets/footer`, `@/widgets/review-slider`.
- **Exports:** `default Contact`.
- **Named functions / components:** `Contact (L6)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/contact/ui/ContactDetails.jsx](../../apps/web/src/pages/contact/ui/ContactDetails.jsx)

pages/contact presentation/interaction component `ContactDetails`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react-icons/bi`, `react-icons/hi2`.
- **Exports:** `default ContactDetails`.
- **Named functions / components:** `ContactDetails (L29)`.
- **Direct static consumers:** [apps/web/src/pages/contact/index.jsx](../../apps/web/src/pages/contact/index.jsx).
- **Selected calls / effects:** `contactDetails.map`.

### [apps/web/src/pages/contact/ui/ContactForm.jsx](../../apps/web/src/pages/contact/ui/ContactForm.jsx)

pages/contact presentation/interaction component `ContactForm`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/contact-support`.
- **Exports:** `default ContactForm`.
- **Named functions / components:** `ContactForm (L3)`.
- **Direct static consumers:** [apps/web/src/pages/contact/index.jsx](../../apps/web/src/pages/contact/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/course-create/index.jsx](../../apps/web/src/pages/course-create/index.jsx)

course-create route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/course-authoring`.
- **Exports:** `default`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/course-details/index.jsx](../../apps/web/src/pages/course-details/index.jsx)

course-details route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/entities/cart`, `@/entities/course`, `@/entities/review`, `@/entities/user`, `@/features/course-purchase`, `@/pages/course-details/ui/CourseDetailsCard`, `@/pages/not-found`, `@/shared/lib/formatDate`, `@/shared/ui/ConfirmationModal`, `@/shared/ui/SafeMarkdown`, `@/widgets/footer`, `react`, `react-hot-toast`, `react-icons/bi`, `react-icons/hi`, `react-redux`, `react-router`.
- **Exports:** `default CourseDetails`.
- **Named functions / components:** `CourseDetails (L30)`; `reloadPolicyConfig (L85)`; `handleActive (L105)`; `handleBuyCourse (L138)`; `handleAddToCart (L164)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** `fetchCourseDetails`, `BuyCourse`, `useSelector`, `useDispatch`, `useNavigate`, `useParams`, `useState`, `useEffect`, `setResponse`, `fetchCheckoutConfig`, `setPolicyConfig`, `setPolicyError`, `setPolicyLoading`, `setCheckoutPolicyAccepted`, `setPolicyReloadKey`, `GetAvgRating`, `setIsActive`, `isActive.includes`, `isActive.concat`, `isActive.filter`, `toast.error`, `setConfirmationModal`, `navigate`, `dispatch`, `addToCart`, `formatDate`, `getAvatarSource`, `setInitialsAvatarOnError`.

### [apps/web/src/pages/course-details/ui/CourseDetailsCard.jsx](../../apps/web/src/pages/course-details/ui/CourseDetailsCard.jsx)

pages/course-details presentation/interaction component `CourseDetailsCard`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/course-purchase`, `copy-to-clipboard`, `react-hot-toast`, `react-icons/bs`, `react-icons/fa`, `react-redux`, `react-router`.
- **Exports:** `default CourseDetailsCard`.
- **Named functions / components:** `CourseDetailsCard (L9)`; `handleShare (L26)`.
- **Direct static consumers:** [apps/web/src/pages/course-details/index.jsx](../../apps/web/src/pages/course-details/index.jsx).
- **Selected calls / effects:** `useSelector`, `useNavigate`, `copy`, `toast.success`, `navigate`.

### [apps/web/src/pages/course-edit/index.jsx](../../apps/web/src/pages/course-edit/index.jsx)

course-edit route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/course-authoring`.
- **Exports:** `default`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/dashboard/index.jsx](../../apps/web/src/pages/dashboard/index.jsx)

dashboard route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/widgets/dashboard-sidebar`, `react`, `react-icons/ai`, `react-redux`, `react-router`.
- **Exports:** `default Dashboard`.
- **Named functions / components:** `Dashboard (L7)`; `handleEscape (L28)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** `useSelector`, `useLocation`, `useState`, `useRef`, `useCallback`, `setSidebarLocationKey`, `useEffect`, `window.setTimeout`, `window.clearTimeout`, `closeSidebar`, `document.addEventListener`, `document.removeEventListener`.

### [apps/web/src/pages/enrolled-courses/index.jsx](../../apps/web/src/pages/enrolled-courses/index.jsx)

enrolled-courses route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/entities/learning`, `@/entities/user`, `@ramonak/react-progress-bar`, `react`, `react-redux`, `react-router`.
- **Exports:** `default EnrolledCourses`.
- **Named functions / components:** `EnrolledCourses (L8)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** `getUserEnrolledCourses`, `setEnrolledCourses`, `enrolledCourses.map`, `useSelector`, `useNavigate`, `useState`, `useEffect`, `getFirstLessonPath`, `navigate`, `description.slice`.

### [apps/web/src/pages/forgot-password/index.jsx](../../apps/web/src/pages/forgot-password/index.jsx)

forgot-password route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/authentication`, `react`, `react-icons/bi`, `react-redux`, `react-router`.
- **Exports:** `default ForgotPassword`.
- **Named functions / components:** `ForgotPassword (L7)`; `handleOnSubmit (L13)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** `useState`, `useDispatch`, `useSelector`, `e.preventDefault`, `dispatch`, `getPasswordResetToken`, `setEmail`.

### [apps/web/src/pages/home/index.jsx](../../apps/web/src/pages/home/index.jsx)

home route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/pages/home/ui/CodeBlocks`, `@/pages/home/ui/ExploreMore`, `@/pages/home/ui/InstructorSection`, `@/pages/home/ui/LearningLanguageSection`, `@/pages/home/ui/Timeline`, `@/shared/assets/Images/banner.mp4`, `@/shared/ui/HighlightText`, `@/shared/ui/LinkButton`, `@/widgets/footer`, `@/widgets/review-slider`, `react-icons/fa`, `react-router`.
- **Exports:** `default Home`.
- **Named functions / components:** `Home (L17)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/home/model/exploreCourses.js](../../apps/web/src/pages/home/model/exploreCourses.js)

pages/home state/constants `exploreCourses`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `HomePageExplore`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/home/ui/ExploreMore.jsx](../../apps/web/src/pages/home/ui/ExploreMore.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/home/ui/CodeBlocks.jsx](../../apps/web/src/pages/home/ui/CodeBlocks.jsx)

pages/home presentation/interaction component `CodeBlocks`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/ui/LinkButton`, `react-icons/fa`, `react-type-animation`.
- **Exports:** `default CodeBlocks`.
- **Named functions / components:** `CodeBlocks (L5)`.
- **Direct static consumers:** [apps/web/src/pages/home/index.jsx](../../apps/web/src/pages/home/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/home/ui/CourseCard.jsx](../../apps/web/src/pages/home/ui/CourseCard.jsx)

pages/home presentation/interaction component `CourseCard`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react-icons/hi`, `react-icons/im`.
- **Exports:** `default CourseCard`.
- **Named functions / components:** `CourseCard (L5)`.
- **Direct static consumers:** [apps/web/src/pages/home/ui/ExploreMore.jsx](../../apps/web/src/pages/home/ui/ExploreMore.jsx).
- **Selected calls / effects:** `setCurrentCard`.

### [apps/web/src/pages/home/ui/ExploreMore.jsx](../../apps/web/src/pages/home/ui/ExploreMore.jsx)

pages/home presentation/interaction component `ExploreMore`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/pages/home/model/exploreCourses`, `@/pages/home/ui/CourseCard`, `@/shared/ui/HighlightText`, `react`.
- **Exports:** `default ExploreMore`.
- **Named functions / components:** `ExploreMore (L14)`; `setMyCards (L21)`.
- **Direct static consumers:** [apps/web/src/pages/home/index.jsx](../../apps/web/src/pages/home/index.jsx).
- **Selected calls / effects:** `setCourses`, `useState`, `setCurrentTab`, `HomePageExplore.filter`, `setCurrentCard`, `tabsName.map`, `setMyCards`, `courses.map`.

### [apps/web/src/pages/home/ui/InstructorSection.jsx](../../apps/web/src/pages/home/ui/InstructorSection.jsx)

pages/home presentation/interaction component `InstructorSection`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/assets/Images/Instructor.png`, `@/shared/ui/HighlightText`, `@/shared/ui/LinkButton`, `react-icons/fa`.
- **Exports:** `default InstructorSection`.
- **Named functions / components:** `InstructorSection (L6)`.
- **Direct static consumers:** [apps/web/src/pages/home/index.jsx](../../apps/web/src/pages/home/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/home/ui/LearningLanguageSection.jsx](../../apps/web/src/pages/home/ui/LearningLanguageSection.jsx)

pages/home presentation/interaction component `LearningLanguageSection`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/assets/Images/Compare_with_others.svg`, `@/shared/assets/Images/Know_your_progress.png`, `@/shared/assets/Images/Plan_your_lessons.svg`, `@/shared/ui/HighlightText`, `@/shared/ui/LinkButton`.
- **Exports:** `default LearningLanguageSection`.
- **Named functions / components:** `LearningLanguageSection (L7)`.
- **Direct static consumers:** [apps/web/src/pages/home/index.jsx](../../apps/web/src/pages/home/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/home/ui/Timeline.jsx](../../apps/web/src/pages/home/ui/Timeline.jsx)

pages/home presentation/interaction component `Timeline`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/assets/Images/TimelineImage.png`, `@/shared/assets/TimeLineLogo/Logo1.svg`, `@/shared/assets/TimeLineLogo/Logo2.svg`, `@/shared/assets/TimeLineLogo/Logo3.svg`, `@/shared/assets/TimeLineLogo/Logo4.svg`.
- **Exports:** `default TimelineSection`.
- **Named functions / components:** `TimelineSection (L30)`.
- **Direct static consumers:** [apps/web/src/pages/home/index.jsx](../../apps/web/src/pages/home/index.jsx).
- **Selected calls / effects:** `TimeLine.map`.

### [apps/web/src/pages/instructor-approvals/index.jsx](../../apps/web/src/pages/instructor-approvals/index.jsx)

instructor-approvals route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/instructor-approval`.
- **Exports:** `default`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/instructor-courses/index.jsx](../../apps/web/src/pages/instructor-courses/index.jsx)

instructor-courses route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/entities/course`, `@/pages/instructor-courses/ui/CoursesTable`, `@/shared/ui/IconBtn`, `react`, `react-icons/vsc`, `react-redux`, `react-router`.
- **Exports:** `default MyCourses`.
- **Named functions / components:** `MyCourses (L9)`; `fetchCourses (L15)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** `fetchInstructorCourses`, `setCourses`, `fetchCourses`, `useSelector`, `useNavigate`, `useState`, `useEffect`, `navigate`.

### [apps/web/src/pages/instructor-courses/ui/CoursesTable.jsx](../../apps/web/src/pages/instructor-courses/ui/CoursesTable.jsx)

pages/instructor-courses presentation/interaction component `CoursesTable`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react`, `react-icons/fa`, `react-icons/fi`, `react-icons/hi`, `react-icons/ri`, `react-redux`, `react-router`, `react-super-responsive-table`, `react-super-responsive-table/dist/SuperResponsiveTableStyle.css`, `@/entities/course`, `@/shared/lib/formatDate`.
- **Exports:** `default CoursesTable`.
- **Named functions / components:** `CourseDeletionDialog (L21)`; `handleEscape (L31)`; `CoursesTable (L109)`; `closeDeletionDialog (L116)`; `handleCourseDelete (L121)`.
- **Direct static consumers:** [apps/web/src/pages/instructor-courses/index.jsx](../../apps/web/src/pages/instructor-courses/index.jsx).
- **Selected calls / effects:** `setCourseToDelete`, `deleteCourse`, `fetchInstructorCourses`, `setCourses`, `useEffect`, `onCancel`, `document.addEventListener`, `document.removeEventListener`, `onChange`, `useNavigate`, `useSelector`, `useState`, `setConfirmationName`, `setLoading`, `closeDeletionDialog`, `description.split`, `formatDate`, `navigate`.

### [apps/web/src/pages/instructor-dashboard/index.jsx](../../apps/web/src/pages/instructor-dashboard/index.jsx)

instructor-dashboard route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/entities/course`, `@/entities/user`, `@/pages/instructor-dashboard/ui/InstructorChart`, `react`, `react-redux`, `react-router`.
- **Exports:** `default Instructor`.
- **Named functions / components:** `Instructor (L8)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** `fetchInstructorCourses`, `setCourses`, `useSelector`, `useState`, `useEffect`, `setLoading`, `getInstructorData`, `setInstructorData`, `courses.slice`.

### [apps/web/src/pages/instructor-dashboard/ui/InstructorChart.jsx](../../apps/web/src/pages/instructor-dashboard/ui/InstructorChart.jsx)

pages/instructor-dashboard presentation/interaction component `InstructorChart`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `chart.js`, `react`, `react-chartjs-2`.
- **Exports:** `default InstructorChart`.
- **Named functions / components:** `getChartColors (L18)`; `InstructorChart (L24)`.
- **Direct static consumers:** [apps/web/src/pages/instructor-dashboard/index.jsx](../../apps/web/src/pages/instructor-dashboard/index.jsx).
- **Selected calls / effects:** `Chart.register`, `useState`, `getChartColors`, `courses.map`, `setCurrChart`.

### [apps/web/src/pages/learning/LearningPage.test.jsx](../../apps/web/src/pages/learning/LearningPage.test.jsx)

Regression/characterization tests for LearningPage.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/pages/learning`, `@testing-library/react`, `@testing-library/user-event`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `learningCourse (L38)`; `readyQuery (L71)`; `LocationProbe (L81)`; `renderViewCourse (L86)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `learningCourse`, `renderViewCourse`, `screen.getByRole`, `screen.getByText`, `screen.getByLabelText`, `vi.hoisted`, `vi.fn`, `vi.mock`, `importOriginal`, `setReviewModal`, `useLocation`, `render`, `describe`, `beforeEach`, `vi.clearAllMocks`, `learningMocks.query.mockReturnValue`, `readyQuery`, `it`, `expect`, `userEvent.setup`, `user.click`, `user.keyboard`, `screen.queryByRole`, `screen.queryByText`.
- **Test focus:** ViewCourse; shows a named initial loading state and skips no valid course id; renders the server learning state, nested lesson, mobile toggle, and review course id; renders a non-retryable 403 access state without leaking a lesson (all cases indexed in TESTING).

### [apps/web/src/pages/learning/index.jsx](../../apps/web/src/pages/learning/index.jsx)

learning route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/entities/learning`, `@/features/course-review`, `@/widgets/curriculum-panel`, `react`, `react-icons/ai`, `react-router`.
- **Exports:** `default ViewCourse`.
- **Named functions / components:** `ViewCourse (L11)`; `handleEscape (L39)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx); [apps/web/src/pages/learning/LearningPage.test.jsx](../../apps/web/src/pages/learning/LearningPage.test.jsx).
- **Selected calls / effects:** `useGetLearningCourseQuery`, `useParams`, `useNavigate`, `useLocation`, `useState`, `useRef`, `useCallback`, `setSidebarLocationKey`, `useEffect`, `window.setTimeout`, `window.clearTimeout`, `closeSidebar`, `document.addEventListener`, `document.removeEventListener`, `getLearningErrorPresentation`, `navigate`.

### [apps/web/src/pages/legal/Legal.test.jsx](../../apps/web/src/pages/legal/Legal.test.jsx)

Regression/characterization tests for Legal.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/pages/legal`, `@testing-library/react`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByRole`, `link.getAttribute`, `screen.findByText`, `vi.mock`, `vi.fn`, `describe`, `it.each`, `render`, `expect`.
- **Test focus:** legal pages; renders the %s document and support contact.

### [apps/web/src/pages/legal/index.jsx](../../apps/web/src/pages/legal/index.jsx)

legal route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/course-purchase`, `@/widgets/footer`, `react`.
- **Exports:** `default Legal`.
- **Named functions / components:** `Legal (L161)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx); [apps/web/src/pages/legal/Legal.test.jsx](../../apps/web/src/pages/legal/Legal.test.jsx).
- **Selected calls / effects:** `useState`, `useEffect`, `fetchCheckoutConfig`, `setRefundWindowDays`, `content.sections.map`, `section.paragraphs.map`, `paragraph`.

### [apps/web/src/pages/lesson/index.jsx](../../apps/web/src/pages/lesson/index.jsx)

lesson route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/lesson-playback`.
- **Exports:** `default`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/login/index.jsx](../../apps/web/src/pages/login/index.jsx)

login route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/authentication`, `@/shared/assets/Images/login.webp`.
- **Exports:** `default Login`.
- **Named functions / components:** `Login (L4)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/not-found/index.jsx](../../apps/web/src/pages/not-found/index.jsx)

not-found route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `react-router`.
- **Exports:** `default Error`.
- **Named functions / components:** `Error (L3)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx); [apps/web/src/pages/course-details/index.jsx](../../apps/web/src/pages/course-details/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/payment-reconciliation/index.jsx](../../apps/web/src/pages/payment-reconciliation/index.jsx)

payment-reconciliation route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/payment-reconciliation`.
- **Exports:** `default`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/policy-acceptance/PolicyAcceptance.test.jsx](../../apps/web/src/pages/policy-acceptance/PolicyAcceptance.test.jsx)

Regression/characterization tests for PolicyAcceptance.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/authentication`, `@/pages/policy-acceptance`, `@reduxjs/toolkit`, `@testing-library/react`, `react-redux`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `vi.mock`, `importOriginal`, `vi.fn`, `describe`, `beforeEach`, `vi.clearAllMocks`, `it`, `configureStore`, `render`, `fireEvent.submit`, `expect`, `expect.any`.
- **Test focus:** PolicyAcceptance redirect intent; passes the saved internal destination through policy acceptance.

### [apps/web/src/pages/policy-acceptance/index.jsx](../../apps/web/src/pages/policy-acceptance/index.jsx)

policy-acceptance route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/authentication`, `@/shared/lib/routing/internalRedirect`, `react`, `react-redux`, `react-router`.
- **Exports:** `default PolicyAcceptance`.
- **Named functions / components:** `PolicyAcceptance (L11)`; `handleSubmit (L20)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx); [apps/web/src/pages/policy-acceptance/PolicyAcceptance.test.jsx](../../apps/web/src/pages/policy-acceptance/PolicyAcceptance.test.jsx).
- **Selected calls / effects:** `useDispatch`, `useLocation`, `useNavigate`, `useSelector`, `useState`, `event.preventDefault`, `sanitizeInternalRedirect`, `dispatch`, `acceptCurrentPolicies`.

### [apps/web/src/pages/profile/index.jsx](../../apps/web/src/pages/profile/index.jsx)

profile route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/shared/lib/dateFormatter`, `@/shared/ui/IconBtn`, `react-icons/ri`, `react-redux`, `react-router`.
- **Exports:** `default MyProfile`.
- **Named functions / components:** `MyProfile (L7)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** `useSelector`, `useNavigate`, `navigate`, `formattedDate`.

### [apps/web/src/pages/purchase-history/PurchaseHistory.test.jsx](../../apps/web/src/pages/purchase-history/PurchaseHistory.test.jsx)

Regression/characterization tests for PurchaseHistory.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/features/course-purchase`, `@/pages/purchase-history`, `@testing-library/react`, `@testing-library/user-event`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `fetchPurchaseHistory.mockResolvedValue`, `requestPurchaseRefund.mockResolvedValue`, `screen.findByText`, `screen.getByRole`, `screen.getByText`, `vi.mock`, `vi.fn`, `describe`, `beforeEach`, `vi.clearAllMocks`, `it`, `userEvent.setup`, `render`, `expect`, `user.click`, `fireEvent.change`, `waitFor`, `screen.queryByText`.
- **Test focus:** PurchaseHistory; submits an eligible refund request with the learner reason; shows a reviewed rejection without claiming the refund window simply closed.

### [apps/web/src/pages/purchase-history/index.jsx](../../apps/web/src/pages/purchase-history/index.jsx)

purchase-history route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/entities/purchase`, `@/features/course-purchase`, `react`, `react-hot-toast`, `react-router`.
- **Exports:** `default PurchaseHistory`.
- **Named functions / components:** `PurchaseHistory (L16)`; `closeRefundForm (L48)`; `submitRefundRequest (L53)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx); [apps/web/src/pages/purchase-history/PurchaseHistory.test.jsx](../../apps/web/src/pages/purchase-history/PurchaseHistory.test.jsx).
- **Selected calls / effects:** `fetchPurchaseHistory`, `setPurchases`, `setRefundPurchaseId`, `requestPurchaseRefund`, `useState`, `useEffect`, `setPagination`, `setLoadError`, `setLoading`, `setRefundReason`, `event.preventDefault`, `refundReason.trim`, `toast.error`, `setSubmittingRefund`, `toast.success`, `closeRefundForm`, `setReloadKey`, `purchases.map`, `getPaymentStatus`, `formatPaymentMoney`, `formatPaymentDate`, `submitRefundRequest`, `setPage`.

### [apps/web/src/pages/settings/index.jsx](../../apps/web/src/pages/settings/index.jsx)

settings route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/authentication`, `@/features/profile-settings`, `react-redux`.
- **Exports:** `default Settings`.
- **Named functions / components:** `Settings (L5)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** `useSelector`, `providers.includes`.

### [apps/web/src/pages/signup/index.jsx](../../apps/web/src/pages/signup/index.jsx)

signup route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/authentication`, `@/shared/assets/Images/signup.webp`.
- **Exports:** `default Signup`.
- **Named functions / components:** `Signup (L4)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/pages/update-password/index.jsx](../../apps/web/src/pages/update-password/index.jsx)

update-password route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/authentication`, `react`, `react-icons/ai`, `react-icons/bi`, `react-redux`, `react-router`.
- **Exports:** `default UpdatePassword`.
- **Named functions / components:** `UpdatePassword (L8)`; `handleOnChange (L42)`; `handleOnSubmit (L49)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** `useNavigate`, `useDispatch`, `useLocation`, `useSelector`, `useState`, `window.location.hash.startsWith`, `window.location.hash.slice`, `useEffect`, `window.history.replaceState`, `setFormData`, `e.preventDefault`, `dispatch`, `resetPassword`, `setShowPassword`, `setShowConfirmPassword`.

### [apps/web/src/pages/verify-email/index.jsx](../../apps/web/src/pages/verify-email/index.jsx)

verify-email route component: composes the imports below into its screen, local UI state and feature interactions; see FRONTEND/FEATURE_FLOWS.

- **Imports / dependencies:** `@/features/authentication`, `react`, `react-icons/bi`, `react-icons/rx`, `react-redux`, `react-router`.
- **Exports:** `default VerifyEmail`.
- **Named functions / components:** `VerifyEmail (L14)`; `handleVerifyAndSignup (L34)`; `handleResend (L41)`.
- **Direct static consumers:** [apps/web/src/app/router/AppRouter.jsx](../../apps/web/src/app/router/AppRouter.jsx).
- **Selected calls / effects:** `useState`, `useSelector`, `useDispatch`, `useNavigate`, `useEffect`, `navigate`, `window.setInterval`, `setResendIn`, `window.clearInterval`, `event.preventDefault`, `dispatch`, `signUp`, `sendOtp`, `setOtp`, `value.replace`.

### [apps/web/src/shared/README.md](../../apps/web/src/shared/README.md)

Directory/workspace responsibility guide: Shared frontend primitives. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [apps/web/src/shared/api/apiErrorModel.js](../../apps/web/src/shared/api/apiErrorModel.js)

Normalizes server/transport failures into consistent user-facing API errors.

- **Imports / dependencies:** No static module import..
- **Exports:** `readApiErrorResponse`; `getSafeApiErrorPresentation`; `getSafeApiErrorEnvelopePresentation`.
- **Named functions / components:** `nonEmptyString (L1)`; `readApiErrorResponse (L4)`; `getSafeApiErrorPresentation (L19)`; `getSafeApiErrorEnvelopePresentation (L28)`.
- **Direct static consumers:** [apps/web/src/entities/catalog/api/catalogApi.js](../../apps/web/src/entities/catalog/api/catalogApi.js); [apps/web/src/entities/learning/api/learningApi.js](../../apps/web/src/entities/learning/api/learningApi.js); [apps/web/src/shared/api/apiErrorModel.test.js](../../apps/web/src/shared/api/apiErrorModel.test.js).
- **Selected calls / effects:** `value.trim`, `nonEmptyString`, `readApiErrorResponse`.

### [apps/web/src/shared/api/apiErrorModel.test.js](../../apps/web/src/shared/api/apiErrorModel.test.js)

Regression/characterization tests for apiErrorModel.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/shared/api/apiErrorModel`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `describe`, `it`, `expect`, `readApiErrorResponse`, `getSafeApiErrorPresentation`.
- **Test focus:** shared API error model; normalizes both Axios responses and RTK Query error envelopes; does not expose an untrusted JavaScript error message.

### [apps/web/src/shared/api/endpoints.js](../../apps/web/src/shared/api/endpoints.js)

Single v1 endpoint registry and safe derivation of v2 paths.

- **Imports / dependencies:** No static module import..
- **Exports:** `API_V1_BASE_URL`; `deriveApiVersionBaseUrl`; `API_V2_BASE_URL`; `endpoints`; `adminEndpoints`; `profileEndpoints`; `studentEndpoints`; `courseEndpoints`; `ratingsEndpoints`; `categories`; `catalogData`; `catalogEndpoints`; `learningEndpoints`; `contactusEndpoint`; `settingsEndpoints`.
- **Named functions / components:** `deriveApiVersionBaseUrl (L14)`.
- **Direct static consumers:** [apps/web/src/entities/catalog/api/catalogApi.js](../../apps/web/src/entities/catalog/api/catalogApi.js); [apps/web/src/entities/catalog/api/catalogApi.test.js](../../apps/web/src/entities/catalog/api/catalogApi.test.js); [apps/web/src/entities/course/api/courseApi.js](../../apps/web/src/entities/course/api/courseApi.js); [apps/web/src/entities/learning/api/learningApi.js](../../apps/web/src/entities/learning/api/learningApi.js); [apps/web/src/entities/learning/api/learningApi.test.js](../../apps/web/src/entities/learning/api/learningApi.test.js); [apps/web/src/entities/review/api/reviewApi.js](../../apps/web/src/entities/review/api/reviewApi.js); [apps/web/src/entities/user/api/profileApi.js](../../apps/web/src/entities/user/api/profileApi.js); [apps/web/src/features/authentication/api/accountSecurityApi.js](../../apps/web/src/features/authentication/api/accountSecurityApi.js); [apps/web/src/features/authentication/api/authApi.js](../../apps/web/src/features/authentication/api/authApi.js); [apps/web/src/features/contact-support/api/contactSupportApi.js](../../apps/web/src/features/contact-support/api/contactSupportApi.js); [apps/web/src/features/course-purchase/api/coursePurchaseApi.js](../../apps/web/src/features/course-purchase/api/coursePurchaseApi.js); [apps/web/src/features/instructor-approval/api/instructorApprovalApi.js](../../apps/web/src/features/instructor-approval/api/instructorApprovalApi.js); [apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.js](../../apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.js); [apps/web/src/features/profile-settings/api/profileSettingsApi.js](../../apps/web/src/features/profile-settings/api/profileSettingsApi.js).
- **Selected calls / effects:** `normalizedBaseUrl.endsWith`, `normalizedBaseUrl.slice`, `deriveApiVersionBaseUrl`, `encodeURIComponent`.

### [apps/web/src/shared/api/httpClient.js](../../apps/web/src/shared/api/httpClient.js)

Credentialed Axios adapter, Authorization stripping, upload/normal timeouts and session signal integration.

- **Imports / dependencies:** `axios`.
- **Exports:** `NORMAL_REQUEST_TIMEOUT_MS`; `UPLOAD_REQUEST_TIMEOUT_MS`; `axiosInstance`; `SESSION_RESPONSE_SIGNALS`; `classifySessionResponseError`; `signalSessionResponseError`; `registerSessionResponseHandler`; `apiConnector`.
- **Named functions / components:** `classifySessionResponseError (L19)`; `signalSessionResponseError (L42)`; `registerSessionResponseHandler (L57)`; `apiConnector (L70)`.
- **Direct static consumers:** [apps/web/src/app/composition.test.jsx](../../apps/web/src/app/composition.test.jsx); [apps/web/src/entities/course/api/courseApi.js](../../apps/web/src/entities/course/api/courseApi.js); [apps/web/src/entities/course/api/courseApi.test.js](../../apps/web/src/entities/course/api/courseApi.test.js); [apps/web/src/entities/learning/api/learningApi.js](../../apps/web/src/entities/learning/api/learningApi.js); [apps/web/src/entities/learning/api/learningApi.test.js](../../apps/web/src/entities/learning/api/learningApi.test.js); [apps/web/src/entities/review/api/reviewApi.js](../../apps/web/src/entities/review/api/reviewApi.js); [apps/web/src/entities/user/api/profileApi.js](../../apps/web/src/entities/user/api/profileApi.js); [apps/web/src/features/authentication/api/accountSecurityApi.js](../../apps/web/src/features/authentication/api/accountSecurityApi.js); [apps/web/src/features/authentication/api/accountSecurityApi.test.js](../../apps/web/src/features/authentication/api/accountSecurityApi.test.js); [apps/web/src/features/authentication/api/authApi.js](../../apps/web/src/features/authentication/api/authApi.js); [apps/web/src/features/authentication/api/authApi.test.js](../../apps/web/src/features/authentication/api/authApi.test.js); [apps/web/src/features/authentication/model/sessionResponseIntegration.js](../../apps/web/src/features/authentication/model/sessionResponseIntegration.js); [apps/web/src/features/authentication/model/sessionResponseIntegration.test.js](../../apps/web/src/features/authentication/model/sessionResponseIntegration.test.js); [apps/web/src/features/contact-support/api/contactSupportApi.js](../../apps/web/src/features/contact-support/api/contactSupportApi.js); [apps/web/src/features/course-purchase/api/coursePurchaseApi.js](../../apps/web/src/features/course-purchase/api/coursePurchaseApi.js); [apps/web/src/features/course-purchase/api/coursePurchaseApi.test.js](../../apps/web/src/features/course-purchase/api/coursePurchaseApi.test.js); [apps/web/src/features/instructor-approval/api/instructorApprovalApi.js](../../apps/web/src/features/instructor-approval/api/instructorApprovalApi.js); [apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.js](../../apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.js); [apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.test.js](../../apps/web/src/features/payment-reconciliation/api/paymentReconciliationApi.test.js); [apps/web/src/features/profile-settings/api/profileSettingsApi.js](../../apps/web/src/features/profile-settings/api/profileSettingsApi.js); [apps/web/src/shared/api/httpClient.test.js](../../apps/web/src/shared/api/httpClient.test.js).
- **Selected calls / effects:** `axios.create`, `classifySessionResponseError`, `axiosInstance.interceptors.response.use`, `signalSessionResponseError`, `sessionResponseHandler`, `Promise.reject`, `axiosInstance`.

### [apps/web/src/shared/api/httpClient.test.js](../../apps/web/src/shared/api/httpClient.test.js)

Regression/characterization tests for httpClient.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/shared/api/httpClient`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `rejectWithResponse (L20)`; `axiosInstance.defaults.adapter (L42)`; `axiosInstance.defaults.adapter (L68)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `unregisterSessionResponseHandler`, `apiConnector`, `capturedConfig.headers.get`, `registerSessionResponseHandler`, `afterEach`, `vi.fn`, `describe`, `it`, `expect`, `capturedConfig.headers.has`, `formData.append`, `it.each`, `rejectWithResponse`.
- **Test focus:** API connector session security; sends cross-origin requests with the HttpOnly session cookie enabled; removes legacy bearer credentials without dropping safe headers; allows multipart uploads to use the backend's longer request window (all cases indexed in TESTING).

### [apps/web/src/shared/config/countrycode.json](../../apps/web/src/shared/config/countrycode.json)

Country dialing code data used by contact form.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

### [apps/web/src/shared/hooks/useOnClickOutside.js](../../apps/web/src/shared/hooks/useOnClickOutside.js)

shared/hooks reusable React hook `useOnClickOutside`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react`.
- **Exports:** `default useOnClickOutside`.
- **Named functions / components:** `useOnClickOutside (L4)`; `listener (L7)`.
- **Direct static consumers:** [apps/web/src/features/authentication/ui/ProfileDropdown.jsx](../../apps/web/src/features/authentication/ui/ProfileDropdown.jsx); [apps/web/src/widgets/navbar/ui/Navbar.jsx](../../apps/web/src/widgets/navbar/ui/Navbar.jsx).
- **Selected calls / effects:** `useEffect`, `ref.current.contains`, `handler`, `document.addEventListener`, `document.removeEventListener`.

### [apps/web/src/shared/lib/dateFormatter.js](../../apps/web/src/shared/lib/dateFormatter.js)

shared/lib domain transformation/utility `dateFormatter`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `formattedDate`.
- **Named functions / components:** `formattedDate (L1)`.
- **Direct static consumers:** [apps/web/src/pages/profile/index.jsx](../../apps/web/src/pages/profile/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/shared/lib/errorMonitoring.js](../../apps/web/src/shared/lib/errorMonitoring.js)

Sanitized frontend error-reporting hook; no production vendor installed in composition.

- **Imports / dependencies:** No static module import..
- **Exports:** `configureErrorReporter`; `reportClientError`.
- **Named functions / components:** `configureErrorReporter (L3)`; `reportClientError (L7)`.
- **Direct static consumers:** [apps/web/src/shared/ui/ErrorBoundary.jsx](../../apps/web/src/shared/ui/ErrorBoundary.jsx); [apps/web/src/shared/ui/ErrorBoundary.test.jsx](../../apps/web/src/shared/ui/ErrorBoundary.test.jsx).
- **Selected calls / effects:** `errorReporter`.

### [apps/web/src/shared/lib/formatDate.js](../../apps/web/src/shared/lib/formatDate.js)

shared/lib domain transformation/utility `formatDate`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `formatDate`.
- **Named functions / components:** `formatDate (L1)`.
- **Direct static consumers:** [apps/web/src/pages/course-details/index.jsx](../../apps/web/src/pages/course-details/index.jsx); [apps/web/src/pages/instructor-courses/ui/CoursesTable.jsx](../../apps/web/src/pages/instructor-courses/ui/CoursesTable.jsx).
- **Selected calls / effects:** `date.getHours`, `date.getMinutes`, `date.toLocaleDateString`, `minutes.toString`.

### [apps/web/src/shared/lib/routing/internalRedirect.js](../../apps/web/src/shared/lib/routing/internalRedirect.js)

shared/lib route gate `internalRedirect`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `DEFAULT_AUTHENTICATED_PATH`; `sanitizeInternalRedirect`.
- **Named functions / components:** `hasUnsafeCharacters (L8)`; `toRedirectCandidate (L19)`; `decodeForValidation (L53)`; `normalizeInternalRedirect (L68)`; `sanitizeInternalRedirect (L102)`.
- **Direct static consumers:** [apps/web/src/features/authentication/api/authApi.js](../../apps/web/src/features/authentication/api/authApi.js); [apps/web/src/features/authentication/routing/OpenRoute.jsx](../../apps/web/src/features/authentication/routing/OpenRoute.jsx); [apps/web/src/features/authentication/ui/GoogleSignInButton.jsx](../../apps/web/src/features/authentication/ui/GoogleSignInButton.jsx); [apps/web/src/features/authentication/ui/LoginForm.jsx](../../apps/web/src/features/authentication/ui/LoginForm.jsx); [apps/web/src/pages/policy-acceptance/index.jsx](../../apps/web/src/pages/policy-acceptance/index.jsx); [apps/web/src/shared/lib/routing/internalRedirect.test.js](../../apps/web/src/shared/lib/routing/internalRedirect.test.js).
- **Selected calls / effects:** `character.codePointAt`, `search.startsWith`, `hash.startsWith`, `decodeURIComponent`, `toRedirectCandidate`, `candidate.startsWith`, `hasUnsafeCharacters`, `INVALID_PERCENT_ENCODING.test`, `decodeForValidation`, `decoded.split`, `decodedPathname.startsWith`, `DOT_PATH_SEGMENT.test`, `normalizeInternalRedirect`.

### [apps/web/src/shared/lib/routing/internalRedirect.test.js](../../apps/web/src/shared/lib/routing/internalRedirect.test.js)

Regression/characterization tests for internalRedirect.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/shared/lib/routing/internalRedirect`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `describe`, `it.each`, `expect`, `sanitizeInternalRedirect`, `it`.
- **Test focus:** internal redirect sanitization; preserves a canonical internal destination; rejects unsafe or malformed redirect value %#; uses only a validated internal fallback.

### [apps/web/src/shared/styles/globals.css](../../apps/web/src/shared/styles/globals.css)

Tailwind 4 CSS import/theme tokens and shared visual rules.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

### [apps/web/src/shared/ui/Button.jsx](../../apps/web/src/shared/ui/Button.jsx)

shared/ui presentation/interaction component `Button`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `default Button`.
- **Named functions / components:** `Button (L10)`.
- **Direct static consumers:** [apps/web/src/app/composition.test.jsx](../../apps/web/src/app/composition.test.jsx); [apps/web/src/pages/catalog/index.jsx](../../apps/web/src/pages/catalog/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/shared/ui/ConfirmationModal.jsx](../../apps/web/src/shared/ui/ConfirmationModal.jsx)

shared/ui presentation/interaction component `ConfirmationModal`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/ui/IconBtn`, `react`.
- **Exports:** `default ConfirmationModal`.
- **Named functions / components:** `ConfirmationModal (L4)`; `handleKeyDown (L22)`.
- **Direct static consumers:** [apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/NestedView.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/NestedView.jsx); [apps/web/src/pages/course-details/index.jsx](../../apps/web/src/pages/course-details/index.jsx); [apps/web/src/shared/ui/ConfirmationModal.test.jsx](../../apps/web/src/shared/ui/ConfirmationModal.test.jsx); [apps/web/src/widgets/dashboard-sidebar/ui/Sidebar.jsx](../../apps/web/src/widgets/dashboard-sidebar/ui/Sidebar.jsx).
- **Selected calls / effects:** `useRef`, `useId`, `useEffect`, `event.preventDefault`, `cancelHandlerRef.current`, `dialog.querySelectorAll`, `dialog.focus`, `focusableElements.at`, `dialog.contains`, `lastElement.focus`, `firstElement.focus`, `document.addEventListener`, `document.removeEventListener`, `previouslyFocused.focus`.

### [apps/web/src/shared/ui/ConfirmationModal.test.jsx](../../apps/web/src/shared/ui/ConfirmationModal.test.jsx)

Regression/characterization tests for ConfirmationModal.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/shared/ui/ConfirmationModal`, `@testing-library/react`, `@testing-library/user-event`, `react`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `Harness (L7)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByRole`, `vi.fn`, `useState`, `setIsOpen`, `onConfirm`, `describe`, `it`, `userEvent.setup`, `render`, `user.click`, `expect`, `user.tab`, `user.keyboard`, `screen.queryByRole`.
- **Test focus:** ConfirmationModal; announces itself as a dialog and contains keyboard focus; closes on Escape and restores focus to the opener.

### [apps/web/src/shared/ui/ErrorBoundary.jsx](../../apps/web/src/shared/ui/ErrorBoundary.jsx)

shared/ui presentation/interaction component `ErrorBoundary`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/lib/errorMonitoring`, `react`.
- **Exports:** `default ErrorBoundary`.
- **Named functions / components:** `getDerivedStateFromError (L7)`; `componentDidCatch (L11)`; `componentDidUpdate (L18)`; `render (L24)`.
- **Direct static consumers:** [apps/web/src/app/composition.test.jsx](../../apps/web/src/app/composition.test.jsx); [apps/web/src/app/providers/AppProviders.jsx](../../apps/web/src/app/providers/AppProviders.jsx); [apps/web/src/shared/ui/ErrorBoundary.test.jsx](../../apps/web/src/shared/ui/ErrorBoundary.test.jsx); [apps/web/src/shared/ui/RouteErrorBoundary.jsx](../../apps/web/src/shared/ui/RouteErrorBoundary.jsx).
- **Selected calls / effects:** `reportClientError`, `this.setState`, `window.location.reload`.

### [apps/web/src/shared/ui/ErrorBoundary.test.jsx](../../apps/web/src/shared/ui/ErrorBoundary.test.jsx)

Regression/characterization tests for ErrorBoundary.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/shared/lib/errorMonitoring`, `@/shared/ui/ErrorBoundary`, `@testing-library/react`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `BrokenView (L6)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByRole`, `screen.getByText`, `describe`, `beforeEach`, `configureErrorReporter`, `vi.fn`, `vi.spyOn`, `afterEach`, `consoleError.mockRestore`, `it`, `render`, `expect`, `expect.objectContaining`, `rerender`, `fireEvent.click`.
- **Test focus:** ErrorBoundary; shows a recoverable fallback and reports only sanitized context; recovers when a route reset key changes; offers a reload action.

### [apps/web/src/shared/ui/FormField.jsx](../../apps/web/src/shared/ui/FormField.jsx)

shared/ui presentation/interaction component `FormField`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `default FormField`.
- **Named functions / components:** `FormField (L1)`.
- **Direct static consumers:** [apps/web/src/pages/catalog/index.jsx](../../apps/web/src/pages/catalog/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/shared/ui/HighlightText.jsx](../../apps/web/src/shared/ui/HighlightText.jsx)

shared/ui presentation/interaction component `HighlightText`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `default HighlightText`.
- **Named functions / components:** `HighlightText (L1)`.
- **Direct static consumers:** [apps/web/src/pages/about/index.jsx](../../apps/web/src/pages/about/index.jsx); [apps/web/src/pages/about/ui/LearningGrid.jsx](../../apps/web/src/pages/about/ui/LearningGrid.jsx); [apps/web/src/pages/about/ui/Quote.jsx](../../apps/web/src/pages/about/ui/Quote.jsx); [apps/web/src/pages/home/index.jsx](../../apps/web/src/pages/home/index.jsx); [apps/web/src/pages/home/ui/ExploreMore.jsx](../../apps/web/src/pages/home/ui/ExploreMore.jsx); [apps/web/src/pages/home/ui/InstructorSection.jsx](../../apps/web/src/pages/home/ui/InstructorSection.jsx); [apps/web/src/pages/home/ui/LearningLanguageSection.jsx](../../apps/web/src/pages/home/ui/LearningLanguageSection.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/shared/ui/IconBtn.jsx](../../apps/web/src/shared/ui/IconBtn.jsx)

shared/ui presentation/interaction component `IconBtn`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `default IconBtn`.
- **Named functions / components:** `IconBtn (L1)`.
- **Direct static consumers:** [apps/web/src/features/authentication/ui/UpdatePassword.jsx](../../apps/web/src/features/authentication/ui/UpdatePassword.jsx); [apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/CourseBuilderForm.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/CourseBuilderForm.jsx); [apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/SubSectionModal.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseBuilder/SubSectionModal.jsx); [apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/CourseInformation/CourseInformationForm.jsx); [apps/web/src/features/course-authoring/ui/AddCourse/PublishCourse/index.jsx](../../apps/web/src/features/course-authoring/ui/AddCourse/PublishCourse/index.jsx); [apps/web/src/features/course-purchase/ui/RenderTotalAmount.jsx](../../apps/web/src/features/course-purchase/ui/RenderTotalAmount.jsx); [apps/web/src/features/course-review/ui/CourseReviewModal.jsx](../../apps/web/src/features/course-review/ui/CourseReviewModal.jsx); [apps/web/src/features/profile-settings/ui/ChangeProfilePicture.jsx](../../apps/web/src/features/profile-settings/ui/ChangeProfilePicture.jsx); [apps/web/src/features/profile-settings/ui/EditProfile.jsx](../../apps/web/src/features/profile-settings/ui/EditProfile.jsx); [apps/web/src/pages/instructor-courses/index.jsx](../../apps/web/src/pages/instructor-courses/index.jsx); [apps/web/src/pages/profile/index.jsx](../../apps/web/src/pages/profile/index.jsx); [apps/web/src/shared/ui/ConfirmationModal.jsx](../../apps/web/src/shared/ui/ConfirmationModal.jsx); [apps/web/src/shared/ui/IconBtn.test.jsx](../../apps/web/src/shared/ui/IconBtn.test.jsx); [apps/web/src/widgets/curriculum-panel/ui/VideoDetailsSidebar.jsx](../../apps/web/src/widgets/curriculum-panel/ui/VideoDetailsSidebar.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/shared/ui/IconBtn.test.jsx](../../apps/web/src/shared/ui/IconBtn.test.jsx)

Regression/characterization tests for IconBtn.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/shared/ui/IconBtn`, `@testing-library/react`, `@testing-library/user-event`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByRole`, `describe`, `it`, `userEvent.setup`, `vi.fn`, `event.preventDefault`, `render`, `expect`, `user.click`.
- **Test focus:** IconBtn; defaults to a non-submitting button; allows callers to opt into submit behavior.

### [apps/web/src/shared/ui/LinkButton.jsx](../../apps/web/src/shared/ui/LinkButton.jsx)

shared/ui presentation/interaction component `LinkButton`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react-router`.
- **Exports:** `default Button`.
- **Named functions / components:** `Button (L3)`.
- **Direct static consumers:** [apps/web/src/pages/about/ui/LearningGrid.jsx](../../apps/web/src/pages/about/ui/LearningGrid.jsx); [apps/web/src/pages/home/index.jsx](../../apps/web/src/pages/home/index.jsx); [apps/web/src/pages/home/ui/CodeBlocks.jsx](../../apps/web/src/pages/home/ui/CodeBlocks.jsx); [apps/web/src/pages/home/ui/InstructorSection.jsx](../../apps/web/src/pages/home/ui/InstructorSection.jsx); [apps/web/src/pages/home/ui/LearningLanguageSection.jsx](../../apps/web/src/pages/home/ui/LearningLanguageSection.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/shared/ui/PageLoadingFallback.jsx](../../apps/web/src/shared/ui/PageLoadingFallback.jsx)

shared/ui presentation/interaction component `PageLoadingFallback`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `default PageLoadingFallback`.
- **Named functions / components:** `PageLoadingFallback (L1)`.
- **Direct static consumers:** [apps/web/src/widgets/app-shell/AppShell.jsx](../../apps/web/src/widgets/app-shell/AppShell.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/shared/ui/RouteErrorBoundary.jsx](../../apps/web/src/shared/ui/RouteErrorBoundary.jsx)

shared/ui presentation/interaction component `RouteErrorBoundary`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/ui/ErrorBoundary`, `react-router`.
- **Exports:** `default RouteErrorBoundary`.
- **Named functions / components:** `RouteErrorBoundary (L4)`.
- **Direct static consumers:** [apps/web/src/widgets/app-shell/AppShell.jsx](../../apps/web/src/widgets/app-shell/AppShell.jsx).
- **Selected calls / effects:** `useLocation`.

### [apps/web/src/shared/ui/SafeMarkdown.jsx](../../apps/web/src/shared/ui/SafeMarkdown.jsx)

Restricted markdown renderer excluding raw HTML/images and unsafe links.

- **Imports / dependencies:** `react-markdown`.
- **Exports:** `default SafeMarkdown`.
- **Named functions / components:** `safeLink (L20)`; `SafeMarkdown (L29)`.
- **Direct static consumers:** [apps/web/src/pages/course-details/index.jsx](../../apps/web/src/pages/course-details/index.jsx); [apps/web/src/shared/ui/SafeMarkdown.test.jsx](../../apps/web/src/shared/ui/SafeMarkdown.test.jsx).
- **Selected calls / effects:** `url.toString`, `safeLink`.

### [apps/web/src/shared/ui/SafeMarkdown.test.jsx](../../apps/web/src/shared/ui/SafeMarkdown.test.jsx)

Regression/characterization tests for SafeMarkdown.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/shared/ui/SafeMarkdown`, `@testing-library/react`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByRole`, `describe`, `it`, `render`, `expect`, `container.querySelector`, `screen.queryByRole`.
- **Test focus:** SafeMarkdown; does not render instructor-controlled remote images or unsafe links.

### [apps/web/src/shared/ui/StatusPanel.jsx](../../apps/web/src/shared/ui/StatusPanel.jsx)

shared/ui presentation/interaction component `StatusPanel`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `default StatusPanel`.
- **Named functions / components:** `StatusPanel (L1)`.
- **Direct static consumers:** [apps/web/src/pages/catalog/index.jsx](../../apps/web/src/pages/catalog/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/vite-env.d.ts](../../apps/web/src/vite-env.d.ts)

Vite/public browser environment type declarations.

- **Imports / dependencies:** No static module import..
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/widgets/README.md](../../apps/web/src/widgets/README.md)

Directory/workspace responsibility guide: Widgets. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [apps/web/src/widgets/app-shell/AppShell.jsx](../../apps/web/src/widgets/app-shell/AppShell.jsx)

widgets/app-shell component/helper `AppShell`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/ui/PageLoadingFallback`, `@/shared/ui/RouteErrorBoundary`, `@/widgets/navbar`, `react`.
- **Exports:** `default AppShell`.
- **Named functions / components:** `AppShell (L6)`.
- **Direct static consumers:** [apps/web/src/widgets/app-shell/index.js](../../apps/web/src/widgets/app-shell/index.js).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/widgets/app-shell/index.js](../../apps/web/src/widgets/app-shell/index.js)

Public export surface for widgets/app-shell; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./AppShell`.
- **Exports:** `default`; `AppShell`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/app/App.jsx](../../apps/web/src/app/App.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/widgets/curriculum-panel/index.js](../../apps/web/src/widgets/curriculum-panel/index.js)

Public export surface for widgets/curriculum-panel; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./ui/VideoDetailsSidebar`.
- **Exports:** `default`; `CurriculumPanel`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/learning/index.jsx](../../apps/web/src/pages/learning/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/widgets/curriculum-panel/ui/VideoDetailsSidebar.jsx](../../apps/web/src/widgets/curriculum-panel/ui/VideoDetailsSidebar.jsx)

widgets/curriculum-panel presentation/interaction component `VideoDetailsSidebar`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/ui/IconBtn`, `react`, `react-icons/bs`, `react-icons/io`, `react-router`.
- **Exports:** `default VideoDetailsSidebar`.
- **Named functions / components:** `lessonPath (L7)`; `VideoDetailsSidebar (L14)`; `trapMobileFocus (L35)`; `renderContent (L52)`.
- **Direct static consumers:** [apps/web/src/widgets/curriculum-panel/index.js](../../apps/web/src/widgets/curriculum-panel/index.js); [apps/web/src/widgets/curriculum-panel/ui/VideoDetailsSidebar.test.jsx](../../apps/web/src/widgets/curriculum-panel/ui/VideoDetailsSidebar.test.jsx).
- **Selected calls / effects:** `encodeURIComponent`, `useState`, `useParams`, `useRef`, `useEffect`, `window.setTimeout`, `window.clearTimeout`, `event.preventDefault`, `last.focus`, `first.focus`, `onClose`, `setReviewModal`, `curriculum.map`, `setExpandedSectionId`, `section.lessons.map`, `completedLessonIds.has`, `lessonPath`, `renderContent`.

### [apps/web/src/widgets/curriculum-panel/ui/VideoDetailsSidebar.test.jsx](../../apps/web/src/widgets/curriculum-panel/ui/VideoDetailsSidebar.test.jsx)

Regression/characterization tests for VideoDetailsSidebar.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/widgets/curriculum-panel/ui/VideoDetailsSidebar`, `@testing-library/react`, `@testing-library/user-event`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `routeFor (L68)`; `renderSidebar (L71)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.getByText`, `screen.getByRole`, `routeFor`, `render`, `vi.fn`, `describe`, `beforeEach`, `vi.clearAllMocks`, `it`, `renderSidebar`, `expect`, `within`, `userEvent.setup`, `foundations.focus`, `user.keyboard`, `screen.queryByRole`, `user.click`, `waitFor`, `dialog.querySelectorAll`, `last.focus`, `user.tab`, `first.focus`.
- **Test focus:** VideoDetailsSidebar; announces exact progress and marks the current and completed lessons; supports keyboard section disclosure and an explicit empty-section state; focuses and traps the mobile dialog, closes it, and preserves review behavior.

### [apps/web/src/widgets/dashboard-sidebar/index.js](../../apps/web/src/widgets/dashboard-sidebar/index.js)

Public export surface for widgets/dashboard-sidebar; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./ui/Sidebar`.
- **Exports:** `default`; `DashboardSidebar`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/dashboard/index.jsx](../../apps/web/src/pages/dashboard/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/widgets/dashboard-sidebar/model/links.js](../../apps/web/src/widgets/dashboard-sidebar/model/links.js)

widgets/dashboard-sidebar state/constants `links`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/user`.
- **Exports:** `sidebarLinks`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/widgets/dashboard-sidebar/ui/Sidebar.jsx](../../apps/web/src/widgets/dashboard-sidebar/ui/Sidebar.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/widgets/dashboard-sidebar/ui/Sidebar.jsx](../../apps/web/src/widgets/dashboard-sidebar/ui/Sidebar.jsx)

widgets/dashboard-sidebar presentation/interaction component `Sidebar`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/features/authentication`, `@/shared/ui/ConfirmationModal`, `@/widgets/dashboard-sidebar/model/links`, `@/widgets/dashboard-sidebar/ui/SidebarLink`, `react`, `react-icons/vsc`, `react-redux`, `react-router`.
- **Exports:** `default Sidebar`.
- **Named functions / components:** `Sidebar (L13)`; `renderSidebarContent (L22)`.
- **Direct static consumers:** [apps/web/src/widgets/dashboard-sidebar/index.js](../../apps/web/src/widgets/dashboard-sidebar/index.js).
- **Selected calls / effects:** `useSelector`, `useDispatch`, `useNavigate`, `useState`, `sidebarLinks.map`, `setConfirmationModal`, `dispatch`, `logout`, `renderSidebarContent`.

### [apps/web/src/widgets/dashboard-sidebar/ui/SidebarLink.jsx](../../apps/web/src/widgets/dashboard-sidebar/ui/SidebarLink.jsx)

widgets/dashboard-sidebar presentation/interaction component `SidebarLink`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/course`, `react-icons/vsc`, `react-redux`, `react-router`.
- **Exports:** `default SidebarLink`.
- **Named functions / components:** `SidebarLink (L30)`; `matchRoute (L35)`.
- **Direct static consumers:** [apps/web/src/widgets/dashboard-sidebar/ui/Sidebar.jsx](../../apps/web/src/widgets/dashboard-sidebar/ui/Sidebar.jsx).
- **Selected calls / effects:** `resetCourseState`, `useLocation`, `useDispatch`, `matchPath`, `dispatch`, `onNavigate`, `matchRoute`.

### [apps/web/src/widgets/footer/index.js](../../apps/web/src/widgets/footer/index.js)

Public export surface for widgets/footer; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./ui/Footer`.
- **Exports:** `default`; `Footer`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/about/index.jsx](../../apps/web/src/pages/about/index.jsx); [apps/web/src/pages/catalog/index.jsx](../../apps/web/src/pages/catalog/index.jsx); [apps/web/src/pages/contact/index.jsx](../../apps/web/src/pages/contact/index.jsx); [apps/web/src/pages/course-details/index.jsx](../../apps/web/src/pages/course-details/index.jsx); [apps/web/src/pages/home/index.jsx](../../apps/web/src/pages/home/index.jsx); [apps/web/src/pages/legal/index.jsx](../../apps/web/src/pages/legal/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/widgets/footer/model/links.js](../../apps/web/src/widgets/footer/model/links.js)

widgets/footer state/constants `links`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `FooterLink2`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/widgets/footer/ui/Footer.jsx](../../apps/web/src/widgets/footer/ui/Footer.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/widgets/footer/ui/Footer.jsx](../../apps/web/src/widgets/footer/ui/Footer.jsx)

widgets/footer presentation/interaction component `Footer`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/shared/assets/Logo/Logo-Full-Light.png`, `@/widgets/footer/model/links`, `react-router`.
- **Exports:** `default Footer`.
- **Named functions / components:** `Footer (L12)`.
- **Direct static consumers:** [apps/web/src/widgets/footer/index.js](../../apps/web/src/widgets/footer/index.js).
- **Selected calls / effects:** `FooterLink2.map`, `section.links.map`.

### [apps/web/src/widgets/navbar/index.js](../../apps/web/src/widgets/navbar/index.js)

Public export surface for widgets/navbar; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./ui/Navbar`.
- **Exports:** `default`; `Navbar`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/widgets/app-shell/AppShell.jsx](../../apps/web/src/widgets/app-shell/AppShell.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/widgets/navbar/model/links.js](../../apps/web/src/widgets/navbar/model/links.js)

widgets/navbar state/constants `links`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** No static module import..
- **Exports:** `NavbarLinks`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/widgets/navbar/ui/Navbar.jsx](../../apps/web/src/widgets/navbar/ui/Navbar.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/widgets/navbar/ui/Navbar.jsx](../../apps/web/src/widgets/navbar/ui/Navbar.jsx)

widgets/navbar presentation/interaction component `Navbar`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `@/entities/catalog`, `@/entities/user`, `@/features/authentication`, `@/shared/assets/Logo/Logo-Full-Light.png`, `@/shared/hooks/useOnClickOutside`, `@/widgets/navbar/model/links`, `react`, `react-icons/ai`, `react-icons/bs`, `react-redux`, `react-router`.
- **Exports:** `default Navbar`.
- **Named functions / components:** `Navbar (L21)`; `handleEscape (L56)`; `matchRoute (L66)`; `catalogPath (L75)`; `handleLogout (L78)`.
- **Direct static consumers:** [apps/web/src/widgets/navbar/index.js](../../apps/web/src/widgets/navbar/index.js); [apps/web/src/widgets/navbar/ui/Navbar.test.jsx](../../apps/web/src/widgets/navbar/ui/Navbar.test.jsx).
- **Selected calls / effects:** `useSelector`, `useDispatch`, `useLocation`, `useNavigate`, `useGetCatalogCategoriesQuery`, `useState`, `useRef`, `useCallback`, `setMobileMenuLocationKey`, `setMobileCatalogOpen`, `useOnClickOutside`, `useEffect`, `window.setTimeout`, `window.clearTimeout`, `closeMobileMenu`, `document.addEventListener`, `document.removeEventListener`, `matchPath`, `subLinks.filter`, `name.split`, `dispatch`, `logout`, `NavbarLinks.map`, `matchRoute`, `catalogLinks.map`, `catalogPath`, `getAvatarSource`, `setInitialsAvatarOnError`.

### [apps/web/src/widgets/navbar/ui/Navbar.test.jsx](../../apps/web/src/widgets/navbar/ui/Navbar.test.jsx)

Regression/characterization tests for Navbar.jsx; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@/entities/cart`, `@/entities/user`, `@/widgets/navbar/ui/Navbar`, `@reduxjs/toolkit`, `@testing-library/react`, `@testing-library/user-event`, `react-redux`, `react-router`, `vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `createNavbarStore (L19)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `screen.findByText`, `store.dispatch`, `setSession`, `screen.getByRole`, `vi.hoisted`, `vi.fn`, `vi.mock`, `importOriginal`, `describe`, `configureStore`, `beforeEach`, `vi.clearAllMocks`, `catalogMocks.categories.mockReturnValue`, `it`, `createNavbarStore`, `render`, `expect`, `userEvent.setup`, `user.click`, `within`, `user.keyboard`, `screen.queryByRole`.
- **Test focus:** Navbar; renders an empty catalog state when the API response has no data array; provides keyboard-accessible mobile navigation and anonymous actions.

### [apps/web/src/widgets/review-slider/index.js](../../apps/web/src/widgets/review-slider/index.js)

Public export surface for widgets/review-slider; groups imported/re-exported lower-level modules without creating a new service.

- **Imports / dependencies:** `./ui/ReviewSlider`.
- **Exports:** `default`; `ReviewSlider`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/web/src/pages/about/index.jsx](../../apps/web/src/pages/about/index.jsx); [apps/web/src/pages/contact/index.jsx](../../apps/web/src/pages/contact/index.jsx); [apps/web/src/pages/home/index.jsx](../../apps/web/src/pages/home/index.jsx).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [apps/web/src/widgets/review-slider/ui/ReviewSlider.jsx](../../apps/web/src/widgets/review-slider/ui/ReviewSlider.jsx)

widgets/review-slider presentation/interaction component `ReviewSlider`; the imports, symbols and calls below identify its actual collaborators. See the matching feature flow for server effects.

- **Imports / dependencies:** `react`, `swiper/react`, `swiper/css`, `swiper/css/free-mode`, `swiper/css/pagination`, `@/shared/styles/globals.css`, `@/entities/review`, `@/entities/user`, `swiper/modules`.
- **Exports:** `default ReviewSlider`.
- **Named functions / components:** `ReviewSlider (L15)`; `safeTruncate (L29)`.
- **Direct static consumers:** [apps/web/src/widgets/review-slider/index.js](../../apps/web/src/widgets/review-slider/index.js).
- **Selected calls / effects:** `useState`, `useEffect`, `setReviews`, `fetchPublicReviews`, `toks.join`, `toks.slice`, `reviews.map`, `getAvatarSource`, `setInitialsAvatarOnError`, `safeTruncate`, `review.rating.toFixed`.

## apps/web/test

### [apps/web/test/setup.js](../../apps/web/test/setup.js)

Vitest DOM matchers/global cleanup and browser API stubs.

- **Imports / dependencies:** `@testing-library/jest-dom/vitest`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `length (L5)`; `clear (L8)`; `getItem (L11)`; `key (L15)`; `removeItem (L18)`; `setItem (L21)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `values.get`, `values.delete`, `values.clear`, `values.keys`, `values.set`.

## apps/web/tsconfig.json

### [apps/web/tsconfig.json](../../apps/web/tsconfig.json)

Strict noEmit incremental TS foundation; allows JS without checkJs.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

## apps/web/vite.config.ts

### [apps/web/vite.config.ts](../../apps/web/vite.config.ts)

Vite React/Tailwind/alias/dev/build and Vitest configuration.

- **Imports / dependencies:** `node:url`, `@tailwindcss/vite`, `@vitejs/plugin-react`, `vite`.
- **Exports:** `default `.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `fileURLToPath`, `defineConfig`, `loadEnv`, `react`, `tailwindcss`.

## Root

### [compose.integration.yml](../../compose.integration.yml)

Disposable real Mongo/Redis test dependencies.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

### [compose.local.env.example](../../compose.local.env.example)

Environment-name template for compose.local.env.example; private values are not copied or inferred.

- **Declared variable names only:** `STUDYNOTION_WEB_PORT`, `STUDYNOTION_API_PORT`, `STUDYNOTION_LOCAL_JWT_SECRET`, `STUDYNOTION_LOCAL_OTP_SECRET`, `STUDYNOTION_LOCAL_ENTITLEMENT_SIDECAR_STARTED_AT`, `STUDYNOTION_DEMO_ADMIN_EMAIL`, `STUDYNOTION_DEMO_ADMIN_PASSWORD`, `STUDYNOTION_DEMO_INSTRUCTOR_EMAIL`, `STUDYNOTION_DEMO_INSTRUCTOR_PASSWORD`, `STUDYNOTION_DEMO_STUDENT_EMAIL`, `STUDYNOTION_DEMO_STUDENT_PASSWORD`.

### [compose.local.yml](../../compose.local.yml)

Local web/API/Mongo/Redis and explicit seed profile topology.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

### [compose.operations.yml](../../compose.operations.yml)

Hardened max-one-host one-shot entitlement recovery container.

- **Consumer / connection:** Owning runtime, build, editor or workflow reads this configuration/data; see REPOSITORY_MAP and the corresponding architecture document.

## docs

### [docs/architecture/0001-incremental-productization.md](../../docs/architecture/0001-incremental-productization.md)

Historical decision/evidence or operator guide: ADR 0001: Productize StudyNotion incrementally. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/architecture/0002-catalog-v2-vertical-slice.md](../../docs/architecture/0002-catalog-v2-vertical-slice.md)

Historical decision/evidence or operator guide: ADR 0002: Add the public catalog as a versioned vertical slice. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/architecture/0003-validated-v2-contract-foundation.md](../../docs/architecture/0003-validated-v2-contract-foundation.md)

Historical decision/evidence or operator guide: ADR 0003: Establish a validated API v2 contract foundation. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/architecture/0004-react-19-and-incremental-typescript.md](../../docs/architecture/0004-react-19-and-incremental-typescript.md)

Historical decision/evidence or operator guide: ADR 0004: Adopt React 19 with incremental strict TypeScript. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/architecture/0005-react-router-8.md](../../docs/architecture/0005-react-router-8.md)

Historical decision/evidence or operator guide: ADR 0005: Migrate the declarative SPA to React Router 8. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/architecture/0006-tailwind-css-4.md](../../docs/architecture/0006-tailwind-css-4.md)

Historical decision/evidence or operator guide: ADR 0006: Adopt Tailwind CSS 4 through Vite. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/architecture/0007-mongoose-9.md](../../docs/architecture/0007-mongoose-9.md)

Historical decision/evidence or operator guide: ADR 0007: Adopt Mongoose 9 without changing stored data. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/architecture/0008-learning-v2-course-progress.md](../../docs/architecture/0008-learning-v2-course-progress.md)

Historical decision/evidence or operator guide: ADR 0008: Add authenticated Learning V2 course progress. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/architecture/0009-enrollment-consistency-audit.md](../../docs/architecture/0009-enrollment-consistency-audit.md)

Historical decision/evidence or operator guide: ADR 0009: Audit enrollment consistency before redesigning authority. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/architecture/0010-entitlement-migration-design.md](../../docs/architecture/0010-entitlement-migration-design.md)

Historical decision/evidence or operator guide: ADR 0010: Make Entitlement the future course-access authority. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/architecture/0011-repository-modularization.md](../../docs/architecture/0011-repository-modularization.md)

Historical decision/evidence or operator guide: ADR 0011: Modularize the repository around deployable applications. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/audits/baseline-2026-07.md](../../docs/audits/baseline-2026-07.md)

Historical decision/evidence or operator guide: StudyNotion modernisation baseline — 27 July 2026. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/audits/catalog-query-plan-2026-07.md](../../docs/audits/catalog-query-plan-2026-07.md)

Historical decision/evidence or operator guide: Catalog v2 query-plan audit — July 2026. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/audits/dependabot-2026-08.md](../../docs/audits/dependabot-2026-08.md)

Historical decision/evidence or operator guide: Dependabot and GitHub Actions audit — August 2026. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/audits/enrollment-consistency-query-plan-2026-08.md](../../docs/audits/enrollment-consistency-query-plan-2026-08.md)

Historical decision/evidence or operator guide: Enrollment consistency query-plan audit — August 2026. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/audits/entitlement-inert-persistence-2026-08.md](../../docs/audits/entitlement-inert-persistence-2026-08.md)

Historical decision/evidence or operator guide: Entitlement inert persistence evidence — August 2026. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/audits/entitlement-stage2-sidecar-2026-08.md](../../docs/audits/entitlement-stage2-sidecar-2026-08.md)

Historical decision/evidence or operator guide: Entitlement Stage 2 sidecar evidence — August 2026. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/operations/deployment.md](../../docs/operations/deployment.md)

Historical decision/evidence or operator guide: Deployment operations. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/operations/enrollment-consistency.md](../../docs/operations/enrollment-consistency.md)

Historical decision/evidence or operator guide: Enrollment consistency audit runbook. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/operations/entitlement-recovery.md](../../docs/operations/entitlement-recovery.md)

Historical decision/evidence or operator guide: Entitlement Stage 2 recovery runbook. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

### [docs/security/repository-safety.md](../../docs/security/repository-safety.md)

Historical decision/evidence or operator guide: Repository safety runbook. Verify current implementation when claims differ.

- **Consumer / connection:** Repository guidance; not executed.

## e2e

### [e2e/catalog.spec.js](../../e2e/catalog.spec.js)

Regression/characterization tests for catalog.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@axe-core/playwright`, `@playwright/test`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `course (L12)`; `json (L33)`; `capture (L40)`; `mockCatalogJourney (L50)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `route.request`, `url.searchParams.get`, `page.getByRole`, `requestCounters.get`, `window.getComputedStyle`, `page.getByText`, `page.getByLabel`, `route.fulfill`, `testInfo.project.name.replace`, `page.screenshot`, `page.route`, `json`, `course`, `test.beforeEach`, `requestCounters.set`, `mockCatalogJourney`, `test`, `page.goto`, `expect`, `courseLink.focus`, `capture`, `courseLink.click`, `page.unroute`, `setTimeout`.
- **Test focus:** catalog reaches the existing public course-detail route; catalog retains cards while loading the next cursor page; catalog search has a recoverable no-results state; catalog exposes stable loading, filter, empty, error, and missing states.

### [e2e/learning.spec.js](../../e2e/learning.spec.js)

Regression/characterization tests for learning.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `@axe-core/playwright`, `@playwright/test`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `json (L17)`; `progress (L24)`; `learningState (L33)`; `capture (L101)`; `expectAccessible (L111)`; `mockAuthenticatedSession (L120)`; `mockPlayback (L140)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `mockAuthenticatedSession`, `page.getByRole`, `contentRegion.getByText`, `contentRegion.getByRole`, `page.getByText`, `route.fulfill`, `progress`, `testInfo.project.name.replace`, `page.screenshot`, `expect`, `page.route`, `json`, `test.beforeEach`, `mockPlayback`, `test`, `learningState`, `completed.add`, `page.goto`, `contentButton.click`, `foundations.focus`, `foundations.press`, `capture`, `page.keyboard.press`, `page.locator`, `expectAccessible`, `setTimeout`, `page.unroute`.
- **Test focus:** learner navigates the curriculum and saves canonical progress; learning exposes loading, retryable failure, and access-denied states; learning has a clear empty-curriculum state.

### [e2e/live-environment.cjs](../../e2e/live-environment.cjs)

Validates target origin; loopback demo fallback versus explicit strong non-loopback test identities, no credential values documented.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=resolveLiveEnvironment`.
- **Named functions / components:** `isLoopbackHostname (L46)`; `parseBaseUrl (L55)`; `valueFrom (L84)`; `readCredentials (L89)`; `resolveLiveEnvironment (L121)`.
- **Direct static consumers:** [apps/api/test/live-e2e-environment.test.js](../../apps/api/test/live-e2e-environment.test.js); [e2e/live-stack.spec.js](../../e2e/live-stack.spec.js); [playwright.live.config.mjs](../../playwright.live.config.mjs).
- **Selected calls / effects:** `isLoopbackHostname`, `value.trim`, `valueFrom`, `Buffer.byteLength`, `email.toLowerCase`, `parseBaseUrl`, `readCredentials`.

### [e2e/live-global-setup.js](../../e2e/live-global-setup.js)

Clears tracked-location live audit screenshots before live suite; do not run casually in a documentation-only task.

- **Imports / dependencies:** `node:fs/promises`.
- **Exports:** `default clearLiveScreenshots`.
- **Named functions / components:** `clearLiveScreenshots (L3)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `rm`.

### [e2e/live-stack.spec.js](../../e2e/live-stack.spec.js)

Regression/characterization tests for live-stack.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:fs/promises`, `@axe-core/playwright`, `@playwright/test`, `./live-environment.cjs`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `waitForVisualAssets (L11)`; `finish (L18)`; `capture (L33)`; `login (L45)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `page.getByLabel`, `page.getByRole`, `page.getByText`, `continueCourse.click`, `resolveLiveEnvironment`, `page.evaluate`, `Promise.all`, `image.removeEventListener`, `resolve`, `image.addEventListener`, `finish`, `mkdir`, `waitForVisualAssets`, `testInfo.project.name.replace`, `page.screenshot`, `page.goto`, `expect`, `test`, `capture`, `courseLink.click`, `login`, `page.locator`.
- **Test focus:** live public home, catalog, and course detail are connected; live student session returns to enrollment and opens protected playback; live instructor workspace loads owned course data; live admin workspaces expose empty operational queues.

## Root

### [eslint.config.mjs](../../eslint.config.mjs)

Flat lint rules with React/hooks/refresh plugins and runtime/test global scopes.

- **Imports / dependencies:** `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`.
- **Exports:** `default `.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [package.json](../../package.json)

Workspace manifest, dependency ownership and executable npm scripts; see DEPENDENCIES and TESTING.

- **Script entry points:** `start`, `client`, `server`, `dev`, `dev:web`, `dev:api`, `build`, `build:local`, `preview`, `e2e:serve`, `test`, `test:frontend`, `test:backend`, `test:watch`, `test:integration`, `test:e2e`, `test:e2e:live`, `typecheck`, `contracts:generate`, `contracts:openapi:check`, `contracts:test`, `architecture:check`, `deploy:validate-pair`, `ops:validate-image`, `ops:validate-recovery-host`, `format`, `format:check`, `lint`, `verify`.
- **Consumers:** npm workspace install/run, Dockerfiles, GitHub workflows; see DEPENDENCIES for every package.

## packages/contracts/package.json

### [packages/contracts/package.json](../../packages/contracts/package.json)

Workspace manifest, dependency ownership and executable npm scripts; see DEPENDENCIES and TESTING.

- **Script entry points:** `openapi:generate`, `openapi:check`, `test`.
- **Consumers:** npm workspace install/run, Dockerfiles, GitHub workflows; see DEPENDENCIES for every package.

## packages/contracts/src

### [packages/contracts/src/admin.js](../../packages/contracts/src/admin.js)

Shared admin Zod wire primitives/DTOs and refinements. Schema presence does not imply an implemented endpoint; see ARCHITECTURE/API_MAP.

- **Imports / dependencies:** `zod`, `./common`, `./pagination`, `./commerce`.
- **Exports:** `module.exports=adminLearnerSummarySchema,instructorApprovalQueueItemSchema,instructorApprovalQueueResponseSchema,reconciliationQueueItemSchema,reconciliationQueueResponseSchema,reconciliationQueueStatusSchema`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [packages/contracts/src/index.js](../../packages/contracts/src/index.js); [packages/contracts/src/registry.js](../../packages/contracts/src/registry.js); [packages/contracts/test/contracts.test.js](../../packages/contracts/test/contracts.test.js).
- **Selected calls / effects:** `z.enum`, `z.strictObject`, `z.string`, `z.email`, `z.literal`, `z.boolean`, `z.null`, `purchaseFinancialsSchema.safeExtend`, `isoDateTimeSchema.nullable`, `refundProviderStatusSchema.nullable`, `createSuccessResponseSchema`, `createOffsetPageSchema`.

### [packages/contracts/src/auth.js](../../packages/contracts/src/auth.js)

Shared auth Zod wire primitives/DTOs and refinements. Schema presence does not imply an implemented endpoint; see ARCHITECTURE/API_MAP.

- **Imports / dependencies:** `zod`, `./common`, `./users`.
- **Exports:** `module.exports=authSessionResponseSchema,authSessionSchema,authenticatedSessionSchema,loginPasswordSchema,localLoginRequestSchema,signedOutSessionSchema`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [packages/contracts/src/index.js](../../packages/contracts/src/index.js); [packages/contracts/src/registry.js](../../packages/contracts/src/registry.js); [packages/contracts/test/contracts.test.js](../../packages/contracts/test/contracts.test.js).
- **Selected calls / effects:** `utf8Encoder.encode`, `z.strictObject`, `z.email`, `z.literal`, `z.boolean`, `z.null`, `createSuccessResponseSchema`.

### [packages/contracts/src/catalog.js](../../packages/contracts/src/catalog.js)

Shared catalog Zod wire primitives/DTOs and refinements. Schema presence does not imply an implemented endpoint; see ARCHITECTURE/API_MAP.

- **Imports / dependencies:** `zod`, `./common`, `./courses`, `./pagination`.
- **Exports:** `module.exports=catalogCourseListQuerySchema,catalogCourseListResponseSchema,catalogCourseSchema,catalogLevelSchema,catalogPriceMajorSchema,catalogQueryOpenApiSchema,catalogSortSchema,objectIdSchema`.
- **Named functions / components:** `blankAsUndefined (L30)`; `optionalQueryNumber (L44)`.
- **Direct static consumers:** [apps/api/routes/CatalogV2.js](../../apps/api/routes/CatalogV2.js); [apps/web/src/entities/catalog/api/catalogApi.js](../../apps/web/src/entities/catalog/api/catalogApi.js); [packages/contracts/src/index.js](../../packages/contracts/src/index.js); [packages/contracts/src/openapi.js](../../packages/contracts/src/openapi.js); [packages/contracts/src/registry.js](../../packages/contracts/src/registry.js); [packages/contracts/test/contracts.test.js](../../packages/contracts/test/contracts.test.js).
- **Selected calls / effects:** `z.enum`, `z.string`, `value.trim`, `z.preprocess`, `value.replace`, `schema.optional`, `languageCodeWireSchema.transform`, `value.toLowerCase`, `z.strictObject`, `objectIdSchema.optional`, `catalogLevelSchema.optional`, `languageCodeSchema.optional`, `optionalQueryNumber`, `z.number`, `catalogSortSchema.optional`, `catalogCursorSchema.optional`, `context.addIssue`, `languageCodeWireSchema.optional`, `z.literal`, `catalogLevelSchema.nullable`, `canonicalLanguageCodeSchema.nullable`, `z.iso.datetime`, `createSuccessResponseSchema`, `z.array`.

### [packages/contracts/src/checkOpenApi.js](../../packages/contracts/src/checkOpenApi.js)

Fails if checked-in OpenAPI differs from deterministic generation.

- **Imports / dependencies:** `node:fs`, `node:path`, `./openapi`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `resolve`, `readFileSync`, `serializeOpenApiDocument`.

### [packages/contracts/src/commerce.js](../../packages/contracts/src/commerce.js)

Shared commerce Zod wire primitives/DTOs and refinements. Schema presence does not imply an implemented endpoint; see ARCHITECTURE/API_MAP.

- **Imports / dependencies:** `zod`, `./common`.
- **Exports:** `module.exports=checkoutOrderResponseSchema,checkoutOrderSchema,checkoutPolicySchema,checkoutRequestSchema,idempotencyKeySchema,learnerPurchaseSchema,purchaseFinancialsSchema,purchaseLineItemSchema,purchaseStatusSchema,reconciliationResolutionSchema,refundProviderStatusSchema,refundRequestSchema`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [packages/contracts/src/admin.js](../../packages/contracts/src/admin.js); [packages/contracts/src/index.js](../../packages/contracts/src/index.js); [packages/contracts/src/registry.js](../../packages/contracts/src/registry.js); [packages/contracts/test/contracts.test.js](../../packages/contracts/test/contracts.test.js).
- **Selected calls / effects:** `z.enum`, `z.strictObject`, `z.number`, `z.literal`, `z.string`, `z.boolean`, `createSuccessResponseSchema`, `lineItems.map`, `value.lineItems.reduce`, `BigInt`, `context.addIssue`, `value.lineItems.some`, `purchaseFinancialsSchema.safeExtend`, `isoDateTimeSchema.nullable`, `refundProviderStatusSchema.nullable`.

### [packages/contracts/src/common.js](../../packages/contracts/src/common.js)

Shared common Zod wire primitives/DTOs and refinements. Schema presence does not imply an implemented endpoint; see ARCHITECTURE/API_MAP.

- **Imports / dependencies:** `zod`.
- **Exports:** `module.exports=amountMinorSchema,createSuccessResponseSchema,currencySchema,httpUrlSchema,idempotencyKeySchema,imageUrlSchema,isoDateSchema,isoDateTimeSchema,minorMoneySchema,nullableImageUrlSchema,objectIdSchema,percentageSchema,policyVersionSchema,positiveAmountMinorSchema,positiveMinorMoneySchema,requestIdSchema`.
- **Named functions / components:** `createSuccessResponseSchema (L47)`.
- **Direct static consumers:** [packages/contracts/src/admin.js](../../packages/contracts/src/admin.js); [packages/contracts/src/auth.js](../../packages/contracts/src/auth.js); [packages/contracts/src/catalog.js](../../packages/contracts/src/catalog.js); [packages/contracts/src/commerce.js](../../packages/contracts/src/commerce.js); [packages/contracts/src/courses.js](../../packages/contracts/src/courses.js); [packages/contracts/src/errors.js](../../packages/contracts/src/errors.js); [packages/contracts/src/index.js](../../packages/contracts/src/index.js); [packages/contracts/src/learning.js](../../packages/contracts/src/learning.js); [packages/contracts/src/openapi.js](../../packages/contracts/src/openapi.js); [packages/contracts/src/pagination.js](../../packages/contracts/src/pagination.js); [packages/contracts/src/registry.js](../../packages/contracts/src/registry.js); [packages/contracts/src/reviews.js](../../packages/contracts/src/reviews.js); [packages/contracts/src/users.js](../../packages/contracts/src/users.js); [packages/contracts/test/contracts.test.js](../../packages/contracts/test/contracts.test.js).
- **Selected calls / effects:** `z.string`, `z.iso.date`, `z.iso.datetime`, `z.literal`, `z.number`, `z.strictObject`, `imageUrlSchema.nullable`.

### [packages/contracts/src/courses.js](../../packages/contracts/src/courses.js)

Shared courses Zod wire primitives/DTOs and refinements. Schema presence does not imply an implemented endpoint; see ARCHITECTURE/API_MAP.

- **Imports / dependencies:** `zod`, `./common`, `./users`.
- **Exports:** `module.exports=canonicalLanguageCodeSchema,courseCategorySchema,courseDetailSchema,courseIdParamsSchema,courseLevelSchema,courseLifecycleStatusSchema,courseRatingSummarySchema,curriculumSectionSchema,lessonPreviewSchema`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [packages/contracts/src/catalog.js](../../packages/contracts/src/catalog.js); [packages/contracts/src/index.js](../../packages/contracts/src/index.js); [packages/contracts/src/registry.js](../../packages/contracts/src/registry.js); [packages/contracts/test/contracts.test.js](../../packages/contracts/test/contracts.test.js).
- **Selected calls / effects:** `z.enum`, `z.strictObject`, `z.string`, `z.number`, `z.boolean`, `z.array`, `courseLevelSchema.nullable`, `canonicalLanguageCodeSchema.nullable`.

### [packages/contracts/src/errors.js](../../packages/contracts/src/errors.js)

Shared errors Zod wire primitives/DTOs and refinements. Schema presence does not imply an implemented endpoint; see ARCHITECTURE/API_MAP.

- **Imports / dependencies:** `zod`, `./common`.
- **Exports:** `module.exports=apiErrorDetailsSchema,apiErrorResponseSchema,apiErrorSchema,validationErrorDetailsSchema,validationIssueSchema`.
- **Named functions / components:** `containsNoControlCharacters (L5)`; `safePublicTextSchema (L6)`.
- **Direct static consumers:** [packages/contracts/src/index.js](../../packages/contracts/src/index.js); [packages/contracts/src/openapi.js](../../packages/contracts/src/openapi.js); [packages/contracts/src/registry.js](../../packages/contracts/src/registry.js); [packages/contracts/test/contracts.test.js](../../packages/contracts/test/contracts.test.js).
- **Selected calls / effects:** `z.string`, `schema.min`, `z.strictObject`, `safePublicTextSchema`, `z.array`, `apiErrorDetailsSchema.optional`.

### [packages/contracts/src/generateOpenApi.js](../../packages/contracts/src/generateOpenApi.js)

Writes the generated OpenAPI artifact from current schemas.

- **Imports / dependencies:** `node:fs`, `node:path`, `./openapi`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `writeFileSync`, `resolve`, `serializeOpenApiDocument`.

### [packages/contracts/src/index.js](../../packages/contracts/src/index.js)

Combines domain exports and fails on conflicting exported names.

- **Imports / dependencies:** `./admin`, `./auth`, `./catalog`, `./commerce`, `./common`, `./courses`, `./errors`, `./learning`, `./pagination`, `./registry`, `./reviews`, `./users`, `./openapi`.
- **Exports:** `module.exports=contracts`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/domains/catalog/catalogService.js](../../apps/api/domains/catalog/catalogService.js); [apps/api/shared/http/v2ErrorEnvelope.js](../../apps/api/shared/http/v2ErrorEnvelope.js); [apps/api/test/catalog-v2-contract.test.js](../../apps/api/test/catalog-v2-contract.test.js); [apps/api/test/catalog-v2-http.test.js](../../apps/api/test/catalog-v2-http.test.js); [apps/api/test/catalog-v2-repository.test.js](../../apps/api/test/catalog-v2-repository.test.js); [apps/api/test/catalog-v2-service.test.js](../../apps/api/test/catalog-v2-service.test.js); [apps/api/test/catalog-v2.integration.test.js](../../apps/api/test/catalog-v2.integration.test.js); [apps/api/test/v2-request-validation.test.js](../../apps/api/test/v2-request-validation.test.js).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [packages/contracts/src/learning.js](../../packages/contracts/src/learning.js)

Shared learning Zod wire primitives/DTOs and refinements. Schema presence does not imply an implemented endpoint; see ARCHITECTURE/API_MAP.

- **Imports / dependencies:** `zod`, `./common`.
- **Exports:** `module.exports=courseProgressSchema,emptyLearningRequestSchema,learningCourseParamsSchema,learningCourseResponseSchema,learningCourseStateSchema,learningCourseSummarySchema,learningLessonProgressParamsSchema,learningLessonSchema,learningProgressResponseSchema,learningSectionSchema,lessonPlaybackSchema,progressUpdateRequestSchema`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [apps/api/domains/learning/learningService.js](../../apps/api/domains/learning/learningService.js); [apps/api/routes/LearningV2.js](../../apps/api/routes/LearningV2.js); [apps/web/src/entities/learning/api/learningApi.js](../../apps/web/src/entities/learning/api/learningApi.js); [packages/contracts/src/index.js](../../packages/contracts/src/index.js); [packages/contracts/src/registry.js](../../packages/contracts/src/registry.js); [packages/contracts/test/contracts.test.js](../../packages/contracts/test/contracts.test.js); [packages/contracts/test/learning-v2.test.js](../../packages/contracts/test/learning-v2.test.js).
- **Selected calls / effects:** `z.strictObject`, `z.boolean`, `z.number`, `isoDateTimeSchema.nullable`, `context.addIssue`, `z.string`, `z.array`, `value.curriculum.map`, `value.curriculum.flatMap`, `section.lessons.map`, `value.progress.completedLessonIds.some`, `validLessonIds.has`, `createSuccessResponseSchema`.

### [packages/contracts/src/openapi.js](../../packages/contracts/src/openapi.js)

Builds deterministic OpenAPI 3.1 from schema registry and three implemented v2 operations.

- **Imports / dependencies:** `zod`, `./catalog`, `./common`, `./errors`, `./registry`.
- **Exports:** `module.exports=createOpenApiDocument,serializeOpenApiDocument`.
- **Named functions / components:** `toJsonSchema (L11)`; `toComponentSchema (L14)`; `withRequestIdResponseHeader (L19)`; `errorResponse (L26)`; `learningErrorResponses (L36)`; `createOpenApiDocument (L49)`; `serializeOpenApiDocument (L264)`.
- **Direct static consumers:** [packages/contracts/src/checkOpenApi.js](../../packages/contracts/src/checkOpenApi.js); [packages/contracts/src/generateOpenApi.js](../../packages/contracts/src/generateOpenApi.js); [packages/contracts/src/index.js](../../packages/contracts/src/index.js).
- **Selected calls / effects:** `z.toJSONSchema`, `toJsonSchema`, `withRequestIdResponseHeader`, `errorResponse`, `learningErrorResponses`, `toComponentSchema`, `createOpenApiDocument`.

### [packages/contracts/src/pagination.js](../../packages/contracts/src/pagination.js)

Shared pagination Zod wire primitives/DTOs and refinements. Schema presence does not imply an implemented endpoint; see ARCHITECTURE/API_MAP.

- **Imports / dependencies:** `zod`, `./common`.
- **Exports:** `module.exports=createCursorPageSchema,createOffsetPageSchema,cursorPageInfoSchema,cursorPaginationOpenApiSchema,cursorPaginationQuerySchema,offsetPageInfoSchema,offsetPaginationOpenApiSchema,offsetPaginationQuerySchema,opaqueCursorSchema,resourceIdParamsSchema`.
- **Named functions / components:** `blankAsUndefined (L11)`; `optionalQueryInteger (L14)`; `createCursorPageSchema (L73)`; `createOffsetPageSchema (L79)`.
- **Direct static consumers:** [packages/contracts/src/admin.js](../../packages/contracts/src/admin.js); [packages/contracts/src/catalog.js](../../packages/contracts/src/catalog.js); [packages/contracts/src/index.js](../../packages/contracts/src/index.js); [packages/contracts/src/registry.js](../../packages/contracts/src/registry.js); [packages/contracts/test/contracts.test.js](../../packages/contracts/test/contracts.test.js).
- **Selected calls / effects:** `value.trim`, `z.preprocess`, `schema.optional`, `opaqueCursorSchema.optional`, `optionalQueryInteger`, `z.number`, `z.strictObject`, `opaqueCursorSchema.nullable`, `z.boolean`, `context.addIssue`, `z.array`.

### [packages/contracts/src/registry.js](../../packages/contracts/src/registry.js)

Named shared schema registry used to generate OpenAPI components.

- **Imports / dependencies:** `./admin`, `./auth`, `./catalog`, `./commerce`, `./common`, `./courses`, `./errors`, `./learning`, `./pagination`, `./reviews`, `./users`.
- **Exports:** `module.exports=contractSchemas`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [packages/contracts/src/index.js](../../packages/contracts/src/index.js); [packages/contracts/src/openapi.js](../../packages/contracts/src/openapi.js).
- **Selected calls / effects:** Declarative data/config or no named call of interest..

### [packages/contracts/src/reviews.js](../../packages/contracts/src/reviews.js)

Shared reviews Zod wire primitives/DTOs and refinements. Schema presence does not imply an implemented endpoint; see ARCHITECTURE/API_MAP.

- **Imports / dependencies:** `zod`, `./common`.
- **Exports:** `module.exports=createReviewRequestSchema,publicReviewSchema,ratingSchema`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [packages/contracts/src/index.js](../../packages/contracts/src/index.js); [packages/contracts/src/registry.js](../../packages/contracts/src/registry.js); [packages/contracts/test/contracts.test.js](../../packages/contracts/test/contracts.test.js).
- **Selected calls / effects:** `z.number`, `z.strictObject`, `z.string`.

### [packages/contracts/src/users.js](../../packages/contracts/src/users.js)

Shared users Zod wire primitives/DTOs and refinements. Schema presence does not imply an implemented endpoint; see ARCHITECTURE/API_MAP.

- **Imports / dependencies:** `zod`, `./common`.
- **Exports:** `module.exports=accountTypeSchema,authProviderSchema,authProvidersSchema,genderSchema,instructorApprovalStatusSchema,profileDetailsSchema,publicInstructorSchema,userIdentitySchema,userProfileSchema`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** [packages/contracts/src/auth.js](../../packages/contracts/src/auth.js); [packages/contracts/src/courses.js](../../packages/contracts/src/courses.js); [packages/contracts/src/index.js](../../packages/contracts/src/index.js); [packages/contracts/src/registry.js](../../packages/contracts/src/registry.js); [packages/contracts/test/contracts.test.js](../../packages/contracts/test/contracts.test.js).
- **Selected calls / effects:** `z.enum`, `z.strictObject`, `z.string`, `isoDateSchema.nullable`, `genderSchema.nullable`, `z.email`, `z.boolean`.

## packages/contracts/test

### [packages/contracts/test/contracts.test.js](../../packages/contracts/test/contracts.test.js)

Regression/characterization tests for contracts.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `..`, `@studynotion/contracts/catalog`, `@studynotion/contracts/admin`, `@studynotion/contracts/auth`, `@studynotion/contracts/commerce`, `@studynotion/contracts/common`, `@studynotion/contracts/courses`, `@studynotion/contracts/errors`, `@studynotion/contracts/learning`, `@studynotion/contracts/pagination`, `@studynotion/contracts/reviews`, `@studynotion/contracts/users`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `contracts.requestIdSchema.safeParse`, `contracts.createSuccessResponseSchema`, `contracts.authSessionSchema.safeParse`, `contracts.userIdentitySchema.safeParse`, `contracts.userProfileSchema.safeParse`, `contracts.courseProgressSchema.safeParse`, `contracts.learnerPurchaseSchema.safeParse`, `catalogContracts.catalogCourseSchema.safeParse`, `contracts.createOpenApiDocument`, `test`, `assert.equal`, `contracts.objectIdSchema.safeParse`, `ids.course.toUpperCase`, `contracts.isoDateSchema.safeParse`, `contracts.minorMoneySchema.safeParse`, `contracts.positiveMinorMoneySchema.safeParse`, `contracts.httpUrlSchema.safeParse`, `assert.deepEqual`, `contracts.offsetPaginationQuerySchema.parse`, `contracts.cursorPaginationQuerySchema.parse`, `contracts.offsetPaginationQuerySchema.safeParse`, `contracts.resourceIdParamsSchema.safeParse`, `contracts.cursorPageInfoSchema.safeParse`, `successSchema.safeParse`, `contracts.apiErrorResponseSchema.safeParse`, `contracts.localLoginRequestSchema.safeParse`, `contracts.courseDetailSchema.safeParse`, `contracts.lessonPlaybackSchema.safeParse`, `contracts.publicReviewSchema.safeParse`, `contracts.checkoutRequestSchema.safeParse`, `contracts.refundRequestSchema.safeParse`, `contracts.reconciliationQueueItemSchema.safeParse`.
- **Test focus:** common wire primitives use exact request IDs and integer minor money; pagination and parameter contracts reject duplicates and unknown fields; success and error envelopes are strict and carry validated request IDs; auth and profile DTOs reject credentials, locks, and raw user fields (all cases indexed in TESTING).

### [packages/contracts/test/learning-v2.test.js](../../packages/contracts/test/learning-v2.test.js)

Regression/characterization tests for learning-v2.js; observable cases listed below and in TESTING.

- **Imports / dependencies:** `node:assert/strict`, `node:test`, `@studynotion/contracts/learning`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `learningResponse (L22)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `learningCourseResponseSchema.safeParse`, `learningProgressResponseSchema.safeParse`, `learningCourseParamsSchema.parse`, `learningLessonProgressParamsSchema.parse`, `learningLessonProgressParamsSchema.safeParse`, `learningCourseParamsSchema.safeParse`, `test`, `learningResponse`, `assert.equal`, `assert.deepEqual`, `emptyLearningRequestSchema.parse`, `emptyLearningRequestSchema.safeParse`, `progressUpdateRequestSchema.safeParse`.
- **Test focus:** learning v2 accepts canonical course state and direct progress responses; learning v2 rejects inconsistent curriculum and progress state; learning v2 DTOs reject identities and protected-media metadata; learning v2 route boundaries are strict and mark-only.

## Root

### [playwright.config.mjs](../../playwright.config.mjs)

Mocked catalog/learning browsers, build-local/preview server, retries and artifacts.

- **Imports / dependencies:** `@playwright/test`.
- **Exports:** `default `.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `defineConfig`.

### [playwright.live.config.mjs](../../playwright.live.config.mjs)

Optional externally running stack smoke with protected credential/trace rules.

- **Imports / dependencies:** `@playwright/test`, `./e2e/live-environment.cjs`.
- **Exports:** `default `.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `resolveLiveEnvironment`, `defineConfig`.

### [prettier.config.js](../../prettier.config.js)

Formatting/import sorting/Tailwind utility ordering policy.

- **Imports / dependencies:** No static module import..
- **Exports:** `module.exports=endOfLine,semi,singleQuote,tabWidth,trailingComma,bracketSpacing,tailwindStylesheet,importOrder,importOrderParserPlugins,plugins`.
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** Declarative data/config or no named call of interest..

## scripts

### [scripts/check-architecture.mjs](../../scripts/check-architecture.mjs)

Scans local import graph for frontend layer/feature/transport and bounded backend domain/composition constraints.

- **Imports / dependencies:** `node:fs`, `node:path`, `node:url`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `compareText (L19)`; `toRepositoryPath (L20)`; `listSourceFiles (L23)`; `lineNumberAt (L37)`; `extractModuleReferences (L45)`; `resolveExistingImport (L68)`; `resolveRepositoryImport (L84)`; `webCoordinate (L101)`; `isTestFile (L110)`; `isUiSource (L113)`; `apiModule (L124)`; `apiDomain (L129)`; `isApiCompositionTarget (L134)`; `isPublicModuleEntry (L138)`; `report (L142)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `candidates.find`, `layerRanks.get`, `resolve`, `dirname`, `fileURLToPath`, `join`, `relative`, `existsSync`, `readdirSync`, `compareText`, `entry.isDirectory`, `listSourceFiles`, `entry.isFile`, `sourceExtensions.has`, `extname`, `content.charCodeAt`, `content.matchAll`, `references.set`, `lineNumberAt`, `references.values`, `importExtensions.map`, `statSync`, `specifier.startsWith`, `specifier.slice`, `toRepositoryPath`, `resolveExistingImport`, `isTestFile`, `violations.push`, `layerRanks.keys`, `report`, `webCoordinate`, `readFileSync`.

### [scripts/scan-secrets.mjs](../../scripts/scan-secrets.mjs)

Pattern scan of current tracked/unignored text with explicit exclusions/fixtures; not Git history.

- **Imports / dependencies:** `node:child_process`, `node:fs`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** `value (L55)`; `compareText (L74)`; `listCandidateFiles (L76)`; `isBinary (L90)`; `lineNumberAt (L98)`; `isAllowedFixture (L106)`; `scanFile (L126)`; `main (L154)`.
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `match.slice`, `execFileSync`, `output.toString`, `content.charCodeAt`, `candidate.trim`, `dynamicReferencePattern.test`, `sourceFilePattern.test`, `codeReferencePattern.test`, `databaseUriPattern.test`, `credentialedUriPattern.test`, `placeholderPattern.test`, `fixturePathPattern.test`, `exampleEnvironmentPathPattern.test`, `existsSync`, `lstatSync`, `metadata.isFile`, `metadata.isSymbolicLink`, `readFileSync`, `isBinary`, `buffer.toString`, `content.matchAll`, `rule.value`, `isAllowedFixture`, `findings.push`, `lineNumberAt`, `listCandidateFiles`, `files.flatMap`, `findings.map`, `compareText`, `main`.

### [scripts/validate-image-reference.mjs](../../scripts/validate-image-reference.mjs)

CLI wraps strict immutable image digest validator.

- **Imports / dependencies:** `../apps/api/utils/imageReference.js`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `isImmutableImageReference`.

### [scripts/validate-recovery-host.cjs](../../scripts/validate-recovery-host.cjs)

Checks external private recovery env/state paths, permissions, allowed env keys and digest host contract.

- **Imports / dependencies:** `node:fs`, `node:path`.
- **Exports:** `module.exports=ALLOWED_KEYS,CANONICAL_STATE_DIRECTORY,parseEnvironmentFile,RecoveryHostConfigurationError,validateRecoveryHost`.
- **Named functions / components:** `constructor (L21)`; `fail (L28)`; `parseEnvironmentFile (L32)`; `assertPathOutsideRepository (L93)`; `assertRealPath (L107)`; `validateRecoveryHost (L117)`.
- **Direct static consumers:** [apps/api/test/recovery-host-validation.test.js](../../apps/api/test/recovery-host-validation.test.js).
- **Selected calls / effects:** `parsed.get`, `boundary.getTime`, `process.getuid`, `super`, `Buffer.byteLength`, `fail`, `contents.split`, `sourceLine.trim`, `line.startsWith`, `ALLOWED_KEYS.has`, `parsed.has`, `rawValue.trim`, `parsed.set`, `STRICT_UTC_TIMESTAMP.test`, `Number.isFinite`, `boundary.toISOString`, `Number.isSafeInteger`, `path.relative`, `path.isAbsolute`, `relative.startsWith`, `filesystem.realpathSync`, `process.cwd`, `path.normalize`, `assertPathOutsideRepository`, `path.resolve`, `filesystem.lstatSync`, `fileMetadata.isFile`, `fileMetadata.isSymbolicLink`, `stateMetadata.isDirectory`, `stateMetadata.isSymbolicLink`, `assertRealPath`, `parseEnvironmentFile`.

### [scripts/validate-release-pair.mjs](../../scripts/validate-release-pair.mjs)

Compares browser build and API env tier/site/provider/cookie identities before release.

- **Imports / dependencies:** `tldts`.
- **Exports:** No declared public export; entry/config/script or private module..
- **Named functions / components:** Declarative schema/config/re-export data; no named function captured..
- **Direct static consumers:** None found; check entry/config/CLI/test invocation and dynamic imports before inferring unused code..
- **Selected calls / effects:** `required.filter`, `missing.join`, `environment.DEPLOYMENT_TIER.trim`, `environment.RAZORPAY_KEY_ID.trim`, `environment.VITE_API_BASE_URL.trim`, `browserApiBaseUrl.replace`, `browserApiUrl.pathname.replace`, `environment.COOKIE_SAME_SITE.trim`, `getDomain`, `environment.FRONTEND_ORIGINS.split`, `value.trim`, `frontendOriginValues.map`, `frontendOrigins.includes`.

## Generated metadata inspected by purpose

- [package-lock.json](../../package-lock.json): npm reproducible dependency graph; exact resolved versions compared with manifests. No hand-edit recommended.
- [packages/contracts/openapi.json](../../packages/contracts/openapi.json): deterministic generated contract artifact; three v2 operations checked against route composition and generator.

## Tracked visual/media assets

All remaining tracked paths are inventoried below. They were not executed or interpreted as business logic; screenshots are historical evidence, not newly reproduced UI verification.

- [apps/web/public/favicon.ico](../../apps/web/public/favicon.ico)
- [apps/web/public/icon.svg](../../apps/web/public/icon.svg)
- [apps/web/public/logo.png](../../apps/web/public/logo.png)
- [apps/web/public/logo192.png](../../apps/web/public/logo192.png)
- [apps/web/public/logo512.png](../../apps/web/public/logo512.png)
- [apps/web/src/shared/assets/Images/Compare_with_others.png](../../apps/web/src/shared/assets/Images/Compare_with_others.png)
- [apps/web/src/shared/assets/Images/Compare_with_others.svg](../../apps/web/src/shared/assets/Images/Compare_with_others.svg)
- [apps/web/src/shared/assets/Images/FoundingStory.png](../../apps/web/src/shared/assets/Images/FoundingStory.png)
- [apps/web/src/shared/assets/Images/Instructor.png](../../apps/web/src/shared/assets/Images/Instructor.png)
- [apps/web/src/shared/assets/Images/Know_your_progress.png](../../apps/web/src/shared/assets/Images/Know_your_progress.png)
- [apps/web/src/shared/assets/Images/Know_your_progress.svg](../../apps/web/src/shared/assets/Images/Know_your_progress.svg)
- [apps/web/src/shared/assets/Images/Plan_your_lessons.png](../../apps/web/src/shared/assets/Images/Plan_your_lessons.png)
- [apps/web/src/shared/assets/Images/Plan_your_lessons.svg](../../apps/web/src/shared/assets/Images/Plan_your_lessons.svg)
- [apps/web/src/shared/assets/Images/TimelineImage.png](../../apps/web/src/shared/assets/Images/TimelineImage.png)
- [apps/web/src/shared/assets/Images/aboutus1.webp](../../apps/web/src/shared/assets/Images/aboutus1.webp)
- [apps/web/src/shared/assets/Images/aboutus2.webp](../../apps/web/src/shared/assets/Images/aboutus2.webp)
- [apps/web/src/shared/assets/Images/aboutus3.webp](../../apps/web/src/shared/assets/Images/aboutus3.webp)
- [apps/web/src/shared/assets/Images/banner.mp4](../../apps/web/src/shared/assets/Images/banner.mp4)
- [apps/web/src/shared/assets/Images/bghome.svg](../../apps/web/src/shared/assets/Images/bghome.svg)
- [apps/web/src/shared/assets/Images/boxoffice.png](../../apps/web/src/shared/assets/Images/boxoffice.png)
- [apps/web/src/shared/assets/Images/frame.png](../../apps/web/src/shared/assets/Images/frame.png)
- [apps/web/src/shared/assets/Images/login.webp](../../apps/web/src/shared/assets/Images/login.webp)
- [apps/web/src/shared/assets/Images/signup.webp](../../apps/web/src/shared/assets/Images/signup.webp)
- [apps/web/src/shared/assets/Logo/Logo-Full-Dark.png](../../apps/web/src/shared/assets/Logo/Logo-Full-Dark.png)
- [apps/web/src/shared/assets/Logo/Logo-Full-Light.png](../../apps/web/src/shared/assets/Logo/Logo-Full-Light.png)
- [apps/web/src/shared/assets/Logo/Logo-Small-Dark.png](../../apps/web/src/shared/assets/Logo/Logo-Small-Dark.png)
- [apps/web/src/shared/assets/Logo/Logo-Small-Light.png](../../apps/web/src/shared/assets/Logo/Logo-Small-Light.png)
- [apps/web/src/shared/assets/Logo/rzp_logo.png](../../apps/web/src/shared/assets/Logo/rzp_logo.png)
- [apps/web/src/shared/assets/TimeLineLogo/Logo1.svg](../../apps/web/src/shared/assets/TimeLineLogo/Logo1.svg)
- [apps/web/src/shared/assets/TimeLineLogo/Logo2.svg](../../apps/web/src/shared/assets/TimeLineLogo/Logo2.svg)
- [apps/web/src/shared/assets/TimeLineLogo/Logo3.svg](../../apps/web/src/shared/assets/TimeLineLogo/Logo3.svg)
- [apps/web/src/shared/assets/TimeLineLogo/Logo4.svg](../../apps/web/src/shared/assets/TimeLineLogo/Logo4.svg)
- [docs/audits/screenshots/catalog/active-filters-desktop.png](../../docs/audits/screenshots/catalog/active-filters-desktop.png)
- [docs/audits/screenshots/catalog/active-filters-mobile.png](../../docs/audits/screenshots/catalog/active-filters-mobile.png)
- [docs/audits/screenshots/catalog/api-error-desktop.png](../../docs/audits/screenshots/catalog/api-error-desktop.png)
- [docs/audits/screenshots/catalog/api-error-mobile.png](../../docs/audits/screenshots/catalog/api-error-mobile.png)
- [docs/audits/screenshots/catalog/course-detail-destination-desktop.png](../../docs/audits/screenshots/catalog/course-detail-destination-desktop.png)
- [docs/audits/screenshots/catalog/course-detail-destination-mobile.png](../../docs/audits/screenshots/catalog/course-detail-destination-mobile.png)
- [docs/audits/screenshots/catalog/empty-category-desktop.png](../../docs/audits/screenshots/catalog/empty-category-desktop.png)
- [docs/audits/screenshots/catalog/empty-category-mobile.png](../../docs/audits/screenshots/catalog/empty-category-mobile.png)
- [docs/audits/screenshots/catalog/loading-skeleton-desktop.png](../../docs/audits/screenshots/catalog/loading-skeleton-desktop.png)
- [docs/audits/screenshots/catalog/loading-skeleton-mobile.png](../../docs/audits/screenshots/catalog/loading-skeleton-mobile.png)
- [docs/audits/screenshots/catalog/missing-category-desktop.png](../../docs/audits/screenshots/catalog/missing-category-desktop.png)
- [docs/audits/screenshots/catalog/missing-category-mobile.png](../../docs/audits/screenshots/catalog/missing-category-mobile.png)
- [docs/audits/screenshots/catalog/no-results-desktop.png](../../docs/audits/screenshots/catalog/no-results-desktop.png)
- [docs/audits/screenshots/catalog/no-results-mobile.png](../../docs/audits/screenshots/catalog/no-results-mobile.png)
- [docs/audits/screenshots/catalog/pagination-end-desktop.png](../../docs/audits/screenshots/catalog/pagination-end-desktop.png)
- [docs/audits/screenshots/catalog/pagination-end-mobile.png](../../docs/audits/screenshots/catalog/pagination-end-mobile.png)
- [docs/audits/screenshots/catalog/populated-focus-desktop.png](../../docs/audits/screenshots/catalog/populated-focus-desktop.png)
- [docs/audits/screenshots/catalog/populated-focus-mobile.png](../../docs/audits/screenshots/catalog/populated-focus-mobile.png)
- [docs/audits/screenshots/learning/access-denied-desktop.png](../../docs/audits/screenshots/learning/access-denied-desktop.png)
- [docs/audits/screenshots/learning/access-denied-mobile.png](../../docs/audits/screenshots/learning/access-denied-mobile.png)
- [docs/audits/screenshots/learning/api-error-desktop.png](../../docs/audits/screenshots/learning/api-error-desktop.png)
- [docs/audits/screenshots/learning/api-error-mobile.png](../../docs/audits/screenshots/learning/api-error-mobile.png)
- [docs/audits/screenshots/learning/completed-progress-desktop.png](../../docs/audits/screenshots/learning/completed-progress-desktop.png)
- [docs/audits/screenshots/learning/completed-progress-mobile.png](../../docs/audits/screenshots/learning/completed-progress-mobile.png)
- [docs/audits/screenshots/learning/empty-curriculum-desktop.png](../../docs/audits/screenshots/learning/empty-curriculum-desktop.png)
- [docs/audits/screenshots/learning/empty-curriculum-mobile.png](../../docs/audits/screenshots/learning/empty-curriculum-mobile.png)
- [docs/audits/screenshots/learning/loading-desktop.png](../../docs/audits/screenshots/learning/loading-desktop.png)
- [docs/audits/screenshots/learning/loading-mobile.png](../../docs/audits/screenshots/learning/loading-mobile.png)
- [docs/audits/screenshots/learning/mobile-drawer-mobile.png](../../docs/audits/screenshots/learning/mobile-drawer-mobile.png)
- [docs/audits/screenshots/learning/populated-current-desktop.png](../../docs/audits/screenshots/learning/populated-current-desktop.png)
