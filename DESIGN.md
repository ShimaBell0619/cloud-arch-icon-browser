# Cloud Arch Icon Browser — Design Contract

Status: MVP design baseline for `v0.1.0`.

This document is the single source of truth for the current product, architecture, security, UX, testing, and release design. If implementation pressure conflicts with this document, do not silently change the design. Raise the conflict in an Issue or PR and obtain an explicit design decision first.

## 1. Product purpose

Cloud Arch Icon Browser is a small local tool for browsing the official Microsoft Azure Architecture Icons package.

The tool exists to make a user-downloaded official ZIP easier to navigate, search, preview, and download from without redistributing Microsoft assets.

The project is independent and must not imply Microsoft affiliation, endorsement, sponsorship, or official status.

### 1.1 Core product contract

- The tool does not include Microsoft Azure Architecture Icons.
- The user downloads the official ZIP from Microsoft.
- The user selects that ZIP in the local browser UI.
- Processing stays local to the user's machine.
- The tool does not modify Microsoft SVG assets.
- A downloaded SVG is the original file from the selected ZIP, with the original filename unchanged.
- The application makes no automatic external network requests at runtime.
- Manual links opened by the user, such as Microsoft Learn links, are allowed.

### 1.2 Official Microsoft terms

The authoritative terms are the current terms published by Microsoft on the Azure Architecture Icons page:

https://learn.microsoft.com/en-us/azure/architecture/icons/

The project must not copy Microsoft assets into the repository, npm package, screenshots used as fixtures, release artifacts, or tests.

Microsoft's current published guidance includes restrictions against cropping, flipping, rotating, distorting, or changing icon shape. The application therefore treats SVG files as immutable source assets.

### 1.3 Non-goals for MVP

The following are explicitly out of scope for `v0.1.0`:

- Hosted/public web application.
- Automatic download of the Microsoft icon package.
- Automatic runtime check for the latest Microsoft package.
- Account system, backend database, cloud storage, or telemetry.
- PNG conversion or other asset conversion.
- SVG editing.
- Bulk selection or bulk download.
- Persistent package selection across reloads or sessions.
- File System Access API persistence.
- PWA or Service Worker.
- Router/multiple pages.
- Windows executable, macOS app, Homebrew, Chocolatey, winget, Docker image, or other distribution channel.
- Storybook.
- Full formal WCAG audit.
- Historical support guarantees for old Microsoft icon packages.
- Generic multi-cloud abstraction.

Future ideas must remain explicitly marked as future work and must not be implemented opportunistically during MVP work.

## 2. Distribution and execution model

### 2.1 Public identity

- Repository base name: `cloud-arch-icon-browser`.
- npm package base name: `cloud-arch-icon-browser`.
- npm package name: `@shimabell0619/cloud-arch-icon-browser`.
- CLI binary name: `cloud-arch-icon-browser`.
- npm scope: `@shimabell0619`.
- App/package branding must not contain `Azure` or `Microsoft` in the product name.

### 2.2 Supported distribution

MVP officially supports npm/npx only.

Supported usage:

```bash
npx @shimabell0619/cloud-arch-icon-browser
```

The package contains both the CLI and the prebuilt Web UI.

### 2.3 Local server

The CLI:

1. Selects an available local port.
2. Starts a temporary static HTTP server bound only to `127.0.0.1`.
3. Prints the local URL to the terminal.
4. Attempts to open the default browser.
5. Continues serving if browser launch fails.
6. Stops on `Ctrl+C`.

The server is static-only:

- `GET` and `HEAD` are supported.
- Mutating HTTP methods return `405`.
- No application API endpoints exist.
- Path traversal must be rejected.
- Host header validation must only permit the expected localhost/127.0.0.1 host and selected port.

### 2.4 CLI surface

MVP CLI supports only:

- no arguments: start the app,
- `-h`, `--help`,
- `-v`, `--version`.

Unknown options fail with exit code 1. Help/version exit with code 0.

No ZIP path argument, verbose mode, custom host, custom port, or `--no-open` option is part of MVP.

## 3. Platform and runtime

