# AGENTS.md

Repository instructions for Codex and other coding agents.

## Required reading

Before making changes, read:

1. `DESIGN.md` — current product/architecture/security/UX source of truth.
2. `README.md` — public product contract.
3. `CONTRIBUTING.md` — contribution workflow.
4. `COMPATIBILITY.md` when changing ZIP/parser/search compatibility behavior.
5. `SECURITY.md` when changing ZIP, SVG, localhost server, browser security, or dependency behavior.

`DESIGN.md` is authoritative for current design. This repository intentionally does not use ADRs for MVP.

## Non-negotiable rules

- Do not add Microsoft Azure Architecture Icon ZIPs or SVGs to the repository, tests, screenshots, npm package, or release artifacts.
- Do not add automatic runtime network requests. The running app must remain local/offline except for user-clicked external links.
- Do not persist user-selected ZIP/SVG content across sessions.
- Do not edit, optimize, recolor, sanitize-for-download, rename, or otherwise rewrite original Microsoft SVG bytes.
- Do not inject untrusted SVG markup into the DOM with `innerHTML` or equivalent APIs.
- Keep the local server bound to `127.0.0.1` only unless an explicit design change is approved.
- Do not add hosted-service/backend/database/account functionality in MVP.
- Do not add out-of-scope distribution channels.
- Do not change foundational architecture, security policy, UX policy, publication model, or core technology choices silently.

If implementation conflicts with `DESIGN.md`, stop that design change, explain the conflict in the Issue/PR, recommend a resolution, and wait for explicit approval.

## Implementation freedom

You may decide normal implementation details that do not change the design contract. Prefer the simplest implementation consistent with `DESIGN.md`.

Avoid speculative abstractions and future-proofing that are not required for MVP.

## UI implementation

- Prefer existing shadcn primitives before creating custom primitive components.
- Keep generated `components/ui` primitives thin.
- Put application-specific composition outside the primitive layer.
- Follow the visual direction and prohibited patterns in `DESIGN.md`.
- Preserve keyboard/focus behavior and responsive behavior.
- Use semantic design tokens instead of scattering raw colors.

## Domain architecture

- Keep core package parsing, validation, category construction, name parsing, and search logic independent from React.
- Do not store derived search result arrays or zip reader/session objects in Zustand.
- Keep package-owned resources in the package session layer and dispose them deterministically.
- Verify the actual current `@zip.js/zip.js` API before using security/CRC options.

## Dependencies

- Use npm.
- Pin direct dependency versions exactly.
- Do not introduce a major/foundational dependency without explicit approval.
- No CDN/runtime-hosted dependencies.
- Preserve ESM-only and Node.js 24+ requirements.

## Tests and validation

Before declaring work complete, run the checks relevant to the change. Once scripts exist, the expected baseline is conceptually:

```bash
npm run check
npm run typecheck
npm test
npm run build
```

For changes affecting the CLI/server or end-to-end flow, run the relevant Playwright/CLI smoke tests as well.

Core logic must maintain the coverage gates defined in `DESIGN.md`.

Do not use Microsoft assets as test fixtures. Generate project-owned dummy ZIP/SVG fixtures.

## Pull requests

- Work from a short-lived branch.
- PR title follows Conventional Commits.
- Keep scope aligned with the assigned Issue.
- Include an appropriate Changeset for release-relevant changes once Changesets is configured.
- State whether the PR changes `DESIGN.md`.
- State the validation performed.
- Confirm no Microsoft assets were added.
- Confirm no automatic runtime network request was added.

Do not implement unrelated future features in the same PR.

## Release safety

Before npm publication, verify package contents (`npm pack --dry-run` or equivalent CI validation) so Microsoft assets, local ZIPs, test fixtures, and unrelated files cannot leak into the package.

Official-package verification is a maintainer/release task using a locally downloaded Microsoft ZIP. Never commit that ZIP.
