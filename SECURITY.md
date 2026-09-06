# Security Policy

## Supported versions

Until `1.0.0`, only the latest published release is supported for security fixes.

The project also formally supports only the latest Microsoft Azure Architecture Icons package recorded as successfully verified in `COMPATIBILITY.md`.

## Reporting a vulnerability

Please do not disclose a suspected vulnerability in a public Issue before the maintainer has had a reasonable opportunity to investigate it.

Use GitHub's private vulnerability reporting / Security Advisory flow for this repository when available.

If private vulnerability reporting is not available, contact the maintainer privately through an appropriate GitHub-supported channel rather than publishing exploit details in an Issue.

Useful reports include:

- affected release/commit,
- reproduction steps,
- impact,
- relevant environment details,
- a minimal proof of concept when safe to provide.

## Security-sensitive areas

The most security-sensitive areas of this project are:

- parsing user-selected ZIP archives,
- ZIP entry path handling,
- SVG preview behavior,
- Blob URL lifecycle,
- localhost static server and Experimental PowerPoint bridge routing,
- Host/Origin validation and DNS rebinding resistance,
- PowerPoint COM automation and temporary-file cleanup,
- CSP and browser security headers,
- npm package contents and dependency supply chain.

## Security boundaries

The intended security model includes:

- local processing only,
- server bind to `127.0.0.1`,
- no remote application backend or cloud API,
- no automatic runtime external network communication,
- no telemetry or crash reporting,
- SVG preview in an image context rather than DOM markup injection,
- original SVG bytes preserved for explicit download,
- no persistence of the user's selected Microsoft ZIP/SVG data,
- restrictive CSP and related response headers.

The Experimental Windows PowerPoint `Copy all` bridge is a narrowly scoped exception to the otherwise static localhost server:

- it exists only in the packaged local runtime and reports unavailable on non-Windows platforms;
- the only Office routes are a read-only capability endpoint and the fixed `Copy all` endpoint;
- normal Host validation still runs before bridge routing;
- the mutating endpoint requires the exact canonical app Origin plus a per-process random capability token that unrelated web pages cannot read or set through ordinary cross-origin requests;
- requests accept only bounded JSON containing PNG bytes and quantities, with a maximum of 36 output objects, bounded image/body sizes, one active operation, and a deterministic timeout;
- the server creates all filesystem paths under an unpredictable app-owned temporary directory and removes generated PNGs, manifest data, and temporary Office state on completion/failure where possible;
- the browser cannot supply arbitrary filesystem paths, commands, PowerShell, shell arguments, COM methods, or generic automation requests;
- PowerShell receives a fixed embedded automation program and only an internal manifest path created by the server;
- no copied image bytes or Office automation payloads are persisted by the application.

The Office lifecycle is intentionally marked Experimental until the real-machine validation tracked in Issue #57 is complete. A failed validation must result in disabling/removing the feature rather than weakening these boundaries or falling back to a flattened image.

## Out of scope assumptions

The tool is designed primarily for the official Microsoft Azure Architecture Icons package selected by the user. It includes proportionate archive validation and safety checks, but it is not intended to be a general-purpose hostile-archive analysis sandbox.

Security reports showing a realistic impact within the supported use case are still welcome.

## Microsoft assets

Microsoft icon assets are not distributed by this project and are governed by Microsoft's own terms. Do not attach Microsoft ZIP/SVG assets to public vulnerability reports unless you have the right to do so and it is genuinely necessary.
