"""Build a local-only visual review page from the saved geometry and source assets."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
config = json.loads((ROOT/'scripts/spine-key-geometry.json').read_text())
parts = ['''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Spine key cleanup review</title><style>
body{font:16px system-ui;background:#111720;color:#e8eef5;margin:24px}h1{font-size:26px}h2{font-size:20px;margin-top:36px}p{max-width:1000px;color:#b8c5d2}.row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;max-width:1536px}figure{margin:0}figcaption{background:#202c3a;padding:8px}.scan{position:relative;aspect-ratio:1;background:black}.scan img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}a{color:#6fe9b0}nav{display:flex;gap:20px;flex-wrap:wrap}@media(max-width:500px){.row{grid-template-columns:1fr}}</style>
<h1>Spine key cleanup — review</h1><p>Thoracic, Lumbar, and Sacrum: original yellow markings, previous green overlay, and proposed clean key. Base images and white saturation bands are unchanged. Five evenly spaced lines illustrate each cross-plane stack; they do not specify a slice count. Borrowed localizers retain no key from another exercise. Numerical scoring remains disabled.</p>
<nav><a href="#thoracic-spine">Thoracic</a><a href="#lumbar-spine">Lumbar</a><a href="#sacrum">Sacrum</a><a href="/">Simulator</a></nav>''']
last = None
for key in config['keys']:
    family, target, plane = key['family'], key['target'], key['plane']
    label = family.replace('-', ' ').title()
    if family != last:
        parts.append(f'<h2 id="{family}">{label}</h2>')
        last = family
    stem = f'/images/{family}-{target}/{plane}'
    parts.append(f'<section><h2>{label} {target} · {plane} view · slide {key["slide"]}</h2>')
    if key.get('note'):
        parts.append(f'<p>{html.escape(key["note"])}</p>')
    parts.append('<div class="row">')
    for title, base, overlay in [('Original', f'/review/expansion/spine/{key["slide"]}-{plane}-original.png', None), ('Before', stem+'.png', stem+'-reference.png'), ('Proposed', stem+'.png', stem+'-reference.svg')]:
        parts.append(f'<figure><figcaption>{title}</figcaption><div class="scan"><img alt="{title} {family} {target} {plane}" src="{base}">')
        if overlay:
            parts.append(f'<img alt="{title} key {family} {target} {plane}" src="{overlay}">')
        parts.append('</div></figure>')
    parts.append('</div></section>')
parts.append('</html>')
path = ROOT/'review/spine-keys.html'
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text('\n'.join(parts))
print('Review: http://127.0.0.1:5174/review/spine-keys.html')
