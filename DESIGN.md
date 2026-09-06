# Cloud Arch Icon Browser — Design Contract

Status: current design baseline. This document tracks current repository behavior; publication/version state is recorded in `README.md`, `CHANGELOG.md`, and `docs/RELEASE.md`.

This document is the source of truth for the current product, architecture, security, UX, testing, compatibility, and release design. It describes the behavior the repository is expected to preserve now; historical implementation planning is recorded separately near the end of this document.

If implementation pressure conflicts with this document, do not silently change the design. Raise the conflict in an Issue or PR and obtain an explicit design decision first.

## 1. Product purpose

Cloud Arch Icon Browser is a small local tool for browsing the official Microsoft Azure Architecture Icons package.

The tool makes a user-downloaded official ZIP easier to navigate, search, preview, copy into compatible Office workflows, and download from without redistributing Microsoft assets.

The project is independent and must not imply Microsoft affiliation, endorsement, sponsorship, or official status.

### 1.1 Core product contract

- The tool does not include Microsoft Azure Architecture Icons.
- The user downloads the official ZIP from Microsoft.
- The user selects that ZIP in the browser UI.
- Processing stays local to the user's machine/browser session.
- The tool does not modify Microsoft SVG assets.
- A downloaded SVG is the original file from the selected ZIP, with the original filename unchanged.
- The application makes no automatic external API/network requests for package content, telemetry, analytics, or update metadata at runtime.
- Manual links opened by the user, such as Microsoft Learn links, are allowed.
- An optional GitHub Pages build may host the static application solely as a UI-verification preview; it must not upload, persist, or proxy user-selected ZIP/SVG contents and is not the supported product distribution channel.

### 1.2 Official Microsoft terms

The authoritative terms are the current terms published by Microsoft on the Azure Architecture Icons page:

https://learn.microsoft.com/en-us/azure/architecture/icons/

The project must not copy Microsoft assets into the repository, npm package, screenshots used as fixtures, release artifacts, tests, or GitHub Pages artifacts.

Microsoft's published guidance includes restrictions against cropping, flipping, rotating, distorting, or changing icon shape. The application therefore treats SVG files as immutable source assets.

### 1.3 Current non-goals

The following are outside the current product baseline and require an explicit design decision before implementation:

- Hosted/public web application as a supported product distribution or service. The narrow GitHub Pages UI-preview exception is defined in §2.3.
- Automatic download of the Microsoft icon package.
- Automatic runtime check for the latest Microsoft package.
- Account system, backend database, cloud storage, or telemetry.
- Raster download/export formats beyond the transient clipboard PNG copy.
- SVG editing.
- Bulk selection or bulk download.
- Persistent package selection across reloads or sessions.
- File System Access API persistence.
- PWA or Service Worker.
- Router/multiple pages.
- Windows executable, macOS app, Homebrew, Chocolatey, winget, Docker image, or another distribution channel.
- Storybook.
- Full formal WCAG audit.
- Historical support guarantees for old Microsoft icon packages.
- Generic multi-cloud abstraction.

Future ideas must remain explicitly marked as future work. Do not implement them opportunistically inside unrelated changes.

## 2. Public identity and distribution

### 2.1 Identity

- Repository base name: `cloud-arch-icon-browser`.
- npm package base name: `cloud-arch-icon-browser`.
- npm package name: `@shimabell06/cloud-arch-icon-browser`.
- CLI binary name: `cloud-arch-icon-browser`.
- npm scope: `@shimabell06`.
- App/package branding must not contain `Azure` or `Microsoft` in the product name.

### 2.2 Supported distribution

The supported product distribution is npm/npx:

```bash
npx @shimabell06/cloud-arch-icon-browser
```

The npm package contains both the CLI and the prebuilt Web UI.

### 2.3 GitHub Pages UI preview

GitHub Pages may host the built Web UI as an optional maintainer preview for checking responsive behavior from phones, tablets, and other browsers without starting the local CLI server.

This preview is not a supported distribution channel and must preserve the same local package-processing boundary:

- Deploy only repository-owned built application assets.
- Never include Microsoft ZIP/SVG assets in the repository or Pages artifact.
- A ZIP selected on the Pages site is processed entirely in that browser session.
- Do not upload selected ZIP/SVG content to GitHub or another backend.
- Do not add telemetry, analytics, account state, cloud sync, or runtime package/update APIs.
- Do not persist file handles or silently reopen a package.
- The Pages build may use the repository subpath base required by GitHub Pages while the normal npm/npx build keeps the root `/` base.
- Pull requests validate a target-specific Pages build. Same-repository PRs also publish to stable `/pr-N/` preview paths, while fork PRs remain build-only.
- `main` publishes at the site root and preserves active `pr-*` previews; closing or merging a PR removes its preview.

