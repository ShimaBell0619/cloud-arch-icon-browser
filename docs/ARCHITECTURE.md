# Architecture

This document is authoritative for substantial implementation architecture. Durable product behavior belongs in `PRODUCT.md`; UI/UX decisions belong in `DESIGN.md`; security requirements remain authoritative in `SECURITY.md`.

## Technology baseline

The current implementation uses:

- Vite, React, and TypeScript,
- Tailwind CSS v4,
- shadcn/ui with Base UI-backed primitives,
- Fuse.js for search,
- `@zip.js/zip.js` for ZIP processing,
- Node built-in `node:http` plus `open` for the packaged CLI,
- Biome, Vitest, React Testing Library, Playwright, and `@axe-core/playwright` for quality/testing.

Prefer existing platform/runtime capabilities and current dependencies. Do not add a foundational dependency or architectural layer without a concrete need and the approval required by `AGENTS.md`.

## Boundary model

### React-independent core

Package parsing, validation, path handling, display-name parsing, category construction, search ranking, persistence parsing/migration, durable icon matching, Tray operations, Saved Set validation/reconciliation, and usage aggregation remain React-independent.

React owns application presentation/composition and ephemeral UI state; it should not become the only location where durable domain rules are implemented.

### Package session and resource ownership

An `IconPackageSession`-style runtime object owns package-scoped resources such as:

- ZIP reader and entry metadata,
- search index,
- lazy extracted SVG Blobs,
- preview/Object URLs,
- package-scoped caches,
- disposal lifecycle.

This runtime object is not serializable application state and must never be written to local persistence. Session disposal deterministically releases readers, Blobs/Object URLs, and other package resources where applicable.

Derived search results are computed from current state/session inputs rather than copied into persistent/shared state.

## Package lifecycle implementation

The product lifecycle contract is defined in `PRODUCT.md`. Implementation preserves it through these boundaries:

1. obtain a candidate from file input/drag-and-drop or File System Access where available,
2. inspect and validate the candidate before replacing the active session,
3. create a new package session only after validation succeeds,
4. conservatively reconcile active Tray references against the new package,
5. atomically expose the new session to the application,
6. dispose the previous session and its resources.

Invalid replacement must not partially mutate or dispose the current valid session.

### Remembered local file reference

`localStorage` never contains a file handle. A separate IndexedDB boundary may store one structured-cloneable `FileSystemFileHandle` only after the referenced package has passed normal validation.

Remembering a handle is best-effort; package loading must not depend on IndexedDB availability. A replacement handle is committed only after replacement validation succeeds. Permission prompts are initiated only by explicit user gestures. Denied/stale/inaccessible references fail back to normal selection without corrupting other persisted state.

## Persistence architecture

The product-level persistence contract and durable matching semantics live in `PRODUCT.md`.

Implementation treats `localStorage` as untrusted input and validates a schema-versioned root at `cloud-arch-icon-browser:state`. Malformed data, unsupported future versions, parse failures, and read/write failures fall back safely.

Persisted values are lightweight metadata. Never serialize package bytes, SVG/generated images, Blobs/Object URLs, ZIP readers, package sessions, or other runtime resources.

Migration code preserves the explicit schema semantics in `PRODUCT.md`; fuzzy similarity is not a migration strategy for durable icon identity.

## ZIP and SVG processing architecture

ZIP processing is metadata-first and lazy:

- enumerate and validate archive metadata before extracting every SVG body,
- normalize/check paths defensively and reject unsafe/ambiguous structures,
- build categories and searchable metadata without eagerly materializing all SVGs,
- lazily extract SVG data when preview/copy/download requires it,
- keep extracted resources owned by the active package session.

SVG preview uses an image context such as `<img>` backed by a session-owned Blob URL. Untrusted SVG markup is never injected into the application DOM with `innerHTML` or equivalent APIs.

Preview validation is defense in depth, not a general hostile-archive analysis/sanitization product. Original SVG download bytes remain separate from transient preview/clipboard representations. Detailed security requirements are in `SECURITY.md`.

