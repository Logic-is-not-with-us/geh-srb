# GEH Serbia V15 — rescue status (2026-10-20)

## Recovered sources

- GEH_Serbia_Energy_Intelligence_V15_2026-10-20.zip — verified source, 145 ZIP entries, CRC OK. Distinct V15 monitor (`energy-console-v15.css`, `energy-console-v15.js`).
- GEH_Serbia_V15_GitHub_Pages_Auto_Refresh_Ready.zip — verified source, 114 ZIP entries, CRC OK. However its complete visual baseline was V14 and not full isolated V15.

## Technical resolution

The consolidated build keeps the complete isolated V15 dashboard and original 4-language site, and transplants the GitHub Pages static data architecture onto **that** baseline. It adds Node 22 build which deploys HTML/CSS/JS/photos/JSON only. It preserves the localhost Python back-end as an optional local development mode, not a GitHub Pages dependency.

`public_power`, `total_power`, `cbpf`, `cbet` are separately fetched public time series from Energy-Charts v2, then exposed to the site as static JSON on GitHub Pages. Day-ahead Serbia price stays withheld on a PUBLIC site pending market-data redistribution permission; ENTSO-E actual load remains unconfigured; TE-TO gas/steam telemetry remains unconfigured.

## Why original V15 showed 'missing' despite /api/energy HTTP 200

The local Python handler returns an aggregate JSON even when individual upstream calls fail or have no data. HTTP 200 is a healthy HTTP response from the **local** server; it does not mean 200 for every external provider. The server's get_dataset catches exceptions and returns status `unavailable` instead of 500. The dataset statuses and timestamps determine actual coverage.

## Chromium

Playwright Chromium navigation to localhost server in this sandbox reproduced `ERR_BLOCKED_BY_ADMINISTRATOR` for both 390 and 1440 CSS px. This is a sandbox browser policy, independent of whether curl/web server can serve the same bytes. Inline HTML/CSS/JS mock visual test succeeded at 390/1440 CSS px: no overflow, page errors, valid SVG charts, logo loaded, actual missing prices shown as dash. This inline QA does NOT verify actual HTTP/network availability or deployed Pages URLs.

## Changes and QA

- Consolidated original V15 + Pages fetch, not replacement with V14 visuals.
- Added V15 dual-mode fetch (loopback API for local Python / static JSON on GitHub Pages; local missing API falls back to static JSON). No external npm packages or keys.
- Corrected 0 MW to show as zero for production where actual zero-valued measurement is reported, not as missing `NaN`.
- Source failures are logged by dataset in the GitHub fetcher; the frontend logs a clear console warning if static JSON cannot load.
- Original 5 Python tests: PASS. Node offline pipeline fixture: PASS. Node syntax check on application + fetcher + builder: PASS.
- All 4 language dashboard pages load the isolated V15 CSS/JS. HTML local assets: none missing.
- Static dist includes zero Python files, server logs or test code. The published build avoids the previous mixed V14 CSS bundle for the dashboard.
- ZIP integrity and independent SHA-256 recorded on release.

## Acceptance blockers

- Real live upstream responses were not tested in this environment (external DNS unavailable). Validate exact count and timestamps in the first real GitHub Actions run.
- GitHub actions and GitHub Pages real deploy must be validated under the user's repository.
- Public market prices must remain empty without rights approval. Other dataset licenses, company branding and images require production approval.
- GitHub Pages scheduling is best effort; it can be delayed or skipped and does not provide truly live telemetry.
