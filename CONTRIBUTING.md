# Contributing

Contributions are welcome. Keep changes focused and aligned with the repository's current product, design, architecture, and specialist contracts.

## Before contributing

Read the documents relevant to your change in this order:

1. [`PRODUCT.md`](./PRODUCT.md) — product behavior, support boundaries, and non-goals.
2. [`DESIGN.md`](./DESIGN.md) — UI/UX and design-system decisions.
3. [`AGENTS.md`](./AGENTS.md) — engineering/agent workflow rules.
4. [`README.md`](./README.md) — public usage and orientation.
5. Relevant specialist documents:
   - [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md),
   - [`SECURITY.md`](./SECURITY.md),
   - [`COMPATIBILITY.md`](./COMPATIBILITY.md),
   - [`docs/UI_REVIEW.md`](./docs/UI_REVIEW.md),
   - [`docs/RELEASE.md`](./docs/RELEASE.md),
   - [`docs/FOUNDATION.md`](./docs/FOUNDATION.md).

Decision history lives in Issues, PRs, releases, CHANGELOG, and Git history. Current approved behavior belongs in the current contract documents.

## Discuss significant changes first

Open an Issue before implementing a change that affects:

- product behavior, scope, support promise, or non-goals,
- architecture/state/resource ownership,
- ZIP/SVG or localhost/PowerPoint trust boundaries,
- runtime network behavior or persistence boundaries,
- supported distribution/runtime or public identity/origin,
- foundational dependencies,
- major UX/navigation behavior,
- compatibility or release/publication policy,
- Microsoft asset handling.

Small bug fixes, documentation corrections, and clearly scoped maintenance may go directly to a PR when they do not cross those boundaries.

If implementation pressure conflicts with an approved contract, describe the conflict and propose a concrete alternative instead of silently redesigning the product or architecture.

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

The normal Web baseline is:

```bash
npm run check
npm run typecheck
npm test
npm run build
```

Run additional checks when the changed area requires them:

```bash
npm run test:e2e
npm run test:cli-smoke
node scripts/cli-server-smoke.mjs
npm run test:cli-package-smoke
npm run verify:package
npm run verify:release-ready
```

Use `npm run check:fix` for formatting/import fixes and `npm run test:watch` for interactive unit tests.

For browser UI changes, inspect the actual UI Review screenshots and PR Pages preview described in [`docs/UI_REVIEW.md`](./docs/UI_REVIEW.md). Update committed Playwright snapshots with `npm run test:e2e:update` only after confirming the visual change is intentional.

Do not use Microsoft assets for automated test or visual-review fixtures.

## Changesets

User-visible or package-relevant changes should normally include a Changeset:

```bash
npm run changeset
```

Choose the appropriate SemVer bump and write a release-facing summary. Documentation-only or internal maintenance that does not change packaged/user-visible behavior normally does not require a Changeset.

See [`docs/RELEASE.md`](./docs/RELEASE.md) for the publication flow.

## Pull requests

Use a short-lived branch from the current `main` SHA and open a focused PR back to `main`. PR titles follow Conventional Commits, for example:

```text
feat: add package dropzone
fix: preserve acronym casing in icon names
docs: clarify compatibility policy
ci: adopt shared web validation
```

A PR may cover closely related Issues when the objective/risk is coherent and each Issue remains independently traceable. Use `Refs #N` for incomplete Issue work and `Closes #N` only when all acceptance criteria are satisfied.

The PR description should cover:

- linked Issue(s) and objective,
- contract impact (`PRODUCT.md`, `DESIGN.md`, architecture, security, compatibility, release),
- validation performed and rendered UI evidence where applicable,
- self-review findings and any corrections made,
- Changeset status,
- security/runtime-network impact,
- confirmation that no Microsoft assets were added.

For UI changes, call out intentional visual-baseline changes after reviewing rendered output.

The project uses squash merge.
