// Finds a real, freely licensed lead photo on de.wikipedia for concrete German nouns that currently only have a schematic drawing.
// Usage: node scripts/find-wiki-photos.mjs out.json   (candidates only; nothing is downloaded or written into the app)
import fs from 'node:fs';
const read=f=>JSON.parse(fs.readFileSync(new URL('../lib/'+f,import.meta.url),'utf8')).reviewedAssets;
const sources=['teaching-scenes.json','new-word-scenes.json','lesson-20261108-art.json','audit-20261109-art.json','reviewed-art.json'];
const have=new Set(read('reviewed-photos.json').map(a=>a.word));
const words=new Map();
for(const f of sources)for(const a of read(f)){
 if(!/^\p{Lu}[\p{L}-]{2,}$/u.test(a.word)||have.has(a.word))continue;
 words.set(a.word,[...(words.get(a.word)||[]),a.meaning||'']);
}
// Nouns of the starter and daily lists (they have an article) get a photo even when no drawing exists.
const basic=fs.readFileSync(new URL('../lib/basic-words.ts',import.meta.url),'utf8');
for(const m of basic.matchAll(/\['([^']+)','(der|die|das)','[^']*','([^']*)'/g))if(/^\p{Lu}/u.test(m[1])&&!have.has(m[1]))words.set(m[1],[...(words.get(m[1])||[]),m[3]]);
const daily=JSON.parse(fs.readFileSync(new URL('../lib/daily-new-words.json',import.meta.url),'utf8'));
for(const v of Object.values(daily))if(v.article&&/^\p{Lu}/u.test(v.word)&&!have.has(v.word))words.set(v.word,[...(words.get(v.word)||[]),v.meaning||'']);
const API='https://de.wikipedia.org/w/api.php';
const j=async u=>{for(let i=0;i<3;i++){try{const r=await fetch(u,{headers:{'User-Agent':'wortgarten-photo-finder/1.0 (educational app)'}});if(r.ok)return await r.json();}catch{}await new Promise(r=>setTimeout(r,800));}return null;};
const out={};const list=[...words.keys()];
for(let i=0;i<list.length;i+=40){
 const batch=list.slice(i,i+40);
 const q=new URLSearchParams({action:'query',format:'json',redirects:'1',titles:batch.join('|'),prop:'pageimages|pageprops|description',piprop:'name',pilicense:'free',ppprop:'disambiguation',formatversion:'2'});
 const d=await j(API+'?'+q);if(!d)continue;
 const redir=Object.fromEntries((d.query.redirects||[]).map(r=>[r.from,r.to]));
 const norm=Object.fromEntries((d.query.normalized||[]).map(r=>[r.from,r.to]));
 for(const w of batch){
  const t=redir[norm[w]||w]||norm[w]||w;const p=d.query.pages.find(x=>x.title===t);
  if(!p||p.missing||p.pageprops?.disambiguation!==undefined||!p.pageimage)continue;
  out[w]={title:p.title,file:p.pageimage,desc:p.description||'',meanings:words.get(w)};
 }
}
// license + thumbnail from Commons
const files=Object.values(out).map(x=>'File:'+x.file);
const meta={};
for(let i=0;i<files.length;i+=40){
 const q=new URLSearchParams({action:'query',format:'json',titles:files.slice(i,i+40).join('|'),prop:'imageinfo',iiprop:'url|extmetadata|size|mime',iiurlwidth:'640',formatversion:'2'});
 const d=await j('https://commons.wikimedia.org/w/api.php?'+q);if(!d)continue;
 for(const p of d.query.pages){const ii=p.imageinfo?.[0];if(ii)meta[p.title]=ii;}
}
const clean=s=>(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const result=[];
for(const [w,x] of Object.entries(out)){
 const ii=meta['File:'+x.file.replace(/_/g,' ')]||meta['File:'+x.file];if(!ii)continue;
 const m=ii.extmetadata||{},lic=clean(m.LicenseShortName?.value),mime=ii.mime;
 if(!/^image\/jpeg$/.test(mime)||!/^(CC BY(-SA)? \d|CC0|Public domain|PD)/i.test(lic))continue;
 if(/logo|wappen|karte|map|diagram|flagge|flag|schema|plan|grafik|portrait|porträt/i.test(x.file))continue;
 if(ii.width<500)continue;
 result.push({word:w,meanings:x.meanings,page:x.title,file:x.file,thumb:ii.thumburl,source:ii.descriptionurl,license:lic,licenseUrl:clean(m.LicenseUrl?.value),author:clean(m.Artist?.value).slice(0,120)||'Wikimedia Commons'});
}
fs.writeFileSync(process.argv[2],JSON.stringify(result,null,1));
console.log('targets',list.length,'with page image',Object.keys(out).length,'usable',result.length);
