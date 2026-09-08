"""Reproducible, visual-only Cervical reference SVGs; never edits base MRI images."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def apply_reference_keys(exams, config, prefix, label):
    by_id = {exam['id']: exam for exam in exams}
    for key in config['keys']:
        ident = prefix + '-' + key['target']
        view = by_id[ident]['views'][key['plane']]
        assert view['image'] and not view.get('substitution')
        assert view['answer'] is None
        if key['kind'] == 'fov':
            shape = f'<rect x="{-key["width"]/2}" y="{-key["height"]/2}" width="{key["width"]}" height="{key["height"]}"/>'
        else:
            shape = '\n'.join(f'<line x1="{-key["length"]/2}" x2="{key["length"]/2}" y1="{key["extent"]*(i/4-0.5)}" y2="{key["extent"]*(i/4-0.5)}"/>' for i in range(5))
        clip = key.get('clip')
        clip_def = (f'<defs><clipPath id="crop"><rect x="{clip[0]}" y="{clip[1]}" width="{clip[2]}" height="{clip[3]}"/></clipPath></defs><g clip-path="url(#crop)">' if clip else '')
        clip_end = '</g>' if clip else ''
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<title>{label} {key['target']} planning reference on {key['plane']} localizer</title>
<desc>Visual tracing of slide {key['slide']}; simplified planning geometry pending instructor review.</desc>
{clip_def}<g fill="none" stroke="#4ade80" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" transform="translate({key['cx']} {key['cy']}) rotate({key['angle']})">
{shape}
</g>{clip_end}
</svg>
'''
        relative = f'images/{ident}/{key["plane"]}-reference.svg'
        (ROOT / 'public' / relative).write_text(svg)
        view['referenceImage'] = relative
    return len(config['keys'])

def apply_cervical_keys(exams):
    config = json.loads((ROOT / 'scripts/cervical-key-geometry.json').read_text())
    return apply_reference_keys(exams, config, 'cervical-spine', 'Cervical')

if __name__ == '__main__':
    path = ROOT / 'src/data/spine.json'
    exams = json.loads(path.read_text())
    count = apply_cervical_keys(exams)
    path.write_text(json.dumps(exams, indent=2) + '\n')
    print(f'Wrote {count} Cervical SVG references. Base images unchanged; scoring remains disabled.')
