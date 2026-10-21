# GEH Serbia · BLUE CURRENT V22

**Status:** local QA preview release, not production certified.

## Baseline and scope
V22 merges V21 Energy Flow controls with the more detailed V20 TE-TO industrial illustration. It adds a coordinated Network inspector and a five-stage TE-TO interactive presentation, with a refined visual treatment. The original video is preserved byte-for-byte.

The site contains 4 language editions (sr-lat, sr-cyr, en, ru) and six separate tabs: Uvod, Energy Flow, Mreža Srbije, Analitika, TE-TO ciklus and Izvori.

## Implemented and exercised
- **Energy Flow:** seven normalized fuel categories, share-weighted production channels, selected-source inspector, top contributors, compare-up-to-three source trends, timeline, 0 vs missing treatment, ranked breakdown, keyboard-selectable channels and composition segments.
- **Mreža Srbije:** geographic regional context (not physical transmission tower routes), eight border readings, imports/exports/missing filters, proportional bar overview, boundary selection connected to the inspector and chart, time slider, independent physical and commercial readings with timestamps and status, partial-coverage safeguards.
- **TE-TO:** preserved V20 industrial artwork, five equipment/phase hotspots, stage selection, input/output descriptions, focus framing, guided story controls, optional detailed technical SVG cutaway and mobile horizontal stage navigation.
- **Engineering:** source CSS rebuild, updated GitHub workflow that runs V22 regression, preservation of V18 strict-data normalization and public-data caching, original video unchanged.

## Test coverage
- Node JS syntax, V15.2 data regression, V19 semantic regression, V22 integration test, three JSON schema validations and static Pages build.
- Headless Chromium set-content offline controlled fixture, 20 combinations (4 languages × widths 320, 390, 768, 1440, 1920). Interactions: Flow source switch; 0 MW vs missing; network filter and border selection; 5 plant hotspots and stage change. No observed JS exceptions or horizontal document overflow in these checks.
- Browser QA uses controlled demo fixtures and inline assets due browser environment blocking local HTTP/file navigation; it is **not** a test of actual public GitHub Pages deployment or external API fetches.

## Important limits
- TE-TO scene is **illustrative**, not verified engineering documentation or actual plant SCADA/telemetry. Exact equipment topology and materials require technical approval.
- Map borders and schematic links do not represent physical routes of high-voltage lines. Flow/commercial data are distinct.
- ENTSO-E load/forecast requires access, user-provided GitHub Secret and reuse-rights confirmation; SEEPEX price requires appropriate publication rights.
- Public live ingestion and deployment, Safari/Firefox and physical devices have **not** been independently validated.
- Existing V18 50-finding ledger is not claimed closed; this is a targeted functional and visual improvement.

## GitHub installation
1. Save current commit. Prefer a test branch.
2. Upload all *contents* of FULL ZIP to repository root, preserving `.github/workflows` and `.nojekyll`.
3. In Settings > Pages set Source to GitHub Actions (existing setup).
4. In Actions trigger **GEH Serbia | V22 Industrial Intelligence** and inspect both `prepare` and `deploy`, upstream source counts and site rendered data.
5. Check `sr-lat/energetski-monitor.html` on the published Pages URL and repeat interactions on a real desktop and phone.

The incremental PATCH ZIP is only for the **exact V21 package** named `GEH_Serbia_V21_ENERGY_FLOW_PREMIUM_FULL_GITHUB_2026-10-21.zip`. For any other baseline use FULL.
