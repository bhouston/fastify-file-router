# Releasing

Releases are manual and maintainer-only. Merging to `main` never publishes.

## Running a Release

```sh
gh workflow run release.yml --ref main                  # release
gh workflow run release.yml --ref main -f dry_run=true  # preview only, publishes nothing
```

When there are no release-worthy commits since the last `v*` tag, the run is a no-op.

## What the Workflow Does

1. Refuses any ref other than `main`.
2. Runs the full CI workflow on the dispatched commit.
3. Stops if `main` has moved since the dispatch.
4. Installs, builds, and runs `pnpm release`, which is semantic-release.
5. semantic-release computes the next version, creates the `v<version>` tag and GitHub Release, and publishes.

Releases run one at a time and never cancel a publish in progress. npm packages publish through npm trusted publishing (GitHub OIDC), so no `NPM_TOKEN` is stored.

## Versioning

The version comes from the Conventional Commits since the last `v*` tag. The highest change wins:

- `feat` produces a minor release.
- `fix` and `perf` produce a patch release.
- `!` or a `BREAKING CHANGE:` footer produces a major release.
- Other types do not trigger a release.

Everything this repository publishes shares one version. `package.json` versions in source are development snapshots; the Git tag and the registry hold the released version. [GitHub Releases](https://github.com/bhouston/fastify-file-router/releases) is the changelog of record.

## One-Time Setup

1. On npmjs.com, open each package's Trusted Publisher settings, choose GitHub Actions, and enter organization or user `bhouston`, repository `fastify-file-router`, workflow filename `release.yml`, and environment name `npm`.
2. Protect `main`: require pull requests and the CI checks, allow merge commits, and block force pushes and deletion.
3. If the repository uploads coverage to Codecov, add the `CODECOV_TOKEN` repository secret.

## Recovery

Publishing is not atomic. If a run fails part way, compare the registry versions, the `v<version>` tag, and the workflow log, then finish what is missing from the same release commit. If publishing succeeded but the GitHub Release failed, create the release from the existing tag. Never republish a version, delete a published version, or move a release tag. Resolve the failure before dispatching another release.

## Repository Specifics

### Published Artifacts

- `fastify-file-router` on npm, from `packages/fastify-file-router`. The root package and `@fastify-file-router/website` are private and never published.

### Required Checks

Pull requests run `ci`, `contribution`, and `node-compat (Node 22)`, `node-compat (Node 24)`, `node-compat (Node 26)`. Require these on `main`.

### Thresholds

- Coverage: 90% statements, lines, and functions and 85% branches (`pnpm test:coverage`).
- Size: 25 kB gzip of built library JavaScript, excluding tests and dependencies (`pnpm size`).
- Audit: `pnpm audit --audit-level high` fails on high or critical findings.

Explain any intentional threshold change in the PR.

### Local Validation

`pnpm release:check` verifies the version rules and release-note rendering. `pnpm release:prepare` copies `LICENSE` into the package, as the release does before publishing.

### Website

The documentation site deploys to GitHub Pages from `.github/workflows/pages.yml` on every push to `main`, independent of releases. Pages must use **GitHub Actions** as its source. See `packages/website/README.md`.