The operational and visual-review setup is documented in `docs/UI_REVIEW.md`.

### 2.4 Local server

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
- Path traversal is rejected.
- Host header validation permits only the expected localhost/127.0.0.1 host and selected port.

### 2.5 CLI surface

The current CLI supports:

- no arguments: start the app,
- `-h`, `--help`,
- `-v`, `--version`.

Unknown options fail with exit code 1. Help/version exit with code 0.

ZIP path arguments, verbose mode, custom host, custom port, and `--no-open` are not part of the current public CLI contract.

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
- React local state by default; introduce a shared state library only when cross-component state warrants it
- Fuse.js for fuzzy search
- Sonner for lightweight notifications

Use shadcn selectively. Keep generated primitives thin and compose application-specific components outside the primitive layer.

### 4.2 ZIP processing

Use `@zip.js/zip.js` rather than JSZip.

The design depends on metadata visibility, on-demand extraction, and keeping the runtime session capable of extracting only the SVG that is actually previewed/downloaded.

Verify the current zip.js API before relying on specific security, CRC, or strict-parsing options. Do not cargo-cult API names from old documentation or this design record.

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

Strong TypeScript settings include:

- `strict`,
- `noUncheckedIndexedAccess`,
- `exactOptionalPropertyTypes`,
- `noFallthroughCasesInSwitch`,
- `noImplicitOverride`.

Avoid `any`, unsafe double casts, and weakly typed boundary handling. Prefer type guards and explicit parsing.

## 5. Domain architecture

### 5.1 Layering

The domain/core layer is React-independent and contains pure or mostly pure logic for:

- package metadata parsing,
- structural validation,
- path normalization and safety checks,
- display-name extraction,
- category tree construction,
- search normalization/ranking,
- stable persisted icon identity and re-matching,
- local UI persistence parsing/migration helpers,
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

This runtime object must not be placed in local persistence or in any serializable/shared state container.

The current UI may use local React state. If a shared state library is introduced later, it may hold only serializable-ish application metadata that benefits from cross-component access, such as:

- current icon metadata list,
- selected category,
- search query,
- selected icon ID,
- load status and public package summary.

A shared store must never own the ZIP reader, `IconPackageSession`, Blob/Object URLs, extracted SVG bodies, or other package-scoped resources.

Derived search results are computed from state/session inputs and are not duplicated into shared state. Ephemeral component UI state remains local React state when possible.

### 5.3 Local UI persistence

UI persistence is intentionally separate from package persistence. The application may remember approved UI metadata across reloads while the Microsoft icon package itself always remains session-only.

The local persistence root key is:

```text
cloud-arch-icon-browser:state
```

Persistence requirements:

- The root object is explicitly schema-versioned.
- `localStorage` is treated as untrusted input and parsed defensively.
- Malformed JSON, invalid field types, or an unknown future schema version fall back to clean defaults rather than preventing application startup.
- Known historical schema versions must be migrated explicitly when such versions exist; do not guess migrations for unknown future versions.
- Storage read/write failures must not prevent the package picker or active package workflow from functioning.
- Persistence parsing, migration, matching, and history logic remain React- and state-library-independent.

Approved persisted data includes only UI metadata:

- theme preference: `system | light | dark`,
- view preference: `grid | compact`,
- sidebar collapsed state,
- Favorite icon references,
- recently opened icon references,
- recent search query strings.

Never persist:

- ZIP bytes or a selected file handle,
- SVG bodies/bytes,
- generated image bytes,
- Blob/Object URLs,
- zip readers,
- `IconPackageSession`,
- other package-scoped runtime resources.

Favorite and Recent icon records store only the minimum real metadata needed for deterministic re-matching: canonical visible path, original filename, display name, category path, and a saved/opened timestamp. Stored metadata is not authoritative display data; after a package is selected, the UI renders the currently matched `IconEntry` metadata.

Favorite/Recent records are not partitioned by Microsoft package version. Re-matching follows a conservative two-stage policy:

