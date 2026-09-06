# Release Runbook

This project uses Changesets for release intent and GitHub Actions for publication. Normal publication uses npm Trusted Publishing (OIDC); no long-lived npm publish token belongs in this repository.

## Release state

Published release state is determined by the npm registry, `package.json`, immutable Git tags, GitHub Releases, and `CHANGELOG.md`. This runbook intentionally does not duplicate a hard-coded "current version" that can become stale between release steps.

The first public release was `v0.1.0`, published on 2026-09-06 (JST).

Package:

```text
@shimabell06/cloud-arch-icon-browser
```

Current publication contract:

- npm package access is public.
- GitHub Actions publishes through npm Trusted Publishing/OIDC.
- npm publication includes provenance generated from the GitHub Actions build identity.
- `package.json`, npm, the immutable `vX.Y.Z` Git tag, and the GitHub Release must use the same version.
- The release workflow is idempotent: an already-published npm version is detected and is not published again.
- Git tag and GitHub Release creation happen only after npm metadata **and the package tarball** are retrievable.

The current official `Azure_Public_Service_Icons_V24.zip` has passed the production-parser verification recorded in [`COMPATIBILITY.md`](../COMPATIBILITY.md).

Release-specific verification records may live under `docs/`; the `v0.2.0` record is [`V0.2.0_VERIFICATION.md`](./V0.2.0_VERIFICATION.md).

## Normal release flow

For a user-visible or package-relevant change:

1. Add an appropriate Changeset in the feature/fix PR:

   ```bash
   npm run changeset
   ```

2. Select the SemVer bump and describe the release-facing change.
3. Merge the PR to `main` after required CI passes.
4. `.github/workflows/release-pr.yml` aggregates pending Changesets into the `chore: release packages` PR.
5. Review release-specific gates and then merge that release PR only after explicit maintainer approval.
6. The resulting `package.json` / `package-lock.json` / `CHANGELOG.md` change triggers `.github/workflows/release.yml`.
7. Verify the published npm version and provenance, immutable `vX.Y.Z` tag, matching GitHub Release, and actual tarball installability.

Docs-only or internal changes that do not alter packaged/user-visible release content normally do not require a Changeset.

## Release-specific product gates

A Changesets Release PR is not sufficient evidence by itself that a feature release is ready. When an Epic or release-polish Issue defines additional acceptance criteria, those gates must be recorded before the release PR is merged.

For `v0.2.0`, [`V0.2.0_VERIFICATION.md`](./V0.2.0_VERIFICATION.md) is the release-specific record. In particular, Windows PowerPoint and Excel paste verification for the transparent 512×512 **Copy image** workflow is a manual release blocker and must be completed before the `v0.2.0` Changesets Release PR is merged.

The repository-wide rule remains: release PR merge requires explicit maintainer instruction; do not enable or perform automatic merge merely because CI is green.

## Trusted Publishing contract

`.github/workflows/release.yml` runs on a GitHub-hosted Ubuntu runner and grants `id-token: write`. It uses the Node version pinned by `.node-version`.

The workflow intentionally does not use `NPM_TOKEN`. npm exchanges the GitHub OIDC identity during `npm publish`.

The npm Trusted Publisher is configured for:

- Provider: GitHub Actions
- Repository: `ShimaBell0619/cloud-arch-icon-browser`
- Workflow filename: `release.yml`
- Direct `npm publish`: allowed
- Stage publish: allowed

The `repository.url` in `package.json` must remain:

```text
https://github.com/ShimaBell0619/cloud-arch-icon-browser.git
```

The Trusted Publisher must continue to point to the exact workflow filename `release.yml`.

## Release-time gates

When publication is activated, `release.yml` performs these checks before and after publishing:

1. `npm run verify:release-ready`
2. `npm audit --audit-level=high` — High/Critical findings fail the release
3. Biome checks and unit tests
4. production build
5. packaged CLI smoke test
6. package-content validation via `npm run verify:package`
7. existing npm version lookup for idempotent recovery
8. OIDC `npm publish --access public` when the version is not already published
9. post-publish registry propagation verification
10. immutable Git tag creation
11. GitHub Release creation

