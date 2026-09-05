# Icon package core integration

`src/core/index.ts` exposes the React-independent Issue #2 implementation.
`DESIGN.md` remains the design contract and is unchanged. There is no UI, store,
production server, persistence, automatic package lookup, or release command in
this layer.

## Candidate and session lifecycle

`IconPackageSession.open(fileOrBlob)` returns a discriminated `PackageCandidate`:
either `{ ok: true, session }` or `{ ok: false, error }`. Errors have a stable
`code`, a `phase`, explanatory `message`, suggested `action`, and an optional
original ZIP `path`. Candidate validation does not mutate another session.

The caller owns the active-session reference outside Zustand. Once a candidate
has passed validation, synchronously replace that reference before disposing the
previous session:

```ts
const candidate = await IconPackageSession.open(selectedFile);
if (candidate.ok) {
  const previous = activeSession;
  activeSession = candidate.session;
  await previous?.dispose();
} else {
  // Display candidate.error; keep the current session.
}
```

The future UI must serialize selection or discard superseded candidates and
dispose them. It must also dispose the active session on reset/unmount. Debounce,
selection coordination, and serializable UI state belong to Issue #3.

Session operations:

- `metadata`: immutable icons, recursive categories, and package summary.
- `search(query, categoryId = null)`: derived ranked results; `null` means All.
- `getSvgBlob(iconId)`: lazily extract and cache the immutable original bytes.
- `getPreviewUrl(iconId)`: check preview content before returning a cached Blob
  URL for an image context. Never insert SVG/XML nodes into the application's DOM.
- `getDownload(iconId)`: return `{ filename, url }` for an explicit download,
  retaining the original filename and bytes even when preview is refused.
- `dispose()`: invalidate the session immediately, abort extraction, revoke all
  owned URLs, clear package references/caches, settle pending operations, and
  close the reader. Repeated calls share the same disposal promise. Operations
  after disposal fail with `SESSION_DISPOSED`; pending work cannot create late URLs.

Concurrent requests for one icon share extraction. URLs belong to the session;
consumers must not revoke them independently. The session owns the reader, its
entry metadata, Fuse index, extracted Blobs, and URL cache. It retains only icons
actually requested, in memory until disposal. Zustand must not hold this object
or duplicate its derived search results.

## ZIP validation and compatibility boundaries

The implementation was checked against zip.js 2.11.1's installed source/types and
the current official [ZipReader API](https://gildas-lormeau.github.io/zip.js/api/classes/ZipReader.html)
and [reader options](https://gildas-lormeau.github.io/zip.js/api/interfaces/ZipReaderOptions.html).
It uses the exported `@zip.js/zip.js/lib/zip-core-native.js` entry point, with
`useWebWorkers: false`, `strictness: "strict"`, `checkCrc32: true`, and
`checkOverlappingEntry: true`. The native entry point includes a local JavaScript
fallback. No `normalizeFilename` callback rewrites zip.js entry names.

Opening a candidate enumerates central-directory metadata without expanding SVG
bodies. It rejects unsafe/ambiguous paths, duplicate normalized paths, conflicting
file/folder paths, encrypted entries (including ignored non-SVG files), symbolic
links, invalid size metadata, unsupported SVG compression, empty SVG entries,
and archives without browsable SVGs. Browsing supports stored and DEFLATE entries.
zip.js additionally rejects ambiguous archive structure in strict mode.

Only path separators are normalized (`\` to `/`); traversal, empty/dot components,
absolute/drive paths, control characters, ambiguous edge whitespace/dots, and
encoded traversal/separator forms are rejected instead of repaired. Path case is
preserved. IDs include the original packaging root, even when that root is hidden
for display. Original decoded filename/path metadata remains separate and intact.
No ZIP entry is written to the filesystem.

SVG folders alone define categories. Non-SVG files and empty directories cannot
invent categories or prevent common-root hiding. Exactly one shared packaging
folder is hidden. Icons immediately inside it have no visible category. Category
IDs use full normalized folder paths; parent selection uses path-component
boundaries and includes every descendant. Siblings and unranked icons are sorted
alphabetically with deterministic path tie-breaking. Display names preserve
original casing, with the convention parser and extension/hyphen fallback from
`DESIGN.md`.

CRC, local-header consistency, and overlap with previously read entries are
checked **on extraction**, not during metadata enumeration. Output is stopped if
it exceeds its declared uncompressed size, and zip.js checks the final size.
A candidate can therefore pass metadata validation and later report
`EXTRACTION_FAILED` for an individual corrupt SVG. This is intentional lazy
validation, not a claim to have verified every SVG body or all entry overlaps.

The preview gate parses XML into a detached document, rejects malformed XML,
DTDs/entities, active elements/handlers, external references and suspicious CSS,
and never exports parsed nodes. This conservative defense-in-depth check is not
a general-purpose sanitizer; it may refuse benign uncommon SVG constructs.
`UNSAFE_PREVIEW` leaves original download bytes available. Image isolation and the
future server CSP remain necessary parts of the design.

No official Microsoft ZIP was downloaded or measured for this implementation.
There are no guessed icon/category counts, version gates, naming-match minima,
ZIP-size ceilings, or compression-ratio limits. Summary counts/matches report the
input observed, not its authenticity. Size checks reject impossible numeric
metadata and bound output to the declared entry size; they do not impose an
absolute memory budget. Large but structurally valid inputs may still consume
substantial memory. Official-package measurements with headroom and release
verification remain pending in `COMPATIBILITY.md`; this PR makes no new official
compatibility claim.

## Search behavior

Search normalizes Unicode width, case, whitespace, and hyphens. `app service`,
`app-service`, and `appservice` are equivalent. Ranking is normalized display-name
exact, prefix, substring, then weighted Fuse results. All tiers obey the category
subtree filter. Empty/separator-only queries use alphabetical order; there is no
result-count cap.

Fuse weights are display name 0.7, original filename 0.2, visible category path
0.1. The initial threshold is 0.35, with location ignored. That threshold also
filters weak combined scores, while literal normalized filename/category
substrings are retained. This avoids ubiquitous filename-prefix noise without
losing direct category/filename lookup. These are initial settings validated with
synthetic relevance cases, not a claim of optimal real-package tuning. Revisit
them using measured official-package search cases before release.

## Tests and CI

`npm test` runs the existing UI tests plus generated ZIP/domain/session tests and
enforces core Lines/Functions/Statements >= 90% and Branches >= 85%. Coverage
includes every production TypeScript module under `src/core`, including untested
files; only test files are excluded. Reports remain in ignored `coverage/`.
The existing CI already invokes `npm test`, so coverage is enforced without
changing either workflow or its docs-only optimization.

All SVGs are project-owned minimal shapes and ZIPs are generated in memory in
`src/test/package-fixtures.ts`. Malformed test inputs are produced by changing
those generated bytes. No Microsoft asset or binary ZIP fixture is committed.
