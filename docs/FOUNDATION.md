# Foundation provenance

Cloud Arch Icon Browser is the first real consumer of `ShimaBell0619/web-app-foundation`.

- Adopted Foundation version: 0.2.0
- Copied-rule/template commit: `83c06f73aa21bdd9f1d4fac2fdb2b25d69e5c365`
- Reusable workflow commit: `83c06f73aa21bdd9f1d4fac2fdb2b25d69e5c365`
- Reusable workflow caller: `.github/workflows/ci.yml` → `web-verify`
- Adopted on: 2026-09-07
- App-specific deviations:
  - The application keeps its existing product-specific security, compatibility, release, CLI/package, and UI-review contracts in dedicated specialist documents rather than copying those details into Foundation core documents.
  - The application retains CLI smoke, package validation, release-readiness, browser/E2E/a11y/visual, and cross-platform packaged-CLI validation as app-owned CI outside the reusable Foundation Web CI.
  - Node runtime support for the published application remains defined by this application's `package.json`; the Foundation repository's own tooling engine range does not override the consumer runtime contract.

The reusable Web CI executes the exact reviewed Foundation release commit above; executable workflow references must not use `@main`, a moving tag, or another mutable ref. The generic `check`, `typecheck`, `test`, and `build` gates remain enabled with no opt-outs.

Copied Foundation rules/templates do not update automatically. Foundation upgrades must review the Foundation changelog/diff, preserve approved app-specific deviations, update copied contracts deliberately, update the reusable-workflow SHA only after review, and refresh this provenance record.
