#!/usr/bin/env python3
"""Build a focused local Spine review. Writes only review/expansion/spine.
Run: pipeline/.venv/bin/python -B scripts/stage-spine.py
"""
import sys
sys.dont_write_bytecode = True
import importlib.util
import json
from pathlib import Path
import cv2

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'review/expansion/spine'

def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'pipeline' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

clean = load('spine_clean', '03_clean.py')
geo = load('spine_geometry', '02_geometry.py')
# Source inspection: 30,31,33,36,39,40 confirm three-view order.
# Two-picture slides 29,32,34,35,37 show sagittal + coronal, no axial.
# Slide 38's middle image needs instructor plane confirmation.
records = json.loads((ROOT / 'review/expansion/inventory.json').read_text())
OUT.mkdir(parents=True, exist_ok=True)
slides = []
for record in records:
    n = record['slide']
    if not 29 <= n <= 40: continue
    family = ['Cervical', 'Thoracic', 'Lumbar', 'Sacrum'][(n-29)//3]
    item = { 'slide': n, 'family': family, 'target': record['targetPlane'],
             'coverage': record['coverage'], 'views': [], 'notes': [] }
    for i, pic in enumerate(record['pictures']):
        plane = ['sagittal','coronal','axial'][i]
        img = cv2.imread(str(ROOT / 'review/expansion' / pic['preview']))
        cleaned, info = clean.clean_image(img, {})
        original = f'{n}-{plane}-original.png'
        candidate = f'{n}-{plane}-clean.png'
        key = f'{n}-{plane}-source-key.png'
        cv2.imwrite(str(OUT / original), img)
        cv2.imwrite(str(OUT / candidate), cv2.cvtColor(cleaned, cv2.COLOR_BGR2GRAY))
        colored = img.copy()
        colored[clean.yellow_mask(img) > 0] = (128,222,74)
        cv2.imwrite(str(OUT / key), colored)
        notes = []
        answer = None
        if n == 38 and i == 1:
            notes.append('Confirm this image plane: the middle source picture may be axial rather than coronal.')
        elif pic['width'] != pic['height']:
            notes.append('Tall source image preserved without stretching. Geometry needs aspect-ratio handling before app use.')
        else:
            answer = geo.analyze(geo.RAW / pic['source'], 'fov' if plane == item['target'] else 'lines', {})
        if info['method'] == 'none': notes.append('No yellow overlay detected; image retained unchanged.')
        item['views'].append({'plane':plane,'original':original,'clean':candidate,'key':key,
            'source':pic['source'],'sourceSha256':pic['sha256'],'notes':notes,
            'cleaning':info,'provisionalGeometry':answer})
    if len(item['views']) == 2:
        item['notes'].append('The source slide has no axial localizer. No substitute or answer has been invented.')
    slides.append(item)
(OUT / 'manifest.json').write_text(json.dumps({'status':'awaiting-review','orderInspectedSlides':[30,31,33,36,39,40], 'slides':slides},indent=2))
# Inline JSON contains source text, escaped so it cannot close the script tag.
data = json.dumps(slides).replace('<','\\u003c')
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Spine image review</title><style>
*{box-sizing:border-box}body{margin:0;background:#10151d;color:#e4eaf2;font:16px system-ui}main{max-width:1120px;margin:auto;padding:24px}h1{margin:0 0 10px}p{line-height:1.5}.muted{color:#acb7c8}nav{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}button{font:inherit;cursor:pointer;border:1px solid #657084;border-radius:8px;color:inherit;background:#1d2735;padding:12px 18px;min-height:44px}button[aria-pressed=true]{background:#ffd23f;color:#171400}button:focus-visible,a:focus-visible{outline:3px solid #72baff;outline-offset:3px}.note{border-left:4px solid #ffc65a;padding:10px 14px;background:#2b251a}article{border-top:1px solid #344356;padding-top:14px;margin-top:24px}h3{text-transform:capitalize}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;background:#080b10;padding:10px;border-radius:8px}img{display:block;max-width:100%;height:340px;object-fit:contain;margin:auto}figcaption{margin-bottom:8px;color:#bcc8d8}a{color:#9bcaff}details{margin:16px 0}summary{cursor:pointer;padding:10px 0}details img{height:auto;max-height:600px}.footer{display:flex;justify-content:space-between;margin-top:24px}@media(max-width:650px){main{padding:16px}.pair{grid-template-columns:1fr}img{height:auto;max-height:420px}}</style>
<main><h1>Spine image review</h1><p class="muted">Cervical, thoracic, lumbar, and sacrum. One target plane at a time.</p>
<nav id="families" aria-label="Spine region"></nav><nav id="targets" aria-label="Target plane"></nav>
<p>For now, check whether the cleaned images are usable and the anatomy is preserved. Saturation bands stay. Flag an issue by slide number and view.</p>
<div id="content"></div><div class="footer"><button id="previous">Previous</button><button id="next">Next</button></div>
<p class="muted">Local candidates only. No new Spine images are in the simulator yet. All original image corners remain available for review.</p></main>
<script>const slides=DATA;const names=['Cervical','Thoracic','Lumbar','Sacrum'];let selected=0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){const s=slides[selected];document.getElementById('families').innerHTML=names.map(n=>`<button aria-pressed="${s.family===n}" data-family="${n}">${n}</button>`).join('');document.getElementById('targets').innerHTML=slides.map((v,i)=>v.family===s.family?`<button aria-pressed="${i===selected}" data-slide="${i}">${esc(v.target)} target</button>`:'').join('');document.getElementById('content').innerHTML=`<h2>${s.family} / ${s.target} target <small class="muted">(slide ${s.slide})</small></h2>`+s.notes.map(n=>`<p class="note">${esc(n)}</p>`).join('')+s.views.map(v=>`<article><h3>${v.plane} view</h3>${v.notes.map(n=>`<p class="note">${esc(n)}</p>`).join('')}<div class="pair"><figure><figcaption>Original source</figcaption><a href="${v.original}" target="_blank"><img src="${v.original}" alt="Original ${v.plane} view on slide ${s.slide}"></a></figure><figure><figcaption>Cleaned candidate</figcaption><a href="${v.clean}" target="_blank"><img src="${v.clean}" alt="Cleaned ${v.plane} candidate on slide ${s.slide}"></a></figure></div><details><summary>Coverage instruction and source markings</summary><p>${esc(s.coverage[v.plane])}</p><p class="muted">Original yellow pixels recolored green for comparison. This is not an approved extracted answer key.</p><a href="${v.key}" target="_blank"><img src="${v.key}" alt="Source markings recolored green"></a></details></article>`).join('');document.getElementById('previous').disabled=selected===0;document.getElementById('next').disabled=selected===slides.length-1;}
document.getElementById('families').onclick=e=>{const b=e.target.closest('button');if(b){selected=slides.findIndex(s=>s.family===b.dataset.family);render()}};
document.getElementById('targets').onclick=e=>{const b=e.target.closest('button');if(b){selected=Number(b.dataset.slide);render()}};
document.getElementById('previous').onclick=()=>{selected--;render();window.scrollTo(0,0)};document.getElementById('next').onclick=()=>{selected++;render();window.scrollTo(0,0)};render();</script></html>'''.replace('DATA',data)
(OUT / 'index.html').write_text(page)
print(f'Spine review: {len(slides)} slides, {sum(len(s["views"]) for s in slides)} images. {OUT / "index.html"}')
