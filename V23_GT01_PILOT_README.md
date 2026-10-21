# GEH Serbia V23 — GT-01 industrial explorer pilot

**Deliverable class: prototype / visual art approval required.** This package contains a working three-state component embedded into the V22 TE-TO tab, **not** an approved physical model of the actual two-GT, two-HRSG, one-ST TE-TO Pančevo installation.

## What is working

- Three registered raster image states, with **exactly zero pixel differences outside the registered GT overlay mask**. This registration is mechanical, not proof of art quality.
- `Shell`, `Exposed`, `Inner` interactive switching, smooth transitions, no camera shift.
- SVG overlay for four distinct **illustrative** flow types: air, gas, hot exhaust, electrical power; one at a time.
- Four selectable machine components, including keyboard-accessible buttons with `aria-pressed`, dynamic educational text, input/output descriptions, previous/next and reset.
- Motion pause and `prefers-reduced-motion`, global monitor motion-off CSS, pause when page hidden or pane inactive.
- Integrated into the actual four-language monitor generator, while preserving the V22 Energy Flow, Network, Analytics, intro video, Sources and legacy plant view.
- GitHub Actions test step for the V23 pilot.

## Intentional asset truthfulness limits / art gate status

- `gt01-exposed.webp` is a lossless crop of **V20 conceptual industrial art**. Not a verified photograph of TE-TO or engineering section.
- `gt01-shell.webp` is an **artist-drawn steel shroud prototype**, NOT a realistic OEM enclosure. **VISUAL PRODUCTION APPROVAL: FAIL / NEEDS NEW SOURCE ART.**
- `gt01-inner.webp` reuses and enlarges visible rotor details from the same conceptual artwork. It is NOT a deeper verified mechanical layer. **ENGINEERING DETAIL APPROVAL: PENDING.**
- All three have the exact same crop and camera. Machine location is conceptual. The entire unit setup is **not** represented as full 2+2+1 overview in this pilot.
- Flow overlays are **educational**, not real piping/wiring routes, speed, values, or telemetry; they do not imply unit state.
- The master panorama for the real 2+2+1 arrangement and five verified separate cutaway asset families are not created here.
- The originally generated overview image with questionable labels/estimates is **not included** in the package.

## Source of truth and modified code

**Baseline**: `GEH_Serbia_V22_INDUSTRIAL_INTELLIGENCE_FULL_GITHUB_2026-10-21.zip`

New:
- `assets/img/gt01-pilot/gt01-{shell,exposed,inner}.webp` + `registration.json`
- `assets/css/te-to-gt01-pilot.css`
- `assets/js/te-to-gt01-pilot.mjs`
- `scripts/create-gt01-pilot-assets.py`
- `scripts/patch-v23-pilot.py`
- `scripts/test-v23-gt01.mjs`
- `scripts/qa-v23-browser.py` (offline QA only, not required on Pages)

Modified:
- `scripts/build-v19-pages.py` (inject viewer element/scripts/style deterministically)
- `.github/workflows/pages-energy.yml` (add test-v23 and syntax check)
- generated `sr-lat`, `sr-cyr`, `en`, `ru` monitor HTML pages

## Local validation actually executed

```bash
python3 scripts/build-v19-site.py
node scripts/test-v23-gt01.mjs
node scripts/test-v20.mjs
node scripts/test-v22.mjs
node scripts/test-v19.mjs
node scripts/test-v152.mjs
node --check assets/js/te-to-gt01-pilot.mjs
node scripts/build-pages.mjs
python3 scripts/qa-v23-browser.py
```

Chromium pilot QA: 5 combinations (`sr-lat` 1440 and 390, other 3 languages at 1440) — switch modes, photo loaded, flow switch, hotspot, animation pause, reset, no horizontal overflow, no JS exceptions.

**Browser qualification detail:** current runtime blocks localhost and file URLs. The Playwright script uses actual generated HTML and authored CSS in `page.set_content`, replaces three raster URLs with data URI strings for the test, and injects only the independent GT-01 JS module. **It does not qualify the public GitHub deployment or the entire V22 app end-to-end**; the existing node-based V22 regressions cover other components.

## GitHub integration

1. Use a **test branch** cloned from the current repository. Ensure you upload *every file in this FULL ZIP*, including `.github` and new assets. Uploading workflow alone previously caused a `Missing V22 file` Actions failure.
2. Keep original `.git` intact. Apply all files from ZIP into repo root, then commit and push test branch.
3. The provided workflow triggers on `main` only by default; for a test branch, either run a workflow configured for that branch or merge via reviewed PR after local/manual testing.
4. Inspect Actions log for `test-v23-gt01`, build, upload and deploy. Open `sr-lat/energetski-monitor.html#plant` and exercise three states on desktop and phone.
5. **Do not publish as verified TE-TO engineering depiction**. Secure engineering/art direction approvals before production.

## Next visual gate

Obtain **aligned, high-quality production source art** for shell and genuine inner cutaway of one confirmed GT type. Re-run outside-mask pixel registration and check engineering plausibility before duplicating the method to GT-02 / HRSG-01 / HRSG-02 / ST-01. Do not force a worse-looking cover into production just to satisfy the test.
