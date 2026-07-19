# StudyNotion baseline audit — July 2026

**Observed:** 20 July 2026

**Baseline commit:** `44b26f7` (`chore: snapshot hardened pre-productization baseline`)

**Rollback tag:** `pre-productization-2026-07-20`

## Scope

This audit records the repository-safety gate before the first catalog vertical
slice. It does not authorize or include payment, identity, entitlement, account
deletion, protected-media, or destructive database changes.

## Repository state and hygiene

- The hardened working tree was captured on `main`, pushed to `origin/main`, and
  tagged before productization work began.
- Real `.env` and `server/.env` files are ignored, are not tracked, and were not
  included in the baseline commit. Environment example files remain tracked.
- The local `full-stack-project-clean.zip` is preserved but ignored. It must not
  be staged, copied into a container context, or treated as a deployment artifact.
- Dependency folders, coverage, `build`, `dist`, rendered Nginx configuration,
  Playwright output, and local source archives are ignored.
- Both npm lockfiles use lockfile version 3 and match their package manifests.

## Runtime observation

The local verification shell reported:

```text
node v26.3.0
npm 11.16.0
```

This does not match `.nvmrc` and the package engine policy, which require Node 24
(`>=24 <25`). The local results below are useful compatibility evidence, but the
Node 24 CI lane remains the supported-runtime authority. Node 26 must not be
declared supported until that migration is reviewed separately.

## Baseline verification

| Check | Command | Result |
|---|---|---|
| Frontend locked install | `npm ci` | Passed |
| Backend locked install | `npm --prefix server ci` | Passed |
| Frontend lint | `npm run lint` | Passed |
| Frontend tests | `npm test` | Passed: 46 tests |
| Local production bundle | `npm run build:local` | Passed |
| Backend tests | `npm --prefix server test` | Passed: 106/106 after loopback binding was allowed |
| Environment ignore check | `git check-ignore -v .env server/.env` | Passed: both real files are ignored |
| Heuristic secret scan | `node scripts/scan-secrets.mjs` | Passed; output is limited to file, line, and rule identifiers |

The existing CI additionally runs the public production-environment validator
through `npm run build` with non-secret CI values.

## Security automation added at Phase 0

- Immutable action SHAs in the existing CI workflow.
- Weekly Dependabot checks for root npm, server npm, and GitHub Actions.
- A deterministic redacted repository secret scan on pushes and pull requests.
- Dependency review for pull requests, failing on high-severity findings.
- CodeQL analysis for JavaScript and TypeScript.
- Disposable MongoDB and Redis integration services with health checks and no
  host data volumes.

## Limitations and follow-up

- The local scanner is deterministic defense in depth, not an entropy scanner or
  a substitute for provider-side secret revocation. Run a dedicated history scan
  before accepting the baseline if Gitleaks is available.
- The local environment files were mode `0644` when first observed and were
  restricted to owner-only mode `0600` during the safety gate.
- The attached archive contains repository metadata, installed dependencies, and
  generated output. It is intentionally excluded, but should be stored outside
  the source checkout for long-term hygiene.
- This Phase 0 work changes no database shape or API contract.
