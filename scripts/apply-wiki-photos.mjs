// Downloads the reviewed candidates (see find-*-photos.mjs) into public/vocabulary-art/wiki and writes lib/wiki-photos.json.
// Usage: node scripts/apply-wiki-photos.mjs cand1.json cand4.json  (KEEP lists below are the words that passed visual review)
import fs from 'node:fs';import crypto from 'node:crypto';
const KEEP=new Set(('Baum Verspätung Treppe Vorlesung Bildschirm Rabatt Kontrollzentrum Notruf Mobilfunk Taste Lesegerät Mauer Hauptbahnhof Bahnhof Kneipe Museum Park Restaurant Kino Telefon Supermarkt Frühstück Mittagessen Geburtstag Forscher Mittelalter Papier Letter Brand Feuerwehr Hand Haus Leute Geld Brot Tomate Karotte Hund Katze Schwein Kaninchen Biene Buch Flugzeug Schiff Kamera Gitarre '+
 'Banane Schaf Vogel Schmetterling Ei Kuh Pferd Bus Zug Becher Kirche Wasser Fahrrad Schuh Orange Zitrone Zwiebel Butter Kuchen Schokolade Tee Bier Flughafen Krankenhaus Schule Bibliothek Apotheke Bäckerei Markt').split(' '));
const slug=w=>w.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z]+/g,'-');
const dir=new URL('../public/vocabulary-art/wiki/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
const assets=[];
for(const f of process.argv.slice(2))for(const c of JSON.parse(fs.readFileSync(f,'utf8'))){
 if(!KEEP.has(c.word)||assets.some(a=>a.word===c.word))continue;
 let r;for(let i=0;i<5;i++){r=await fetch(c.thumb,{headers:{'User-Agent':'wortgarten-photo-finder/1.0 (educational app)'}});if(r.status!==429)break;await new Promise(x=>setTimeout(x,3000*(i+1)));}
 if(!r.ok){console.log('skip',c.word,r.status);continue;}await new Promise(x=>setTimeout(x,250));
 const buf=Buffer.from(await r.arrayBuffer());const id='wiki-'+slug(c.word);
 fs.writeFileSync(new URL(id+'.jpg',dir),buf);
 assets.push({assetId:id,conceptId:id,word:c.word,aliases:[],meanings:(c.meanings||[]).filter(Boolean),path:`/vocabulary-art/wiki/${id}.jpg`,source:c.source,archive:'wikimedia',version:'wiki-2026-11-13',sha256:crypto.createHash('sha256').update(buf).digest('hex'),license:c.license,licenseUrl:c.licenseUrl||'https://creativecommons.org/licenses/',author:c.author,sourceAttribution:`${c.author} · ${c.license} · Wikimedia Commons`,kind:'image',reviewStatus:'reviewed'});
}
fs.writeFileSync(new URL('../lib/wiki-photos.json',import.meta.url),JSON.stringify({reviewedAssets:assets},null,1));
console.log(assets.length,'photos');
