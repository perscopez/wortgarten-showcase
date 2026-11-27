#!/usr/bin/env python3
"""Render labeled contact sheets for the curated, pinned illustration archives."""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs'/'contact-sheets'
MANIFEST=ROOT/'lib/reviewed-art.json'
CELL_W,CELL_H=190,145
COLS=5

def sheet(archive):
    data=json.loads(MANIFEST.read_text())
    assets=[x for x in data['reviewedAssets'] if x['archive']==archive]
    rows=math.ceil(len(assets)/COLS)
    im=Image.new('RGB',(COLS*CELL_W,rows*CELL_H),'white')
    draw=ImageDraw.Draw(im)
    font=ImageFont.load_default()
    for i,item in enumerate(assets):
        x=(i%COLS)*CELL_W;y=(i//COLS)*CELL_H
        art=Image.open(ROOT/'public'/item['path'].lstrip('/')).convert('RGBA')
        art.thumbnail((92,92))
        im.paste(art,(x+(CELL_W-art.width)//2,y+5),art)
        label=item['conceptId']
        word=item['word']
        draw.text((x+5,y+101),f"{i+1:02d} {label}",fill='black',font=font)
        draw.text((x+5,y+119),word,fill='black',font=font)
    path=OUT/f'{archive}-contact-sheet.png'
    path.parent.mkdir(parents=True,exist_ok=True)
    im.save(path)
    print(f'{path} ({len(assets)} icons; {im.width}x{im.height})')

for archive in ('openmoji','twemoji'): sheet(archive)
