# Release Runbook

This project uses Changesets for release intent and GitHub Actions for npm publication. Normal publication uses npm Trusted Publishing/OIDC; no long-lived npm publish token belongs in this repository.

Package:

```text
@shimabell06/cloud-arch-icon-browser
```

Do not duplicate a hard-coded current version in this runbook. Published state is determined by `package.json`, npm, immutable Git tags, GitHub Releases, and `CHANGELOG.md`.

## Release contract

- npm access is public.
- User-visible or package-relevant changes normally include a Changeset.
- A human explicitly approves and merges the generated Release PR; green CI alone must never auto-merge a release.
- GitHub Actions publishes through npm Trusted Publishing/OIDC and includes provenance.
- `package.json`, npm, immutable `vX.Y.Z`, and the matching GitHub Release must identify the same version.
- Existing version tags are never moved.
- GitHub tag/Release creation happens only after npm metadata and the package tarball are retrievable.
- Microsoft Azure Architecture Icon ZIP/SVG assets must never enter the repository, npm package, or release artifacts.

Docs-only/internal maintenance that does not change packaged or user-visible behavior normally does not require a Changeset.

## Normal release flow

1. In a feature/fix PR, add a Changeset when the change is release-relevant:

   ```bash
   npm run changeset
   ```

2. Merge the feature/fix PR after normal review and CI.
3. `.github/workflows/release-pr.yml` runs on `main` and aggregates pending Changesets into `changeset-release/main`, creating/updating the `chore: release packages` PR.
4. Review the generated version, `CHANGELOG.md`, lockfile, consumed Changesets, compatibility state, and any release-specific acceptance gates.
5. Merge the Release PR only after explicit maintainer approval.
6. `.github/workflows/release.yml` activates publication when the package version changed.
7. After the workflow succeeds, verify npm/provenance, immutable `vX.Y.Z`, the matching GitHub Release, and practical package installability.

Release-specific evidence belongs in the relevant Issue, PR, or release notes rather than permanent version-specific runbooks under `docs/`.

## Release activation guard

`release.yml` is triggered by `main` changes to `package.json`, `package-lock.json`, or `CHANGELOG.md`, but a trigger does not automatically mean a new release.

For normal `push` events, the workflow compares the previous and current `package.json` versions:

- version unchanged → publication is intentionally skipped,
- version changed → release validation/publication runs,
- previous version cannot be resolved → checks run conservatively.

This prevents ordinary dependency/script/metadata changes from trying to republish an existing immutable version.

Other activation rules:

- `package.json` with `private: true` disables publication,
- manual `workflow_dispatch` explicitly activates the release path even when the version comparison would otherwise skip it.

Use manual dispatch only when intentionally exercising/recovering the release workflow.

## Release PR creation fallback

Repository settings can prevent GitHub Actions from opening pull requests even when the workflow has `pull-requests: write`. The characteristic error is:

```text
GitHub Actions is not permitted to create or approve pull requests.
```

If Changesets successfully generated `changeset-release/main` before that error:

1. Compare `changeset-release/main` with `main`.
2. Confirm the version, generated `CHANGELOG.md`, lockfile, and consumed Changesets are exactly the expected output.
3. Open `changeset-release/main` → `main` manually as `chore: release packages`.
4. Apply the same review and explicit-approval gates as an automatically created Release PR.

To allow automatic PR creation, a maintainer may enable **Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**.

## Publication checks

When publication is activated, `release.yml` performs the release-critical checks before/after publishing, including:

1. `npm run verify:release-ready`,
2. `npm audit --audit-level=high`,
3. Biome/unit/build validation,
4. packaged CLI smoke validation,
5. `npm run verify:package`,
6. existing npm-version lookup,
7. OIDC `npm publish --access public` only when that immutable version is not already published,
8. npm metadata and tarball retrieval verification,
9. immutable Git tag creation,
10. matching GitHub Release creation.

Package validation must reject Microsoft ZIP/SVG assets, test/development directories, and non-allowlisted top-level content.

### Idempotent recovery

The publication workflow is designed to recover from partial completion:

- If npm already contains `name@X.Y.Z`, do not republish the immutable version; verify it and continue with any missing GitHub metadata.
- Registry metadata and tarball propagation are retried before tag/Release creation.
- If `vX.Y.Z` already exists at the intended commit, it may be reused.
- If `vX.Y.Z` exists at a different commit, fail rather than moving the tag.

A failed post-publish step should normally be recovered by rerunning the workflow after identifying the failure, not by changing the version or deleting published metadata casually.

## Trusted Publishing configuration

The npm Trusted Publisher must remain aligned with:

- Provider: GitHub Actions
- Repository: `ShimaBell0619/cloud-arch-icon-browser`
- Workflow filename: `release.yml`

`package.json` must keep the matching repository URL:

```text
https://github.com/ShimaBell0619/cloud-arch-icon-browser.git
```

`release.yml` requires `id-token: write` and intentionally does not use `NPM_TOKEN`.

## Official package compatibility

Before a release that claims support for a newer current Microsoft package:

1. Download the latest official ZIP separately from the Microsoft Learn Azure Architecture Icons page.
2. Keep the ZIP/SVG assets outside the repository.
3. Run:

   ```bash
   npm run verify:official -- /path/to/latest-official.zip
   ```

4. Update `COMPATIBILITY.md` only after successful verification with the production parser/validator.
5. Ensure the compatibility release gate accurately reflects the recorded package before publishing.

If the official package identity has not changed since a recent successful verification, duplicate verification is not required unless the package/link or relevant Microsoft guidance changed.

`.github/workflows/microsoft-icons-watch.yml` checks the Microsoft source periodically and may open/update a maintenance Issue when the package identity or reviewed guidance changes. It must never download/commit Microsoft icon assets, make legal judgments, alter compatibility claims, or change runtime code automatically.

## SemVer

Before `1.0.0`:

- patch — compatible fixes/internal improvements,
- minor — features or breaking changes.

Breaking changes during `0.x` must be called out clearly in the Changeset/CHANGELOG. At and after `1.0.0`, use normal SemVer major/minor/patch semantics.
