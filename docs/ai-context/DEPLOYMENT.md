# Deployment evidence: local, staging, production

## Evidence boundary

`docs/operations/deployment.md` is the existing canonical runbook. It states that current AWS staging uses web/API in the same task and same browser origin. `apps/web/nginx.conf` explicitly implements `/api` → `127.0.0.1:4000`, and CI validates relevant same-origin builds/proxy behavior. This audit did not inspect AWS accounts, DNS, running tasks, logs, registries, live secrets, or real provider setup.

| Item                                                        | Repository evidence                                                                       | What is not established                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| AWS/ECS/Fargate-style staging task                          | Runbook/README statements and Nginx shared-loopback assumption                            | No task definition, cluster/service creation, live task ID or deployment verification |
| HTTPS ingress/load balancer                                 | Runbook requires HTTPS, forwarded Host/Origin/request ID and exact proxy hops             | No checked-in ALB listener/rule/certificate/target-group definition                   |
| Container registry/ECR                                      | Runbook requires immutable registry digests and image validator accepts digest references | No configured ECR repository or registry-push CI job                                  |
| MongoDB/Atlas-compatible TLS                                | URI validators, pool/timeouts, explicit indexes and preflight                             | No database instance/backup/network/replication provisioning                          |
| Managed TLS Redis                                           | Required production authenticated rediss URL and readiness/limiter implementation         | No ElastiCache instance, subnet or security-group definition                          |
| EC2, VPC/subnets/security groups, IAM, Route 53, CloudWatch | No deployable resource definitions discovered                                             | Do not teach these as implemented services just because common on AWS                 |
| Recovery scheduling                                         | One-shot hardened Compose adapter and checkpoint contract                                 | No cron, EventBridge, fleet scheduler, or managed task schedule installed by repo     |

## Supported release request flow

```text
Browser → public HTTPS AWS/platform entry point (runbook responsibility)
        → web Nginx:8080 (checked-in image/config)
        → /api or /api/* → same-task loopback API:4000 (checked-in proxy)
API → private TLS MongoDB / authenticated TLS Redis (validated runtime inputs)
API → Razorpay, Cloudinary, Resend, Google (implemented integrations)
Browser → Cloudinary short-lived authenticated playback URL
```

DNS provider and exact ingress resource are intentionally unnamed here. Same-origin browser base is exactly `/api/v1`, with v2 derived. An absolute HTTPS API origin ending `/api/v1` is also supported, but app/API must share one registrable site; `tldts` validates the site relationship. Browser cookies are credentialed with the configured secure SameSite/domain posture. An unrelated-site API is rejected even if SameSite=None might otherwise be considered, because browser cookie restrictions make that topology unreliable.

Local Compose is different: browser→localhost web and browser→absolute localhost API, with separate containers/service-name dependencies. See [DOCKER](DOCKER.md).

## Tier rules and public/private settings

`apps/api/config/env.js` requires NODE_ENV production together with DEPLOYMENT_TIER staging or production. Both use production security posture: secure cookies, explicit numeric reviewed proxy count (1–10), non-loopback TLS dependencies, private secrets, disabled automatic DB indexing, and no development OTP. Staging requires Razorpay test-mode public key; production live-mode. Google client ID is optional on both staging sides together, required in production. Staging media/database/provider resources must be isolated by operator configuration; the repo can validate shape, not prove account isolation.

| Group                       | Names and consumer                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser build               | VITE_DEPLOYMENT_TIER, VITE_API_BASE_URL, VITE_GOOGLE_CLIENT_ID, VITE_RAZORPAY_KEY_ID, VITE_SUPPORT_EMAIL, VITE_LEGAL_ENTITY_NAME, VITE_LEGAL_ADDRESS, VITE_LEGAL_JURISDICTION; `apps/web/scripts/validate-public-env.mjs`, endpoint/auth/checkout/legal UI |
| Public application identity | APP_URL, PUBLIC_API_URL, FRONTEND_ORIGINS (legacy FRONTEND_URL), BRAND_NAME, BRAND_LOGO_URL, SUPPORT_EMAIL                                                                            |
| Session/security            | JWT_SECRET, OTP_SECRET, COOKIE_NAME/DOMAIN/SAME_SITE/SECURE, TRUST_PROXY, ALLOW_DEV_OTP                                                                                               |
| Database/limiter            | MONGODB_URI (legacy MONGODB_URL), MONGODB_AUTO_INDEX and bounded MONGODB_* options, REDIS_URL and bounded Redis options                                                               |
| Email                       | RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO, CONTACT_RECIPIENT                                                                                                                         |
| Payments                    | RAZORPAY_KEY_ID, RAZORPAY_SECRET, RAZORPAY_WEBHOOK_SECRET, REFUND_WINDOW_DAYS, checkout timeout tuning                                                                                |
| Media/identity              | CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET, FOLDER_NAME, media upload/playback limits, GOOGLE_CLIENT_ID                                                                              |
| Entitlement/operations      | ENTITLEMENT_SIDECAR_STARTED_AT; immutable API image digest, private recovery environment/state/checkpoint paths; explicit job confirmation variables                                  |
| Telemetry/lifecycle         | LOG_LEVEL, release/environment metadata, HTTP/shutdown tuning as validated in env/lifecycle helpers                                                                                   |

This lists names only. Full source-derived names per example file appear in FILE_MAP, and the existing deployment runbook contains the detailed classified inventory. No private values belong in VITE names, build args, Git, screenshots, or these docs.

## Validation and release operations

`scripts/validate-release-pair.mjs` compares public web values to the backend configuration: tier, origins/API path, Google/Razorpay identities, support values, cookie/site relationships, and production posture. `apps/web/scripts/deployment-network.mjs`/`render-nginx-config.mjs` validate and render the API CSP origin. `utils/imageReference.js` plus root validator enforce immutable digest image references. Recovery-host validator checks private paths, ownership, permissions, allowed keys, and runtime isolation contract.

Runbooks require same reviewed Git SHA for web/API artifacts, recorded digest after push, DB backup before changes, explicit index creation/verification, preflight before promotion, and safe initial admin provisioning. Preflight validates configuration and database/media/index consistency, enrollment report, and entitlement recovery health. It is not a repair tool, provider transaction rehearsal, or certificate of deployed infrastructure correctness.

`ENTITLEMENT_SIDECAR_STARTED_AT` is one immutable exact UTC boundary shared across API/preflight/recovery. Moving it casually changes which financial records are eligible; recovery/checkpoint rules fail closed on mismatch. Index rollout is additive; rolling application code back should not mean dropping financial/entitlement evidence automatically.

## Health and observability

Web `/health` confirms Nginx. API `/health/live` confirms process response; `/health/ready` checks DB/Redis/configuration and shutdown. Runtime logs are structured/redacted with request IDs and bounded operational metadata. Frontend has an error reporter hook but no installed vendor integration. CloudWatch/alarms/log shipping remain platform responsibilities; no checked-in monitoring infrastructure proves they are configured.

## What was not executed

This audit did not deploy, build/push cloud images, run live E2E, connect to production/staging data, run migrations/seeds/recovery, call payment/refund providers, or read private environment values. Existing audit/runbook evidence describes prior work; [TESTING](TESTING.md) records checks freshly executed for this documentation task.
