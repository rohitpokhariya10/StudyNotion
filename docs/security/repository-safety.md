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
git check-ignore -v .env server/.env
git ls-files .env server/.env full-stack-project-clean.zip
```

Both environment files must be reported as ignored by the first command and must
produce no output from `git ls-files`. The local archive must also remain
untracked and ignored. Never print environment values into a terminal transcript.

For local filesystem hygiene:

```bash
chmod 600 .env server/.env
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
npm run lint
npm test
npm run build:local
npm --workspace studynotion-backend test
```

CI runs the public production configuration validator through `npm run build`.
Do not place backend secrets in `VITE_*` values or in a frontend bundle.

The following scripts can change database or account state and are not part of a
repository safety check:

- `npm --workspace studynotion-backend run seed`
- `npm --workspace studynotion-backend run db:backfill-security`
- `npm --workspace studynotion-backend run db:indexes`
- `npm --workspace studynotion-backend run admin:provision`

## 5. Use disposable integration dependencies

```bash
docker compose -f compose.integration.yml up -d --wait
docker compose -f compose.integration.yml ps
docker compose -f compose.integration.yml down --remove-orphans
```

MongoDB binds to `127.0.0.1:27018` and Redis binds to `127.0.0.1:6380` by
default. Override `INTEGRATION_MONGO_PORT` or `INTEGRATION_REDIS_PORT` when those
ports are occupied. The services use container tmpfs storage and no host volume;
stopping them discards their data.

## 6. Review the exact staged snapshot

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

## 7. Commit, push, and roll back safely

Run the relevant checks immediately before each feature commit and push. Prefer a
new revert commit for rollback:

```bash
git revert <commit>
git push origin main
```

Do not rewrite shared `main` history or use `git reset --hard` as a deployment
rollback. The pre-productization recovery anchor is the annotated tag
`pre-productization-2026-07-20`.