- Supported Node.js runtime: `^22.22.2 || ^24.15.0 || >=26.0.0`.
- Node 25.x is unsupported by the current dependency set.
- Development and CI use Node 24.20.0 via `.node-version`.
- `package.json` runtime engine must match the supported range above.
- Supported operating systems: Windows, macOS, Linux.
- Package is ESM-only (`"type": "module"`).
- Package manager: npm.
- `package-lock.json` is committed.
- CI and release use `npm ci`.

## 4. Technology choices

### 4.1 Web UI

- Vite
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Base UI-backed shadcn primitives
- Rhea-style shadcn visual direction
- Lucide icons
- Zustand for shared application state
- Fuse.js for fuzzy search
- Sonner for lightweight notifications

Use shadcn selectively. Keep generated primitives thin and compose application-specific components outside the primitive layer.

### 4.2 ZIP processing

Use `@zip.js/zip.js` rather than JSZip.

Reasons include metadata visibility, on-demand extraction, and keeping the runtime session capable of extracting only the SVG that is actually previewed/downloaded.

Implementation must verify the current zip.js API before relying on specific options such as CRC checking or strict parsing. Do not cargo-cult API names from this design document.

### 4.3 CLI implementation

- Node built-in `node:http` for the local static server.
- `open` package for launching the user's default browser.
- CLI TypeScript compiled using `tsc`.
- Web UI built using Vite.
- Do not add Express or a separate CLI bundler without an approved design change.

### 4.4 Code quality tooling

- Biome for linting, formatting, and import organization.
- TypeScript strict mode.
- Vitest.
- React Testing Library.
- Playwright.
- `@axe-core/playwright`.

Strong TypeScript settings should include:

- `strict`,
- `noUncheckedIndexedAccess`,
- `exactOptionalPropertyTypes`,
- `noFallthroughCasesInSwitch`,
- `noImplicitOverride`.

Avoid `any`, unsafe double casts, and weakly typed boundary handling. Prefer type guards and explicit parsing.

## 5. Domain architecture

### 5.1 Layering

The domain/core layer must be React-independent and contain pure or mostly pure logic for:

- package metadata parsing,
- structural validation,
- path normalization and safety checks,
- display-name extraction,
- category tree construction,
- search normalization/ranking,
- domain types.

No React imports are allowed in core domain modules.

### 5.2 Runtime package session

A runtime `IconPackageSession`-style object owns package-scoped resources such as:

- zip reader,
- entry metadata lookup,
- icon metadata,
- Fuse index,
- lazy SVG extraction,
- object URL cache,
- cleanup/disposal.

This runtime object is not stored in Zustand.

Zustand contains only shared serializable-ish app state that benefits from cross-component access, such as:

- current icon metadata list,
- selected category,
- search query,
- selected icon ID,
- load status and public package summary.

Derived search results are computed from state/session inputs and are not duplicated into the store.

Ephemeral component UI state remains local React state when possible.

### 5.3 Package replacement lifecycle

- User selects a package on every run/session.
- Reload resets the application completely.
- Initial selection supports drag/drop and file picker.
- After a package is loaded, global drag/drop replacement is disabled.
- Replacement occurs only through an explicit `Change package` action.
- A candidate replacement is validated before replacing the active session.
- Invalid replacement preserves the currently active session.
- Successful replacement atomically swaps sessions, then disposes the previous session.
- All object URLs owned by the disposed session are revoked.

## 6. ZIP and icon model

### 6.1 Compatibility model

The application does not hard-code a Microsoft ZIP version number such as `V24`.

Compatibility is structural. The app is designed and tested against the latest official package available during release verification, but old or future packages may work if structurally compatible.

Only the latest package explicitly recorded as successfully verified in `COMPATIBILITY.md` is officially supported.

### 6.2 Structural behavior

- Enumerate package metadata before extracting all SVG bodies.
- Inspect archive structure and relevant safety metadata.
- Identify browsable SVG entries.
- Ignore non-SVG files for browsing/search.
- Use ZIP folder hierarchy as the authoritative category structure.
- Do not invent/reclassify Microsoft service categories.
- Hide one single common packaging root folder when all browsable icons share it.
- Otherwise show roots as they exist.
- Recursive folder hierarchy is supported.
- Parent category selection includes all descendant icons.

