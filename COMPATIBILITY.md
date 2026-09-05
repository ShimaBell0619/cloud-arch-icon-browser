# Official Package Compatibility

This file records the most recent Microsoft Azure Architecture Icons package that has been explicitly verified against the project.

Only the most recently recorded **successful** verification is officially supported. Older or newer packages may work when structurally compatible, but they are not guaranteed until verified.

## Current official package observation

As of 2026-09-05, the official Microsoft Learn page links to:

- Package: `Azure_Public_Service_Icons_V24.zip`
- Official page: https://learn.microsoft.com/en-us/azure/architecture/icons/
- Microsoft Learn page last updated: 2026-07-09
- Manual compatibility verification: **Pending**

The project must not claim `V24` as formally supported until the actual ZIP has been downloaded by the maintainer and successfully processed by the release verification command.

## Last successful verification

No official package has been formally verified yet. This is expected before the first `v0.1.0` release.

## Verification procedure

Before a release that claims compatibility:

1. Download the latest official ZIP directly from the Microsoft Learn page.
2. Do not add the ZIP to this repository.
3. Run the development-only verification command once implemented:

   ```bash
   npm run verify:official -- /path/to/latest-official.zip
   ```

4. Record at least:
   - verification date,
   - official ZIP filename,
   - Microsoft page update date/package observation,
   - browsable SVG/icon count,
   - category count,
   - naming-convention match rate,
   - validation result,
   - any compatibility notes.
5. Commit only the metadata in this file, never Microsoft icon assets.

## Verification record template

```text
Verification date: YYYY-MM-DD
Package: Azure_Public_Service_Icons_VNN.zip
Result: PASS | FAIL
Browsable SVG icons: N
Categories: N
Naming-convention match: NN.N%
Notes: ...
```

## Compatibility philosophy

The runtime does not hard-code the package version. It validates structure and behavior instead. Version filenames are release metadata, not a runtime gate.
