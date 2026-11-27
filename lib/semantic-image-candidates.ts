import type {ImageConcept} from './image-catalog';
import type {VocabularyImage} from './vocabulary-images';
type Context={word:string;meaning?:string};
type SemanticMatch={id:string;label:string;file:string;electronic:boolean};
const normalize=(s:string,language='de-DE')=>{const t=s.normalize('NFC').replace(/\s+/g,' ').trim();const stripped=language.startsWith('de')?t.replace(/^(der|die|das|den|dem|des)\s+/i,'').trim():t;return stripped.toLocaleLowerCase(language);};
const canonicalFileTitle=(name:string)=>{const clean=name.normalize('NFC').replace(/^File:/i,'').replace(/_/g,' ').replace(/\s+/g,' ').trim();return clean?clean.charAt(0).toUpperCase()+clean.slice(1):'';};
const electronics=new Set(['calculator','computer','laptop','smartphone','mobile phone','tablet computer','projector','video projector','headphones','computer monitor','computer keyboard','computer mouse','printer','scanner','radio receiver','television set']);
const bannedInstances=new Set(['Q5','Q43229','Q783794','Q515','Q11424','Q571','Q13442814','Q482994','Q7366','Q3305213']);
const cache=new Map<string,{time:number;images:VocabularyImage[]}>();
const value=(v:any):string=>typeof v?.value==='string'?v.value.slice(0,300):'';
/** Semantic evidence is not a visual review. Every result remains a manual candidate. */
export function matchSemanticEntities(word:string,meaning:string,entities:unknown):SemanticMatch[]{
 if(!meaning||!Array.isArray(entities))return [];
 const glosses=new Set(meaning.replace(/\([^)]*\)/g,' ').split(/[;,\/]/).map(s=>normalize(s,'tr-TR')).filter(s=>s.length>=3));
 // Turkish infinitive and action-noun forms (yüzmek/yüzme) describe the same action.
 for(const g of [...glosses])if(g.length>5&&/(?:mak|mek)$/.test(g))glosses.add(g.slice(0,-1));
 const matches:SemanticMatch[]=[];
 for(const e of entities.slice(0,5)){
  if(!e||!/^Q\d+$/.test(e.id||''))continue;
  const german=[value(e.labels?.de),...(Array.isArray(e.aliases?.de)?e.aliases.de.map(value):[])];
  if(!german.some(s=>normalize(s)===normalize(word)))continue;
  if((e.claims?.P31||[]).some((c:any)=>bannedInstances.has(c.mainsnak?.datavalue?.value?.id)))continue;
  if(/\b(?:human|politician|company|surname|given name|painting by|film directed|album by)\b/i.test(value(e.descriptions?.en)))continue;
  const turkish=[value(e.labels?.tr),...(Array.isArray(e.aliases?.tr)?e.aliases.tr.map(value):[])];
  const label=turkish.find(s=>glosses.has(normalize(s,'tr-TR')));if(!label)continue;
  for(const c of (e.claims?.P18||[]).slice(0,3)){
   const file=c?.mainsnak?.datavalue?.value;
   if(c.rank==='deprecated'||typeof file!=='string'||file.length>240||/[|#\x00-\x1f]/.test(file)||!(/\.(?:jpe?g|png|webp|gif)$/i.test(file)))continue;
   matches.push({id:e.id,label,file,electronic:electronics.has(normalize(value(e.labels?.en),'en'))});break;
  }
 }
 return matches.slice(0,2);
}
export async function semanticImageCandidates(context:Context,options:{request:typeof fetch;signal?:AbortSignal;validate:(concept:ImageConcept,pages:unknown)=>VocabularyImage[]}):Promise<VocabularyImage[]>{
 if(!context.meaning||options.signal?.aborted)return [];
 const key=normalize(context.word)+'\0'+normalize(context.meaning,'tr-TR');const hit=cache.get(key);if(hit&&Date.now()-hit.time<30*60*1000)return hit.images.map(i=>({...i}));
 const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(4000)]):AbortSignal.timeout(4000);
 const get=async(host:string,params:Record<string,string>)=>{const r=await options.request(host+'?'+new URLSearchParams({...params,format:'json'}),{signal,headers:{'User-Agent':'Wortgarten/1.3 contextual-vocabulary-images'}});if(!r.ok)throw Error('Image source HTTP '+r.status+' at '+new URL(host).hostname);const d:any=await r.json();if(d.error)throw Error('Image source error');return d;};
 try{
  const found=await get('https://www.wikidata.org/w/api.php',{action:'wbsearchentities',search:context.word,language:'de',uselang:'de',type:'item',limit:'5'});
  const ids=(Array.isArray(found.search)?found.search:[]).filter((e:any)=>/^Q\d+$/.test(e.id||'')).map((e:any)=>e.id).slice(0,5);if(!ids.length)return [];
  const data=await get('https://www.wikidata.org/w/api.php',{action:'wbgetentities',ids:ids.join('|'),props:'labels|aliases|descriptions|claims',languages:'de|tr|en'});
  const matches=matchSemanticEntities(context.word,context.meaning,Object.values(data.entities||{}));if(!matches.length)return [];
  const files=await get('https://commons.wikimedia.org/w/api.php',{action:'query',prop:'imageinfo',titles:matches.map(m=>'File:'+m.file).join('|'),iiprop:'url|extmetadata|mime',iiurlwidth:'640',formatversion:'2'});
  const pages=Array.isArray(files.query?.pages)?files.query.pages:Object.values(files.query?.pages||{});
  const images=matches.flatMap(m=>{
   const target=canonicalFileTitle(m.file);
   const matching=pages.filter((p:any)=>typeof p?.title==='string'&&canonicalFileTitle(p.title)===target);
   const normalizedFile=m.file.replace(/_/g,' ');
   const concept:ImageConcept={id:'wikidata-'+m.id,lemmas:[context.word],query:normalizedFile,terms:[normalizedFile],allowElectronics:m.electronic};
   return options.validate(concept,matching).map(image=>({...image,match:'candidate' as const,confidence:'candidate' as const,explanationTR:`“${m.label}” anlamına ait Wikidata ${m.id} maddesindeki görsel adayı. Görsel tek tek incelenmedi; anlamına uygun bulursan seç.`}));
  }).slice(0,2);
  if(images.length){if(cache.size>=64)cache.delete(cache.keys().next().value!);cache.set(key,{time:Date.now(),images});}
  return images;
 }catch(error){console.warn('Contextual image lookup unavailable:',error instanceof Error?error.message:'request failed');return [];}
}