Implementation-time validation thresholds must be derived from the actual latest official ZIP with generous headroom, not from guessed category names or a hard-coded version filename.

Reasonable safety checks include rejecting ambiguous/unsafe paths, duplicate normalized paths, encrypted archives, and archive structures that are implausible for the supported official package. ZIP hardening should remain proportionate to the product's intended happy path; do not turn MVP into a hostile-archive research project.

### 6.3 Icon ID

The stable in-session icon identifier is the normalized full path inside the ZIP.

### 6.4 Display name

For the current Microsoft naming convention, parse names conceptually using:

```text
^\d+-icon-service-(.+)\.svg$
```

Then:

- strip the convention prefix/suffix,
- replace hyphens with spaces,
- preserve original casing,
- do not title-case acronyms such as SQL, AI, IoT.

Fallback for nonmatching SVG filenames:

- strip `.svg`,
- replace hyphens with spaces,
- preserve casing.

Original filenames are never changed for download.

Naming-convention match rate may be used as one structural plausibility signal. The release verification process should measure the actual official package first and set thresholds with headroom.

## 7. Search design

Search fields:

- display name,
- original filename,
- category path.

Default search scope is all categories. If a category is selected, search is restricted to that category subtree. The query remains intact when changing category.

Search is real-time with approximately 150–200 ms debounce.

Normalization should make inputs such as these behave similarly:

- `app service`
- `app-service`
- `appservice`

Ranking priority:

1. normalized exact display-name match,
2. display-name prefix match,
3. display-name substring match,
4. Fuse fuzzy results.

Initial Fuse weighting target:

- display name: 0.7,
- filename: 0.2,
- category path: 0.1.

Initial fuzzy threshold target is around 0.35, but it must be tuned against real package data rather than treated as an immutable constant.

Weak fuzzy matches should be omitted. Do not impose an arbitrary result-count cap in MVP. Show the result count.

## 8. User experience

### 8.1 Visual direction

The interface should be modern, calm, dense, and product-focused rather than a generic admin dashboard.

Primary palette direction:

- white,
- light neutral grays,
- vivid blue accent approximately inspired by `#3880F1`,
- deep neutral gray surfaces in dark mode rather than pure black.

Do not use one raw blue everywhere. Define semantic design tokens such as accent, hover, soft accent, focus ring, borders, foreground, muted foreground, and surfaces.

Dark mode follows `prefers-color-scheme`. MVP has no manual theme switch.

Avoid:

- gradients as a primary motif,
- glassmorphism,
- oversized marketing cards,
- generic AI-SaaS styling,
- heavy shadows,
- Microsoft/Azure visual imitation.

### 8.2 Design references

Use these as directional references, not templates to clone:

- shadcn `sidebar-16`: main layout inspiration,
- Linear: calm density, keyboard-first interaction, restrained chrome,
- Vercel: neutral surfaces, typography, hierarchy,
- 21st.dev: selective inspiration for search/card/empty/loading patterns.

Do not copy brand-specific compositions or create a false impression of affiliation.

### 8.3 Branding

The app logo/favicon must be independent and abstract. Planned direction is a compact rounded tile/grid motif using neutral surfaces and the project's blue accent.

Do not use Microsoft, Azure, Windows, or official product iconography as the app logo/favicon.

### 8.4 Typography

Use a locally bundled Geist Sans Variable font. No runtime font CDN/network request.

Geist Mono is not required for MVP.

Retain the font's upstream license and notice information in project notices. Do not treat the font as project-owned artwork.

### 8.5 Initial screen and loading

Before a package is loaded, show a focused package Dropzone rather than an empty application shell.

Loading remains in the same focused area with clear phases such as:

- Reading,
- Validating,
- Indexing.

A fake percentage progress bar is not required.

### 8.6 Loaded layout

Desktop:

- fixed-width left category sidebar,
- sticky search/action toolbar,
- responsive icon grid.

