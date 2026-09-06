from pathlib import Path

path = Path("DESIGN.md")
text = path.read_text()

start = text.index("### 8.6 Loaded layout")
end = text.index("## 9. SVG handling and security", start)
replacement = '''### 8.6 Loaded layout

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

'''
text = text[:start] + replacement + text[end:]

old = '''### 9.1 Immutability

Original SVG bytes must not be rewritten, optimized, reformatted, recolored, resized, or sanitized for download.
'''
new = '''### 9.1 Immutability and derived clipboard images

Original SVG bytes must not be rewritten, optimized, reformatted, recolored, resized, or sanitized for download.

Clipboard PNG generation is a transient derived representation only. The application may render a preview-approved source SVG into an in-memory transparent 512×512 canvas/PNG for an explicit copy action, but must not mutate the source bytes or persist the generated Canvas/PNG/Blob data. Clipboard failures must not affect the active package session or original SVG download path.
'''
if old not in text:
    raise SystemExit("SVG immutability block not found")
text = text.replace(old, new, 1)

path.write_text(text)
