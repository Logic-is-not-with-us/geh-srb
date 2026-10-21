import asyncio, base64, json, re, sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
MODEL=(ROOT/'assets/js/energy-model-v18.mjs').read_text().replace('export const ','const ').replace('export function ','function ')
APP=(ROOT/'assets/js/energy-app-v19.mjs').read_text()
APP=re.sub(r'^import .*?;\s*','',APP,flags=re.M)
BUNDLE=MODEL+'\n'+APP.replace("const target=new URL('../data/energy/'+file,window.location.href);","const target={href:'https://geh-preview.invalid/data/energy/'+file};")
CSS=(ROOT/'assets/css/energy-v19.css').read_text()
SNAP=json.loads((ROOT/'data/energy/demo-24h.json').read_text())
IMG=(ROOT/'assets/img/geh-ccgt-illustration-v20.webp').read_bytes()
LOGO=(ROOT/'assets/img/geh-teto.png').read_bytes()

async def scenario(browser,lang,width):
    context=await browser.new_context(viewport={'width':width,'height':990},reduced_motion='reduce')
    page=await context.new_page()
    errors=[]
    page.on('pageerror', lambda err:errors.append(str(err)))
    page.on('console', lambda msg: errors.append('console '+msg.text) if msg.type=='error' else None)
    html=(ROOT/lang/'energetski-monitor.html').read_text()
    html=re.sub(r'<link[^>]+energy-v19\.css[^>]*>',lambda m:'<style>'+CSS+'</style>',html)
    html=re.sub(r'<script[^>]+energy-app-v19\.mjs[^>]*></script>','',html)
    html=re.sub(r'<video\b.*?</video>','<div id="ei-hero-video"></div>',html, flags=re.S) # mock video methods injected before bundle
    html=html.replace('../assets/img/geh-ccgt-illustration-v20.webp','data:image/webp;base64,'+base64.b64encode(IMG).decode())
    html=html.replace('../assets/img/geh-teto.png','data:image/png;base64,'+base64.b64encode(LOGO).decode())
    # origin about:blank; avoid external requests; the model's URL request is mocked
    await page.set_content(html,wait_until='domcontentloaded')
    await page.evaluate('''(snapshot)=>{
      window.fetch=async()=>({ok:true,json:async()=>snapshot});
      const v=document.getElementById('ei-hero-video');
      if(v){v.pause=()=>{};v.play=async()=>{};Object.defineProperty(v,'paused',{get:()=>true});}
    }''',SNAP)
    await page.add_script_tag(content=BUNDLE)
    await page.wait_for_timeout(150)
    await page.locator('[data-tab="flow"]').click()
    await page.wait_for_timeout(100)
    flow=await page.locator('.v21-flow-node').count()
    if flow!=7:raise Exception('flow nodes: '+str(flow))
    await page.locator('[data-fuel="solar"]').click()
    zero = await page.locator('#ei-flow-value').inner_text()
    if zero != '0':raise Exception('observed 0 MW incorrectly rendered: '+zero)
    await page.locator('[data-fuel="other"]').click()
    missing = await page.locator('#ei-flow-value').inner_text()
    if missing == '0':raise Exception('missing series confused with 0')
    await page.locator('[data-fuel="hydro"]').click()
    await page.wait_for_timeout(60)
    selected=await page.locator('#ei-flow-title').inner_text()
    if not selected:raise Exception('empty selected source')
    await page.locator('[data-tab="grid"]').click()
    await page.wait_for_timeout(80)
    count=await page.locator('.v22-border-row').count()
    if count!=8:raise Exception('border rows '+str(count))
    await page.locator('[data-v22-filter="in"]').click()
    imported=await page.locator('.v22-border-row').count()
    await page.locator('[data-v22-filter="all"]').click()
    await page.locator('[data-v22-border="RO"]').click()
    val=await page.locator('#ei-border-name').inner_text()
    if not val:raise Exception('border inspector failed')
    await page.locator('[data-tab="plant"]').click()
    await page.wait_for_timeout(80)
    controls=await page.locator('[data-plant-focus]').count()
    if controls!=5:raise Exception('expected 5 hotspots: '+str(controls))
    await page.locator('[data-v22-stage="3"]').click()
    stage=await page.locator('#ei-stage-index').inner_text()
    if stage!='04 / 05':raise Exception('stage focus '+stage)
    pagewidth=await page.evaluate('document.documentElement.scrollWidth')
    if pagewidth>width+2: raise Exception('overflow '+str(pagewidth)+' > '+str(width))
    if errors:raise Exception('JS errors '+str(errors[:3]))
    if lang=='sr-lat' and width in [390,1440]:
        await page.screenshot(path=str(ROOT/f'qa_v22_plant_{width}.png'),full_page=False)
        await page.locator('[data-tab="grid"]').click()
        await page.screenshot(path=str(ROOT/f'qa_v22_grid_{width}.png'),full_page=False)
        await page.locator('[data-tab="flow"]').click()
        await page.screenshot(path=str(ROOT/f'qa_v22_flow_{width}.png'),full_page=False)
    await context.close()
    return f'{lang} {width}: flow={flow} borders={count} in={imported} hotspots={controls}, selected={selected}, viewport={pagewidth}'

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],headless=True)
        for lang in ['sr-lat','sr-cyr','en','ru']:
            for width in [320,390,768,1440,1920]:
                print(await scenario(browser,lang,width),flush=True)
        await browser.close()

asyncio.run(main())