Narrow viewport:

- category navigation becomes a Drawer/Sheet,
- grid adapts without horizontal breakage,
- dialogs fit within the viewport.

Toolbar priority:

1. search,
2. result count,
3. `Change package`.

Loaded ZIP filename/icon count/category count are useful but visually secondary.

### 8.7 Category tree

- Single category selection.
- `All` selected by default after successful load.
- Top-level folders visible initially.
- Child folders collapsed initially.
- Sibling folders alphabetical.
- Clicking category label selects it.
- Chevron controls expand/collapse.

The main icon grid remains flat; it is not grouped by category.

### 8.8 Icon grid/card

- Flat alphabetical order by display name when not in ranked search mode.
- Compact fixed-height cards.
- SVG preview approximately 64 px target footprint while preserving aspect ratio.
- Display name up to roughly two lines.
- Category path one line.
- Full values available by accessible Tooltip when truncated.
- Whole card is clickable/keyboard activatable.
- No inline download control on the card.
- Preview images lazy-load.
- Use stable fixed-size skeletons while previews load.
- No list virtualization for MVP.

Duplicate display names are disambiguated using category path.

### 8.9 Icon details dialog

Card activation opens a Dialog containing:

- larger safe preview,
- display name,
- full category path,
- original filename,
- `Download SVG`,
- close action.

One SVG is downloaded at a time.

### 8.10 Search keyboard behavior

`/` focuses search unless focus is already in an editable control or modal/dialog context where interception would be inappropriate.

When the query is non-empty, show a clear control. Clearing the query keeps the selected category and search focus.

Do not auto-focus the search input immediately after package load.

### 8.11 Empty state

Search empty state is compact and actionable. Prefer actions such as:

- `Clear search`,
- `Search all categories` when category scope is limiting results.

No decorative illustration is required.

## 9. SVG handling and security

### 9.1 Immutability

Original SVG bytes must not be rewritten, optimized, reformatted, recolored, resized, or sanitized for download.

### 9.2 Preview isolation

Preview using an image context such as an `<img>` with a package-session-owned Blob URL. Never inject arbitrary SVG markup using `innerHTML` or equivalent DOM insertion.

Perform a lightweight defense-in-depth check for suspicious active/external content. If an SVG is considered unsafe to preview, refuse the preview with a clear UI state while preserving the original file for explicit download.

Do not claim this lightweight check is a general-purpose SVG sanitizer.

### 9.3 CSP and browser security headers

The local server must set a restrictive CSP. Target policy shape:

```text
default-src 'self';
script-src 'self';
style-src 'self' ...;
img-src 'self' blob: data:;
connect-src 'self';
object-src 'none';
base-uri 'none';
frame-ancestors 'none';
```

Only add allowances actually required by the built app. Do not use `unsafe-eval`. Determine whether Tailwind/shadcn output needs an inline-style allowance based on the production build rather than assumption.

Also set appropriate headers such as:

- `X-Content-Type-Options: nosniff`,
- strict referrer policy,
- frame protection / CSP frame ancestors,
- opener isolation where compatible,
- permissions policy denying unused sensitive capabilities such as camera, microphone, and geolocation.

Avoid unnecessary cross-origin isolation policies if they interfere with normal Blob/SVG behavior without a concrete security benefit.

### 9.4 Runtime network policy

The application performs no automatic external network communication after npm package retrieval.

Therefore:

- no telemetry,
- no analytics,
- no crash reporting,
- no CDN dependencies,
- no Google Fonts,
- no runtime update check,
- no automatic Microsoft package/version lookup.

User-clicked external documentation links are permitted.

### 9.5 Error boundary

Use a React Error Boundary for unexpected render/application failures. On fatal application reset, dispose the active package session and return to a safe initial state. Do not send crash data anywhere.

## 10. Accessibility

MVP accessibility requirements include:

- keyboard operation for primary flows,
- visible focus rings,
- correct button/card keyboard semantics,
- Enter/Space activation as appropriate,
- Dialog focus management,
- Escape to close Dialog,
- restore focus after Dialog close,
- ARIA labeling where needed,
- useful image alternative text,
- do not rely on color alone.

