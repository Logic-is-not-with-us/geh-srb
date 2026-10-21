#!/usr/bin/env python3
"""Adds a cinematic, non-telemetry industrial illustration to authored V19 templates.
Idempotent; called before compiling. Does not alter upstream energy data.
"""
from pathlib import Path
P=Path(__file__).resolve().parent.parent
src=P/'scripts/build-v19-pages.py'
s=src.read_text()
if 'v20-cinematic-scene' not in s:
    target='<div class="v19-technical-desk">'
    assert target in s
    # generation template is an f-string; j is computed by generation not inside template
    addition='''<div class="v20-cinematic-scene" id="v20-cinematic-scene" data-active-stage="0" aria-label="{h('plant')}"><img src="../assets/img/geh-ccgt-illustration-v20.webp" alt="{h('v20_alt')}" loading="lazy" decoding="async" width="1536" height="1024"><div class="v20-scene-tone" aria-hidden="true"></div><svg class="v20-circuit" viewBox="0 0 1536 1024" aria-hidden="true" preserveAspectRatio="none"><path class="v20-circuit-heat" d="M460 570 C660 480 730 460 910 405"/><path class="v20-circuit-power" d="M540 725 L920 727"/><path class="v20-circuit-steam" d="M950 380 C1170 258 1230 320 1330 400"/></svg><div class="v20-scene-legend"><span>GEH / INDUSTRIAL ATLAS</span><strong>{h('v20_illustration')}</strong></div>'''+'''{''.join(f'<button type="button" class="v20-scene-point" data-plant-focus="{k}" style="--x:{x}%;--y:{y}%" aria-label="{html.escape(t["stage_names"][k])}"><span class="v20-point-num">0{k+1}</span><span class="v20-point-label">{html.escape(t["stage_names"][k])}</span></button>' for k,x,y in [(1,32,66),(2,57,71),(3,69,38),(4,86,49)])}'''+'''<div class="v20-scene-bottom"><span>{h('v20_instruction')}</span><span>{h('v20_status')}</span></div></div><details class="v20-technical-detail"><summary>{h('v20_drawing')}</summary>'''
    # add close after technical desk original: starts <div...> and ends by closing ... tags before <details class=v19-full-plant>
    s=s.replace(target,addition+target,1)
    s=s.replace('</svg><div class="v19-component-tags" id="v19-component-tags"></div></div><details class="v19-full-plant">','</svg><div class="v19-component-tags" id="v19-component-tags"></div></div></details><details class="v19-full-plant">',1)
    # Append four new dictionary keys at first segment of each language translation dict (all have stage etc).
    for lang,terms in {
        'sr-lat':['Industrijska interpretacija kombinovanog ciklusa. Nije stvarni snimak niti tehnički model TE-TO.','Tehnološka ilustracija','Izaberite deo postrojenja za detalje','Ilustracija, bez operativnih podataka','Otvori tehnički presek'],
        'sr-cyr':['Индустријска интерпретација комбинованог циклуса. Није снимак нити технички модел ТЕ-ТО.','Технолошка илустрација','Изаберите део постројења за детаље','Илустрација, без оперативних података','Отвори технички пресек'],
        'en':['Artistic combined-cycle visualization, not a photograph or verified TE-TO technical model.','Technology illustration','Select a component to explore','Illustration, not operational data','Open technical cross-section'],
        'ru':['Художественная визуализация парогазового цикла, не фотография и не техническая модель ТЭ-ТО.','Технологическая иллюстрация','Выберите узел для подробностей','Иллюстрация, не рабочие данные','Открыть технический разрез']
    }.items():
        marker=f"'{lang}':dict("
        assert marker in s
        add=",".join(f"{key}={val!r}" for key,val in zip(['v20_alt','v20_illustration','v20_instruction','v20_status','v20_drawing'],terms))
        s=s.replace(marker,marker+add+',',1)
    src.write_text(s)