1. Exact match on the canonical visible relative path derived from `categoryPath + originalFilename`, excluding the hidden packaging root.
2. If exact matching fails, compare a canonical service filename/name that ignores only known mechanical naming differences such as the numeric `NNNNN-icon-service-` prefix. This fallback is accepted only when exactly one current icon matches.

Fuzzy-search similarity must never migrate a Favorite/Recent record. Ambiguous or missing records remain persisted but are hidden for the active package. A successful unique fallback match self-heals the persisted reference to the current icon metadata for later exact matching.

History behavior:

- Recent icons: maximum 50, newest first, de-duplicated by durable identity.
- Recent searches: maximum 10, trimmed, case-insensitively de-duplicated, with the latest entered display form retained.
- Favorites: no automatic count limit.

Reload always returns the application to the package-picker state and requires explicit ZIP selection. Persisted UI metadata does not permit silent package reopening.

### 5.4 Package replacement lifecycle

- User selects a package on every run/session.
- Reload clears the active package session and returns to the package picker; only the approved UI metadata in §5.3 may persist.
- Initial selection supports drag/drop and file picker.
- In secure contexts where `showOpenFilePicker()` is available, package selection may prefer a transient File System Access picker with a ZIP filter; cancellation is silent and unsupported/error cases fall back to the standard file input.
- A `FileSystemFileHandle` is used only long enough to obtain the current-session `File` and must never be persisted or used to silently reopen a package.
- After a package is loaded, global drag/drop replacement is disabled.
- Replacement occurs only through an explicit `Change package` action.
- A candidate replacement is validated before replacing the active session.
- Invalid replacement preserves the currently active session.
- Successful replacement atomically swaps sessions, then disposes the previous session.
- All object URLs owned by the disposed session are revoked.

## 6. ZIP and icon model

### 6.1 Compatibility model

The application does not hard-code a Microsoft ZIP version number such as `V24`.

Compatibility is structural. The app is designed and tested against the latest official package available during release verification, but older or future packages may work if structurally compatible.

Only the latest package explicitly recorded as successfully verified in `COMPATIBILITY.md` is officially supported.

### 6.2 Structural behavior

- Enumerate package metadata before extracting all SVG bodies.
- Inspect archive structure and relevant safety metadata.
- Identify browsable SVG entries.
- Ignore non-SVG files for browsing/search.
- Use ZIP folder hierarchy as the authoritative category structure.
- Do not invent or reclassify Microsoft service categories.
- Hide one single common packaging root folder when all browsable icons share it.
- Otherwise show roots as they exist.
- Recursive folder hierarchy is supported.
- Parent category selection includes all descendant icons.

Validation thresholds are derived from the actual current official ZIP with generous headroom rather than guessed category names or a hard-coded version filename.

Safety checks include rejecting ambiguous/unsafe paths, duplicate normalized paths, encrypted archives, and archive structures that are implausible for the supported official package. ZIP hardening should remain proportionate to the product's intended happy path; this project is not a hostile-archive research platform.

### 6.3 Icon identity

The stable in-session `IconEntry.id` is the normalized full path inside the ZIP, including the hidden packaging root when one exists. It remains the runtime/session identifier and is not used as the sole durable persisted identity.

Persisted UI references use a separate canonical visible relative path derived from `categoryPath + originalFilename`, excluding the hidden packaging root. This allows a package-root rename to preserve Favorites/Recent without changing runtime ZIP identity semantics.

When that visible path no longer exists, persisted re-matching may ignore only the mechanical numeric `NNNNN-icon-service-` filename prefix and accept the result only if exactly one current icon matches. Fuzzy matching is not a persistence identity mechanism.

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

Naming-convention match rate may be used as one structural plausibility signal. Release verification measures the actual official package and keeps thresholds with headroom.

## 7. Search design

Search fields:

- display name,
- original filename,
- category path.

Default search scope is all categories. If a category is selected, search is restricted to that category subtree. The query remains intact when changing category.

Search is real-time with approximately 150–200 ms debounce.

Normalization makes inputs such as these behave similarly:

- `app service`
- `app-service`
- `appservice`

Ranking priority:

1. normalized exact match against display name, original filename, or category path,
2. prefix match against those same fields,
3. substring match against those same fields,
4. Fuse fuzzy results.

Fuse weighting target:

- display name: 0.7,
- filename: 0.2,
- category path: 0.1.

The fuzzy threshold is around 0.35 and should continue to be tuned against real package data rather than treated as an immutable constant.