Use `@axe-core/playwright` on key screens. Automated axe checks do not constitute a full accessibility audit.

## 11. Testing strategy

### 11.1 Unit tests

Core/domain logic receives the deepest unit coverage, including:

- package parser,
- validator,
- path normalization,
- display-name parser,
- recursive category hierarchy,
- search normalization and ranking,
- invalid package behavior,
- session replacement/reset behavior where testable,
- original filename preservation.

Initial core coverage gates:

- Lines: 90%
- Functions: 90%
- Statements: 90%
- Branches: 85%

Do not game the metrics with meaningless tests.

### 11.2 Component tests

Use React Testing Library for important interaction boundaries rather than exhaustive visual testing of every primitive.

### 11.3 E2E

Playwright should cover one or two golden paths, including:

1. start the local app,
2. upload a self-created dummy ZIP,
3. browse icons,
4. search,
5. open details Dialog,
6. download an SVG,
7. verify key keyboard/focus behavior.

Microsoft ZIP/SVG assets must never be committed as test fixtures. Tests create/use project-owned dummy SVG/ZIP data.

### 11.4 Visual regression

Keep visual regression limited and stable, initially covering approximately:

- initial package screen,
- loaded icon grid,
- details dialog.

Use a stable Linux CI environment and local font resources for deterministic screenshots.

### 11.5 CI matrix

Linux runs the full suite:

- Biome check,
- typecheck,
- Vitest,
- build,
- Playwright,
- accessibility smoke checks,
- npm package-content validation.

Windows and macOS run lighter CLI smoke validation.

CodeQL for JavaScript/TypeScript is enabled from MVP.

## 12. Dependency and package policy

- Pin direct dependencies/devDependencies to exact versions.
- Dependabot monitors npm dependencies and GitHub Actions.
- Patch dependency updates may auto-merge after required CI is green.
- Minor updates require human merge/review.
- Major updates require explicit manual review.
- Release validation runs `npm audit` and blocks High/Critical findings.
- `npm audit` is not required on every normal PR.

The npm package uses an explicit `files` allowlist. Release CI runs `npm pack --dry-run` and verifies that no Microsoft ZIP/SVG, test fixture, accidental local package, or unrelated source artifact is published.

## 13. Repository governance

### 13.1 Canonical documents

- `DESIGN.md`: current design source of truth.
- `AGENTS.md`: coding-agent instructions and document index.
- `README.md`: public introduction and usage.
- `COMPATIBILITY.md`: last manually verified official Microsoft package metadata.
- `CONTRIBUTING.md`: external contribution rules.
- `SECURITY.md`: vulnerability reporting/support policy.
- `THIRD_PARTY_NOTICES.md`: third-party notices.
- `LICENSE`: MIT license for project code.

ADR files are intentionally not used for MVP. Decision history lives in Issues, PRs, and Git history while `DESIGN.md` represents the current contract.

### 13.2 External contributions

External Issues and PRs are welcome.

Small fixes may be proposed directly. Significant features, architecture changes, security model changes, UX policy changes, new distribution channels, or new foundational dependencies must be discussed in an Issue first.

### 13.3 Agent behavior

Coding agents implement approved design; they do not invent replacement product policy.

If an agent identifies a design/implementation conflict, it must explain the conflict and recommendation rather than silently changing:

- architecture,
- security model,
- UX contract,
- publication model,
- runtime network policy,
- foundational stack/dependencies.

Implementation-level details not covered here may be decided pragmatically.

## 14. Git and PR workflow

Use GitHub Flow:

- `main` is the only long-lived branch.
- Work happens on short-lived branches.
- Changes enter `main` through PRs.
- Required CI must pass.
- Direct pushes/force pushes to `main` should be prevented once repository rules are configured.
- Solo project requires zero human approval count, but CI remains required.
- Squash merge only.
- Delete merged branches automatically.
- PR titles use Conventional Commits.
- Internal branch commit messages do not need to follow Conventional Commits.

A PR template should include:

