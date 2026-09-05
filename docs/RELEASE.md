# Release Runbook

This project uses Changesets for release intent and GitHub Actions for publication. The steady-state publication path uses npm Trusted Publishing (OIDC); no long-lived npm publish token belongs in this repository.

## Current v0.1.0 publication state

The final npm package name is:

```text
@shimabell06/cloud-arch-icon-browser
```

The v0.1.0 publication PR sets `private=false` and `publishConfig.access=public`. The current official `Azure_Public_Service_Icons_V24.zip` has passed the production-parser verification recorded in `COMPATIBILITY.md`, so the compatibility release gate is now `PASS`.

Before merging the v0.1.0 publication PR, a maintainer must complete the remaining npm account/bootstrap steps:

1. Complete the one-time npm package bootstrap described below.
2. Configure npm Trusted Publishing for the package and this repository's `release.yml` workflow.
3. Confirm normal PR CI is green, then merge the publication PR.

When `private=false`, `npm run verify:release-ready` makes the scoped package name, repository URL, lockfile metadata, stable SemVer, and compatibility PASS record mandatory.

For future Microsoft package updates, download the current official ZIP separately, run `npm run verify:official -- /path/to/latest-official.zip`, and update `COMPATIBILITY.md` only after successful production-parser verification. Never commit the Microsoft ZIP or SVG assets.

## One-time npm bootstrap

A Trusted Publisher is configured against an npm package that already exists. For the first publication of `@shimabell06/cloud-arch-icon-browser`, create the registry package once without consuming the intended `v0.1.0` release.

Use a disposable clean copy/worktree. Do not commit the bootstrap version to the repository.

1. Install and validate the release candidate:

   ```bash
   npm ci
   npm run check
   npm test
   npm run build
   npm run test:cli-package-smoke
   npm run verify:package
   npm run verify:release-ready
   ```

2. In the disposable copy only, set version `0.0.0`:

   ```bash
   npm version 0.0.0 --no-git-tag-version
   ```

3. Authenticate interactively to npm with the maintainer account and its required 2FA/passkey controls:

   ```bash
   npm login
   ```

4. Publish only the bootstrap version under a non-default dist-tag:

   ```bash
   npm publish --access public --tag bootstrap
   ```

5. Configure the Trusted Publisher for the newly created package. In npmjs.com use:
   - Provider: GitHub Actions
   - Organization or user: `ShimaBell0619`
   - Repository: `cloud-arch-icon-browser`
   - Workflow filename: `release.yml`
   - Environment: leave blank unless a GitHub Environment is deliberately introduced
   - Allowed actions: enable direct `npm publish`

   With a current npm CLI, the equivalent interactive configuration can be performed with:

   ```bash
   npm trust github @shimabell06/cloud-arch-icon-browser \
     --repo ShimaBell0619/cloud-arch-icon-browser \
     --file release.yml \
     --allow-publish
   ```

6. Discard the disposable `0.0.0` package changes. The repository remains at `0.1.0`.
7. After the first successful OIDC release, remove the `bootstrap` dist-tag if it is no longer useful. The published `0.0.0` version remains historical registry metadata.
8. After OIDC is proven, set npm Publishing access to the strongest appropriate setting, preferably **Require two-factor authentication and disallow tokens**.

If npm later supports establishing a Trusted Publisher for a never-published package without a bootstrap version, prefer that supported flow and update this runbook.

## Trusted Publishing contract

`.github/workflows/release.yml` runs on a GitHub-hosted Ubuntu runner and grants `id-token: write`. It uses the Node version pinned by `.node-version`, which satisfies npm Trusted Publishing minimums.

The workflow intentionally does not use `NPM_TOKEN`. npm exchanges the GitHub OIDC identity during `npm publish`. The Trusted Publisher must explicitly permit direct `npm publish` because new configurations default to staged publishing permission.

The `repository.url` in `package.json` must remain exactly:

```text
https://github.com/ShimaBell0619/cloud-arch-icon-browser.git
```

The npm Trusted Publisher configuration must point to the exact workflow filename `release.yml`.

## Release-time gates

When publication is activated, `release.yml` performs these gates before publishing:

1. `npm run verify:release-ready`
2. `npm audit --audit-level=high` — High/Critical findings fail the release
3. formatting/lint checks and unit tests
4. production build
5. packaged CLI smoke test
6. `npm pack --dry-run` content validation via `npm run verify:package`
7. npm registry version check

The package-content validation rejects development/test directories, ZIP files, SVG assets, and non-allowlisted top-level paths.

## Version, tag, and GitHub Release

`package.json` is the version authority for publication. For version `X.Y.Z`, the release workflow derives the immutable tag `vX.Y.Z`.

The workflow publishes/checks `name@X.Y.Z` first, then creates `vX.Y.Z`, then creates the GitHub Release for that same tag. It never moves an existing version tag. If a tag already exists at a different commit, the release fails.

This order permits recovery if npm accepted a publish but tag/Release creation failed: a rerun detects the existing registry version and continues with missing GitHub metadata instead of attempting to republish the immutable npm version.

## Normal post-v0.1.0 release flow

For a user-visible/package-relevant change:

1. In the feature/fix PR, run:

   ```bash
   npm run changeset
   ```

2. Select the SemVer bump and describe the release-facing change.
3. Merge the PR to `main` after CI passes.
4. `.github/workflows/release-pr.yml` aggregates pending Changesets into `chore: release packages`.
5. Review and merge that release PR.
6. The package version change triggers `.github/workflows/release.yml`.
7. Verify the npm version/provenance, immutable `vX.Y.Z` tag, and matching GitHub Release.

The initial `v0.1.0` is a bootstrap exception because the repository already started at version `0.1.0`; this release-readiness PR intentionally does not add a version-bumping Changeset.

## Microsoft source-change watcher

`.github/workflows/microsoft-icons-watch.yml` runs weekly and on manual dispatch. It compares the official ZIP identity/link plus normalized fingerprints of the Microsoft Learn `General guidelines` and `Icon terms` sections to the reviewed baseline.

A difference opens or updates a maintenance issue. It never downloads or commits the official ZIP/SVG assets and never changes legal guidance, compatibility claims, or runtime code automatically.