csssrc=P/'assets/css/energy-v20-polish.css'
if not csssrc.exists():
 csssrc.write_text('''/* V20 Industrial Atlas: cinematic editorial plate, source is original generated imagery. */
.v20-cinematic-scene{position:relative;isolation:isolate;overflow:hidden;background:#06172b;border:1px solid #41728c;aspect-ratio:3/2;box-shadow:inset 0 0 0 1px #9ed8ed18,0 32px 72px #020d1c70;margin-top:20px;margin-bottom:15px}
.v20-cinematic-scene>img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.98) contrast(1.05);transition:filter .5s,transform .9s cubic-bezier(.2,.8,.2,1);transform:scale(1.01)}
.v20-scene-tone{pointer-events:none;position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,18,32,.75),transparent 22%,transparent 63%,rgba(4,15,26,.92)),linear-gradient(90deg,rgba(4,16,28,.34),transparent 25%,transparent 76%,rgba(3,15,29,.2));z-index:1}
.v20-circuit{position:absolute;inset:0;width:100%;height:100%;z-index:2;overflow:visible;pointer-events:none}
.v20-circuit path{fill:none;stroke-width:5;opacity:.85;stroke-dasharray:14 30;filter:drop-shadow(0 0 5px currentColor);animation:v20-flow 13s linear infinite}
.v20-circuit-heat{stroke:#fb9867}.v20-circuit-power{stroke:#75d9ff}.v20-circuit-steam{stroke:#a9e9fa}
@keyframes v20-flow{to{stroke-dashoffset:-440}}
.v20-scene-legend{position:absolute;z-index:3;top:18px;left:20px;right:20px;display:flex;justify-content:space-between;gap:12px;align-items:center;color:#ccefff;text-shadow:0 2px 12px #03101d;font-size:10px;letter-spacing:.13em;font-weight:800;text-transform:uppercase}
.v20-scene-legend strong{color:#8cbfd2;font-size:9px;font-weight:700}
.v20-scene-point{--x:50%;--y:50%;position:absolute;z-index:5;left:var(--x);top:var(--y);transform:translate(-50%,-50%);border:0;background:none;color:#fff;cursor:pointer;padding:0;display:flex;align-items:center;gap:9px;font:inherit;transition:filter .25s,transform .25s}
.v20-point-num{width:42px;height:42px;flex:none;display:grid;place-items:center;border:1px solid #abebffb0;border-radius:50%;background:#06273fe0;backdrop-filter:blur(10px);box-shadow:0 0 0 6px #3abef418,0 0 21px #28b2ec66;color:#e6f9ff;font-size:11px;font-weight:850;letter-spacing:.05em;transition:background .2s,border-color .2s}
.v20-point-label{border:1px solid #a4d9ee50;background:#061728e8;padding:9px 12px;white-space:nowrap;font-size:11px;font-weight:750;letter-spacing:.015em;backdrop-filter:blur(10px);box-shadow:0 10px 27px #00101d78}
.v20-scene-point:hover .v20-point-num,.v20-scene-point:focus-visible .v20-point-num,.v20-scene-point[aria-pressed="true"] .v20-point-num{background:#1478ab;border-color:#f0fbff;box-shadow:0 0 0 8px #31c9fa39,0 0 30px #38c7fc}
.v20-scene-point:focus-visible{outline:2px solid #a3e7ff;outline-offset:8px}
.v20-scene-point[aria-pressed="true"] .v20-point-label{border-color:#9ee9ff;background:#104469f0}
.v20-scene-bottom{position:absolute;z-index:3;bottom:18px;left:20px;right:20px;display:flex;justify-content:space-between;gap:20px;color:#d3edf7;text-shadow:0 3px 7px #020a11;font-size:10px;letter-spacing:.045em}
.v20-scene-bottom span:last-child{color:#96c0d2}
.v20-technical-detail{background:rgba(6,25,42,.62);border:1px solid #2c516a;margin-bottom:15px}
.v20-technical-detail>summary{cursor:pointer;padding:16px 20px;color:#b5eaff;font-size:12px;font-weight:800;letter-spacing:.055em}
.v20-technical-detail .v19-technical-desk{margin:0;border-top:1px solid #2d5671}
.v20-cinematic-scene[data-active-stage="1"] .v20-circuit-heat,.v20-cinematic-scene[data-active-stage="2"] .v20-circuit-heat{stroke-opacity:.22}
.v20-cinematic-scene[data-active-stage="3"] .v20-circuit-heat,.v20-cinematic-scene[data-active-stage="4"] .v20-circuit-steam{stroke-width:9}
.ei-motion-off .v20-circuit path{animation:none!important;stroke-dasharray:none}
@media(prefers-reduced-motion:reduce){.v20-circuit path{animation:none!important;stroke-dasharray:none}.v20-cinematic-scene>img{transition:none!important}}
@media(max-width:780px){.v20-scene-point .v20-point-label{display:none}.v20-point-num{height:32px;width:32px;font-size:10px}.v20-scene-legend{top:10px;left:12px;right:12px;font-size:8px}.v20-scene-legend strong{font-size:7px}.v20-scene-bottom{bottom:9px;left:12px;right:12px;font-size:8px}.v20-scene-bottom span:last-child{display:none}.v20-cinematic-scene{margin-top:10px}.v20-technical-detail>summary{padding:13px;font-size:11px}}
''',encoding='utf8')
builder=P/'scripts/build-v19-site.py';bs=builder.read_text()
if 'energy-v20-polish.css' not in bs:
 bs=bs.replace("(ROOT/'assets/css/energy-v19-additions.css').read_text(encoding='utf-8')","(ROOT/'assets/css/energy-v19-additions.css').read_text(encoding='utf-8')+'\\n'+(ROOT/'assets/css/energy-v20-polish.css').read_text(encoding='utf-8')")
 builder.write_text(bs)
js=P/'assets/js/energy-app-v19.mjs';j=js.read_text()
if 'data-plant-focus' not in j:
 j=j.replace("function renderPlant(){const s=state.stage;",'''function renderPlant(){const s=state.stage;
 const scene=$('v20-cinematic-scene');if(scene){scene.dataset.activeStage=String(s);$$('[data-plant-focus]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.plantFocus)===s)));}''',1)
 j=j.replace("$$('[data-stage]').forEach(el=>el.addEventListener('click',()=>{stopTour();state.stage=Number(el.dataset.stage);renderPlant()}));", "$$('[data-stage]').forEach(el=>el.addEventListener('click',()=>{stopTour();state.stage=Number(el.dataset.stage);renderPlant()}));\n $$('[data-plant-focus]').forEach(el=>el.addEventListener('click',()=>{stopTour();state.stage=Number(el.dataset.plantFocus);renderPlant()}));",1)
 js.write_text(j)
print('V20 visual source upgrade prepared')
