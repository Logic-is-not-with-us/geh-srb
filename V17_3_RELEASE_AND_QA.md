# GEH Serbia V17.3 — Cinematic Signature / Release evidence

## Scope and design
- Source: V17.2 Industrial Atlas (2026-10-20), preserved original movie and public-energy data code.
- **Updated:** 4 dashboard HTML pages, consolidated art direction (one replacement CSS/JS module), old-version test references and build label.
- Six independent tabs remain: Introduction / Energy Flow / Serbia Network / Analytics / TE-TO Cycle / Sources.
- Industrial process now features refined depth/material/glint treatments, five-step phase status rail **above** the diagram, smooth focus/exterior/cutaway selection, keyboard focus for machine hotspots, and an explicit *illustrative only* data label.
- At widths <=720 CSS px, plant illustration is positioned first *in DOM order*, followed by explanation. This matches keyboard order and reduces initial screen clutter.
- Other tabs share a subdued navy/cyan corporate art direction; original film remains identical byte-for-byte.

## Regressions fixed
- Previous focus UI used `scrollIntoView` on a phase-rail child; this could scroll the whole page away from the zoomed component. New code scrolls only the horizontal rail.
- Phase controls now precede the diagram in source/visual order, making them accessible without first scrolling past the diagram.
- Minor overlapping secondary decorative credit removed.

## QA performed
- Browser smoke checks **12/12**: sr-lat 320/390/768/1440/2560/3840px, plus sr-cyr/en/ru at 390/1440px; tested 6-tab transitions, stage choice, exterior/cutaway, scene reset, horizontal overflow and exceptions. No JavaScript exceptions or horizontal document overflow in the tested cases.
- Independent visually inspected Chromium screenshot renders at sr-lat 390px and 1440px (hero, overview and component focus).
- V15.2 source transformer fixture PASS, V16 structural PASS, V17.1 motion PASS, V17.2 historical interface invariants PASS, V17.3 scene invariants PASS; Node syntax PASS.
- Static GitHub Pages build PASS; `.nojekyll`, four language folders and new assets included.
- ZIP entries CRC checked after packing, and SHA-256 recorded.
- Public-source data feed, real deployed Pages URL, Safari/Firefox, real-device GPU performance, full WCAG audit, GEH/Gazprom art-direction approval, actual TE-TO as-built topology **not tested** and not claimed.

## Deployment
1. Preserve your current `geh-srb` Git commit and preferably create a new branch (e.g. `v17-3-preview`).
2. If V17.2 is already installed, extract the PATCH into a local Git clone, commit changes, and push. Otherwise use the FULL package.
3. Do not upload ZIP as a single file or alter GitHub Pages → Source = GitHub Actions.
4. Trigger/inspect the workflow `prepare` and `deploy` jobs; inspect published `.../sr-lat/energetski-monitor.html#plant` and actual `data/energy/*.json` states.
5. Verify intro video playback, Energy Flow tab independence, physical/commercial border semantics, optional external data status, reduced motion and mobile controls.
6. If anything regresses, revert to the preserved V17.2 Git commit.

## Technical limits
This is an **educational combined-cycle engineering illustration**, not a photorealistic 3D model, actual equipment inventory, operational SCADA, or digital twin. No new private TE-TO telemetry, commercial energy prices, or live API coverage is implied. Corporate release needs legal/media rights, engineering validation and approval.
