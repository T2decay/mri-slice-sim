#!/usr/bin/env python3
"""01_extract.py — parse pptx slides into a manifest.

For each slide in SLIDE_RANGE: title, subtitle, the 3-row coverage table,
and the three <p:pic> images sorted by x-offset (left→right on the slide,
mapped to sagittal/coronal/axial). Emits out/manifest.json.
"""
import json
import re
import sys
from pathlib import Path

from defusedxml import ElementTree as ET

ROOT = Path(__file__).parent
RAW = ROOT / "pptx_raw"
OUT = ROOT / "out"

SLIDE_RANGE = range(2, 16)  # Brain family: slides 2–15
PLANES = ["sagittal", "coronal", "axial"]

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def shape_text(el):
    return " ".join(t.text or "" for t in el.iter(f"{{{NS['a']}}}t")).strip()


def parse_slide(n):
    tree = ET.parse(RAW / "ppt" / "slides" / f"slide{n}.xml")
    root = tree.getroot()

    # relationship id -> media path
    rels = ET.parse(RAW / "ppt" / "slides" / "_rels" / f"slide{n}.xml.rels").getroot()
    rel_map = {
        r.get("Id"): r.get("Target").replace("../", "ppt/")
        for r in rels
    }

    # table: rows of (plane label, coverage text)
    coverage = {}
    tbl = root.find(f".//{{{NS['a']}}}tbl")
    if tbl is not None:
        for tr in tbl.findall(f"{{{NS['a']}}}tr"):
            cells = [shape_text(tc) for tc in tr.findall(f"{{{NS['a']}}}tc")]
            if len(cells) >= 2:
                key = cells[0].strip().lower()
                if key in PLANES:
                    coverage[key] = cells[1].strip()

    # title/subtitle: non-table text shapes, in document order.
    # Prefer placeholder types; fall back to order (title first, subtitle second).
    title, subtitle = None, None
    others = []
    for sp in root.iter(f"{{{NS['p']}}}sp"):
        txt = shape_text(sp)
        if not txt:
            continue
        ph = sp.find(f".//{{{NS['p']}}}ph")
        ph_type = ph.get("type") if ph is not None else None
        if ph_type in ("title", "ctrTitle"):
            title = txt
        elif ph_type in ("subTitle", "body"):
            subtitle = subtitle or txt
        else:
            others.append(txt)
    if title is None and others:
        title = others.pop(0)
    if subtitle is None and others:
        subtitle = others.pop(0)

    # pics sorted by x offset
    pics = []
    for pic in root.iter(f"{{{NS['p']}}}pic"):
        off = pic.find(f".//{{{NS['a']}}}off")
        blip = pic.find(f".//{{{NS['a']}}}blip")
        rid = blip.get(f"{{{NS['r']}}}embed")
        pics.append((int(off.get("x")), rel_map[rid]))
    pics.sort()

    if len(pics) != 3:
        print(f"  WARN slide {n}: {len(pics)} pics (expected 3)", file=sys.stderr)

    images = {plane: path for plane, (_, path) in zip(PLANES, pics)}

    return {
        "slide": n,
        "title": title,
        "subtitle": subtitle,
        "coverage": coverage,
        "images": images,
    }


def main():
    OUT.mkdir(exist_ok=True)
    manifest = [parse_slide(n) for n in SLIDE_RANGE]
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    for s in manifest:
        missing = [p for p in PLANES if p not in s["coverage"]]
        flag = f"  MISSING coverage: {missing}" if missing else ""
        print(f"slide {s['slide']:2d}  {s['title']} — {s['subtitle']}{flag}")
    print(f"\nWrote {OUT/'manifest.json'} ({len(manifest)} slides)")


if __name__ == "__main__":
    main()