- summary,
- design impact,
- validation performed,
- Changeset status,
- security/runtime-network confirmation,
- confirmation that no Microsoft assets were added.

## 15. Implementation plan for v0.1.0

Implement in several PRs rather than one giant change.

Recommended phases:

1. Project foundation — Vite/React/TypeScript/Tailwind/shadcn, tooling, CI skeleton, repository docs.
2. Core package processing — ZIP/session/parser/validator/category/search plus core tests.
3. Application UI — package loading, sidebar/search/grid/dialog, responsive behavior, accessibility basics.
4. CLI/local server — static server, browser launch, security headers, host/path handling.
5. Release readiness — E2E, visual/a11y checks, npm packaging, compatibility verification command, watcher/release workflows.

Create corresponding GitHub Issues and track them under a `v0.1.0` milestone when available.

## 16. Release and versioning

Initial release: `v0.1.0`.

### 16.1 SemVer policy

Before `1.0.0`:

- patch: fixes/internal compatible improvements,
- minor: new features or breaking changes.

Breaking changes during `0.x` must be called out clearly in Changesets/CHANGELOG.

At/after `1.0.0`, use normal SemVer:

- patch: backward-compatible fixes,
- minor: backward-compatible features,
- major: breaking changes.

### 16.2 npm channel

MVP publishes only the `latest` dist-tag. Do not introduce `next`/`beta` channels until there is a real need.

### 16.3 Changesets release model

Use Changesets for release intent, versioning, CHANGELOG, and Release PR creation.

Target workflow:

1. Feature/fix PR includes an appropriate Changeset when user-visible/release-relevant.
2. Changesets Action creates/updates a Release PR.
3. Human merges the Release PR.
4. GitHub Actions publishes npm, creates immutable `vX.Y.Z` tag, and creates the GitHub Release.

Version must match across `package.json`, npm, tag, and GitHub Release.

Do not use moving major/minor tags.

### 16.4 npm authentication

Use npm Trusted Publishing/OIDC from GitHub Actions with provenance when supported. Do not rely on a long-lived `NPM_TOKEN` for normal publication.

Initial package bootstrap may require a one-time manual npm step before trusted publisher configuration can be completed.

## 17. Official package compatibility operations

### 17.1 Release verification

Provide a development-only command conceptually like:

```bash
npm run verify:official -- /path/to/latest-official.zip
```

It reuses production core parser/validator code and prints compatibility metadata suitable for updating `COMPATIBILITY.md`.

This command is not part of the public end-user CLI.

Before release, manually download the latest official package from Microsoft, run this check locally, and update `COMPATIBILITY.md`.

Only the most recently recorded successful package is formally supported.

### 17.2 Weekly Microsoft watcher

A scheduled GitHub Actions workflow checks the official Microsoft Azure Architecture Icons page approximately weekly for:

1. a changed/new official ZIP link/package identity,
2. meaningful changes to the icon terms/guidelines text.

If a change is detected, create a maintenance Issue for human review.

The watcher:

- does not store or commit Microsoft icon assets,
- does not automatically rewrite compatibility claims,
- does not automatically make legal judgments,
- does not automatically change application code,
- does not introduce a runtime network dependency into the application.

If Microsoft terms appear materially incompatible with the project's intended use, pause new releases and review the project's public documentation and distribution status. Do not implement a remote kill switch.

## 18. Cache behavior

- `index.html`: no-store.
- hashed Vite static assets: long-lived immutable caching is acceptable.

This local cache policy must not introduce persistence of user-selected Microsoft assets.

## 19. Version display

CLI version and Web UI version must derive from the same `package.json` version source rather than independent constants.

## 20. Design-change rule

Changes to any of the following require explicit approval and an update to this document in the same or preceding PR:

- product purpose/non-goals,
- Microsoft asset handling,
- runtime network policy,
- security boundary,
- primary architecture/layering,
- core dependency foundation,
- supported distribution model,
- compatibility/support policy,
- release/publication model,
- major UX/navigation model,
- OSS contribution policy.

Implementation details that do not alter these contracts may be decided by maintainers or coding agents without a separate design approval.