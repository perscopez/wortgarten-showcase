// Commons search for concrete words that Wikipedia has no usable lead photo for.
// Usage: node scripts/find-commons-photos.mjs out.json   (candidates only)
import fs from 'node:fs';
const MAP={Apfel:'apple fruit',Banane:'banana fruit',Ente:'mallard duck',Schaf:'sheep',Vogel:'bird perched',Schmetterling:'butterfly',Glühbirne:'light bulb',Schlüssel:'key',Tür:'wooden door',Ei:'chicken egg',Kuh:'cow',Pferd:'horse',Bus:'city bus',Zug:'passenger train',Becher:'mug cup',Küche:'kitchen interior',Kirche:'church building',Mantel:'coat clothing',Wasser:'water glass',Computer:'desktop computer',Fahrrad:'bicycle',Wand:'brick wall',Fisch:'fish',Computer2:'laptop',Mantel2:'winter coat',Käse:'cheese',Tisch:'table furniture',Stuhl:'chair',Fenster:'window',Brille:'glasses eyeglasses',Uhr:'wall clock',Zeitung:'newspaper',Kugelschreiber:'ballpoint pen',Tasche:'handbag',Schuh:'shoe',Hose:'trousers',Hemd:'shirt',Kleid:'dress',Banane2:'bananas',Orange:'orange fruit',Zitrone:'lemon',Kartoffel:'potato',Zwiebel:'onion',Reis:'rice',Milch:'milk glass',Butter:'butter',Wurst:'sausage',Suppe:'soup bowl',Salat:'salad',Kuchen:'cake',Schokolade:'chocolate',Tee:'cup of tea',Bier:'beer glass',Wein:'wine glass',Berg:'mountain',See:'lake',Meer:'sea beach',Wald:'forest',Blume:'flower',Sonne:'sun',Mond:'moon',Schnee:'snow',Straße:'street',Flughafen:'airport',Krankenhaus:'hospital building',Schule:'school building',Bibliothek:'library interior',Bett:'bed',Sofa:'sofa',Lampe:'lamp',Spiegel:'mirror',Treppe:'staircase',Garten:'garden',Hotel:'hotel building',Apotheke:'pharmacy',Bäckerei:'bakery',Markt:'market stall',Ofen:'oven',Löffel:'spoon',Gabel:'fork',Messer:'knife',Teller:'plate',Flasche:'bottle',Regenschirm:'umbrella',Ring:'ring jewelry',Rucksack:'backpack',Kerze:'candle',Baby:'baby',Zahn:'tooth',Auge:'human eye',Ohr:'ear',Nase:'nose',Fuß:'foot',Herz:'heart anatomy',Kopf:'head',Katze2:'cat'};
const words=Object.keys(MAP).filter(w=>!/\d$/.test(w));
const j=async u=>{for(let i=0;i<3;i++){try{const r=await fetch(u,{headers:{'User-Agent':'wortgarten-photo-finder/1.0 (educational app)'}});if(r.ok)return await r.json();}catch{}await new Promise(r=>setTimeout(r,800));}return null;};
const clean=s=>(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const out=[];
for(const w of words)for(const quality of [true,false]){
 if(out.some(x=>x.word===w))break;
 const q=new URLSearchParams({action:'query',format:'json',formatversion:'2',generator:'search',gsrnamespace:'6',gsrlimit:'8',gsrsearch:MAP[w]+' filetype:bitmap'+(quality?' incategory:"Quality images"':''),prop:'imageinfo',iiprop:'url|extmetadata|size|mime',iiurlwidth:'640'});
 const d=await j('https://commons.wikimedia.org/w/api.php?'+q);
 const pages=(d?.query?.pages||[]).sort((a,b)=>a.index-b.index);
 for(const p of pages){
  const ii=p.imageinfo?.[0];if(!ii||ii.mime!=='image/jpeg'||ii.width<800)continue;
  const m=ii.extmetadata||{},lic=clean(m.LicenseShortName?.value);
  if(!/^(CC BY(-SA)? \d|CC0|Public domain)/i.test(lic))continue;
  if(/logo|map|diagram|flag|portrait|poster|stamp|painting|drawing|museum|collection/i.test(p.title))continue;
  out.push({word:w,meanings:[''],file:p.title.replace(/^File:/,''),thumb:ii.thumburl,source:ii.descriptionurl,license:lic,licenseUrl:clean(m.LicenseUrl?.value),author:clean(m.Artist?.value).slice(0,120)||'Wikimedia Commons'});
  break;
 }
}
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));console.log(words.length,'searched',out.length,'found');