Weak fuzzy matches are omitted. Do not impose an arbitrary result-count cap. Show the result count.

## 8. User experience

### 8.1 Visual direction

The interface is modern, calm, dense, and product-focused rather than a generic admin dashboard.

Primary palette direction:

- white,
- light neutral grays,
- vivid blue accent approximately inspired by `#3880F1`,
- deep neutral gray surfaces in dark mode rather than pure black.

Use semantic design tokens such as accent, hover, soft accent, focus ring, borders, foreground, muted foreground, and surfaces rather than one raw blue everywhere.

Theme defaults to `System`, follows `prefers-color-scheme` in that mode, and also supports explicit persisted `Light` and `Dark` selections.

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

The app logo/favicon must be independent and abstract. The branding direction is a compact rounded tile/grid motif using neutral surfaces and the project's blue accent.

Do not use Microsoft, Azure, Windows, or official product iconography as the app logo/favicon.

### 8.4 Typography

Use a locally bundled Geist Sans Variable font. No runtime font CDN/network request.

Geist Mono is not required by the current baseline.

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

- fixed left workspace sidebar with top-level `All icons`, `Favorites`, `Recent`, and `Categories` destinations,
- sidebar expanded by default and collapsible to a compact icon rail; the collapsed preference persists through the approved UI persistence layer,
- categories expand inside the full sidebar; selecting a category scopes the icon results,
- sticky search-first toolbar,
- responsive Grid/Compact result presentation.

`Favorites` renders persisted favorite icons that successfully re-match the active package. `Recent` renders recently opened icons newest-first. Unmatched persisted records are hidden for the active package without being deleted and may reappear after a compatible package is selected later. Recent search queries are separate and appear only in the search surface.

Narrow viewport:

- the desktop sidebar/rail is replaced by a navigation Drawer/Sheet,
- the sheet contains the top-level destinations, category tree, secondary package controls, and theme control,
- Grid/Compact presentation adapts without horizontal breakage,
- dialogs fit within the viewport.

Search remains the dominant workspace control. Result count and Grid/Compact controls remain supporting controls. Loaded ZIP filename/icon count/category count and `Change package` remain visually secondary in navigation surfaces rather than competing with search.

Theme behavior:

- users can explicitly choose `System`, `Light`, or `Dark`,
- the preference persists through the approved UI persistence layer,
- `System` follows the operating-system color-scheme preference and reacts to changes while the app is open,
- only the preference is persisted; the resolved light/dark value is runtime UI state.

### 8.7 Category tree and explicit filtering

- Single category selection.
- The top-level `All icons` workspace destination is selected by default after successful load.
- Top-level folders visible initially when `Categories` is expanded.
- Child folders collapsed initially.
- Sibling folders alphabetical.
- Clicking category label selects it and returns the workspace to icon results scoped to that category.
- Chevron controls expand/collapse.
- The workspace navigation owns the global `All icons` destination; category-tree instances omit their legacy `All` row to avoid duplicate navigation.
- Active category scope is always represented by a removable `Category: …` filter chip next to the search surface.
- Removing the category filter returns search to global scope without clearing the current query.

The main icon result surface remains flat; it is not grouped by category.

### 8.8 Search and autocomplete

Search covers display name, original filename, and visible category path using deterministic priority:

1. exact match,
2. prefix match,
3. substring/partial match,
4. fuzzy fallback.

Strong deterministic matches must always outrank fuzzy matches. While a query is present, result and autocomplete ranking use the same search index. Browsing with no query remains alphabetical.

Search autocomplete:

- appears from the search surface rather than a separate navigation destination,
- shows a small icon preview and match/category context for query results,
- supports `ArrowUp`, `ArrowDown`, `Enter`, and `Escape`,
- selecting an icon opens its centered details Dialog,
- focused empty search surfaces recent search queries and currently matched favorite shortcuts where available,
- recent search queries are de-duplicated/persisted separately from recently opened icons.

`/` focuses search unless focus is already in an editable control or modal/dialog context where interception would be inappropriate. When the query is non-empty, show a clear control. Clearing the query keeps search focus. Do not auto-focus search immediately after package load.

### 8.9 Favorites and Recent

