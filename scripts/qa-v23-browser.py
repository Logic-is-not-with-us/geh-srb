#!/usr/bin/env python3
"""Real Chromium interaction QA using in-memory loaded authored HTML and assets.
No claims about localhost/GitHub; sandbox blocks network/file navigation.
"""
import asyncio, base64, json, pathlib, traceback
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=ROOT/'qa_v23';OUT.mkdir(exist_ok=True)
CSS=(ROOT/'assets/css/energy-v19.css').read_text()+(ROOT/'assets/css/te-to-gt01-pilot.css').read_text()
SCRIPT=(ROOT/'assets/js/te-to-gt01-pilot.mjs').read_text()
for mode in ['shell','exposed','inner']:
 target=f'../assets/img/gt01-pilot/gt01-{mode}.webp'
 data='data:image/webp;base64,'+base64.b64encode((ROOT/'assets/img/gt01-pilot'/f'gt01-{mode}.webp').read_bytes()).decode()
 SCRIPT=SCRIPT.replace(target,data)
async def main():
 summaries=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for lang,width in [('sr-lat',1440),('sr-lat',390),('sr-cyr',1440),('en',1440),('ru',1440)]:
   page=await browser.new_page(viewport={'width':width,'height':950},device_scale_factor=1)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   html=(ROOT/lang/'energetski-monitor.html').read_text()
   html=html.replace('<link rel="preload" href="../assets/video/geh-energy-film-poster.jpg" as="image">','')
   html=html.replace('<link rel="stylesheet" href="../assets/css/energy-v19.css">','').replace('<link rel="stylesheet" href="../assets/css/te-to-gt01-pilot.css">','')
   html=html.replace('<script type="module" src="../assets/js/energy-app-v19.mjs"></script>','').replace('<script type="module" src="../assets/js/te-to-gt01-pilot.mjs"></script>','')
   html=html.replace('id="pane-plant" hidden','id="pane-plant"')
   html=html.replace('</head>',f'<style>{CSS}\n#pane-plant>.ei-plant-layout{{display:none!important}}\nbody{{overflow-x:hidden}}.ei-nav{{visibility:hidden!important}}</style></head>')
   await page.set_content(html,wait_until='load',timeout=30000)
   await page.evaluate(SCRIPT)
   root=page.locator('#v23-gt01-pilot')
   await root.wait_for()
   assert await root.locator('[data-photo="exposed"]').evaluate('(el)=>el.complete && el.naturalWidth===985'), 'exposed not loaded'
   await root.locator('[data-mode="shell"]').click()
   assert await root.get_attribute('data-mode')=='shell'
   assert await root.locator('[data-photo="shell"]').get_attribute('aria-hidden')=='false'
   await root.locator('[data-mode="inner"]').click()
   assert await root.get_attribute('data-mode')=='inner'
   await root.locator('[data-part="0"]').click()
   assert await root.locator('[data-part="0"]').get_attribute('aria-pressed')=='true'
   await root.locator('[data-route="power"]').click()
   assert await root.get_attribute('data-route')=='power'
   await root.locator('[data-motion]').click()
   assert await root.get_attribute('data-motion')=='false'
   await root.locator('[data-reset]').click()
   assert await root.get_attribute('data-mode')=='exposed'
   assert await root.get_attribute('data-route')=='heat'
   for mode in ['shell','exposed','inner']:
    await root.locator(f'[data-mode="{mode}"]').click()
    if lang=='sr-lat':
     await page.wait_for_timeout(430)
     await root.screenshot(path=str(OUT/f'gt01_{mode}_{width}.png'),timeout=30000)
   # real viewport overflow test; root only, older generated page also present but hidden.
   overflow=await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
   assert not overflow, (lang,width,'horizontal overflow')
   assert not errors,(lang,width,errors)
   summaries.append({'language':lang,'width':width,'shell_exposed_inner':'PASS','hotspots':'PASS','routes':'PASS','motion_pause':'PASS','reset':'PASS','image_loaded':'PASS','no_horizontal_overflow':True,'js_errors':errors})
   await page.close()
  await browser.close()
 (OUT/'browser_results.json').write_text(json.dumps(summaries,indent=2,ensure_ascii=False))
 print('PASS V23 Chromium QA:',json.dumps(summaries,ensure_ascii=False))
asyncio.run(main())
