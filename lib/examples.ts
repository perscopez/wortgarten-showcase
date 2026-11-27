import bundled from './tatoeba-examples.json';
import authored from './authored-examples.json';

/** One usable example sentence for a word, with where it came from. */
export type Candidate={de:string;tr:string;origin:'card'|'lexicon'|'tatoeba';id?:number;by?:string};
type Stored={id:number;de:string;tr:string;by:string};

const norm=(s:string)=>s.normalize('NFC').trim();
const lower=(s:string)=>norm(s).toLocaleLowerCase('de');
const list=(bundled as unknown as {examples:Record<string,Stored[]>}).examples;
const correctedTranslations:Readonly<Record<string,string>>={
 'Alle achten ihn.':'Herkes ona saygı duyar.',
};
const reviewedStudyExamples:Readonly<Record<string,readonly [string,string][]>>={
 achten:[
  ['Achte bitte auf den Verkehr.','Lütfen trafiğe dikkat et.'],
  ['Sie achtet auf den Preis.','Fiyata dikkat ediyor.'],
  ['Alle achten ihn.','Herkes ona saygı duyar.'],
 ],
 salat:[
  ['Möchtest du einen Salat zum Mittagessen?','Öğle yemeğinde salata ister misin?'],
  ['Ich nehme den Salat ohne Zwiebeln.','Salatayı soğansız alayım.'],
 ],
 packung:[['Ich brauche eine Packung Reis.','Bir paket pirince ihtiyacım var.']],
 'im angebot sein':[['Die Tomaten sind heute im Angebot.','Domatesler bugün indirimde.']],
};
const wordKey=(w:string)=>lower(w.replace(/^(der|die|das)\s+/i,''));
const correct=(de:string,tr:string)=>{const k=norm(de);return Object.hasOwn(correctedTranslations,k)?correctedTranslations[k]:tr;};
const asCandidate=(e:Stored):Candidate=>({de:e.de,tr:correct(e.de,e.tr),origin:'tatoeba',id:e.id,by:e.by});

/** Sentences bundled with the app (covers every word the app ships with). */
export function bundledExamples(word:string):Candidate[]{
 const key=wordKey(word);
 const own=(authored as Record<string,{de:string;tr:string}[]>);
 return [...(Object.hasOwn(own,key)?own[key].map(e=>({de:e.de,tr:e.tr,origin:'lexicon' as const})):[]),...(Object.hasOwn(list,key)?list[key].map(asCandidate):[])];
}

// Words outside the bundled list are fetched once from /api/examples and remembered on this device.
const CACHE_KEY='wortgarten-examples-cache-v1';
let cache:Record<string,Stored[]>|null=null;
function loadCache(){
 if(cache)return cache;cache={};
 try{const raw=typeof localStorage!=='undefined'?localStorage.getItem(CACHE_KEY):null;const data=raw?JSON.parse(raw):null;if(data&&typeof data==='object'&&!Array.isArray(data))cache=data;}catch{/* private mode */}
 return cache!;
}
export function cachedExamples(word:string):Candidate[]{
 const c=loadCache(),key=wordKey(word);
 return Object.hasOwn(c,key)&&Array.isArray(c[key])?c[key].filter(e=>e&&typeof e.de==='string'&&typeof e.tr==='string').map(asCandidate):[];
}
export function hasLookedUp(word:string){return Object.hasOwn(loadCache(),wordKey(word));}
const CACHE_LIMIT=4000;
function remember(word:string,examples:Stored[]){
 const c=loadCache();c[wordKey(word)]=examples;
 const keys=Object.keys(c);if(keys.length>CACHE_LIMIT)for(const k of keys.slice(0,keys.length-CACHE_LIMIT))delete c[k];
 try{localStorage.setItem(CACHE_KEY,JSON.stringify(c));}catch{/* storage full */}
}
/** Puts precomputed Tatoeba sentences (with author and id, so credit is kept) into the cache in one write; words already cached are left alone. */
export function primeExamples(entries:[string,Stored[]][]){
 const c=loadCache();let added=0;
 for(const [word,list] of entries){const k=wordKey(word);if(!Object.hasOwn(c,k)&&list.length){c[k]=list;added++;}}
 if(!added)return 0;
 const keys=Object.keys(c);if(keys.length>CACHE_LIMIT)for(const k of keys.slice(0,keys.length-CACHE_LIMIT))delete c[k];
 try{localStorage.setItem(CACHE_KEY,JSON.stringify(c));}catch{/* storage full */}
 return added;
}
/** Fetch examples for a word the bundle does not know. Resolves true when something new is now available. */
export async function fetchExamples(word:string,meaning='',signal?:AbortSignal):Promise<boolean>{
 const bare=norm(word).replace(/^(der|die|das)\s+/i,'');
 if(bundledExamples(word).length||hasLookedUp(word)||!/^[\p{L}-]{2,40}$/u.test(bare))return false;
 try{
  const r=await fetch('/api/examples?word='+encodeURIComponent(bare)+(meaning?'&meaning='+encodeURIComponent(meaning.slice(0,120)):''),{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(9000)]):AbortSignal.timeout(9000)});
  if(!r.ok)return false;// not remembered: try again another day
  const data=await r.json() as {examples?:Stored[]};
  const examples=Array.isArray(data.examples)?data.examples.filter(e=>e&&typeof e.de==='string'&&typeof e.tr==='string'):[];
  remember(word,examples);return examples.length>0;
 }catch{return false;}
}

/**
 * Every example we can use for a card, best first: the card's own sentence, the reviewed one for this sense,
 * then Tatoeba sentences. Duplicates are dropped; a sentence without translation is still usable for cloze.
 */
export function candidatesFor(card:{word:string;example?:string;translation?:string},info:{example?:string;translation?:string}):Candidate[]{
 const out:Candidate[]=[],seen=new Set<string>();
 const push=(c:Candidate)=>{const k=lower(c.de);if(!k||seen.has(k))return;seen.add(k);out.push({...c,tr:correct(c.de,c.tr)});};
 if(card.example?.trim())push({de:norm(card.example),tr:norm(card.translation||''),origin:'card'});
 if(info.example?.trim())push({de:norm(info.example),tr:norm(info.translation||''),origin:'lexicon'});
 for(const c of bundledExamples(card.word))push(c);
 for(const c of cachedExamples(card.word))push(c);
 return out;
}
export function studyExamples(card:{word:string;example?:string;translation?:string},info:{example?:string;translation?:string}):Candidate[]{
 const k=wordKey(card.word);
 const rows=Object.hasOwn(reviewedStudyExamples,k)?reviewedStudyExamples[k]:[];
 const reviewed=rows.map(([de,tr]):Candidate=>({de,tr,origin:'lexicon'}));
 const candidates=[...reviewed,...candidatesFor(card,info)].filter(c=>c.tr);
 const seen=new Set<string>();
 const unique=candidates.filter(c=>{const key=lower(c.de);if(seen.has(key))return false;seen.add(key);return true;});
 const trusted=unique.filter(c=>c.origin!=='tatoeba');
 return trusted.length?trusted:unique.slice(0,1);
}
export const tatoebaLink=(id:number)=>'https://tatoeba.org/en/sentences/show/'+id;
