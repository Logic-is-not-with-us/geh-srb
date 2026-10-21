#!/usr/bin/env python3
"""GT-01 imagery study. Strictly registered local alterations, not OEM engineering drawings.
Authored as fixed-camera pixel art prototypes; not photographic claims about TE-TO hardware.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, hashlib, json
ROOT=Path(__file__).resolve().parent.parent
base=Image.open(ROOT/'assets/img/geh-ccgt-illustration-v20.webp').convert('RGB')
# Crop already-approved V20 image, limited to one gas turbine and associated generator.
CROP=(0,305,985,815)
reference=base.crop(CROP)
w,h=reference.size
out=ROOT/'assets/img/gt01-pilot';out.mkdir(exist_ok=True,parents=True)
reference.save(out/'gt01-exposed.webp',format='WEBP',lossless=True,method=6)
# Exact pixel registration: all changes are limited to registered equipment area.
# These regions are conceptual graphic covers, NOT real casing geometry.
polygon=[(179,184),(295,170),(443,169),(569,190),(655,259),(667,365),(170,379),(145,321)]
mask=Image.new('L',(w,h),0)
d=ImageDraw.Draw(mask)
d.polygon(polygon,fill=255)
mask=mask.filter(ImageFilter.GaussianBlur(2.5))
# SHELL: an artist-drawn, muted steel acoustic hood (kept within the registered GT footprint).
y,x=np.mgrid[0:h,0:w]
rng=np.random.default_rng(21)
noise=rng.normal(0,2.3,(h,w))
light=14*np.sin((x-170)/620*np.pi)+10*np.cos((y-160)/240*np.pi)
structure=np.clip(78+light+noise,25,180)
shell_arr=np.stack([np.clip(structure*.97,0,255),np.clip(structure*1.12,0,255),np.clip(structure*1.29,0,255)],-1).astype('uint8')
shell=Image.fromarray(shell_arr,'RGB')
sd=ImageDraw.Draw(shell)
sd.rounded_rectangle((177,188,660,358),radius=10,outline=(151,190,212),width=3)
sd.line([(191,202),(645,202)],fill=(194,218,227),width=3)
sd.line([(193,339),(644,339)],fill=(25,53,75),width=5)
for cx in [284,406,530]:
 sd.line([(cx,201),(cx,339)],fill=(40,75,95),width=5)
 sd.line([(cx+5,204),(cx+5,336)],fill=(157,191,205),width=2)
for cx in [235,355,479,594]:
 sd.rectangle((cx-6,218,cx+6,223),fill=(40,63,81))
 sd.line([(cx-3,221),(cx+3,221)],fill=(186,213,225))
sd.line([(179,188),(147,307),(175,363)],fill=(188,214,225),width=4)
sd.line([(641,201),(663,281),(657,358)],fill=(182,208,221),width=4)
shell_img=Image.composite(shell,reference,mask)
shell_img.save(out/'gt01-shell.webp',format='WEBP',lossless=True,method=6)
# INNER: keep same camera and machine housing. Clarify the visible rotor using a
# local detail loupe with translucent peripheral matte, not fabricated internals.
inner=reference.copy()
focus=Image.new('RGBA',(w,h),(0,0,0,0))
fd=ImageDraw.Draw(focus)
# Darken only the pilot's selected machine envelope to make true photo-detail more legible.
fd.rounded_rectangle((186,190,645,355),radius=18,fill=(1,14,25,38),outline=(128,194,219,118),width=3)
# A photographic inset takes pixels from the same reference image.
zoom=reference.crop((259,180,587,347)).resize((432,220),Image.Resampling.LANCZOS)
# Crop to non-overlapping region and paste inside GT focus boundary, preserving camera anchors outside registered mask.
zoom=zoom.resize((386,145),Image.Resampling.LANCZOS)
zoom_rgba=zoom.convert('RGBA')
fd.rounded_rectangle((221,201,607,346),radius=10,fill=(3,25,39,210))
focus.alpha_composite(zoom_rgba,(221,201))
fd=ImageDraw.Draw(focus)
fd.rounded_rectangle((219,199,609,348),radius=11,outline=(135,201,224,190),width=2)
# Mask inner-only edit to same turbine envelope as shell, do not alter other plant equipment.
inner=Image.composite(Image.alpha_composite(reference.convert('RGBA'),focus).convert('RGB'),reference,mask)
inner.save(out/'gt01-inner.webp',format='WEBP',lossless=True,method=6)
# Locked registration QA: every unchanged pixel beyond mask exactly matches Exposed.
refarr=np.asarray(reference).astype(np.int16)
assert reference.size==(985,510)
results={}
for mode in ('shell','exposed','inner'):
 img=Image.open(out/f'gt01-{mode}.webp').convert('RGB')
 diff=np.any(np.asarray(img).astype(np.int16)!=refarr,axis=2)
 outside=(np.asarray(mask)==0)
 changed=int(np.count_nonzero(diff))
 violations=int(np.count_nonzero(diff & outside))
 assert violations==0,(mode,violations)
 results[mode]={'file':f'assets/img/gt01-pilot/gt01-{mode}.webp','changed_pixels':changed,'unchanged_region_pixel_diffs':violations,'dimensions':list(img.size),'bytes':(out/f'gt01-{mode}.webp').stat().st_size,'sha256':hashlib.sha256((out/f'gt01-{mode}.webp').read_bytes()).hexdigest()}
(out/'registration.json').write_text(json.dumps({'source':'V20 conceptual industrial illustration crop x0..985 y305..815','mask':polygon,'source_width':1536,'target_size':[w,h],'status':'PROTOTYPE_ONLY_NO_TE_TO_GEOMETRY_CLAIM','modes':results},indent=2),encoding='utf-8')
print('GT01 images registered: no unchanged-region differences',results)
