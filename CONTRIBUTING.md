# Contributing

These instructions apply equally to humans, Claude, and Codex. This file is the single source of workflow rules; AGENTS.md and CLAUDE.md only point here.

## Issue → branch → pull request

1. Before starting a feature or fix, create a GitHub issue (or reuse the issue supplied by the requester). Use the feature or bug template: describe the problem, motivation, constraints, and acceptance criteria. Agents should use `gh issue create --body-file` with those same sections.
2. Branch from current `dev`: `feature/42-short-description`, `fix/42-short-description`, or `chore/42-short-description`. The number must identify the issue. `docs`, `refactor`, and `test` prefixes also work. Keep unrelated local changes separate, using a worktree when useful.
3. Implement the change and run the checks below. Every new commit must follow Conventional Commits. Reference the issue in the body where useful. Never commit contributor changes directly to `main` or `dev`.
4. Open a PR against `dev`, using a Conventional Commit title and `Closes #42` in its body. Describe the result and validation. PR policy checks the issue exists and is open, branch name, title, and new commits. Fix failed checks before merging. Feature PRs may be squash-merged; retain breaking-change footers in the squash message.
5. Release deliberately with a PR from this repository's `dev` to `main`. Use a title such as `chore(release): promote dev to main`. **Merge with a merge commit, never squash or rebase this promotion**: semantic-release must see the original feature and fix commits. Ordinary merges into `dev` do not publish.
6. After a release, open a `main` → `dev` synchronization PR and merge it with a merge commit, preserving release tags and generated files. This PR is exempt from the issue/branch checks. Do this before the next promotion.

`dev` should be the GitHub default branch so feature PRs close linked issues when merged. The contribution policy rejects other branches targeting `main`. Only the release bot may commit generated version/changelog changes directly to `main`.

## Commit format

Use `type(scope): description`, where scope is optional. Supported types include `feat`, `fix`, `perf`, `docs`, `chore`, `refactor`, `test`, `style`, `build`, `ci`, and `revert`.

- `feat: add route groups` → minor release.
- `fix(parser): accept empty params` → patch release. `perf` also produces a patch release.
- `feat!: remove legacy route syntax` → major release. Include a `BREAKING CHANGE: explain migration` footer for users. A breaking-change footer also triggers a major release without `!`.
- Other types do not normally trigger releases unless marked breaking.

Husky runs commitlint before accepting a commit. CI checks PR titles and feature commits. Historical commits predating this policy are not rewritten.

## Local checks

Use Node from `.nvmrc` and the pnpm version in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm tsc
pnpm lint
pnpm test:coverage
pnpm audit --audit-level high
pnpm size
pnpm release:prepare
npm pack --dry-run ./packages/fastify-file-router
```

Coverage measures all library source, including untested files. Minimums are 90% statements, lines, and functions, and 85% branches. CI also runs demo tests. The size limit is 25 kB of gzip-compressed built library JavaScript, excluding tests and external dependencies; this is a server library, so browser bundle size is not the relevant metric. Explain intentional threshold changes in the PR.

Audit includes development dependencies and fails on high/critical vulnerabilities. Codecov uploads `coverage/lcov.info`; configure `CODECOV_TOKEN` for hosted coverage reporting. Upload failures do not bypass the local coverage gate.

## Automated releases

`.github/workflows/release.yml` runs on pushes to `main`, after repeating the quality checks. semantic-release computes the version from commits since the previous `v*` tag, generates `CHANGELOG.md`, updates the library package version, creates the tag and GitHub release, and publishes `fastify-file-router` through npm OIDC. The root package is private and the demo is not published.

Generated changelog and version changes are committed by the release bot with `[skip ci]`. Do not edit versions or release changelog entries manually. The npm package includes the generated changelog, README, MIT license, JavaScript, and declarations, excluding compiled tests. The old manual publishing script has been removed.

The migration baseline is `v3.1.0` at `ebab6ea116135877f88f411668b6147d6a24e2aa`, verified against npm's `gitHead`. Do not move this tag or tag unreleased work as a published version.

## One-time maintainer setup

1. Set the GitHub default branch to `dev`. Require `Quality checks` and `Contribution policy` on contributor PRs to `dev`. Keep merge commits enabled for release and synchronization PRs. If you enforce protections on `main`, permit the release bot's generated commits and tags; a blanket required-PR rule on `main` prevents `@semantic-release/git` from working with `GITHUB_TOKEN`.
2. In the npm package settings for **fastify-file-router**, add a GitHub Actions trusted publisher with these exact values:
   - Organization or user: `bhouston`
   - Repository: `fastify-file-router`
   - Workflow filename: `release.yml` (not its directory path)
   - Environment name: leave blank (the release job does not use an environment)
3. After saving the npm settings, enable publishing with `gh variable set NPM_TRUSTED_PUBLISHING_ENABLED --body true`. Until then the release jobs are skipped. Do not add `NPM_TOKEN` or `NODE_AUTH_TOKEN`; authentication uses `id-token: write`. The pinned Node version supplies a recent npm, and semantic-release's npm plugin includes its compatible npm CLI.
4. Merge the implementation into `dev`, then promote `dev` to `main` with a merge commit when ready for a release. Review the Actions run, generated release notes, package contents, and npm provenance. Local dry runs cannot prove GitHub-to-npm OIDC authentication; the first real CI release verifies it.

See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [semantic-release on GitHub Actions](https://semantic-release.gitbook.io/semantic-release/recipes/ci-configurations/github-actions).

## Reusing this workflow

After the first successful release, copy the policy, agent pointers, templates, commitlint configuration, hooks, release configuration/scripts, and workflows into a dedicated GitHub template repository. Adapt package paths, package name, repository links, baseline tag, Node/pnpm versions, coverage and size thresholds, and trusted publisher identity for each destination. Do not copy this repository's release tags or assume another package uses the same npm trust relationship. Creating a separate template repository is a follow-up after this pilot is validated.
