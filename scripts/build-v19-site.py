#!/usr/bin/env python3
"""Deterministic source build. Uses Python standard library only.
V18 base CSS plus V19 refinements are compiled into one monitor stylesheet;
all four language pages are rebuilt from a single authored template.
"""
from pathlib import Path
import subprocess,sys
ROOT=Path(__file__).resolve().parent.parent
css=(ROOT/'assets/css/energy-v18.css').read_text(encoding='utf-8')+'\n'+(ROOT/'assets/css/energy-v19-additions.css').read_text(encoding='utf-8')+'\n'+(ROOT/'assets/css/energy-v20-polish.css').read_text(encoding='utf-8')+'\n'+(ROOT/'assets/css/energy-v22-polish.css').read_text(encoding='utf-8')
(ROOT/'assets/css/energy-v19.css').write_text(css,encoding='utf-8')
subprocess.run([sys.executable,str(ROOT/'scripts/build-v19-pages.py')],check=True)
for lang in ('sr-lat','sr-cyr','en','ru'):
    html=(ROOT/lang/'energetski-monitor.html').read_text(encoding='utf-8')
    for required in ('energy-v19.css','energy-app-v19.mjs','id="v19-machine-drawing"','id="v19-map-data"','id="v19-compare-mode"'):
        if required not in html: raise SystemExit(f'{lang}: missing {required}')
    if 'undefined' in html or '<div class="ei-machine-art">None</div>' in html:
        raise SystemExit(f'{lang}: invalid generated source')
print('PASS V19 source rebuild: four languages and single monitor stylesheet')