- Favorite state is stored only through the stable persisted icon identity contract; no SVG/package bytes are persisted.
- Favorite add/remove is available from reusable card/Dialog controls and is keyboard accessible.
- Favorites re-match only after a package is explicitly loaded.
- Recent means recently opened icon details, not recent search text.
- Opening icon details records/moves the icon to the front of Recent.
- Unmatched favorite/recent records remain retained but hidden until a future package can deterministically re-match them.
- Persisted record self-healing follows the stable identity rules in the persistence section; no fuzzy automatic migration is permitted.

### 8.10 Grid/Compact cards

Grid is the default. `Grid` / `Compact` is an explicit persisted UI preference.

Grid:

- larger preview,
- display name,
- category context,
- responsive multi-column layout.

Compact:

- smaller preview,
- name-focused fixed-height row/card,
- denser responsive multi-column layout,
- category text may be omitted from the visible card when space is constrained.

For both modes:

- card body activation opens details,
- Favorite is a separate inline control and must not be nested inside the card activation button,
- `Copy` is the primary quick action on pointer/keyboard-capable layouts and remains reachable on touch layouts,
- preview images lazy-load outside autocomplete/details eager contexts,
- original download is not a card primary action.

Duplicate display names remain disambiguated through category context/accessibility labels.

### 8.11 Icon details dialog and action hierarchy

Card or autocomplete activation opens a centered Dialog containing only real application/package data:

- larger safe preview,
- display name,
- full category path,
- original filename,
- Favorite control,
- primary `Copy image`,
- secondary `Copy SVG` when browser clipboard text support exists,
- original `Download SVG`,
- close action.

`Copy image` derives a transparent 512×512 PNG from the source SVG, preserving aspect ratio and centering content without cropping or stretching. Success/failure feedback is visible and actionable. `Download SVG` remains byte-for-byte original with the original filename. No Azure resource descriptions or fabricated Microsoft Learn mappings are introduced.

Dialog Escape, focus containment, and focus restoration remain required. One SVG is downloaded at a time.

### 8.12 Empty states

Search empty state is compact and actionable. Prefer actions such as:

- `Clear search`,
- `Search all categories` when category scope is limiting results.

Favorites and Recent have distinct empty states that explain how entries appear. No decorative illustration is required.

## 9. SVG handling and security

### 9.1 Immutability and derived clipboard images

Original SVG bytes must not be rewritten, optimized, reformatted, recolored, resized, or sanitized for download.

Clipboard PNG generation is a transient derived representation only. The application may render a preview-approved source SVG into an in-memory transparent 512×512 canvas/PNG for an explicit copy action, but must not mutate the source bytes or persist the generated Canvas/PNG/Blob data. Clipboard failures must not affect the active package session or original SVG download path.

### 9.2 Preview isolation

Preview using an image context such as an `<img>` with a package-session-owned Blob URL. Never inject arbitrary SVG markup using `innerHTML` or equivalent DOM insertion.

Perform a lightweight defense-in-depth check for suspicious active/external content. If an SVG is considered unsafe to preview, refuse the preview with a clear UI state while preserving the original file for explicit download.

Do not claim this lightweight check is a general-purpose SVG sanitizer.

### 9.3 CSP and browser security headers

The local server sets a restrictive CSP with the following policy shape:

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

Only allowances required by the built app are acceptable. Do not use `unsafe-eval`.

Also set appropriate headers such as:

- `X-Content-Type-Options: nosniff`,
- strict referrer policy,
- frame protection / CSP frame ancestors,
- opener isolation where compatible,
- permissions policy denying unused sensitive capabilities such as camera, microphone, and geolocation.

Avoid unnecessary cross-origin isolation policies if they interfere with normal Blob/SVG behavior without a concrete security benefit.

### 9.4 Runtime network policy

The application has no backend/runtime API dependency for icon-package processing. After the static application assets are loaded, it performs no automatic external network communication for package content, telemetry, analytics, crash reporting, or update metadata.

The GitHub Pages preview necessarily downloads the repository-owned static application assets from GitHub Pages. That hosting transport is not an application backend and does not change the local ZIP-processing boundary.

Therefore:

- no telemetry,
- no analytics,
- no crash reporting,
- no CDN runtime dependencies beyond the selected static host serving the built app,
- no Google Fonts,
- no runtime update check,
- no automatic Microsoft package/version lookup.

User-clicked external documentation links are permitted.

### 9.5 Error boundary

Use a React Error Boundary for unexpected render/application failures. On fatal application reset, dispose the active package session and return to a safe initial state. Do not send crash data anywhere.

## 10. Accessibility

Current accessibility requirements include:

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

