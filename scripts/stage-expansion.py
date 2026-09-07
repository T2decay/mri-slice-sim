#!/usr/bin/env python3
"""Inventory slides 16-103 and stage local review material; never publish assets.

Usage: pipeline/.venv/bin/python -B scripts/stage-expansion.py [--candidates]
The candidate pass requires review/order-check.json with five inspected slides.
All outputs live under ignored review/expansion; pipeline is imported read-only.
"""
import argparse
import hashlib
import html
import importlib.util
import json
from pathlib import Path
import posixpath
import sys
import zipfile

sys.dont_write_bytecode = True
import cv2
import numpy as np
from defusedxml import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'review' / 'expansion'
PLANES = ['sagittal', 'coronal', 'axial']
NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'pipeline' / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def region(n):
    if n <= 22: return 'Vascular'
    if 29 <= n <= 40: return 'Spine'
    if 73 <= n <= 99 or n >= 102: return 'MSK'
    return 'Body'

def text(el):
    return ' '.join(t.text or '' for t in el.iter(f"{{{NS['a']}}}t")).strip()

def inventory(deck):
    records = []
    for n in range(16, 104):
        base = f'ppt/slides/slide{n}.xml'
        slide = ET.fromstring(deck.read(base))
        rels = ET.fromstring(deck.read(f'ppt/slides/_rels/slide{n}.xml.rels'))
        relmap = {r.get('Id'): posixpath.normpath(posixpath.join('ppt/slides', r.get('Target'))) for r in rels if r.get('TargetMode') != 'External'}
        shapes = [text(sp) for sp in slide.findall('.//p:sp', NS) if text(sp)]
        title, subtitle = shapes[:2]
        coverage = {}
        for row in slide.findall('.//a:tbl/a:tr', NS):
            cells = [text(cell) for cell in row.findall('a:tc', NS)]
            if len(cells) >= 2 and cells[0].lower() in PLANES:
                coverage[cells[0].lower()] = cells[1]
        pics = []
        for pic in slide.findall('.//p:pic', NS):
            off, ext = pic.find('.//a:off', NS), pic.find('.//a:ext', NS)
            blip = pic.find('.//a:blip', NS)
            source = relmap[blip.get(f"{{{NS['r']}}}embed")]
            transform = pic.find('.//a:xfrm', NS)
            pics.append({'source': source, 'x': int(off.get('x')), 'y': int(off.get('y')),
                         'widthEmu': int(ext.get('cx')), 'heightEmu': int(ext.get('cy')),
                         'transform': dict(transform.attrib) if transform is not None else {},
                         'cropped': any(int(v) != 0 for v in (pic.find('.//a:srcRect', NS).attrib.values() if pic.find('.//a:srcRect', NS) is not None else []))})
        pics.sort(key=lambda item: (item['x'], item['y']))
        flags = []
        if len(pics) != 3: flags.append(f'{len(pics)} pictures: manual plane mapping required')
        if any(p['cropped'] or p['transform'] for p in pics): flags.append('picture crop or transform: inspect source layout')
        if not all(coverage.get(p) for p in PLANES): flags.append('incomplete coverage text')
        target = subtitle.split()[0].lower()
        if target not in PLANES: flags.append('target plane unresolved')
        for i, pic in enumerate(pics):
            data = deck.read(pic['source'])
            image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
            pic['width'], pic['height'] = image.shape[1], image.shape[0]
            pic['sha256'] = hashlib.sha256(data).hexdigest()
            pic['preview'] = f'original/slide{n:03d}-slot{i + 1}.png'
            cv2.imwrite(str(OUT / pic['preview']), image)
            if image.shape[0] != image.shape[1]: flags.append(f'slot {i+1}: non-square image requires aspect-aware geometry')
        records.append({'slide': n, 'region': region(n), 'title': title, 'subtitle': subtitle,
                        'targetPlane': target, 'coverage': coverage, 'pictures': pics,
                        'flags': flags, 'status': 'awaiting-review'})
    return records

def candidate_pass(records):
    evidence_file = OUT / 'order-check.json'
    if not evidence_file.exists(): raise SystemExit('Inspect five source layouts and write order-check.json before candidate processing.')
    evidence = json.loads(evidence_file.read_text())
    if len(set(evidence.get('slides', []))) < 5 or evidence.get('result') != 'sagittal-coronal-axial':
        raise SystemExit('Five-slide order evidence is incomplete.')
    geo = load('expansion_geometry', '02_geometry.py')
    clean = load('expansion_clean', '03_clean.py')
    sheet = load('expansion_sheet', '04_contact_sheet.py')
    for record in records:
        if record['flags'] or record['region'] not in evidence.get('regions', []): continue
        for plane, pic in zip(PLANES, record['pictures']):
            img = cv2.imread(str(OUT / pic['preview']))
            expected = 'fov' if plane == record['targetPlane'] else 'lines'
            try:
                result = geo.analyze(geo.RAW / pic['source'], expected, {})
                output, report = clean.clean_image(img, {})
                # White saturation bands stay. No white-pixel inpainting.
                output = cv2.cvtColor(output, cv2.COLOR_BGR2GRAY)
                scale = min(1, 800 / max(output.shape))
                if scale < 1: output = cv2.resize(output, (round(output.shape[1]*scale), round(output.shape[0]*scale)))
                pic['candidate'] = f'clean/slide{record["slide"]:03d}-{plane}.png'
                cv2.imwrite(str(OUT / pic['candidate']), output)
                pic['geometry'], pic['cleaning'] = result, report
                pic['provisionalPlane'] = plane
                if result.get('confidence', 0) < .6: record['flags'].append(f'{plane}: low-confidence geometry')
                if report['method'] == 'none': record['flags'].append(f'{plane}: overlay absent or not yellow; retained unchanged')
                pic['keyPreview'] = f'keys/slide{record["slide"]:03d}-{plane}.png'
                cv2.imwrite(str(OUT / pic['keyPreview']), sheet.draw_geometry(img.copy(), result))
            except Exception as error:
                record['flags'].append(f'{plane}: candidate failed: {type(error).__name__}: {error}')

