# Contributing

Contributions are welcome. Keep changes focused and aligned with the current contract in `DESIGN.md`.

## Before contributing

Read the documents relevant to your change:

- `DESIGN.md` — product, architecture, security, and UX contract,
- `AGENTS.md` — additional rules when using a coding agent,
- `SECURITY.md` — security-sensitive changes and vulnerability reporting,
- `docs/UI_REVIEW.md` — browser UI and Pages-preview review,
- `docs/RELEASE.md` — release, compatibility, or npm-publication changes.

## Discuss significant changes first

Open an Issue before implementing a change that affects product scope, architecture/state ownership, ZIP/SVG security, runtime network behavior, supported distribution/runtime, foundational dependencies, major UX/navigation behavior, release/publication policy, or Microsoft asset handling.

Small bug fixes, documentation corrections, and clearly scoped maintenance changes may go directly to a PR.

If the current design makes an implementation unnecessarily difficult, describe the conflict and propose a concrete alternative instead of silently redesigning around `DESIGN.md`.

## Microsoft assets

Do not commit, attach, package, or use Microsoft Azure Architecture Icon ZIPs/SVGs as repository fixtures, visual baselines, or release artifacts.

Tests use project-owned synthetic ZIP/SVG fixtures. Official-package compatibility is a maintainer task that reads a separately downloaded ZIP:

```bash
npm run verify:official -- /path/to/Azure_Public_Service_Icons.zip
```

The official package itself must remain outside the repository and workflow artifacts.

## Local development

Use the Node.js version pinned in `.node-version`:

```bash
nvm install
nvm use
npm ci
npm run dev
```

Direct dependencies are exact-pinned and the repository uses `npm ci` for reproducible installs.

## Validation

Run checks appropriate to the change. The normal baseline is:

```bash
npm run check
npm run typecheck
npm test
npm run build
```

Additional checks when relevant:

```bash
npm run test:e2e
npm run test:cli-package-smoke
npm run verify:package
npm run verify:release-ready
```

Use `npm run check:fix` for formatting/import fixes and `npm run test:watch` for interactive unit tests.

For browser UI changes, inspect the actual UI Review screenshots and the PR Pages preview described in [`docs/UI_REVIEW.md`](./docs/UI_REVIEW.md). Update committed Playwright snapshots with `npm run test:e2e:update` only after confirming that a visual change is intentional.

Do not use Microsoft assets to create test or visual-review fixtures.

## Changesets

User-visible or package-relevant changes should normally include a Changeset:

```bash
npm run changeset
```

Choose the appropriate SemVer bump and write a release-facing summary. Documentation-only or internal maintenance that does not change packaged/user-visible behavior normally does not require a Changeset.

See [`docs/RELEASE.md`](./docs/RELEASE.md) for the publication flow.

## Pull requests

Use a short-lived branch and open a PR to `main`. PR titles follow Conventional Commits, for example:

```text
feat: add package dropzone
fix: preserve acronym casing in icon names
docs: clarify compatibility policy
```

Keep the PR scoped to one purpose. The description should cover:

- what changed and why,
- whether `DESIGN.md` changes,
- validation performed,
- Changeset status,
- any security/runtime-network impact,
- confirmation that no Microsoft assets were added.

For UI changes, also inspect the UI Review artifact/Pages preview and call out intentional visual-baseline changes.

The project uses squash merge.