### 11.1 Unit and component tests

Core/domain logic receives the deepest unit coverage, including:

- package parser,
- validator,
- path normalization,
- display-name parser,
- recursive category hierarchy,
- search normalization and ranking,
- stable persisted identity exact/fallback/ambiguity behavior,
- persistence schema parsing and fail-safe storage behavior,
- Favorite/Recent de-duplication, bounds, ordering, unmatched retention, and self-healing,
- invalid package behavior,
- session replacement/reset behavior,
- original filename preservation.

Core coverage gates:

- Lines: 90%
- Functions: 90%
- Statements: 90%
- Branches: 85%

Do not game the metrics with meaningless tests.

Use React Testing Library for important interaction boundaries rather than exhaustive visual testing of every primitive.

### 11.2 Browser E2E, accessibility, and visual regression

Playwright covers the golden path using only project-owned dummy ZIP/SVG fixtures:

1. start the local app and upload a dummy ZIP,
2. browse All icons and explicit category filters,
3. search with keyboard autocomplete,
4. exercise Favorites, Recent, Grid/Compact, theme, and persistence boundaries,
5. open the centered details Dialog and verify focus/Escape restoration,
6. verify transparent 512×512 PNG clipboard behavior and denied-permission feedback,
7. download an SVG and verify the original bytes/filename,
8. exercise representative narrow/mobile navigation and Dialog containment.

Automated axe checks cover key screens.

Visual regression is intentionally limited to stable Linux baselines such as:

- initial package screen,
- loaded icon grid,
- details dialog.

Microsoft ZIP/SVG assets must never be committed as test fixtures.

### 11.3 CI matrix

Linux runs the full suite:

- Biome check,
- typecheck,
- Vitest,
- build,
- Playwright,
- accessibility smoke checks,
- npm package-content validation,
- release-readiness validation where relevant.

Windows and macOS run packaged CLI smoke validation. CodeQL for JavaScript/TypeScript is enabled.

The Pages preview workflow validates target-specific Vite builds. Same-repository PRs publish to stable `/pr-N/` paths for pre-merge device verification; fork PRs are build-only. `main` remains at the site root, and closing or merging a PR removes its generated preview path.

## 12. Dependency and package policy

- Pin direct dependencies/devDependencies to exact versions.
- Dependabot monitors npm dependencies and GitHub Actions.
- Patch dependency updates may auto-merge after required CI is green.
- Minor updates require human merge/review.
- Major updates require explicit manual review.
- Release validation runs `npm audit` and blocks High/Critical findings.
- `npm audit` is not required on every normal PR.

The npm package uses an explicit `files` allowlist. Release CI validates package contents so Microsoft ZIP/SVG assets, test fixtures, accidental local packages, and unrelated source artifacts cannot be published.

## 13. Release and compatibility operations

### 13.1 Release model

Use Changesets for release intent, versioning, CHANGELOG updates, and Release PR creation.

Normal workflow:

1. Feature/fix PR includes an appropriate Changeset when user-visible or release-relevant.
2. Changesets Action creates/updates a Release PR.
3. Human merges the Release PR.
4. GitHub Actions publishes npm through Trusted Publishing/OIDC, verifies registry metadata and tarball availability, creates immutable `vX.Y.Z`, and creates the matching GitHub Release.

Version must match across `package.json`, npm, tag, and GitHub Release. Do not use moving major/minor tags.

The default npm distribution channel is `latest`. Do not introduce `next`/`beta` channels until there is a real need.

Normal publication must not rely on a long-lived `NPM_TOKEN`.

The GitHub Pages UI preview is operationally separate from npm release publication and does not define or change the product version.

See `docs/RELEASE.md` for the operational runbook and the historical first-release bootstrap record.

### 13.2 SemVer policy

Before `1.0.0`:

- patch: fixes/internal compatible improvements,
- minor: new features or breaking changes.

Breaking changes during `0.x` must be called out clearly in Changesets/CHANGELOG.

At/after `1.0.0`, use normal SemVer:

- patch: backward-compatible fixes,
- minor: backward-compatible features,
- major: breaking changes.

### 13.3 Official package verification

The development-only command:

```bash
npm run verify:official -- /path/to/latest-official.zip
```

reuses production parser/validator code and prints compatibility metadata suitable for updating `COMPATIBILITY.md`.

This command is not part of the public end-user CLI.

