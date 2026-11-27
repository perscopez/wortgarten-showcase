// Builds lib/frequency-de.json from the text of "User:Matthias Buchmeier/German frequency list-1-5000" (Wiktionary, CC BY-SA 4.0).
// Usage: pdftotext -layout <list.pdf> list.txt && node scripts/build-frequency.mjs list.txt
// Keeps nouns (capitalised) and infinitives that also exist in the bundled German–Turkish dictionary, in frequency order.
import fs from 'node:fs';
const text=fs.readFileSync(process.argv[2],'utf8').split('\n').filter(l=>!/Wiktionary|^https?:|Seite \d/.test(l)).join(' ');
const dict=JSON.parse(fs.readFileSync(new URL('../lib/dictionary-data.json',import.meta.url),'utf8')).words;
const forms=new Map();
for(const m of text.matchAll(/(\d{3,7})\s+([A-Za-zÄÖÜäöüß'-]+)/g)){
 const n=Number(m[1]),w=m[2];if(w.startsWith("'")||w.length<3)continue;
 const key=w.toLocaleLowerCase('de');const e=forms.get(key)||{total:0,capital:0};e.total+=n;if(w[0]!==key[0])e.capital+=n;forms.set(key,e);
}
const SKIP=new Set(['Hallo','Ach','Scheiße','Verdammt','Mist','Okay','Hey','zusammen','Scheisse','Idiot']);
const NOT_VERB=new Set(['diesen','einen','keinen','meinen','deinen','seinen','ihren','unseren','anderen','ganzen','guten','neuen','kleinen','letzten','ersten','jeden','allen','denen','wegen','gegen','sogar','nichten','jungen','schönen','alten','großen','vielen','beiden','eigenen','wenigen']);
const out=[];let rank=0;
for(const [key,e] of [...forms.entries()].sort((a,b)=>b[1].total-a[1].total)){
 rank++;
 const entry=dict[key]||dict[key[0].toLocaleUpperCase('de')+key.slice(1)];
 if(!entry||!entry[0]?.length)continue;
 const noun=e.capital/e.total>=0.85;
 const verb=!noun&&key.length>=5&&key.endsWith('en')&&!NOT_VERB.has(key);
 if((!noun&&!verb)||SKIP.has(key[0].toLocaleUpperCase('de')+key.slice(1))||SKIP.has(key))continue;
 out.push([noun?key[0].toLocaleUpperCase('de')+key.slice(1):key,rank,noun?'n':'v']);
}
fs.writeFileSync(new URL('../lib/frequency-de.json',import.meta.url),JSON.stringify({source:'User:Matthias Buchmeier/German frequency list-1-5000 · Wiktionary',license:'CC BY-SA 4.0',url:'https://en.wiktionary.org/wiki/User:Matthias_Buchmeier/German_frequency_list-1-5000',words:out}));
console.log(forms.size,'forms ->',out.length,'suggestible words');
console.log(out.slice(0,60).map(x=>x[0]).join(' '));
