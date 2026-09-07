# Cloud Arch Icon Browser — Agent Instructions

Repository instructions for Codex and other coding agents.

## Document responsibilities and read order

Before changing this repository, read:

1. `PRODUCT.md` — authoritative product behavior, boundaries, support promises, and non-goals.
2. `DESIGN.md` — authoritative UI/UX and design-system contract for user-facing changes.
3. `AGENTS.md` — repository-specific engineering and agent workflow rules.
4. `README.md` — public usage and contributor orientation.
5. Relevant specialist documents for the affected area:
   - `docs/ARCHITECTURE.md` — implementation boundaries and resource lifecycle,
   - `SECURITY.md` — ZIP/SVG/localhost/PowerPoint bridge/dependency security,
   - `COMPATIBILITY.md` — official package compatibility,
   - `docs/UI_REVIEW.md` — rendered browser UI and Pages review,
   - `docs/RELEASE.md` — release/publication behavior,
   - `docs/FOUNDATION.md` — adopted Web App Foundation provenance and deviations.

Decision history lives in Issues, PRs, releases, CHANGELOG, and Git history. Current approved behavior belongs in the current contract documents; do not reconstruct current requirements from history when an authoritative current contract exists.

Do not duplicate a normative rule across multiple documents unless the duplication is a deliberate summary and the authoritative source is explicit.

## Before changing code or repository configuration

1. Read the applicable contracts, Foundation provenance, Issue acceptance criteria, and existing implementation.
2. Verify current official documentation for browser APIs, Node/npm behavior, framework/library APIs, GitHub Actions, security-sensitive options, deprecations, and compatibility facts that may have changed.
3. Prefer the smallest coherent change that satisfies the approved Issue.
4. Before the first GitHub write, resolve the current `main` SHA, create a short-lived branch from that exact SHA, and explicitly target that branch for writes.
5. Batch related reads and coherent writes when practical without sacrificing conflict detection, correctness, or CI evidence.
6. If implementation pressure conflicts with `PRODUCT.md`, `DESIGN.md`, `docs/ARCHITECTURE.md`, or a material specialist contract, surface the conflict and obtain the required explicit decision rather than silently changing the contract.

## Issue-driven development

- Feature work, meaningful bug fixes, material refactors, and workflow changes should normally start from an Issue with acceptance criteria.
- One Issue is one independently understandable objective, not necessarily one PR.
- Closely related Issues may share a PR when they touch the same implementation area, have compatible risk, and remain independently traceable/reviewable.
- If one Issue needs multiple PRs, intermediate PRs use `Refs #N`; only the PR that completes all remaining acceptance criteria uses `Closes #N`.
- If one PR covers several Issues, map validation/evidence to each Issue separately.
- Do not mix unrelated cleanup or speculative future work into an implementation PR.
- Use short-lived branches named from the change type and primary Issue where practical.
- PR titles use Conventional Commit style (`feat:`, `fix:`, `docs:`, `ci:`, `refactor:`, etc.).

## Approval boundaries

Agents may decide normal implementation details autonomously when approved behavior is preserved. Approval is required before crossing a material product, trust, compatibility, distribution, or architecture boundary.

| Agent may decide autonomously | Explicit approval required |
| --- | --- |
| Local refactors that preserve approved behavior | New/changed product behavior, support promise, or non-goal |
| Naming, focused tests, internal structure | Authentication/authorization/privilege/trust-boundary change |
| Error handling/input validation following existing contracts | New persistence location/retention or destructive migration |
| Small dependency-free hardening within Issue scope | New external data transmission, telemetry, cloud integration, or recurring-cost service |
| UI implementation details already implied by `DESIGN.md` | Material navigation/interaction redesign |
| Technical details already implied by `docs/ARCHITECTURE.md` | New foundational dependency, backend, distribution channel, public API/origin/identity, or major architecture change |
| Search/dependency tuning that stays inside explicit contract bounds | Compatibility/release/publication policy changes |

Do not re-ask decisions already approved in the Issue, contracts, or current conversation. If a correction is clearly required by existing acceptance criteria and does not cross the approval boundary, make it autonomously.

## Mandatory implementation and review loop

The first implementation pass is not evidence of completion. For every material change:

1. **Implement** — satisfy the approved scope with the simplest coherent implementation.
2. **Self-review** — inspect the full diff and affected behavior as if authored by another engineer.
3. **Correct/harden** — fix real defects and reasonable hardening gaps that do not require a new approval decision.
4. **Re-review** — inspect the final affected code/behavior after corrections.
5. **Final validation** — run the relevant checks after the final material correction.
6. **Completion report** — state what changed, acceptance-criteria evidence, final commit/diff scope, review findings/corrections, validation results, and remaining risk.

Self-review should consider as applicable: contract fit; regressions/edge cases; ZIP/SVG and localhost trust boundaries; persistence/resource cleanup; error/failure behavior; accessibility/focus/responsive behavior; performance hot paths; dependency/supply-chain impact; package contents; release safety; and whether tests validate behavior rather than implementation trivia.

