# GEH Serbia — Rescue V15 + automatic GitHub Pages refresh

**20 October 2026.** This is the recovered **original V15 dashboard** and complete 4-language GEH site, merged with the GitHub Pages data pipeline; it is **not** the V14-themed Pages branch.

## GitHub Pages preview — no local Python needed

1. Extract ZIP. Upload the **contents of this folder**, including hidden `.github` and `.nojekyll`, to the root of a new GitHub repository on `main`. Do not upload the ZIP by itself.
2. GitHub repo **Settings → Pages → Source → GitHub Actions**.
3. In **Actions → GEH Serbia · Pages + Energy data → Run workflow**, manually run the first deployment.
4. The dashboard is at `<Pages URL>/sr-lat/energetski-monitor.html`. Other prefixes: `sr-cyr/`, `en/`, `ru/`.
5. Automatic workflow runs at 07, 22, 37, 52 minutes past each UTC hour. The browser re-reads `data/energy/24h.json`, `7d.json`, `30d.json` every 5 minutes. GitHub Actions may delay or skip scheduled runs; these are *published, near-live datasets*, not truly live power-plant telemetry.

## What's implemented

- The original isolated `energy-console-v15.css` and `energy-console-v15.js` are preserved for all four dashboard pages. Non-dashboard site retains the complete V15 source tree and its existing assets.
- Dashboard selects `../data/energy/<range>.json` on public Pages, keeping the original `/api/energy?range=` path on local Python loopback server. For a localhost static preview, tries the Python endpoint first and falls back to JSON.
- `.github/workflows/pages-energy.yml` runs Node 22 zero-dependency fetcher, then `scripts/build-pages.mjs`, then Pages deployment. Only static HTML/CSS/JS/images/JSON are deployed, no Python backend or logs.
- Source requests are explicitly separated: production=`public_power`, generation total=`total_power`, physical flows=`cbpf`, commercial exchange=`cbet`. These are 4 public data endpoints under Energy-Charts v2, not 4 different providers.
- Price (`price?bzn=RS`) is NOT published on a public preview before price redistribution rights are confirmed. Actual load is not automatically available from this feed: the optional local ENTSO-E integration requires `ENTSOE_API_TOKEN`. Real TE-TO telemetry requires authorized internal sources, not invented substitutes.
- Source datasets show missing, zero, cached, and per-source observation timestamps separately. Displaying HTTP 200 alone proves neither coverage nor timeliness.
- Missing or stale results remain properly empty/cached; demo is **only** `?demo=1` with visible DEMO markers.

## QA / checks

Run `node --check scripts/fetch-energy.mjs`, `node --check assets/js/energy-console-v15.js`, and `node scripts/test-fixture.mjs` for mock data tests. `node scripts/build-pages.mjs` creates a deployable `dist/` directory. The original V15 offline Python tests are at `tests/test_server_v15.py`.

The current ChatGPT container does not have external DNS access to verify real Energy-Charts responses. **After the first GitHub Actions run, inspect logs for each dataset: observed records, source timestamps, missing/HTTP 429 errors.** If a source has no Serbia observations, do not replace missing with zero or historical/demo numbers.

## Local preview

The existing `START_DASHBOARD.bat` uses Python 3 to serve live API locally on `127.0.0.1:18765`, as an optional dev convenience. GitHub deployment does not use it. Open `http://127.0.0.1:18765/sr-lat/energetski-monitor.html` for local API mode.

You can also use any static web server with the generated JSON; `file://` directly is blocked by browser fetch policies.

## Restrictions

This is a preview, not an authorized production GEH property. It includes `noindex` from the original project. Do not publish internal telemetry, private market feeds, staff data, or sensitive files. Brand/photo/content approvals, data licensing and real network API QA remain production gates.
