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
- localhost static server routing,
- Host header validation / DNS rebinding resistance,
- CSP and browser security headers,
- npm package contents and dependency supply chain.

## Security boundaries

The intended security model includes:

- local processing only,
- server bind to `127.0.0.1`,
- no application backend/API,
- no automatic runtime external network communication,
- no telemetry or crash reporting,
- SVG preview in an image context rather than DOM markup injection,
- original SVG bytes preserved for explicit download,
- no persistence of the user's selected Microsoft ZIP/SVG data,
- restrictive CSP and related response headers.

## Out of scope assumptions

The tool is designed primarily for the official Microsoft Azure Architecture Icons package selected by the user. It includes proportionate archive validation and safety checks, but it is not intended to be a general-purpose hostile-archive analysis sandbox.

Security reports showing a realistic impact within the supported use case are still welcome.

## Microsoft assets

Microsoft icon assets are not distributed by this project and are governed by Microsoft's own terms. Do not attach Microsoft ZIP/SVG assets to public vulnerability reports unless you have the right to do so and it is genuinely necessary.
