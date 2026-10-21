# BLUE CURRENT V19 | Release / Independent QA

Datum: 20. oktobar 2026.

## Testirana implementacija

- Četiri jezika. Šest međusobno odvojenih tabova.
- Energy Flow: sedam odvojenih kanala, realni odnosi dostupnih serija, istorijski klizač, pojedinačni detalji i poređenje do tri tehnologije. Responsive horizontalni izbor na mobilnom.
- Mreža: Natural Earth geografski obris, osam granica, signed MW, smer, status merenja, istorija, fizički/komercijalni izbor i fokus kamere.
- TE-TO: pet novih krupnih edukativnih SVG prikaza, rotorska animacija, prikaz kućišta i alternativna cela šema. SVG opis i faze nemaju pristup operativnim podacima postrojenja.
- Jedinstveni UI modul `energy-app-v19.mjs` i uvezena normalizacija `energy-model-v18.mjs`.
- Originalni video sačuvan bez promene medijskog sadržaja.

## Potvrđeni rezultati

- `scripts/test-v152.mjs`: PASS. Popravljeno vraćanje izvornih JSON datoteka nakon fixture testa.
- `scripts/test-v19.mjs`: PASS. Nula naspram null, vremenska validnost, jedinice, duplikat granica, demo provenance, prisustvo četiri jezika.
- `scripts/validate-v18-snapshots.mjs`: PASS za tri perioda 24h, 7d, 30d; početne datoteke nemaju izmišljena javna merenja.
- `scripts/build-pages.mjs`: PASS, sa prisutnim videom, JSON i aktivnim V19 modulima.
- `python3 scripts/build-v19-site.py`: PASS. Isti izvor deterministički generiše sva četiri jezika i sastavljeni CSS.
- `qa-v19/matrix_results.json`: 32/32 izolovanih Chromium slučaja (4 jezika × 8 širina: 320, 390, 768, 1024, 1280, 1440, 2560, 3840). Nema horizontalnog prelivanja ni JS grešaka u pokrivenim slučajevima.
- Dodatni interaktivni Chromium slučajevi: nema-podatka, stvarni 0 MW, izbor tastaturom, kontrola smanjivanja/isključivanja animacija; PASS.
- Izvedeni screenshotovi za desktop 1440 i mobilni 390 postoje za sva tri ključna iskustva. DEMO je jasno označen.

## Ograničenja dokaza

- Ovo su lokalni testovi sa kontrolisanim fixture podacima; nisu verifikacija današnjih brojčanih vrednosti Srbije, spoljnog API-ja ili javnog GitHub deploymenta.
- Testovi dokaziju izostanak prijavljenih JS grešaka i prelivanja, ali ne garantuju premium vizuelni kvalitet ili kompletnu pristupačnost.
- Izolovani Chromium lokalni test u ovom projektu koristi umetnute assete zbog `ERR_BLOCKED_BY_ADMINISTRATOR` za lokalni HTTP. Nije isto što i provereno ponašanje na produkcionoj stranici.
- Nisu završeni testovi na Safari/Firefox i fizičkim mobilnim uređajima, nezavisni audit bezbednosti i stručna/pravna odobrenja.

## Kritični spoljašnji uslovi za produkciju

1. Obezbediti potvrđena prava korišćenja identiteta, fotografija, filma i svih javnih izvora.
2. Potvrditi ispravnost Energy-Charts odgovora za stvarnu konfiguraciju, uključujući ograničenja API-ja i prijavljenu svežinu.
3. Obezbediti ENTSO-E token/prava ako javna potrošnja i prognoza treba da budu dostupne. SEEPEX tržišna cena zahteva licencu.
4. Tehnički potpisati ili prilagoditi ilustraciju gasno-parnog ciklusa prema stvarnoj TE-TO arhitekturi.
5. Obezbediti stvarni GitHub Pages deployment i proći svih šest tabova sa realnim podacima.

**Stanje:** isporučiv V19 GitHub preview, ali NE odobrena finalna produkcija. Registar iz V18 ne može se automatski označiti kao potpuno zatvoren samo na osnovu ovih testova.
