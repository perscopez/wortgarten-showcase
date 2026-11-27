#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.resolve(root,'outputs','teaching-scene-contact-sheets');fs.mkdirSync(out,{recursive:true});
const allData=JSON.parse(fs.readFileSync(path.join(root,'lib/teaching-scenes.json'),'utf8')).reviewedAssets;
const selectedWords=process.argv.slice(2).find(a=>a.startsWith('--words='))?.slice(8).split(',');
const data=selectedWords?allData.filter(x=>selectedWords.includes(x.word)):allData;
if(selectedWords&&data.length!==selectedWords.length)throw new Error('Unknown or duplicate --words entry');
const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);const sharp=require('sharp');
const col=4,row=3,perPage=col*row,cellW=375,cellH=320,pad=18;
const pageCount=Math.ceil(data.length/perPage);
const requested=process.argv.slice(2).flatMap(a=>a.startsWith('--pages=')?a.slice(8).split(',').map(x=>Number(x)-1):[]);
const pages=requested.length?requested:Array.from({length:pageCount},(_,i)=>i);
for(const page of pages){ if(page<0||page>=pageCount)throw Error('Invalid page number: '+(page+1));
 const items=data.slice(page*perPage,(page+1)*perPage);
 const svgParts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${col*cellW}" height="${row*cellH}"><rect width="100%" height="100%" fill="#eef1ea"/>`];
 for(let i=0;i<items.length;i++){
  const item=items[i],x=(i%col)*cellW,y=Math.floor(i/col)*cellH;
  const inFile=path.join(root,'public',item.path.slice(1));
  const res=spawnSync('/usr/bin/sips',['-s','format','png','--resampleWidth','250',inFile,'--out',path.join(os.tmpdir(),`wortgarten-scene-${page}-${i}.png`)],{encoding:'utf8'});
  if(res.status!==0)throw Error(`sips failed: ${inFile}: ${res.stderr}`);
  const tile=path.join(os.tmpdir(),`wortgarten-scene-${page}-${i}.png`),png=fs.readFileSync(tile).toString('base64');
  svgParts.push(`<rect x="${x+8}" y="${y+8}" width="${cellW-16}" height="${cellH-16}" rx="16" fill="#fff" stroke="#bcc8bd"/>`);
  svgParts.push(`<image href="data:image/png;base64,${png}" x="${x+pad}" y="${y+16}" width="${cellW-2*pad}" height="210" preserveAspectRatio="xMidYMid meet"/>`);
  const title=item.word.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const meaning=item.meaning.replace(/&/g,'&amp;').replace(/</g,'&lt;').slice(0,72);
  const scene=item.explanationTR.replace(/&/g,'&amp;').replace(/</g,'&lt;').slice(0,110);
  svgParts.push(`<text x="${x+pad}" y="${y+246}" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#253c33">${String(page*perPage+i+1).padStart(3,'0')} ${title}</text>`);
  svgParts.push(`<text x="${x+pad}" y="${y+270}" font-family="Arial,sans-serif" font-size="14" fill="#385a51">${meaning}</text>`);
  svgParts.push(`<text x="${x+pad}" y="${y+292}" font-family="Arial,sans-serif" font-size="11" fill="#64746e">${scene}</text>`);
  fs.rmSync(tile,{force:true});
 }
 svgParts.push('</svg>');
 const dest=path.join(out,selectedWords?'teaching-scenes-targeted.png':`teaching-scenes-${String(page+1).padStart(2,'0')}-of-${pageCount}.png`);
 await sharp(Buffer.from(svgParts.join(''))).png().toFile(dest);console.log(dest);
}