### Clipboard image derivation

`Copy image` and Experimental multi-object representations derive transient PNG data without mutating source SVGs. Canvas/PNG/Blob representations are not persisted.

Where perceived-size normalization is used, render to an offscreen canvas, detect non-transparent alpha bounds, and fit visible artwork into the 512×512 transparent output with consistent padding while preserving aspect ratio.

## Search architecture

The ranking contract is authoritative in `PRODUCT.md`.

Search implementation keeps deterministic lexical tiers ahead of Fuse fuzzy fallback. Category filtering scopes candidates to the selected subtree. Search metadata is derived from display name, original filename, and visible category path.

Search tuning such as Fuse threshold/weights may be adjusted with measured package behavior only if the product ranking tiers and deterministic-match precedence remain intact.

## Local CLI/server architecture

The packaged CLI serves prebuilt static application content from the canonical local listener `127.0.0.1:41731`.

The server:

- binds only to loopback,
- serves expected static content through `GET`/`HEAD`,
- rejects unsafe paths and unexpected Host values,
- attempts to open the default browser,
- reuses an already-running matching application where supported,
- fails actionably if another process owns the canonical port,
- terminates on `Ctrl+C` when the current invocation owns the server.

Mutating methods remain rejected except for the explicitly approved Experimental PowerPoint bridge routes. Security header/CSP and Host/Origin rules are defined in `SECURITY.md`.

## Experimental PowerPoint bridge architecture

The bridge is a narrow capability of the existing packaged local server, not a generic backend or command API.

It exposes only:

- `GET /__bridge/powerpoint/capability`,
- `POST /__bridge/powerpoint/copy-all`.

The security contract in `SECURITY.md` is authoritative. Architecturally, the operation is fixed:

1. the application prepares bounded, application-owned PNG/quantity JSON,
2. the server validates canonical Host/Origin and per-process capability token,
3. the server creates unpredictable app-owned temporary paths,
4. a fixed embedded PowerShell/PowerPoint automation sequence creates/uses a temporary presentation,
5. one independent picture shape is created per expanded Tray quantity and arranged in deterministic order/grid,
6. PowerPoint copies the fixed `ShapeRange`,
7. the temporary presentation/resources are closed/released and generated temporary files are removed where possible.

The browser never supplies arbitrary local paths, commands, PowerShell arguments, shell input, COM method names, or generic automation instructions. Only one active operation is allowed and all payload/object/timeout limits from `SECURITY.md` remain enforced.

Attach to an already-running PowerPoint instance without quitting it. If automation creates its own PowerPoint application, the automation owns and closes that application.

## Failure and cleanup architecture

- Package candidate failure leaves the current active session intact.
- Fatal React/application recovery disposes the active package session and returns to a safe initial state without transmitting crash data.
- Object URLs and package-session resources have explicit ownership and deterministic cleanup.
- Temporary PowerPoint files/manifests/images are app-owned and removed on success/failure where possible.
- Persistence failures never make package selection/loading unusable.

## Testing boundaries

Core/domain logic receives the deepest unit coverage. Current minimum core coverage gates are:

- Lines: 90%
- Functions: 90%
- Statements: 90%
- Branches: 85%

Browser behavior is covered by a representative Playwright path, accessibility checks, and a deliberately small visual-regression baseline. Tests and review artifacts use only project-owned synthetic ZIP/SVG fixtures.

Application-specific CLI/package/browser/platform validation remains application-owned even when generic Web checks are provided by Web App Foundation. See `AGENTS.md`, `.github/workflows/`, and `docs/UI_REVIEW.md` for validation ownership.

## Specialist authority

- `SECURITY.md` — ZIP/SVG/localhost/bridge/CSP/dependency security boundaries.
- `COMPATIBILITY.md` — latest verified official package and compatibility evidence.
- `docs/RELEASE.md` — Changesets, npm publication, release identity, and maintenance operations.
- `docs/UI_REVIEW.md` — rendered UI review and Pages preview operations.

Do not duplicate detailed specialist procedures here when a link is sufficient.