Do not create meaningless code churn merely to prove review occurred. If review finds no material correction, report the evidence reviewed.

### Completion gate

Do not report material work complete until:

- every acceptance criterion is satisfied or explicitly unresolved,
- self-review was performed against the final implementation,
- review-driven corrections were re-reviewed,
- final validation ran after the last material correction,
- no unresolved Blocker/High or otherwise material finding is silently carried forward.

Authentication/authorization, destructive migration, release/publishing machinery, privileged workflow, localhost trust-boundary, and reusable-workflow changes should receive independent human/second-agent review before merge when practical. Self-review remains mandatory but is not independent review.

## Application-specific engineering boundaries

### Microsoft assets and fixtures

- Never add Microsoft Azure Architecture Icon ZIPs/SVGs to the repository, tests, visual baselines, npm package, or workflow/release artifacts.
- Automated tests/review use project-owned synthetic ZIP/SVG fixtures.
- Maintainer-only official-package verification reads a separately downloaded local ZIP and never commits/publishes it.

### Core and resource ownership

- Keep package parsing/validation/path/category/search/persistence/durable matching/Tray/Saved Set domain logic React-independent as defined in `docs/ARCHITECTURE.md`.
- Keep ZIP readers, package sessions, extracted Blobs, preview/Object URLs, and package-scoped caches in the session/resource layer and dispose them deterministically.
- Never persist package-scoped runtime resources.
- Derived search results should be computed rather than copied into durable/shared state.

### UI composition

- Prefer existing shadcn/Base UI primitives and semantic browser behavior.
- Keep application composition outside `src/components/ui`.
- Preserve keyboard operation, visible focus, responsive behavior, and the interaction hierarchy in `DESIGN.md`.
- User-facing UI changes require actual rendered validation; source inspection alone is insufficient.

### Security and local runtime

`SECURITY.md` is authoritative. Agent-facing invariants include:

- never inject untrusted SVG markup into the DOM with `innerHTML` or equivalent APIs,
- preserve original SVG bytes used for download,
- keep the local listener bound to `127.0.0.1` and preserve canonical Host/Origin/security-header behavior,
- never turn the Experimental PowerPoint bridge into a generic command/local-file/automation API,
- do not add automatic runtime external network requests, telemetry, analytics, crash reporting, or package/update checks,
- do not weaken approved payload/object/temp-file/cleanup constraints for the bridge to make interoperability easier.

### Dependencies and supply chain

- Prefer platform/runtime capability and existing dependencies before adding packages.
- Direct dependencies/devDependencies remain exact-pinned.
- Before adding/changing a foundational dependency, review maintenance, compatibility, license, security history/implications, bundle/runtime cost, and trust-boundary impact.
- Use npm and the committed lockfile with reproducible `npm ci`.
- Pin external GitHub Actions and reusable Foundation workflows to reviewed full commit SHAs; do not use mutable `@main` or moving tags as executable workflow references.
- Never commit secrets, tokens, private keys, production credentials, or generated credential files.

## Validation and CI

The default Web quality contract is:

```bash
npm run check
npm run typecheck
npm test
npm run build
```

These are real one-shot gates and must not be replaced with no-op scripts. The reusable Web App Foundation workflow provides the generic CI baseline by exact SHA.

Application-specific validation remains app-owned. Run when relevant:

```bash
npm run test:cli-smoke
node scripts/cli-server-smoke.mjs
npm run test:cli-package-smoke
npm run verify:package
npm run verify:release-ready
npm run test:e2e
```

For browser UI work, inspect actual UI Review screenshots/Pages preview as documented in `docs/UI_REVIEW.md`; update visual baselines only after confirming an intentional visual change.

Core coverage must remain at or above the thresholds in `docs/ARCHITECTURE.md`.

## Changesets and pull requests

- User-visible/package-relevant changes normally include a Changeset. Docs-only/internal workflow maintenance that does not change consumer-visible/package behavior normally does not.
- State Issue traceability and whether each linked Issue is fully closed or only referenced.
- State contract impact: `PRODUCT.md`, `DESIGN.md`, `docs/ARCHITECTURE.md`, security, compatibility, and release/publication as applicable.
- State validation performed and rendered UI evidence where applicable.
- State self-review findings/corrections.
- State Changeset decision.
- State security/runtime-network impact.
- Confirm that no Microsoft assets were added.
- Keep PRs focused and use squash merge.

## Release and package safety

Publication uses npm Trusted Publishing/OIDC. Do not introduce a long-lived npm publish token.

Before publication, package-content validation must prevent Microsoft assets, local ZIPs, test fixtures, and unrelated development files from entering the npm package. Release/publish changes must preserve the same validated source SHA and privilege boundaries defined by `docs/RELEASE.md` and the adopted Foundation rules.

Official-package verification always uses a separately downloaded local ZIP and never commits it.