def contact_sheets(records):
    sheet = load('expansion_contact_sheet', '04_contact_sheet.py')
    tiles = []
    for record in records:
        for pic in record['pictures']:
            if 'candidate' not in pic: continue
            before = cv2.imread(str(OUT / pic['keyPreview']))
            after = cv2.imread(str(OUT / pic['candidate']))
            label = f"s{record['slide']} {pic['provisionalPlane']} conf={pic['geometry'].get('confidence', 0):.2f} {pic['cleaning']['method']}"
            tiles.append(sheet.tile(before, after, label, bool(record['flags'])))
    if not tiles: return []
    width = max(t.shape[1] for t in tiles)
    tiles = [np.pad(t, ((0, 0), (0, width-t.shape[1]), (0, 0)), constant_values=15) for t in tiles]
    names = []
    for start in range(0, len(tiles), 12):
        chunk = tiles[start:start+12]
        chunk += [np.full_like(tiles[0], 15)] * ((-len(chunk)) % 3)
        page = np.vstack([np.hstack(chunk[i:i+3]) for i in range(0, len(chunk), 3)])
        name = f"sheets/body-{start//12+1:02d}.png"
        cv2.imwrite(str(OUT / name), page)
        names.append(name)
    return names

def write_review(records):
    esc = html.escape
    parts = ['<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Expansion image review</title>',
             '<style>body{background:#11151c;color:#e8ecf1;font:16px system-ui;margin:24px}a{color:#9ccaff}header{position:sticky;top:0;background:#11151c;padding:12px;z-index:2}section{border-top:1px solid #536078;padding:16px 0}img{max-width:100%;width:260px;object-fit:contain;background:black}figure{margin:8px;display:inline-block;vertical-align:top}figcaption{max-width:260px;font-size:13px}summary{cursor:pointer}.flag{color:#ffc46b}.pictures{display:flex;flex-wrap:wrap;gap:16px}</style>',
             '<header><h1>Remaining exam regions: local review</h1><p>All candidates are unapproved. Check plane identity, anatomy, green geometry, cleaning, and all image corners. Saturation bands remain.</p><nav>' + ' '.join(f'<a href="#{r}">{r}</a>' for r in ['Vascular','Spine','Body','MSK']) + '</nav></header>']
    sheets = contact_sheets(records)
    parts.append('<p>Body contact sheets: ' + ' '.join(f'<a href="{name}">{i+1}</a>' for i, name in enumerate(sheets)) + '</p>')
    for r in ['Vascular', 'Spine', 'Body', 'MSK']:
        parts.append(f'<h2 id="{r}">{r}</h2>')
        for rec in [s for s in records if s['region'] == r]:
            parts.append(f'<section id="slide-{rec["slide"]}"><h3>Slide {rec["slide"]}: {esc(rec["title"])} / {esc(rec["subtitle"])}</h3>')
            parts.append('<p class="flag">' + esc('; '.join(rec['flags']) or 'Candidate geometry requires instructor review') + '</p><div class="pictures">')
            for i, pic in enumerate(rec['pictures']):
                parts.append('<div>')
                for key, label in [('preview','Original'), ('keyPreview','Provisional green key'), ('candidate','Clean candidate')]:
                    if key in pic:
                        parts.append(f'<figure><a href="{pic[key]}"><img loading="lazy" src="{pic[key]}" alt="Slide {rec["slide"]}, slot {i+1}, {label}"></a><figcaption>Slot {i+1}: {label}; {esc(pic.get("provisionalPlane", "plane unconfirmed"))}</figcaption></figure>')
                parts.append('</div>')
            parts.append('</div><details><summary>Source coverage and layout</summary>')
            parts.extend(f'<p><b>{p}:</b> {esc(rec["coverage"].get(p,"Missing"))}</p>' for p in PLANES)
            parts.append('<p>Picture positions, sizes, transformations, and source hashes are in inventory.json. Left-to-right order alone is provisional.</p></details></section>')
    (OUT / 'index.html').write_text('\n'.join(parts))
    (OUT / 'inventory.json').write_text(json.dumps(records, indent=2))
    lines = ['# Expansion inventory', '', 'All entries await image and reference review. No live assets changed.', '', '| Region | Slides | Pictures | Slides flagged |', '|---|---:|---:|---:|']
    for r in ['Vascular','Spine','Body','MSK']:
        items = [s for s in records if s['region'] == r]
        lines.append(f'| {r} | {len(items)} | {sum(len(s["pictures"]) for s in items)} | {sum(bool(s["flags"]) for s in items)} |')
    lines += ['', '| Slide | Exam / sequence | Review notes |', '|---|---|---|']
    lines.extend(f'| {s["slide"]} | {s["title"]} / {s["subtitle"]} | {"; ".join(s["flags"]) or "Awaiting visual review"} |' for s in records)
    (OUT / 'INVENTORY.md').write_text('\n'.join(lines)+'\n')
    print(f'{len(records)} slides; {sum(len(s["pictures"]) for s in records)} pictures; {sum(bool(s["flags"]) for s in records)} flagged slides. Review: {OUT / "index.html"}')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidates', action='store_true')
    args = parser.parse_args()
    for directory in ['original','clean','keys','sheets']: (OUT / directory).mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ROOT / 'MRI PlanningGuide.pptx') as deck: records = inventory(deck)
    if args.candidates: candidate_pass(records)
    write_review(records)

if __name__ == '__main__': main()
