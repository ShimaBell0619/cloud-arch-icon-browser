# AGENTS.md

Repository instructions for Codex and other coding agents.

## Read before changing code

Always read:

1. `DESIGN.md` — authoritative product/engineering contract,
2. `README.md` — public product behavior,
3. `CONTRIBUTING.md` — development and PR workflow.

Also read the relevant specialist document when the change touches it:

- `COMPATIBILITY.md` — package/parser compatibility,
- `SECURITY.md` — ZIP, SVG, localhost server, browser security, or dependency security,
- `docs/UI_REVIEW.md` — browser UI or visual/Pages review,
- `docs/RELEASE.md` — release/publication behavior.

Decision history lives in Issues, PRs, releases, CHANGELOG, and Git history. `DESIGN.md` represents the current approved design.

## Non-negotiable rules

- Never add Microsoft Azure Architecture Icon ZIPs/SVGs to the repository, tests, visual baselines, npm package, or workflow/release artifacts.
- Keep selected ZIP/SVG contents session-local. Do not persist package bytes or file handles.
- Do not rewrite, optimize, recolor, resize, sanitize-for-download, rename, or otherwise change original SVG bytes used for download.
- Never inject untrusted SVG markup into the DOM with `innerHTML` or equivalent APIs.
- Do not add automatic runtime network requests, telemetry, analytics, crash reporting, or package/update checks.
- Keep the local server bound to `127.0.0.1` unless an explicit design change is approved.
- Do not add a backend, hosted-service product mode, account/database/cloud-sync feature, or new distribution channel without explicit approval.
- Do not silently change architecture, security boundaries, major UX/navigation policy, compatibility policy, release/publication policy, or foundational dependencies.

If an implementation request conflicts with `DESIGN.md`, explain the conflict and recommendation in the Issue/PR and wait for explicit approval before changing the contract.

## Implementation freedom

Normal implementation details that preserve `DESIGN.md` may be decided pragmatically. Prefer the simplest solution that satisfies the approved scope; avoid speculative abstractions and unrelated future work.

Key engineering boundaries:

- keep package parsing/validation/category/search/persistence logic React-independent,
- keep ZIP readers, package sessions, extracted Blobs, and object URLs in the session/resource layer and dispose them deterministically,
- do not persist derived/package-scoped runtime resources,
- prefer existing shadcn primitives and keep application composition outside `src/components/ui`,
- preserve keyboard/focus/responsive behavior,
- use npm and exact-pin direct dependencies,
- verify the actual installed/current library API before relying on security-sensitive options.

## Validation

Run checks relevant to the change. Baseline:

```bash
npm run check
npm run typecheck
npm test
npm run build
```

Run Playwright, CLI/package smoke, package validation, or release-readiness checks when the changed area requires them.

For browser UI changes, inspect the actual UI Review screenshots/Pages preview described in `docs/UI_REVIEW.md`; source inspection alone is not visual validation. Test/review fixtures must remain project-owned synthetic ZIP/SVG data.

Core coverage must remain at or above the thresholds defined in `DESIGN.md`.

## Pull requests

- Work on a short-lived branch and keep the PR focused on its assigned purpose.
- Use a Conventional Commit PR title.
- Include a Changeset for release-relevant/user-visible changes unless the change is genuinely docs/internal-only.
- State design impact, validation performed, Changeset status, and security/runtime-network impact.
- Confirm that no Microsoft assets were added.
- Do not implement unrelated future features in the same PR.

## Release safety

Publication uses npm Trusted Publishing/OIDC from GitHub Actions. Do not add a long-lived npm publish token.

Before publication, package-content validation must prevent Microsoft assets, local ZIPs, test fixtures, and unrelated development files from entering the npm package. Official-package verification always uses a separately downloaded local ZIP and never commits it.
