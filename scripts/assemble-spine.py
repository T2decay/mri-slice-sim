#!/usr/bin/env python3
"""Promote the reviewed Spine candidates without rerunning the Brain pipeline.
Creates source-reference exercises, not numerical keys inferred from uncertain geometry.
"""
import hashlib, json, shutil
from pathlib import Path
import cv2
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
REVIEW=ROOT/'review/expansion/spine'
slides=json.loads((REVIEW/'manifest.json').read_text())['slides']
exams=[]; provenance=[]
for slide in slides:
    family=slide['family'] + (' Spine' if slide['family']!='Sacrum' else '')
    ident=family.lower().replace(' ','-')+'-'+slide['target']
    folder=ROOT/'public/images'/ident; folder.mkdir(parents=True,exist_ok=True)
    views={p:{'image':None,'answer':None,'unavailableReason':'This source slide does not include this localizer.'} for p in ['sagittal','coronal','axial']}
    for view in slide['views']:
        plane=view['plane']; original=cv2.imread(str(REVIEW/view['original']))
        cleaned=cv2.imread(str(REVIEW/view['clean']))
        b,g,r=cv2.split(original.astype(np.int16)); mask=((r-b>8)&(g-b>8)).astype(np.uint8)*255
        reference=np.zeros((*mask.shape,4),dtype=np.uint8);reference[:,:,:3]=(128,222,74);reference[:,:,3]=mask
        h,w=mask.shape; side=max(h,w);left=(side-w)//2;top=(side-h)//2
        clean_square=np.zeros((side,side,3),np.uint8);clean_square[top:top+h,left:left+w]=cleaned
        key_square=np.zeros((side,side,4),np.uint8);key_square[top:top+h,left:left+w]=reference
        for name,img in [(plane+'.png',clean_square),(plane+'-reference.png',key_square)]:
            dest=folder/name
            success,buf=cv2.imencode('.png',img)
            if not success: raise ValueError('PNG encoding failed')
            data=buf.tobytes()
            if dest.exists() and dest.read_bytes()!=data: raise RuntimeError(f'Refusing to overwrite changed asset: {dest}')
            dest.write_bytes(data)
        entry={'image':f'images/{ident}/{plane}.png','answer':None,'referenceImage':f'images/{ident}/{plane}-reference.png'}
        if slide['slide']==38 and plane=='coronal':
            views[plane]['unavailableReason']='The plane of the middle source image needs instructor confirmation.'
        else: views[plane]=entry
        provenance.append({'slide':slide['slide'],'plane':plane,'source':view['source'],'sourceSha256':view['sourceSha256'],'reviewedCandidate':view['clean'],'candidateSha256':hashlib.sha256((REVIEW/view['clean']).read_bytes()).hexdigest(),'output':entry['image'],'padding':{'left':left,'top':top,'squareSize':side},'usedInExercise':not(slide['slide']==38 and plane=='coronal')})
    exams.append({'id':ident,'exam':family,'region':'Spine','landmark':{'Cervical':'Center at C4','Thoracic':None,'Lumbar':'Center at L3','Sacrum':'Center at ASIS'}[slide['family']], 'targetPlane':slide['target'],'sequenceNote':slide['target'].capitalize(),'coverage':slide['coverage'],'views':views,'referenceMode':'source','sourceSlide':slide['slide']})
(ROOT/'src/data/spine.json').write_text(json.dumps(exams,indent=2)+'\n')
(ROOT/'docs/spine-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
print(f'Assembled {len(exams)} Spine exercises; {len(provenance)} preserved source images, {sum(v["image"] is not None for e in exams for v in e["views"].values())} usable views.')
