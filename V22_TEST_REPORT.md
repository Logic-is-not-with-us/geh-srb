# V22 QA evidence summary

Local, isolated-browser checks were executed using Chromium with an in-memory HTML/CSS/JavaScript bundle and controlled normalized DEMO snapshot. No claim of real upstream API testing.

## Results
- 20 / 20: sr-lat, sr-cyr, en and ru at 320, 390, 768, 1440 and 1920px.
- Seven Energy Flow production channels selectable.
- Solar value `0` stays numeric zero, unreported Other remains unavailable.
- Eight network entries; import filtering returns four borders in fixture; country selection changes inspector.
- Five TE-TO hotspots, fourth stage activation changes stage index to `04 / 05`.
- No unhandled page exceptions, no horizontal overflow in tested widths.
- Existing Node semantic/data tests PASS. Public Pages artifact locally builds.

## Findings and limitations
- In this sandbox, `http://127.0.0.1` and `file://` browser navigation is blocked; the QA fixture uses `page.set_content` and a deterministic network-response substitution. Static asset and DOM interactions are exercised, but network availability and deployment are not.
- Screenshot framing is one browser viewport at selected tabs; it does not certify camera motion visual quality on physical devices.
- User acceptance of art direction remains pending. The underlying TE-TO visual is still the stylized V20 illustration and not an engineering-verified model.
- Energy-Charts feeds require network access and correct licensing / source support; ENTSO-E and SEEPEX remain conditional.
