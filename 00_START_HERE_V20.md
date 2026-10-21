# GEH Serbia V20 — Industrial Illustration Upgrade (preview)

This is an **incremental visual upgrade of V19**, not a claim that all remaining production and licensing gates are complete.

## What changed

- Adds an original, high-detail cinematic cutaway illustration, optimized as a 254 KB WebP asset.
- Adds accessible industrial component hotspots and a phase-responsive visual spotlight on the same image.
- Keeps the previous technical SVG drawing, behind the "technical cross-section" disclosure, for explanatory rather than photographic use.
- Retains five stage selection buttons, keyboard interaction, guided tour and reduced-motion support.
- Keeps all four language variants; one consolidated CSS remains the only monitor stylesheet.
- Keeps Energy Flow and Network as distinct tabs. Does **not** change measured values, source classifications, JSON contracts, video, trading/price feeds, or GitHub deployment strategy.

## IMPORTANT: image provenance

The new illustrative asset is **AI-generated industrial conceptual artwork**, not a photograph of TE-TO Pančevo, an accurate as-built engineering model, or live telemetry. It must not be presented as a verified depiction of the plant. Technical labels are generic educational explanations; final public approval requires plant engineering and corporate review.

## Deployment

Full ZIP: extract **contents** into the GitHub repository root, preserving `.github` and `.nojekyll`. Commit on a preview branch first. Do not upload ZIP as a single file. Run `python3 scripts/build-v19-site.py` and `node scripts/test-v20.mjs` locally if desired; the Pages workflow runs those automatically. Existing V19 snapshot should be kept for rollback. V20 patch (if available) applies **only to the exact V19 FULL baseline**.

## Independent verification

- `python3 scripts/build-v19-site.py`
- `node scripts/test-v19.mjs`
- `node scripts/test-v152.mjs`
- `node scripts/test-v20.mjs`
- `node scripts/validate-v18-snapshots.mjs`
- `node scripts/build-pages.mjs`
- Local Chromium in-memory DOM render, 5 language/width combinations, click stages and overflow/JS error assertions. Note Chromium host policy blocks file:// and localhost end-to-end navigation, so **deployment in a real browser remains a separate gate**.

## Required official access for data

**ENTSO-E:** free Transparency Platform registration. If no Web API Security Token is visible, email transparency@entsoe.eu (subject "Restful API access", body must include the registered email). Generate token in profile and add as GitHub Actions Secret `ENTSOE_API_TOKEN`. Public reuse of load/forecast must match ENTSO-E CC BY 4.0 open-data list, with attribution and changes indicated. Set repository variable `ENTSOE_PUBLIC_REUSE_APPROVED` to exactly `1` only after this check. Do not put API tokens in public JS or GitHub files.

**SEEPEX:** Data LABS advertises 60-day free trial, but API and **redistribution rights** need an appropriate market-data package/contract. For public GEH dashboard showing Serbian day-ahead prices, get a quote (User vs Vendor rights, number of public web visitors, permitted timeliness, historical intervals, attribution and API) from SEEPEX. Trading membership fees are not the same as market-data fees.

Sources: https://transparency.entsoe.eu/ ; https://transparency.entsoe.eu/content/static_content/download?path=%2FStatic+content%2FAPI-Token-Management.pdf ; https://seepex-spot.rs/sr/data-reporting ; https://legacy.seepex-spot.rs/market-data-offers/

## Open items

Not completed: authenticated ENTSO-E production ingestion, SEEPEX price subscription/public redistribution, as-built TE-TO verification, real GitHub production deploy, accessibility audit on physical devices, full visual rebuild of network and Energy Flow. Existing V19 workflow and data rules are preserved.
