# Office interoperability spike — Issue #45

Status: **real Windows / desktop PowerPoint evidence pending**.

This note records the evidence gate for the v0.3 PowerPoint integration. The repository now contains a reproducible synthetic harness, but no browser/native route is approved for production until the target environment has been tested and the matrix below is completed.

## Target environment

Required advanced-integration target:

- Windows 11
- current stable Microsoft Edge and Google Chrome
- desktop Microsoft PowerPoint from Microsoft 365
- packaged/local workflow; no cloud Office automation

Record the tested versions here:

| Component | Tested version |
| --- | --- |
| Windows 11 | Pending |
| Microsoft Edge | Pending |
| Google Chrome | Pending |
| Microsoft PowerPoint / Microsoft 365 | Pending |
| PowerShell | Pending |

## Pre-test evidence and constraints

The following API facts shape the test plan but are **not** substitutes for PowerPoint interoperability evidence:

- Web Clipboard `Clipboard.write()` accepts an array of `ClipboardItem`s, but MDN explicitly notes that when the underlying OS clipboard does not support multiple native clipboard items, only the first item is written. Therefore `ClipboardItem[]` cannot be assumed to implement multi-object `Copy all`: <https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write>
- `ClipboardItem.supports()` can be used to probe a MIME type such as `image/svg+xml`; support by the browser still does not prove that desktop PowerPoint consumes that representation: <https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem/supports_static>
- PowerPoint `ShapeRange.Copy()` copies a shape range to the Clipboard: <https://learn.microsoft.com/en-us/office/vba/api/powerpoint.shaperange.copy>
- `Presentations.Add(WithWindow := msoFalse)` creates a presentation without a visible window, which is the basis for the hidden-document lifecycle test: <https://learn.microsoft.com/en-us/office/vba/api/powerpoint.presentations.add>
- `Shapes.AddPicture()` creates a PowerPoint picture from a file and is the candidate insertion primitive for a local/native fallback: <https://learn.microsoft.com/en-us/office/vba/api/powerpoint.shapes.addpicture>
- `Application.Visible` is read/write and accepts `msoFalse`/`msoTrue`; the harness records hidden-automation behavior rather than assuming it is non-disruptive: <https://learn.microsoft.com/en-us/office/vba/api/powerpoint.application.visible>

## Reproducible harness

See [`../tools/office-spike/README.md`](../tools/office-spike/README.md).

The harness intentionally does not touch the production React UI or the canonical `127.0.0.1:41731` static server. Browser experiments use a separate fixed loopback port (`41732`), and PowerPoint COM automation is invoked only by an explicit maintainer-run PowerShell script.

All test images/SVGs are synthetic and generated locally. No Microsoft icon asset is committed, copied into fixtures, or required for the spike.

## Decision matrix

Use these classifications only after real tests:

- **Approved** — reproducible on the required target and suitable for #48.
- **Rejected** — fails the product contract or relies on an unacceptable representation/behavior.
- **Deferred** — potentially viable but not reliable enough for v0.3.

| Capability / route | Current status | Evidence required | Final decision |
| --- | --- | --- | --- |
| Browser-only `Copy all`: multiple `ClipboardItem` PNGs (A1) | Pending | Edge + Chrome: one paste, expected object count, independent shape types | Pending |
| Browser-only `Copy all`: one HTML item with 3 images (A2) | Pending | Edge + Chrome: one paste, expected object count, independence/layout | Pending |
| PowerPoint automation `ShapeRange.Copy()` (B) | Pending | 4 independent objects after source close, temp-file deletion, source app quit; layout retained | Pending |
| Browser true vector: SVG + PNG clipboard item (C1) | Pending | Edge + Chrome: PowerPoint chooses a genuine vector `msoGraphic` or equivalent | Pending |
| Local/native vector: SVG → `AddPicture` → Copy (C2) | Pending | Vector survives source close/temp deletion/app quit and pastes as vector | Pending |
| Direct drag: standard PNG File/DataTransfer (D1) | Pending | Edge + Chrome direct insert without manual download | Pending |
| Direct drag: standard SVG File/DataTransfer (D2) | Pending | Edge + Chrome direct insert; vector behavior recorded | Pending |
| Chromium `DownloadURL` drag (D3) | Exploratory only | Record behavior, but do not approve solely on this non-standard path | Reject if sole route |

