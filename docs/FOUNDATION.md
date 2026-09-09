# Foundation provenance

Cloud Arch Icon Browser is a real consumer of `ShimaBell0619/web-app-foundation`.

- Adopted Foundation version: 0.4.0
- Copied-rule/template commit: `7b2ac5cb75b0055489a0f9e2c8864672145bb30e`
- Reusable workflow commit: `7b2ac5cb75b0055489a0f9e2c8864672145bb30e`
- Reusable Web CI caller: `.github/workflows/ci.yml` → `web-verify`
- Reusable Pages candidate caller: `.github/workflows/ci.yml` → `pages-candidate`
- Trusted Pages publisher caller: `.github/workflows/pages-publish.yml`
- Adopted on: 2026-09-10

## Adopted optional profiles

### GitHub Pages

The application adopts the Foundation GitHub Pages candidate/publisher trust split.

- Application build and review-image capture run in the read-only reusable Pages candidate after shared Web verification succeeds.
- Privileged Pages publication consumes the candidate artifact through the default-branch trusted publisher and does not checkout, install, build, or execute pull-request source.
- Production remains at the project Pages root and same-repository PR previews remain under `/pr-N/`.
- The Foundation publisher owns serialized `pages-content` staging and PR-close cleanup.

The former app-owned direct write-enabled Pages publisher and manual selected-ref Pages publisher are retired by this adoption.

## App-specific deviations

- The application keeps its existing product-specific security, compatibility, release, CLI/package, and UI-review contracts in dedicated specialist documents rather than copying those details into Foundation core documents.
- The application retains CLI smoke, package validation, release-readiness, browser/E2E/a11y/visual, and cross-platform packaged-CLI validation as app-owned CI outside the reusable Foundation Web CI.
- The npm publication and GitHub Release workflow remains app-owned because it includes npm Trusted Publishing, registry propagation verification, immutable tag handling, and package-specific release checks that are stronger and materially different from the Foundation generic application-release profile.
- Node runtime support for the published application remains defined by this application's `package.json`; the Foundation repository's own tooling engine range does not override the consumer runtime contract.
- Vercel and Azure OIDC profiles are not adopted because this application does not use them for its current deployment/runtime path.

The reusable workflows execute the exact reviewed Foundation release commit above; executable workflow references must not use `@main`, a moving tag, or another mutable ref. The generic `check`, `typecheck`, `test`, and `build` gates remain enabled with no opt-outs.

Copied Foundation rules/templates do not update automatically. Foundation upgrades must review the Foundation changelog/diff, preserve approved app-specific deviations, update copied contracts deliberately, update reusable-workflow SHAs only after review, and refresh this provenance record.
