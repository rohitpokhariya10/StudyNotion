# Docker and local development

## Image construction

Both Dockerfiles use repository root as build context because npm workspaces and `packages/contracts` are shared. Base images are digest-pinned; exact digests remain in source, not copied here.

| File                  | Build and runtime                                                                                                                                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/Dockerfile` | Node 24 bookworm-slim; workspace-aware `npm ci --omit=dev --ignore-scripts`; copies API/contracts; non-root `node`; API 4000; readiness health check. It is not an npm build of server TypeScript                                                                             |
| `apps/web/Dockerfile` | Node 24 builder installs web/contracts, validates tier-specific public values unless deliberate local-build mode, runs Vite, renders Nginx API/CSP origin; runtime digest-pinned `nginxinc/nginx-unprivileged:1.29-alpine`, non-root nginx, port 8080, `/health` health check |
| `.dockerignore`       | Excludes private environment files (including example patterns where applicable), Git, dependencies, tests, docs/audits, local outputs and archives. CI asserts image context/runtime boundaries                                                                              |

VITE variables are build-time public values; changing only a running container environment does not rewrite an existing JS bundle. Private API variables are runtime inputs. No secret should be baked into either image.

## Local Compose

`compose.local.yml` and `compose.local.env.example` define the local container stack.

| Service | Network/port                                | Storage/readiness/dependencies                                                         |
| ------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| web     | Container 8080 → loopback host 3000         | Static image; waits for healthy API                                                    |
| api     | Container 4000 → loopback host 4000         | Connects to service-name Mongo/Redis; waits for both healthy                           |
| mongo   | Internal 27017; MongoDB 8                   | Named database volume; ping health check                                               |
| redis   | Internal 6379; Redis 7.4 alpine             | Ephemeral tmpfs and persistence disabled; ping health check                            |
| seed    | Explicit `seed` profile; one-shot API image | Depends on healthy Mongo; invokes guarded demo seed; not normal automatic startup |

Default Compose networking provides internal service-name DNS. Database/cache ports are not published by this local app Compose. Defaults deliberately use development posture, lax/non-secure localhost cookies, and opt-in local OTP behavior; they are not production settings.

```text
Browser localhost:3000 → web container:8080 (static SPA)
Browser localhost:4000/api/v1 or /api/v2 → API container:4000
API → mongo:27017 (named volume)
API → redis:6379 (ephemeral limiter counters)
API → configured external providers
```

The browser uses an **absolute localhost API base** in this layout. Nginx's release proxy points at 127.0.0.1:4000 inside its own container; separate Compose web/API containers do not share loopback. Simply switching local Compose's browser base to `/api/v1` would not make that proxy reach the API service.

Native development uses root `npm run dev`: concurrently runs Vite (127.0.0.1:3000 configuration) and the Node watch API. `npm start` starts only web. `npm run build` runs public environment validation; `build:local` bypasses that release validator but runtime endpoint configuration is still required by the built app. Refer to existing README/runbook for environment setup, not private values in these documents.

## Integration Compose

`compose.integration.yml` runs only disposable MongoDB/Redis: loopback Mongo 27018 and Redis 6380, ephemeral tmpfs, health checks. Tests connect from the host using specially named databases/Redis indexes and explicit enable flags. It does not run web/API. Integration test guards reject unintended targets and production mode; teardown can drop the allowed test database. This audit did not start or mutate integration services.

## Recovery operations Compose

`compose.operations.yml` runs only `entitlement-recovery`, from required `STUDYNOTION_API_IMAGE_DIGEST`. It uses fixed container name `studynotion-entitlement-recovery`, `docker compose up` as a single-host max-one boundary, non-root node, init, no restart, read-only root, all capabilities dropped, no-new-privileges, PID limit 64, small noexec/nosuid/nodev tmpfs, ten-second stop grace, and no long-running healthcheck.

Private environment file and pre-created checkpoint directory are required external bind inputs. Scheduler requires directory mode 0700 and checkpoint mode 0600 with correct owner and no symlinks. `scripts/validate-recovery-host.cjs` checks the host contract before launch. This one-shot container needs an external scheduler; the repo does not install cron/cloud scheduling. Fixed name only controls one Docker host, not every host in a fleet. Do not use `compose run`/scale to bypass this boundary.

## Release Nginx

`apps/web/nginx.conf` serves immutable hashed assets (one-year cache), uncached SPA HTML/history fallback, gzip, security headers/CSP, upload body limit 30 MB, and web health. Exact `/api` and `/api/` proxy to task loopback API without path rewrite. Forwarded headers are deliberately preserved for the reviewed AWS ingress hop contract, not blindly appended with a new X-Forwarded-For chain.

This supports an ECS/Fargate-like shared task network with API/web ports 4000/8080. It is configuration evidence, not a checked-in ECS task definition. `render-nginx-config.mjs` validates the API origin used in CSP; it does not provision cloud ingress. See [DEPLOYMENT](DEPLOYMENT.md).
