# Repository safety runbook

Use this runbook before staging, committing, or packaging StudyNotion changes.
Commands assume the repository root as the working directory.

## 1. Confirm the baseline

```bash
git status --short --branch
git branch --show-current
git log --oneline --decorate -10
git tag --list 'pre-productization-*'
node --version
npm --version
```

The supported runtime is Node 24. A different runtime may provide compatibility
evidence, but it does not replace the Node 24 CI result.

## 2. Protect environment files and local artifacts

```bash
git check-ignore -v \
  .env server/.env apps/web/.env apps/api/.env compose.local.env
git ls-files -- \
  .env server/.env apps/web/.env apps/api/.env compose.local.env \
  full-stack-project-clean.zip
```

The app-local files, user-owned Compose file, and both legacy compatibility
locations must be reported as ignored by the first command and must produce no
output from `git ls-files`. The local archive must also remain untracked and
ignored. Never print environment values into a terminal transcript. Do not move
or delete a legacy environment file until its app-local replacement has been
verified independently.

For local filesystem hygiene:

```bash
for environment_file in \
  .env server/.env apps/web/.env apps/api/.env compose.local.env; do
  test ! -e "$environment_file" || chmod 600 "$environment_file"
done
```

## 3. Scan before staging

```bash
node scripts/scan-secrets.mjs
```

The scanner enumerates Git-tracked files plus unignored source files. Findings
show only `file:line [rule]`; matched values are never printed. Obvious example
values and synthetic test fixtures are allowed, but real-looking credentials in
test files still fail.

When Gitleaks is available, also scan committed history and the staged snapshot:

```bash
gitleaks git --no-banner --redact --log-opts='--all' .
gitleaks git --pre-commit --redact --staged --verbose .
```

Treat every real finding as exposed: remove it from the proposed change, revoke
it at the provider, and follow an approved history-remediation plan if it already
entered Git history.

## 4. Install and verify from lockfiles

```bash
npm ci
npm run verify
npm run architecture:check
npm run test:e2e
```

CI runs the public production configuration validator through `npm run build`.
The local build output belongs under `apps/web/dist`; it must remain ignored.
Do not place backend secrets in `VITE_*` values or in a frontend bundle.

The following scripts can change database or account state and are not part of a
repository safety check:

- `npm --workspace studynotion-backend run seed`
- `npm --workspace studynotion-backend run db:backfill-security`
- `npm --workspace studynotion-backend run db:indexes`
- `npm --workspace studynotion-backend run admin:provision`

## 5. Review dependency updates deliberately

Enable GitHub's dependency graph so the pull-request dependency-review job can
enforce the existing high-severity gate. Do not disable that job merely to make
bot branches green.

Rebase a dependency update onto current `main`, inspect its major-version and
runtime implications, and require the complete affected test matrix. Keep
substantive major upgrades separate from structural changes. Never use
`npm audit fix --force` or peer-dependency bypass flags as routine automation.
The August 2026 queue disposition is a dated audit in
`docs/audits/dependabot-2026-08.md`; it is not permanent merge approval.

## 6. Use disposable integration dependencies

```bash
docker compose -f compose.integration.yml up -d --wait
docker compose -f compose.integration.yml ps
docker compose -f compose.integration.yml down --remove-orphans
```

MongoDB binds to `127.0.0.1:27018` and Redis binds to `127.0.0.1:6380` by
default. Override `INTEGRATION_MONGO_PORT` or `INTEGRATION_REDIS_PORT` when those
ports are occupied. The services use container tmpfs storage and no host volume;
stopping them discards their data.

## 7. Review the exact staged snapshot

Stage named paths, then inspect the index:

```bash
git add -- path/to/file another/path
git diff --cached --check
git diff --cached --name-status
node scripts/scan-secrets.mjs
```

Do not commit until the staged list contains only intended source, configuration,
tests, and documentation. Never stage real environment files, dependency folders,
generated builds, browser-test reports, or source archives.

## 8. Commit, push, and roll back safely

Run the relevant checks immediately before each feature commit and push. Prefer a
new revert commit for rollback:

```bash
git revert <commit>
git push origin main
```

Do not rewrite shared `main` history or use `git reset --hard` as a deployment
rollback. The pre-productization recovery anchor is the annotated tag
`pre-productization-2026-07-20`.
