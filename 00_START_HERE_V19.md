# GEH Serbia | BLUE CURRENT V19 | Ispravna isporuka za GitHub Pages

**Status:** razvijena i lokalno testirana interaktivna V19 preview verzija. **Nije produkciono odobrena niti proverena na stvarnoj GitHub Pages adresi.**

## Šta je novo

- **Uvod:** čitav originalni film turbine od 55,27 s. Nema dugmeta za zvuk; film nije menjan.
- **Energy Flow:** zaseban tab sa sedam vizuelnih kanala, grafikom proporcionalnim dostupnim podacima, klikabilnim tehnologijama, dva nivoa detalja, poređenjem do tri izvora, istorijskim vremenskim klizačem i izračunatim udelima. Ne prikazuje isključene ili odsutne serije kao stvarne tokove.
- **Mreža Srbije:** geografski kontekst regiona, osam veza, smerovi i vremenske vrednosti, potpunost graničnih serija, istorija i fokus kamere. **Linije su shematske veze, ne stvarne trase dalekovoda.** Fizički i komercijalni tokovi su odvojeni.
- **TE-TO ciklus:** pet samostalnih edukativnih detaljnih scena (gas, turbina, generator, povrat toplote, para), rotirajući rotor, otvaranje kućišta i povezane kontrole. Kompleksni originalni tehnički SVG je dostupan kao proširivi pregled. **Nije operativni digitalni blizanac TE-TO Pančevo** i ne predstavlja stvarnu telemetriju.
- **Analitika i Izvori:** zasebni tabovi, grafikoni, transparentna klasifikacija podataka i statusi sa izvorima. Četiri jezika: srpski latinica, srpski ćirilica, engleski i ruski.
- **Arhitektura:** jedan aktivan V19 UI modul, jedan sastavljen CSS i stabilan normalizovani v18 podatkovni model. Nema dodatnih aktivnih slojeva V14–V17 u monitoru.

## Objavljivanje putem GitHub Desktop (preporučeno)

1. Sačuvati sadašnji commit na postojećem `geh-srb` projektu (ili napraviti testnu granu).
2. Raspakovati **FULL** ZIP u root lokalnog klona repozitorijuma uz zamenu postojećih fajlova. U korenu treba da se vide `.github/workflows/pages-energy.yml`, `.nojekyll`, `assets`, `data`, `scripts`, `sr-lat`, `sr-cyr`, `en`, `ru` i `index.html`.
3. U GitHub Desktop napraviti commit i `Push origin`.
4. Na GitHubu u **Settings → Pages → Build and deployment** kao izvor ostaviti **GitHub Actions**. Ne dodavati Jekyll ili drugi Static HTML workflow.
5. U **Actions** pokrenuti `GEH Serbia | V19 Industrial Intelligence` pomoću `Run workflow`, ili sačekati izvršavanje nakon push-a.
6. Potvrditi oba posla: `prepare` i `deploy`. Potom otvoriti `https://logic-is-not-with-us.github.io/geh-srb/sr-lat/energetski-monitor.html` i pregledati sve tabove.
7. Proveriti aktuelne timestampove, status svakog izvora i stvarne JSON podatke iz `data/energy/24h.json`, `7d.json`, `30d.json`. `HTTP 200` sam za sebe ne potvrđuje ispravnost serija.

**PATCH** ZIP koristiti isključivo ako je na GitHubu već postavljena identična V18 rescue osnova. Ako nije, FULL ZIP je bezbedniji izbor. PATCH ne uključuje veliki video i postojeće fotografije.

## Pokretanje lokalno

Iz korena projekta: `python -m http.server 18765`. Zatim otvoriti `http://localhost:18765/sr-lat/energetski-monitor.html?demo=1` za jasno označen, sintetički DEMO. Bez `?demo=1` statičke lokalne početne JSON datoteke nemaju stvarna merenja do prve uspešne GitHub Actions obnove. Sintetičke vrednosti nisu stvarni podaci Srbije.

## Testovi

```sh
python3 scripts/build-v19-site.py
node scripts/test-v152.mjs
node scripts/test-v19.mjs
node scripts/validate-v18-snapshots.mjs
node --check assets/js/energy-app-v19.mjs
node scripts/build-pages.mjs
```

V19 stilska osnova dolazi iz `assets/css/energy-v18.css` + `assets/css/energy-v19-additions.css`, koje skripta spaja u `assets/css/energy-v19.css`. Izvorni HTML generator je `scripts/build-v19-pages.py`.

## Važna otvorena ograničenja

- Javni proizvodni podaci za Srbiju zavise od odgovora Energy-Charts; nije moguće unapred garantovati potpunost svakog izvora, dostupnost svake tehnologije, stopu osvežavanja ili pokrivenost granica.
- Potrošnja i prognoza preko ENTSO-E traže API token i potvrdu uslova javne redistribucije; postavke: `ENTSOE_API_TOKEN` GitHub Secret i `ENTSOE_PUBLIC_REUSE_APPROVED` GitHub Variable, nakon pravne provere.
- SEEPEX cena nije uključena u javni JSON bez odgovarajuće licence. Ne zamenjivati je izmišljenom cenom.
- TE-TO ilustracije su edukativne, ne potvrđena šema konkretnog postrojenja. Potrebni su tehničko i korporativno odobrenje.
- `noindex` nije kontrola privatnosti: javni GitHub Pages URL je javno dostupan.
- Lokalni Chromium nije zamena za proveru objavljenog GitHub Pages deploymenta, Safari/Firefox i stvarnih mobilnih uređaja.

## Povratak na prethodno stanje

Vratiti prethodni Git commit u GitHub Desktop ili koristiti sačuvani V18 rescue ZIP, pa ponovo pokrenuti Actions. Ne brisati prethodnu verziju dok V19 ne dobije stvarnu proveru.
