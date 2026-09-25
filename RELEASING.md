# Releases

## Local checks

Coverage measures all library source, including untested files. Minimums are 90% statements, lines, and functions, and 85% branches (`pnpm test:coverage`). The size limit is 25 kB of gzip-compressed built library JavaScript, excluding tests and external dependencies; this is a server library, so browser bundle size is not the relevant metric (`pnpm size`). Audit includes development dependencies and fails on high/critical vulnerabilities (`pnpm audit --audit-level high`). Explain intentional threshold changes in the PR.

Codecov uploads `coverage/lcov.info`; configure `CODECOV_TOKEN` for hosted coverage reporting. Upload failures do not bypass the local coverage gate.

## Automated releases

`.github/workflows/release.yml` is triggered manually, never on push: `gh workflow run release.yml --ref main`. It rejects dispatches against any ref other than `main`, repeats the quality checks against the exact dispatched commit, and aborts if `main` has advanced past that commit before the release step runs. semantic-release then computes the version from commits since the previous `v*` tag, generates release notes, creates the tag and GitHub release, and publishes `fastify-file-router` through npm OIDC via `pnpm publish` (`@anolilab/semantic-release-pnpm`). The root package is private and the demo is not published.

semantic-release no longer commits a version/changelog update back to `main`; `main` is protected and there is no bypass for generated commits. There is no `CHANGELOG.md`; the [GitHub Releases page](https://github.com/bhouston/fastify-file-router/releases) is the changelog of record. Do not edit versions manually or hand-push tags. The npm package includes the hand-maintained package README, MIT license, JavaScript, and declarations, excluding compiled tests. The package README lives at `packages/fastify-file-router/README.md` and is the canonical documentation; the root README is a short landing page that links to it.

Use the workflow's `dry_run` input to verify version computation without publishing. When there are no release-worthy commits since the last tag, the workflow succeeds as a no-op and says so in the run summary.

The migration baseline is `v3.1.0` at `ebab6ea116135877f88f411668b6147d6a24e2aa`, verified against npm's `gitHead`. Do not move this tag or tag unreleased work as a published version.

## One-time maintainer setup

1. Set the GitHub default branch to `main`. Require `Quality checks` and `Contribution policy` on contributor PRs to `main`.
2. In the npm package settings for **fastify-file-router**, add a GitHub Actions trusted publisher with these exact values:
   - Organization or user: `bhouston`
   - Repository: `fastify-file-router`
   - Workflow filename: `release.yml` (not its directory path)
   - Environment name: leave blank (the release job does not use an environment)
3. Do not add `NPM_TOKEN` or `NODE_AUTH_TOKEN`; authentication uses `id-token: write`. Publishing runs through `pnpm publish` via `@anolilab/semantic-release-pnpm`, using the pnpm version pinned in `packageManager`.
4. Merge feature PRs into `main` as they land. When ready to publish, dispatch `Release` on `main`. Review the Actions run, generated release notes, package contents, and npm provenance. Local dry runs cannot prove GitHub-to-npm OIDC authentication; the first real CI release verifies it.

See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [semantic-release on GitHub Actions](https://semantic-release.gitbook.io/semantic-release/recipes/ci-configurations/github-actions).
