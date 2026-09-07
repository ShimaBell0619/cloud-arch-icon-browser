---
version: alpha
name: Cloud Arch Icon Browser
description: UI, UX, and design-system contract for the local architecture icon browser.
---

# Design System

## Overview

Cloud Arch Icon Browser is a search-first utility for quickly finding and using architecture icons. The interface should feel calm, dense, modern, and product-focused: neutral surfaces, restrained chrome, and a blue accent without imitating Microsoft/Azure branding.

`DESIGN.md` is authoritative for **UI/UX and design-system decisions**. Product behavior and non-goals belong in `PRODUCT.md`; engineering workflow belongs in `AGENTS.md`; substantial technical architecture belongs in `docs/ARCHITECTURE.md`.

Design for fast retrieval and low-friction copy workflows. Prefer clear hierarchy, keyboard accessibility, responsive behavior, and stable information density over decorative novelty.

## Colors

- Use semantic design tokens rather than scattering literal colors through components.
- Use a restrained blue accent for primary/selected emphasis without copying Microsoft/Azure brand language.
- Support `System`, `Light`, and `Dark` appearance. The saved `System` preference follows live OS color-scheme changes.
- Maintain sufficient contrast for text, icons, controls, focus indicators, selected states, notices, and disabled states.
- Do not communicate required meaning through color alone.
- Avoid gradients as a primary motif, glassmorphism, or decorative color effects that compete with icon content.

## Typography

- Geist Sans Variable is bundled locally and remains the application font baseline; do not add a runtime font-CDN dependency.
- Keep a small hierarchy for headings, body text, labels, control text, and metadata.
- Preserve readability under browser zoom and text scaling.
- Use truncation only where the full value remains discoverable; avoid fixed control geometry that cuts user-visible icon/service names unnecessarily.

## Layout

### Package picker

Before a package is loaded, present a focused package picker/dropzone rather than the full browser shell.

When a remembered local file reference exists, expose explicit `Open previous ZIP` and `Forget previous ZIP reference` actions. Browser permission prompts must remain user-gesture driven. Loading may show meaningful phases such as Reading, Validating, and Indexing, but must not invent fake percentage progress.

### Loaded desktop layout

The desktop layout contains:

- a collapsible left sidebar with `All icons`, `Favorites`, `Recent`, `Tray`, and `Categories`,
- a search-first sticky toolbar,
- Grid/Compact result presentation,
- package metadata and `Change package` as visually secondary controls.

`All icons` is the default workspace after load. Main results remain flat rather than grouped by category.

### Narrow/mobile layout

- Replace the persistent desktop sidebar with a Drawer/Sheet.
- Avoid horizontal overflow.
- Keep primary search, current scope, Tray access, and result actions reachable.
- Dialogs and overlays must remain within the viewport.
- Responsive behavior is based on available layout space, not device-name detection.

## Elevation & Depth

- Prefer surface hierarchy, borders, spacing, and contrast before strong shadows.
- Use elevation only to communicate layering such as sticky toolbars, drawers, quick panels, popovers, and dialogs.
- Keep overlays visually distinct from underlying content without glass-heavy or floating-card visual noise.

## Shapes

- Use a small consistent radius vocabulary across cards, inputs, chips, buttons, panels, and dialogs.
- Shape changes should communicate component role, not arbitrary decoration.
- Equivalent controls should not use inconsistent corner radii.

## Components

### Search and category scope

- Search is the primary navigation/action surface after package load.
- A single selected category is always visible near search as a removable `Category: …` filter chip.
- Removing the category chip restores global scope without clearing the current query.
- Search autocomplete uses the same product ranking contract as the result list, shows useful icon/context information, supports Arrow keys/Enter/Escape, and opens the centered details dialog on selection.
- Focused empty search may surface recent searches and matched Favorite shortcuts.
- `/` focuses search only when it does not interfere with an editable field or modal context.

### Sidebar and navigation

- Desktop navigation exposes All icons, Favorites, Recent, Tray, and Categories directly.
- Sidebar collapse is explicit and must not make core workspaces undiscoverable.
- Category hierarchy reflects the loaded package hierarchy; parent-category navigation remains understandable for recursive folders.

### Results and icon cards

