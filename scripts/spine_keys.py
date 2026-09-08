"""Generate all Spine vector keys without rerunning image cleanup or assembly."""
import json
from cervical_keys import ROOT, apply_cervical_keys, apply_reference_keys


def apply_spine_keys(exams):
    count = apply_cervical_keys(exams)
    config = json.loads((ROOT / 'scripts/spine-key-geometry.json').read_text())
    for family, label in [('thoracic-spine', 'Thoracic'), ('lumbar-spine', 'Lumbar'), ('sacrum', 'Sacrum')]:
        count += apply_reference_keys(exams, {'keys': [key for key in config['keys'] if key['family'] == family]}, family, label)
    return count


if __name__ == '__main__':
    path = ROOT / 'src/data/spine.json'
    exams = json.loads(path.read_text())
    count = apply_spine_keys(exams)
    path.write_text(json.dumps(exams, indent=2) + '\n')
    print(f'Wrote {count} Spine SVG references; base images and scoring unchanged.')