Package-content validation rejects development/test directories, ZIP files, SVG assets, and non-allowlisted top-level paths.

### Registry/tarball propagation verification

A successful `npm publish` response does not guarantee that every registry/CDN endpoint is immediately ready. During the `v0.1.0` release, package metadata became visible before the tarball was consistently retrievable.

The workflow therefore verifies both:

- `npm view <name>@<version> version`
- `npm pack <name>@<version>`

The check retries every 5 seconds for up to 24 attempts (approximately 2 minutes). The workflow does not create the version tag or GitHub Release until both metadata and the actual tarball are available.

This makes release completion correspond to practical installability rather than metadata visibility alone.

## Version, tag, and GitHub Release

`package.json` is the version authority for publication. For version `X.Y.Z`, the release workflow derives the immutable tag `vX.Y.Z`.

The workflow order is:

1. validate the release candidate,
2. detect or publish `name@X.Y.Z` on npm,
3. verify registry metadata and tarball availability,
4. create immutable `vX.Y.Z`,
5. create the GitHub Release for the same tag.

The workflow never moves an existing version tag. If the tag already exists at a different commit, the release fails.

This order also permits recovery if npm accepts a publish but a later step fails. A rerun detects the existing npm version, skips republishing the immutable version, and continues with verification and any missing GitHub metadata.

## Official package compatibility operations

Before a release that claims compatibility with a newer current Microsoft package:

1. Download the latest official ZIP separately from the Microsoft Learn page.
2. Do not add the ZIP or Microsoft SVGs to this repository.
3. Run:

   ```bash
   npm run verify:official -- /path/to/latest-official.zip
   ```

4. Update `COMPATIBILITY.md` only after successful production-parser verification.
5. Ensure `Release gate: PASS` accurately reflects the current recorded package before release.

If the official package identity is unchanged from a successful verification already recorded for the same release-maintenance window, a duplicate download/re-run is not required. Re-verify if the package identity/link or relevant Microsoft guidance changes before publication.

The verifier reuses the production `IconPackageSession.open` parser/validator. The official package itself remains outside the repository and npm artifact.

## Microsoft source-change watcher

`.github/workflows/microsoft-icons-watch.yml` runs weekly and on manual dispatch. It compares the official ZIP identity/link plus normalized fingerprints of the Microsoft Learn `General guidelines` and `Icon terms` sections to the reviewed baseline.

A difference opens or updates a maintenance issue. It never downloads or commits the official ZIP/SVG assets and never changes legal guidance, compatibility claims, or runtime code automatically.

## Historical: v0.1.0 bootstrap

The initial release required a one-time bootstrap because npm Trusted Publishing had to be configured against an existing registry package.

The completed bootstrap sequence was:

1. A disposable worktree changed the package version to `0.0.0` without committing that version to the repository.
2. `@shimabell06/cloud-arch-icon-browser@0.0.0` was manually published as a public package under the non-default `bootstrap` dist-tag.
3. npm Trusted Publishing was configured for `ShimaBell0619/cloud-arch-icon-browser` and `release.yml` with direct publish permission.
4. The `v0.1.0` release-readiness PR was merged.
5. GitHub Actions published `@shimabell06/cloud-arch-icon-browser@0.1.0` through OIDC with signed provenance.
6. The immutable `v0.1.0` tag and GitHub Release were created.

The repository never used `0.0.0` as its source-controlled release version. The published `0.0.0` remains historical npm registry metadata.

If the `bootstrap` dist-tag is still present and is no longer useful, a maintainer may remove only the tag:

```bash
npm dist-tag rm @shimabell06/cloud-arch-icon-browser bootstrap
```

Do not unpublish the historical version merely to clean up release metadata.

After OIDC publishing has been proven, npm Publishing access should use the strongest practical account/package setting, preferably requiring two-factor authentication while disallowing legacy publish tokens.
