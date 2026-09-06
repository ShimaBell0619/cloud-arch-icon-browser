# @shimabell06/cloud-arch-icon-browser

## 0.3.0

### Minor Changes

- 46753f3: Add an Experimental Windows PowerPoint Copy all workflow for Tray items through a capability-scoped localhost bridge, with bounded transient PNG handling and perceived-size normalization.
- 9aeba15: Use a stable canonical localhost origin for packaged runs, reuse an already-running matching local instance, and let supported browsers reopen a previously validated local ZIP through a persisted File System Access handle without storing package bytes.
- 2e1045e: Add a session-only Tray with quantity/order controls, multi-select and drag collection, reusable locally persisted Saved Sets, recently-used history, and frequently-used shortcuts.

### Patch Changes

- 2666a3e: Reduce initial and scroll-time icon preview latency with shared prefetch observation and bounded viewport-prioritized preview work.

## 0.2.1

### Patch Changes

- 593c7b5: Deduplicate identical icon filenames in the global All icons results and search suggestions while preserving category-scoped entries.

## 0.2.0

### Minor Changes

- 0c44486: Add v0.2 icon discovery autocomplete and explicit category filters, Favorites and Recent icon experiences, transparent 512×512 PNG clipboard copy, Grid/Compact views, and copy-first icon details.
- fc85595: Add stable icon identity matching and a versioned local UI persistence foundation for favorites, recent activity, and upcoming workspace preferences without persisting icon package contents.
- f64abc9: Redesign the loaded workspace around a collapsible desktop sidebar, mobile navigation sheet, top-level All/Favorites/Recent/Categories destinations, and persisted System/Light/Dark theme controls.

### Patch Changes

- 249e341: Improve ZIP selection on supported Android Chromium browsers by preferring the transient File System Access picker while retaining the existing browser file-input fallback.
