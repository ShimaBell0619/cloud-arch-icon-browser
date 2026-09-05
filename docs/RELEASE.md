# Release Runbook

This project uses Changesets for release intent and GitHub Actions for publication. The steady-state publication path uses npm Trusted Publishing (OIDC); no long-lived npm publish token belongs in this repository.

## Current pre-v0.1.0 state

Publication is intentionally disabled while `package.json` contains `"private": true`. This lets release-readiness automation merge without accidentally publishing the placeholder unscoped package name.

Before `v0.1.0`, a maintainer must complete all of the following:

1. Choose the final npm scope/name and update `package.json` plus `package-lock.json`.
2. Change `private` to `false` only in the final publication/bootstrap PR.
3. Download the current official Microsoft Azure Architecture Icons ZIP directly from Microsoft and run:

   ```bash
   npm run verify:official -- /path/to/latest-official.zip
   ```

4. Record the measured compatibility metadata in `COMPATIBILITY.md` and change the exact release gate line to:

   ```text
   Release gate: PASS
   ```

5. Complete the one-time npm package bootstrap and Trusted Publisher configuration described below.
6. Merge the final publication/bootstrap PR only after normal CI is green.

When `private=false`, `npm run verify:release-ready` makes the npm scope, repository URL, lockfile metadata, stable SemVer, and compatibility PASS record mandatory.

## One-time npm bootstrap

npm Trusted Publishing is configured in an existing package's npmjs.com settings. As of September 2026, first-time OIDC publication of a package that does not yet exist is not a reliable bootstrap path. Keep this one-time exception out of GitHub secrets.

If the final npm package already exists under the chosen scope, skip the bootstrap publish and configure its Trusted Publisher directly.

If it does not exist and keeping `v0.1.0` as the first real automated release is required, use a disposable clean copy/worktree for a one-time placeholder publication under a non-default dist-tag:

1. Set the final scoped package name, `private=false`, and version `0.0.0` only in the disposable copy. Do not commit the `0.0.0` version to `main`.
2. Run the normal local release gates (`npm ci`, tests/build, `npm run verify:package`) before the bootstrap publish.
3. Authenticate interactively to npm using the maintainer account and its required 2FA/passkey controls.
4. Publish the bootstrap version with a non-default tag:

   ```bash
   npm publish --access public --tag bootstrap
   ```

5. Configure npm Trusted Publishing for the newly created package:
   - Provider: GitHub Actions
   - GitHub user/organization: `ShimaBell0619`
   - Repository: `cloud-arch-icon-browser`
   - Workflow filename: `release.yml`
   - Allow direct `npm publish`
6. Discard the disposable bootstrap changes. The repository remains at the intended `0.1.0` version.
7. After the first successful OIDC release, remove the `bootstrap` dist-tag if it is no longer useful. The already-published `0.0.0` version remains historical registry metadata.
8. After OIDC is proven, use npm's strongest appropriate publishing-access setting and remove/revoke any temporary credentials used only for the bootstrap.

If npm adds a supported way to establish a Trusted Publisher for a never-published package, prefer that over the `0.0.0` workaround and update this runbook.

## Trusted Publishing contract

`.github/workflows/release.yml` runs on a GitHub-hosted Ubuntu runner and grants `id-token: write`. It uses the Node version pinned by `.node-version`; this currently satisfies npm's Trusted Publishing minimums.

The workflow intentionally does not read an `NPM_TOKEN`. npm exchanges the GitHub OIDC identity during `npm publish`. For a public package published from this public repository, npm Trusted Publishing automatically attaches provenance.

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

This order also permits recovery from the narrow case where npm accepted a publish but tag/Release creation failed: a rerun detects the existing registry version and continues with the missing GitHub metadata instead of attempting to republish the immutable npm version.

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