Before a release that claims compatibility with a newer official package, manually download the current package from Microsoft, run this verification locally, and update `COMPATIBILITY.md` only after a successful result.

Only the most recently recorded successful package is formally supported.

### 13.4 Weekly Microsoft watcher

A scheduled GitHub Actions workflow checks the official Microsoft Azure Architecture Icons page approximately weekly for:

1. a changed/new official ZIP link/package identity,
2. meaningful changes to the icon terms/guidelines text.

A difference creates or updates a maintenance Issue for human review.

The watcher:

- does not store or commit Microsoft icon assets,
- does not automatically rewrite compatibility claims,
- does not automatically make legal judgments,
- does not automatically change application code,
- does not introduce a runtime network dependency into the application.

If Microsoft terms appear materially incompatible with the project's intended use, pause new releases and review public documentation and distribution status. Do not implement a remote kill switch.

## 14. Repository governance

### 14.1 Canonical documents

- `DESIGN.md`: current design source of truth.
- `AGENTS.md`: coding-agent instructions and document index.
- `README.md`: public introduction, usage, and release status.
- `COMPATIBILITY.md`: last manually verified official Microsoft package metadata.
- `CONTRIBUTING.md`: external contribution rules.
- `SECURITY.md`: vulnerability reporting/support policy.
- `THIRD_PARTY_NOTICES.md`: third-party notices.
- `docs/RELEASE.md`: release and compatibility operations.
- `docs/UI_REVIEW.md`: browser UI review and GitHub Pages preview operations.
- `LICENSE`: MIT license for project code.

The repository intentionally does not maintain a separate ADR set. Decision history lives in Issues, PRs, and Git history while `DESIGN.md` represents the current contract.

### 14.2 External contributions

External Issues and PRs are welcome.

Small fixes may be proposed directly. Significant features, architecture changes, security model changes, UX policy changes, new distribution channels, or new foundational dependencies must be discussed in an Issue first.

### 14.3 Agent behavior

Coding agents implement approved design; they do not invent replacement product policy.

If an agent identifies a design/implementation conflict, it must explain the conflict and recommendation rather than silently changing:

- architecture,
- security model,
- UX contract,
- publication model,
- runtime network policy,
- foundational stack/dependencies.

Implementation-level details not covered here may be decided pragmatically.

### 14.4 Git and PR workflow

Use GitHub Flow:

- `main` is the only long-lived branch.
- Work happens on short-lived branches.
- Changes enter `main` through PRs.
- Required CI must pass.
- Squash merge only.
- Delete merged branches automatically.
- PR titles use Conventional Commits.
- Internal branch commit messages do not need to follow Conventional Commits.

A PR should state:

- summary,
- design impact,
- validation performed,
- Changeset status,
- security/runtime-network confirmation,
- confirmation that no Microsoft assets were added.

## 15. Cache and version behavior

### 15.1 Local cache policy

- `index.html`: no-store.
- hashed Vite static assets: long-lived immutable caching is acceptable.

This local cache policy must not introduce persistence of user-selected Microsoft assets. The Pages preview may use GitHub Pages' hosting/cache behavior for the repository-owned static build, but it must not cache or persist user-selected ZIP/package data on the server.

### 15.2 Version display

CLI version and Web UI version derive from the same `package.json` version source rather than independent constants.

## 16. v0.1.0 implementation record

`v0.1.0` is complete and publicly released. The original MVP implementation plan is retained here only as a historical record of how the baseline was delivered.

Completed phases:

1. **Project foundation** — Vite/React/TypeScript/Tailwind/shadcn, tooling, CI skeleton, and repository documents.
2. **Core package processing** — ZIP/session/parser/validator/category/search plus core tests.
3. **Application UI** — package loading/replacement, category navigation, search, icon grid, details dialog, responsive behavior, and accessibility basics.
4. **CLI/local server** — static server, browser launch, security headers, Host/path handling, loopback-only binding, and shutdown behavior.
5. **Release readiness** — browser E2E, visual/a11y checks, package-content validation, official-package compatibility verification, weekly Microsoft watcher, Changesets, npm Trusted Publishing/OIDC, immutable version tags, and GitHub Releases.
6. **First public publication** — `@shimabell06/cloud-arch-icon-browser@0.1.0` published with GitHub Actions provenance and matching `v0.1.0` GitHub Release.

Future work should be tracked as new Issues/design decisions rather than appended to this historical implementation plan.

## 17. Design-change rule

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
