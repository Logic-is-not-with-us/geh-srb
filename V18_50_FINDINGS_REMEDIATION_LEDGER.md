# GEH Serbia V18: registar zatvaranja svih 50 nalaza

**Status:** implementacioni kandidat za interni preview. Nijedna oznaka LOCAL FIX nije tvrdnja da su produkcija ili realni uređaji verifikovani.

```
{'LOCAL FIX': 17, 'PARTIAL': 28, 'EXTERNAL GATE': 4, 'OPEN': 1}
```

- LOCAL FIX: direktna izmena koda, lokalni contract/browser test.
- PARTIAL: deo problema rešen, nedostaje dodatna inženjerska isporuka/test.
- EXTERNAL GATE: zahteva pristup GitHub deploymentu, API-ju, licencama ili stvarnim uređajima.
- OPEN: rad nije izveden.

| ID | V17.4 nalaz (skraćeno) | V18 status | Dokaz / sledeći korak |
|---|---|---|---|
| P0-01 | Workflow ne može pouzdano da prođe . `.github/workflows/pages-energy.yml` poziva stare `test-v16`, `test-v171`, `test-v172`; svi padaju na aktuelnom izvoru. | **PARTIAL** | Stari testovi više nisu CI gate. V15.2 semantički test + V18 contract + validacija tri JSON-a + build; stvarni Actions deploy otvoren. |
| P0-02 | Isti proizvod ima dve različite klasifikacije energetskih serija . `energy-transform.mjs::classifyFuel` validira jedinice i drugačije razvrstava biogas/biomasu/ | **LOCAL FIX** | Jedan normalizator `assets/js/energy-model-v18.mjs` kreira proizvodne bucket-e na serveru; UI čita samo `v18` podatke. |
| P0-03 | Frontend prihvata nepoznatu jedinicu kao MW . `energy-v16.js::asMW`, `energy-v17-4-interaction.js::mw` vraćaju originalni broj za sve jedinice osim GW/kW, uklju | **LOCAL FIX** | `toMW` prihvata samo kW/MW/GW, ostalo odbija i loguje. |
| P0-04 | Prekogranični parser prepisuje vrednosti za istu državu . `energy-v16.js::borderMetrics` radi `out[code]=reading`, bez definisanog agregiranja više kanala/serij | **PARTIAL** | Višestruke serije za istu granicu označavaju se kao ambigvitet (bez prepisivanja). Pravila za sve stvarne ID serije zahtevaju live verifikaciju. |
| P0-05 | Nema verifikacije realnog objavljivanja V17.4 i stvarnih skupova podataka . | **EXTERNAL GATE** | GitHub deployment, upstream 429/HTTP i stvarne JSON vrednosti nisu testirani ovde. |
| P0-06 | Status može izgledati „spreman“ i kada je podatak star . V15 adapter računa 3/3 prema postojanju redova, a ne prema njihovoj starosti; `server_time` se osvežava | **PARTIAL** | Status zavisi od `observed_at` i starosti, ne od `server_time` ili republish trenutka. Potrebni produkcioni uzorci. |
| P1-01 | 3 stvarna javna feeda nisu 6 izvora . `actual_load`, `load_forecast` su `not_configured` bez tokena; `day_ahead_price` je `license_required`. | **EXTERNAL GATE** | 3 javna feeda, 2 uslovna ENTSO-E, licencirani SEEPEX; bez lažnog povećanja broja feedova. |
| P1-02 | `fetch-energy.mjs` ponovno gradi/objavljuje ceo sajt na svakom 15-minutnom osvežavanju. Video od 13,4 MB ulazi u artifact svaki put. | **OPEN** | Pages redeploy i dalje uključuje film zbog statičkog deployment modela; potrebna odluka o hostingu i trošku. |
| P1-03 | Više API perioda može pogoditi 429; retry postoji, ali nema globalnog rate-limit budžeta po endpointu. | **PARTIAL** | Pacing 25s/endpoint, 429 Retry-After, fallback; još nema nezavisnog opterećenog upstream testa. |
| P1-04 | `loadPrevious` zavisi od dostupnosti prethodne Pages URL putanje ili slučajno sačuvanih lokalnih JSON podataka. | **PARTIAL** | Prethodno objavljeni snapshot služi kao keš; nema nezavisne durable baze. |
| P1-05 | `energy-console-v15.js::refresh` pri browser fetch grešci zamenjuje tekući ekran praznim datasetom. | **PARTIAL** | UI zadržava poslednji uspešan snapshot kada novo preuzimanje padne; zahtevana mrežna E2E simulacija. |
| P1-06 | Neujednačena vremenska osnova proizvodnje, fizičkih i komercijalnih tokova. Korisnik može gledati različita vremena kao da su jedan snimak sistema. | **PARTIAL** | Odvojeni satovi po feedu, nema izmišljenog izjednačenog bilansa. Zajedničko vreme i dalje nije poseban režim. |
| P1-07 | Frontend linijski grafikon koristi indeks uzorka kao X, ne stvarni timestamp . | **LOCAL FIX** | Grafik koristi stvarne vremenske koordinate, prekide, vremenske oznake, nultu osu. |
| P1-08 | Udeo OIE/proizvodnje zavisi od nepotpunog skupa prijavljenih serija. Ograničenje je napisano, ali naziv veliki % može dominirati nad objašnjenjem. | **PARTIAL** | Procenat je označen kao deo prijavljenih serija; nema nezavisne nacionalne potvrde pokrivenosti. |
| P1-09 | Podaci se grupišu heuristikom teksta ; nepoznati ID može nestati iz zbira bez jasnog alarama. | **PARTIAL** | Nepoznate serije idu u QA warnings; klasifikacija još zavisi od eksplicitnih regex obrazaca, ne od potvrđenog ID kataloga. |
| P1-10 | Izvoz CSV iz V15 adaptera je širok, bez strukture koja jasno nosi poreklo, metodologiju, vreme publikacije i licencu po seriji. | **PARTIAL** | CSV nosi feed/time/unit/provenance; potreban odvojeni manifest za potpunu razmenu. |
| P1-11 | ENTSO-E XML parsiranje je regex/first-or-last value po istom timestampu (`seen.set`), bez eksplicitne validacije konflikata više TimeSeries. | **PARTIAL** | ENTSO-E duplikati različitih vrednosti izazivaju grešku; XML parser još nije pun namespace-aware parser. |
| P1-12 | Production/front prikaz prihvata vremenske tačke do +1 h kao „observed“ . | **LOCAL FIX** | Budući timestamp opažanja odbijen; prognoza dozvoljava buduće intervale. |
| P1-13 | Energy Flow je interaktivan samo delimično . Klik osvetli liniju, promeni naslov/broj i mali grafikon; centralna scena ostaje statična radijalna mreža bez stvar | **PARTIAL** | Umesto radijalnog modela, ponderisane ribbon putanje i povezan inspektor; vizuelno odobrenje korisnika otvoreno. |
| P1-14 | Energy Flow ima dva slična inspektora, glavni „Odabrani izvor“ i veliki „Pregled izvora“ sa 6 mini-kartica. | **LOCAL FIX** | Jedan inspektor sa brojem, udelom, grafikonom i detaljima. |
| P1-15 | Grafikonu nedostaju vidljive Y jedinice, datumska X osa i hover/touch tooltip; ekran izgleda kao dekorativna linija. | **LOCAL FIX** | Ose i tooltip, metadata u vremenu, detalj/tabela za pristupačnost. |
| P1-16 | Mreža Srbije nije geografska ni električna mreža; osam suseda predstavlja radijalni dijagram oko SRB, bez geografije i bez razlike između granice, interkonektor | **LOCAL FIX** | Regionalna Natural Earth mapa + eksplicitno šematske veze, granice i inspector. |
| P1-17 | Mreža koristi previše sitnog teksta i glifova; `→`, `←`, cyan/amber boje nisu dovoljno samostalno objašnjene u trenutku interakcije. | **LOCAL FIX** | Tekstualno import/export značenje i stalan opis predznaka po izvoru. |
| P1-18 | U `grid` V17.4 komercijalna granična vrednost se na kartici prikazuje kao apsolutna (`Math.abs`), dok drugi delovi prikazuju predznačen saldo. | **LOCAL FIX** | Predznak je očuvan i u listi granica i u inspektoru, uz zasebne vrste toka. |
| P1-19 | Inspector granice koristi mali jedinični sparkline bez oznaka intervala/nulte ose/smera na samom grafiku. | **LOCAL FIX** | Signed history, vremenska i nulta osa; fallback tabela. |
| P1-20 | TE-TO je bolji crtež, ali i dalje težak za razumevanje. Koncept turbina/generator/HRSG prikazan je kao jedan nedovoljno diferenciran model bez proverenog P&ID/t | **PARTIAL** | Zadržana bogatija 2.5D ilustracija, potrebno stručno odobrenje TE-TO i namenski kadrovi. |
| P1-21 | Vođena tura automatski menja fazu na ~2,9 s , što nije dovoljno za čitanje objašnjenja i pregled scene. | **LOCAL FIX** | Tura 11.5s/fazi, ručna navigacija i prekid. Provera razumljivosti sa korisnicima otvorena. |
| P1-22 | Fokusiranje SVG scene je samo promena `viewBox` uz već postojeću osnovnu ilustraciju; nema stvarnog „otvaranja kućišta“ na nivou realnih vizuelnih slojeva. | **PARTIAL** | Cutaway i kamera rade, ali nije pun 4-slojni originalni mehanički model. |
| P1-23 | Istovremeno postoje scene motion engine, data engine, tab controller i art-direction observers bez jedinstvenog vlasništva nad stanjem . | **LOCAL FIX** | Jedna app state mašina, jedan CSS i jedan JS module entrypoint. |
| P1-24 | Analitika je pre svega četiri osnovna panela i niz KPI kartica; nedostaju uporedni mod, jasne jedinice, kontekst, distribucije, metodološka pomoć. | **PARTIAL** | Izbor 6 feedova, veliki graf, source detalji; uporedni mod i napredna statistika preostali. |
| P2-01 | Premium pravac je još uglavnom dark-navy, glow i bordered cards, bez zaista snažnih autorskih scena . | **PARTIAL** | Novi art-direction prikazi, ali potreban nezavisni vizuelni potpis. |
| P2-02 | Hero video ima oko 13,4 MB i 55,27 s; nema adaptivnu strategiju. | **PARTIAL** | Poster i metadata preload; zasebni adaptive mobile video renditions nisu napravljeni. |
| P2-03 | MP4 zapravo sadrži AAC audio stream, ali praktično tih , a UI nema zvuk. | **PARTIAL** | Nema audio kontrole; originalni tihi audio stream u web MP4 nije zasebno uklonjen. |
| P2-04 | Film ima ugrađene natpise i nije potpun višejezični sadržaj, iako su okolne 4 stranice prevedene. | **PARTIAL** | Lokalizovane okolne stranice, natpisi ugrađeni u film nisu menjani. |
| P2-05 | Jedini „konsolidovani“ `energy-v17-4.css` ima ~87 KB, 480 fizičkih  linija i 38 `!important`, uz mnogo nasleđenih verzija u paketu. | **LOCAL FIX** | Monitor učitava jedan novi CSS fajl, ne stare slojeve; screenshot test. |
| P2-06 | Sajt istovremeno sadrži veliki broj neaktivnih CSS/JS generacija; release/rollback nije evidencijom vezan za koji active bundle. | **PARTIAL** | Legacy sadržaj ostaje u ZIP-u zato što ostatak sajta još može da ga koristi; monitor ga ne učitava. |
| P2-07 | Tipografija u screenshotovima često 9–12 px i vrlo niskog vizuelnog prioriteta, previše `letter-spacing` za podatke. | **PARTIAL** | Jasna veća tipografska hijerarhija; sitne oznake treba još proveriti radi kontrasta i WCAG AA. |
| P2-08 | Graph SVG u V17.4 ima `aria-hidden=true` bez vidljive semantičke tabele ili screen-reader opisa. | **LOCAL FIX** | Grafici sada imaju tekstualni naslov i proširivu tabelu sa podacima. |
| P2-09 | Touch slider nije dovoljan za precizno biranje intervala među 700+ uzoraka na telefonu. | **PARTIAL** | Slider + korak napred/nazad/najnovije; datepicker i skok po datumu nisu dodati. |
| P2-10 | `window.scrollTo` pri tab promeni resetuje poziciju, može biti neprijatno pri detaljnim uporednim analizama. | **LOCAL FIX** | Promena taba ne poziva globalno scrollTo; fokus navigabilan. |
| P2-11 | Veći deo interakcija nema eksplicitne `aria-live` informacije pri promeni podataka; stanje može biti slabo najavljeno screen readeru. | **PARTIAL** | Status toast aria-live i kontrolisani tabovi, ali treba kompletan NVDA/VoiceOver audit. |
| P2-12 | `prefers-reduced-motion` postoji, ali nije formalno proverena kompletna matrica animacija/video/motion režima. | **PARTIAL** | Reduced-motion test i manual motion toggle; nema testova na fizičkim uređajima. |
| P2-13 | Hard-coded engleski tehnički tekst/ARIA oznake u SVG i filmu, pored četiri jezička interfejsa. | **PARTIAL** | Glavni sadržaj preveden u 4 varijante; preostale tehničke oznake SVG delimično na engleskom. |
| P2-14 | Em-dash uklonjen iz statičkog HTML-a, ali aktivni JS i dalje ima više `—` fallbacka. | **LOCAL FIX** | Nema em-dash fallbacka u V18 prikazu; prikazuje se `n/d` ili razumljivo stanje. |
| P2-15 | Footer je vizuelno rasterećen, ali potrebne metodološke i licencne informacije nisu sistematski prevedene u primarni Sources UI. | **PARTIAL** | Sources tab sa detaljima, vremenima i licencama, ali nije verifikovan kompletan legal paket. |
| P2-16 | `noindex,nofollow` je kompatibilan sa internim previewom, ali nije autentifikacija; javni GitHub Pages URL ostaje javno dostupan. | **EXTERNAL GATE** | Preview javna Pages adresa sa `noindex`; to nije kontrola pristupa. |
| P2-17 | QA je dominantno DEMO + screenshot + structural, bez browser testova realnih izlaza/praznih feedova/stale/429/keyboard/performance. | **PARTIAL** | Sintetika, uredni DOM i interakcije testirani; realni dataset, network throttling i Safari nisu. |
| P2-18 | Stari testovi assertuju imena CSS fajlova i predugačke hardkodirane strukture, pa refaktor izaziva lažne padove; novi smoke ne proverava dovoljno domenskih scen | **LOCAL FIX** | Novi testovi proveravaju domenske slučajeve, ne imena starih CSS fajlova. |
| P2-19 | Design system nema formalizovanu vizuelnu metriku  i nezavisnu komisiju za odobrenje. | **PARTIAL** | Postoje screenshotovi, ali nema nezavisne komisije ili formalnog odobrenja. |
| P2-20 | Nisu potvrđeni realni uređaji, Safari/Firefox i slabije mreže; ranije green testovi su preširoko tumačeni. | **EXTERNAL GATE** | Neprovereno na fizičkom telefonu i Safari/Firefox-u. |

## Nezavršeni release gate

1. GitHub Actions `prepare` i `deploy` na zasebnoj testnoj grani sa stvarnim snapshotovima i sačuvanim logovima.
2. QA upstream payload za sve dostupne serije, naročito granice i parcijalne feedove; ne improvizovati kada izvori nisu dostupni.
3. Potvrda licenci tržišnih podataka, videa, fotografija, identiteta i prava objavljivanja.
4. Tehnička verifikacija TE-TO ilustracije, bez prikazivanja kao stvarne telemetrije.
5. Nezavisni dizajnerski pregled + fizički Android/iPhone + Safari/Firefox, performance i accessibility.
6. Odluka o adaptivnom videu i statičkom GitHub Pages refresh trošku.

**Odluka o javnoj objavi:** HOLD do zatvaranja svih P0 eksterih gateova i relevantnih P1 rizika.
