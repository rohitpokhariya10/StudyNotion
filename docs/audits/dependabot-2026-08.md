# Dependabot and GitHub Actions audit — August 2026

This is a read-only snapshot taken on 24 August 2026 before repository
modularization. It records disposition, not an instruction to merge without a
fresh rebase and the current CI matrix.

## Main branch health

CI and security workflows passed on deployment-readiness commit
`1e91b2580655e99463e8326f216b6ce389434e96`. No failing main-branch job was
present. All 12 open pull requests were authored by Dependabot.

Every open PR's security workflow failed its dependency-review job because the
repository dependency graph was disabled. This was a repository-setting error,
not a reported vulnerable dependency. Enable the dependency graph in GitHub's
Code security settings and keep the existing high-severity review gate.

Both configured five-PR limits were saturated. Obsolete major and historical
directory updates therefore prevented normal update flow.

## Disposition

| PR                                                                                                                                                                                             | Update                                 | Disposition at audit time                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [#18](https://github.com/rohitpokhariya10/StudyNotion/pull/18)                                                                                                                                 | ESLint 9 to 10                         | Separate toolchain migration. Real `npm ci` failures: `eslint-plugin-react@7.37.5` did not accept ESLint 10. Do not bypass peer checks. |
| [#17](https://github.com/rohitpokhariya10/StudyNotion/pull/17)                                                                                                                                 | Playwright 1.61 to 1.62                | Relevant minor update; recreate or rebase after the move and rerun all browsers.                                                        |
| [#16](https://github.com/rohitpokhariya10/StudyNotion/pull/16)                                                                                                                                 | Node types 24 to 26                    | Defer while Node 24 is the supported runtime.                                                                                           |
| [#15](https://github.com/rohitpokhariya10/StudyNotion/pull/15)                                                                                                                                 | React Refresh ESLint plugin 0.4 to 0.5 | Recreate after the move; treat the pre-1.0 minor as potentially breaking and rerun lint/build.                                          |
| [#13](https://github.com/rohitpokhariya10/StudyNotion/pull/13), [#11](https://github.com/rohitpokhariya10/StudyNotion/pull/11), [#10](https://github.com/rohitpokhariya10/StudyNotion/pull/10) | Separate CodeQL 4.37.2 steps           | Superseded. Close and later update init, autobuild, and analyze together to one reviewed pinned SHA.                                    |
| [#12](https://github.com/rohitpokhariya10/StudyNotion/pull/12)                                                                                                                                 | checkout 4 to 7                        | Stale major with a merge conflict. Recreate as a separate action-runtime upgrade.                                                       |
| [#5](https://github.com/rohitpokhariya10/StudyNotion/pull/5)                                                                                                                                   | Mongoose 8 to 9 under `server/`        | Obsolete: main already used Mongoose 9.9.1 and the old lockfile path was removed.                                                       |
| [#4](https://github.com/rohitpokhariya10/StudyNotion/pull/4)                                                                                                                                   | responsive table 5 to 6                | Separate UI major; rerun instructor-table and mobile behavior after relocation.                                                         |
| [#3](https://github.com/rohitpokhariya10/StudyNotion/pull/3)                                                                                                                                   | `gcp-metadata` 5 to 8 under `server/`  | Obsolete patch. Audit the unused direct dependency separately instead of merging the historical lockfile.                               |
| [#2](https://github.com/rohitpokhariya10/StudyNotion/pull/2)                                                                                                                                   | setup-node 4 to 7                      | Relevant action-runtime major, but recreate and verify after migration.                                                                 |

The audit made no GitHub mutations because no authenticated GitHub CLI or API
session was available. Old red runs remain historical evidence and must not be
erased by rewriting Git history.

## Ongoing hygiene

- Keep one npm updater at `/` while the repository uses one root workspace
  lockfile.
- Group `github/codeql-action/*` so all CodeQL phases use the same pinned SHA.
- Group routine minor/patch updates or explicitly defer majors so major work
  cannot consume the complete PR limit.
- Enable the dependency graph rather than weakening dependency review.
- Rebase every relevant update after structural changes and require current
  main-branch tests; a green stale run is not merge evidence.
- Never use `npm audit fix --force` as automated dependency maintenance.