- Grid is the default view; Grid/Compact is user-selectable.
- The icon itself and primary identifying text receive visual priority over secondary metadata.
- Card body opens details.
- Favorite and Add-to-Tray are separate accessible controls.
- `Copy` remains the primary single-icon quick action.
- Selected/Favorite/Tray-related state must remain understandable without hover-only affordances or color-only state.

### Favorites, Recent, Tray, and Saved Sets

- Favorites present user-curated single-icon shortcuts.
- Recent presents recently used icons, not merely opened details.
- Frequently used shortcuts may appear on the empty/global All-icons surface without becoming a competing primary navigation concept.
- The sidebar opens the full Tray workspace.
- A continuously reachable `Tray N` affordance opens a lightweight quick panel so quantity/removal can be managed without leaving search results.
- Dragging a card to Tray may exist as a desktop convenience but is never the only Add path.
- Temporary Select mode supports adding multiple currently displayed icons and visibly resets when the material result scope changes.
- Saved Set UI supports create, rename, update, delete, inspect, `Add to Tray`, and `Replace Tray`, including clear reporting of unresolved members rather than silently hiding the condition.

### Experimental PowerPoint Copy all

- On the canonical Windows npx runtime, Tray may expose the approved Experimental `Copy all` action when the feature flag is enabled.
- The first use shows an explicit Experimental warning before initiating the operation.
- Unsupported runtimes show a clean unavailable state rather than attempting automation.
- Success copy must not claim formally supported independent-shape PowerPoint compatibility until the product acceptance boundary in `PRODUCT.md` is satisfied.
- There is no UI path offering a flattened combined-image fallback.

### Details dialog

The centered details dialog shows only real package/application data:

- icon preview,
- display name,
- category path,
- original filename,
- Favorite control,
- copy/download actions.

Action hierarchy:

1. primary: `Copy image`,
2. secondary: `Copy SVG source` where supported,
3. secondary: `Download SVG`.

Do not invent Azure resource descriptions or Microsoft Learn mappings. Clipboard failure feedback must be actionable without blocking the original download path.

Dialog behavior requires focus containment, Escape close, and focus restoration to the invoking context.

### Loading, empty, error, and unavailable states

- Model loading, validation, empty search, no-match, clipboard failure, package error, missing remembered file, and unsupported Experimental capability deliberately.
- Preserve the current valid session when a replacement package fails validation.
- Keep failure copy concise and actionable; do not expose raw implementation errors as the primary user message.

### Accessibility

- Prefer semantic HTML and accessible platform/component primitives.
- Primary flows support keyboard navigation, visible focus, correct button/dialog semantics, useful image alternative text, and non-color-only state communication.
- Controls require meaningful accessible names and appropriate target sizes.
- Automated axe checks supplement rather than replace manual/rendered accessibility review.

## Do's and Don'ts

### Do

- Make search and the current category scope obvious.
- Keep `Copy`/`Copy image` visually dominant for the common single-icon workflow.
- Preserve keyboard operation, focus behavior, and responsive reachability when adding interactions.
- Use actual rendered screenshots/Pages preview for meaningful UI changes as defined in `docs/UI_REVIEW.md`.
- Keep icon/package metadata legible at both Grid and Compact densities.
- Use semantic tokens and existing shadcn/Base UI primitives when they improve consistency and accessibility.
- Keep application composition outside `src/components/ui`; use that area for reusable UI primitives.

### Don't

- Do not put product requirements, runtime policy, persistence contracts, release policy, or detailed architecture into `DESIGN.md`.
- Do not imitate Microsoft/Azure branding or generic AI-SaaS visual language.
- Do not use gradients, glassmorphism, heavy shadows, excessive motion, or decorative density merely because the component stack allows it.
- Do not hide essential actions behind hover-only behavior.
- Do not treat a single desktop screenshot as responsive validation.
- Do not introduce a bespoke component/design abstraction before a real repeated pattern requires it.
- Do not change approved product behavior just to simplify UI implementation; surface the conflict against `PRODUCT.md` instead.

Google's DESIGN.md format is currently alpha. Preserve valid machine-readable front matter and the canonical section order when editing this file. Unsupported but important design rationale stays in Markdown prose rather than invented front-matter fields.