## Result log

### Browser clipboard

| Browser | Test | PowerPoint pasted count | Shape types | Independent? | Notes |
| --- | --- | ---: | --- | --- | --- |
| Edge | A0 single PNG | Pending | Pending | N/A | Pending |
| Edge | A1 3 PNG ClipboardItems | Pending | Pending | Pending | Pending |
| Edge | A2 HTML 3 images | Pending | Pending | Pending | Pending |
| Edge | C1 SVG + PNG | Pending | Pending | N/A | Pending |
| Chrome | A0 single PNG | Pending | Pending | N/A | Pending |
| Chrome | A1 3 PNG ClipboardItems | Pending | Pending | Pending | Pending |
| Chrome | A2 HTML 3 images | Pending | Pending | Pending | Pending |
| Chrome | C1 SVG + PNG | Pending | Pending | N/A | Pending |

### Native automation

| Check | Result |
| --- | --- |
| Hidden source presentation has zero visible windows | Pending |
| Four generated PNG inputs produce four source shapes | Pending |
| `ShapeRange.Copy()` pastes four independent shapes | Pending |
| Relative 2×2 layout survives | Pending |
| Temporary PNGs can be deleted before validation paste | Pending |
| Clipboard survives source presentation close | Pending |
| Clipboard survives source PowerPoint automation quit | Pending |
| Manual paste into normal PowerPoint produces four independently movable objects | Pending |
| Automation causes unacceptable visible flash/focus stealing | Pending |
| Native SVG route pastes as `msoGraphic` (28) or equivalent vector type | Pending |

### Direct drag

| Browser | Payload | Inserts directly? | Result type/quality | Download/open side effect? | Decision |
| --- | --- | --- | --- | --- | --- |
| Edge | PNG File/DataTransfer | Pending | Pending | Pending | Pending |
| Edge | SVG File/DataTransfer | Pending | Pending | Pending | Pending |
| Edge | Chromium DownloadURL | Pending | Pending | Pending | Exploratory |
| Chrome | PNG File/DataTransfer | Pending | Pending | Pending | Pending |
| Chrome | SVG File/DataTransfer | Pending | Pending | Pending | Pending |
| Chrome | Chromium DownloadURL | Pending | Pending | Pending | Exploratory |

## Production gate for #48

`Copy all` may ship only when one validated route produces the exact number of independent PowerPoint objects in one user paste. A single combined bitmap, a grouped/flattened object that cannot be independently manipulated as required, or a route that loses Tray quantity/order fails the gate.

If browser-only multi-object Clipboard fails but the `ShapeRange.Copy()` lifecycle test succeeds, the recommended architecture is a narrowly scoped Windows-local PowerPoint automation bridge in the packaged `npx` runtime. #48 must then define strict Host/Origin validation, a per-process unguessable capability/CSRF token, bounded validated payloads, deterministic timeouts/temp cleanup, and **no** arbitrary command/file/PowerShell/COM execution surface.

Browser vector Copy and native vector Copy are evaluated separately. Existing `Copy SVG` remains SVG **source text** and must not be relabeled as vector image copy.

Direct drag is an accelerator only. If behavior depends on undocumented/non-standard Chromium data such as `DownloadURL`, differs materially between current Edge and Chrome, causes manual downloads, or cannot be stabilized, direct drag should be deferred rather than weakening the product contract.

## Explicitly rejected approaches

These remain rejected regardless of test outcome:

- flattening multiple Tray icons into one bitmap for `Copy all`;
- treating several browser `ClipboardItem`s as success without verifying PowerPoint pasted-object count;
- treating copied SVG markup text as a vector image;
- shipping a generic localhost shell/PowerShell/COM/file-path execution API;
- committing Microsoft Azure Architecture Icon assets as test fixtures;
- making a non-standard drag representation the only supported interaction without reproducible browser/Office evidence.

## Final recommendation

Pending real Windows evidence. Complete this section only after the target-environment results above are recorded. The final recommendation must name the approved routes for #48 and explicitly mark every rejected/deferred route.
