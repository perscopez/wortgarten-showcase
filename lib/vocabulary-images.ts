import {semanticImageCandidates} from './semantic-image-candidates';
import {IMAGE_CONCEPTS,type ImageConcept} from './image-catalog';
import {reviewedArtFor,reviewedVisualFor,reviewedUsageExamplesFor,type ReviewedArt} from './reviewed-art';
export type ImageMatch='curated'|'dictionary'|'candidate';
export type VocabularyImage={url:string;source:string;title:string;author:string;license:string;licenseUrl:string;match:ImageMatch;confidence:ImageMatch;conceptId:string;kind:'photo'|'illustration'|'image';archive?:'openmoji'|'twemoji'|'wortgarten'|'wikimedia';assetId?:string;attribution?:string;explanationTR?:string};
export type ImageLookupResult={images:VocabularyImage[];status:'ok'|'cached'|'no-concept'|'no-match'|'unavailable'|'aborted';conceptId?:string;candidatesExamined:number};
/** Four exact file/concept pairs checked against live Commons metadata + downloadable image URLs.
 * This is not a claim that all 120 query concepts contain verified/hosted images. */
export const VERIFIED_IMAGE_FILES=[
 {conceptId:'apple',title:'File:Apple fruit 1.2.jpg',checkedAt:'2026-10-30'},
 {conceptId:'lemon',title:'File:Lemon fruit from USA.jpg',checkedAt:'2026-10-30'},
 {conceptId:'bank-bench',title:'File:Bratislava Relaxing Park Bench 01.jpg',checkedAt:'2026-10-30'},
 {conceptId:'bicycle',title:'File:Parked bicycle with graffitied building facade and doors in Amsterdam.jpg',checkedAt:'2026-10-30'},
] as const;
const CACHE=new Map<string,{time:number;images:VocabularyImage[]}>();
const generic=new Set(['building','home','food','fruit','animal','landscape','bunch','public','stone','river','wood','metal','coast','street','transport','water']);
const forbidden:{kind:'logo'|'portrait'|'document'|'map';pattern:RegExp}[]=[
 {kind:'logo',pattern:/\b(?:logo|coat of arms|emblem|flag|wordmark)\b/i},
 {kind:'portrait',pattern:/\b(?:portrait|selfie|headshot|politician|president|actor|actress)\b/i},
 {kind:'document',pattern:/\b(?:document|manuscript|certificate|scanned|newspaper|postcard|advertisement|advertising|diagram|drawing|painting|illustration)\b/i},
 {kind:'map',pattern:/\b(?:map|cartography|floor plan|location plan)\b/i},
];
function normalize(text:string){return text.normalize('NFC').trim().replace(/^(?:der|die|das|den|dem|des)\s+/i,'').toLocaleLowerCase('de');}
function plain(value:unknown){return typeof value==='string'?value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim():'';}
function literalTerm(text:string,term:string){const escaped=term.toLocaleLowerCase('en').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(?:^|[^\\p{L}])'+escaped+'(?:$|[^\\p{L}])','iu').test(text);}
function conceptForms(term:string){const lower=term.toLocaleLowerCase('en');const forms=[lower,lower+'s',lower+'es'];if(/[^aeiou]y$/.test(lower))forms.push(lower.slice(0,-1)+'ies');return [...new Set(forms)];}
function matchesTerm(text:string,term:string){return conceptForms(term).some(f=>literalTerm(text,f));}
function dedupeByUrl(images:VocabularyImage[]){return [...new Map(images.map(i=>[i.url,i])).values()];}
function specificTerms(concept:ImageConcept){const terms=concept.terms.filter(term=>!generic.has(term.toLocaleLowerCase('en')));return terms.length?terms:concept.id==='river'?['river']:[];}
function reviewedIllustrations(word:string,senseId?:string):VocabularyImage[]{
 return reviewedArtFor(word,senseId).map((image:ReviewedArt)=>({...image,match:'curated' as const,confidence:'curated' as const,conceptId:image.conceptId,kind:image.kind}));
}
export function resolveImageConcept(word:string,senseId?:string):ImageConcept|undefined{
 if(senseId)return IMAGE_CONCEPTS.find(c=>c.senseIds?.includes(senseId))||IMAGE_CONCEPTS.find(c=>c.id===senseId);
 const matches=IMAGE_CONCEPTS.filter(c=>!c.senseIds?.length&&c.lemmas.some(lemma=>normalize(lemma)===normalize(word)));
 return matches.length===1?matches[0]:undefined;
}
function safeUrl(value:unknown,kind:'image'|'source'|'license'){
 if(typeof value!=='string'||value.length>4096)return'';try{const url=new URL(value);if(url.username||url.password)return'';
  if(kind==='license')return ['https:','http:'].includes(url.protocol)&&['creativecommons.org','www.creativecommons.org','commons.wikimedia.org'].includes(url.hostname)?url.href:'';
  if(url.protocol!=='https:')return'';
  if(kind==='source')return url.hostname==='commons.wikimedia.org'&&url.pathname.startsWith('/wiki/File:')?url.href:'';
  return ['upload.wikimedia.org','thumb.wikimedia.org'].includes(url.hostname)?url.href:'';
 }catch{return'';}
}
/** Search rank alone is never semantic proof. Every non-pinned file remains a manual candidate. */
export function filterVocabularyImages(concept:ImageConcept,pages:unknown,limit=6):VocabularyImage[]{
 const records=Array.isArray(pages)?pages:pages&&typeof pages==='object'?Object.values(pages):[];const result:{image:VocabularyImage;score:number}[]=[];const seen=new Set<string>();
 const pinned=VERIFIED_IMAGE_FILES.filter(f=>f.conceptId===concept.id).map(f=>f.title);
 for(const raw of records.slice(0,20)){const page=raw as any;const info=page?.imageinfo?.[0],meta=info?.extmetadata;if(!info||!meta||!/^image\/(?:jpeg|png|webp|gif|avif)$/i.test(info.mime||''))continue;
  const title=plain(page.title),description=plain(meta.ImageDescription?.value)+' '+plain(meta.ObjectName?.value);const content=(title+' '+description).toLocaleLowerCase('en');
  if((concept.excludeTerms||[]).some(term=>literalTerm(content,term)))continue;
  // Descriptions can contain incidental fruit text or museum boilerplate: the filename's
  // primary object must not be a computer/electronic product for a non-electronics concept.
  const electronics=/\b(?:apple\s+(?:ii|iii|inc)|macintosh|iphone|ipad|computer|computers|microcomputer|microcomputers|laptop|smartphone|motherboard|circuit board|electronic|electronics)\b/i;
  const electronicConcept=concept.allowElectronics===true||/^(?:computer|laptop|smartphone|mobile-phone|phone|tablet|television|tv|camera|radio|keyboard|mouse|headphones|printer|monitor)$/.test(concept.id);
  if(!electronicConcept&&electronics.test(title))continue;
  if(concept.id==='apple'&&(!literalTerm(title,'apple')&&!literalTerm(title,'apples')||/\b(?:museum|musée|bolo|paneer|syzygium|wax|water|java|rose|custard|sugar)\b/iu.test(title)))continue;
  if(forbidden.some(rule=>!concept.allow?.includes(rule.kind)&&rule.pattern.test(content)))continue;
  const terms=specificTerms(concept);if(!terms.some(term=>matchesTerm(title,term)))continue;const hits=terms.filter(term=>matchesTerm(content,term));if(!hits.length)continue;
  const url=safeUrl(info.thumburl||info.url,'image'),source=safeUrl(info.descriptionurl,'source'),license=plain(meta.LicenseShortName?.value),licenseUrl=safeUrl(meta.LicenseUrl?.value,'license'),author=plain(meta.Artist?.value);
  if(!url||!source||!licenseUrl||!(/^(?:CC(?:[ -]BY|0)|Public domain|PD\b)/i.test(license))||/\b(?:NC|ND|all rights reserved|fair use)\b/i.test(license))continue;
  if(/CC[ -]BY/i.test(license)&&!author)continue;if(seen.has(source))continue;seen.add(source);
  const match:ImageMatch=pinned.includes(title as any)?'curated':'candidate';const score=(match==='curated'?100:0)+hits.filter(term=>matchesTerm(title,term)).length*2+hits.length;
  result.push({image:{url,source,title:title.replace(/^File:/,''),author,license,licenseUrl,match,confidence:match,conceptId:concept.id,kind:'image'},score});
 }
 return result.sort((a,b)=>b.score-a.score||a.image.title.localeCompare(b.image.title)).slice(0,Math.max(0,Math.min(6,limit))).map(r=>r.image);
}
export async function vocabularyImages(context:{word:string;senseId?:string;meaning?:string},options:{request?:typeof fetch;signal?:AbortSignal;cache?:boolean}={}):Promise<ImageLookupResult>{
 const concept=resolveImageConcept(context.word,context.senseId);if(options.signal?.aborted)return{images:[],status:'aborted',candidatesExamined:0};
 const contextual=dedupeByUrl(reviewedVisualFor(context.word,context.meaning).map(i=>({...i,confidence:'curated' as const})));
 if(contextual.length)return{images:contextual.slice(0,6),status:'ok',conceptId:contextual[0].conceptId,candidatesExamined:0};
 const examples=reviewedUsageExamplesFor(context.word,context.meaning).map(i=>({...i,match:'candidate' as const,confidence:'candidate' as const,explanationTR:`İncelenmiş arşivdeki örnek kullanım: ${i.usageMeaning}. Senin bağlamınla aynı olduğunu varsayma; uygun bulursan seç.`}));
 const illustrations=dedupeByUrl([...reviewedIllustrations(context.word,context.senseId),...examples]);
 const hasPinned=!!concept&&VERIFIED_IMAGE_FILES.some(f=>f.conceptId===concept.id);
 if(!illustrations.length&&context.meaning&&!context.senseId&&!hasPinned){const semantic=await semanticImageCandidates({word:context.word,meaning:context.meaning},{request:options.request||fetch,signal:options.signal,validate:(c,p)=>filterVocabularyImages(c,p,2)});if(semantic.length)return{images:dedupeByUrl(semantic),status:'ok',conceptId:semantic[0].conceptId,candidatesExamined:semantic.length};}
 if(!concept)return illustrations.length?{images:illustrations.slice(0,6),status:'ok',conceptId:illustrations[0].conceptId,candidatesExamined:0}:{images:[],status:'no-concept',candidatesExamined:0};
 const cached=CACHE.get(concept.id);if(options.cache!==false&&cached&&Date.now()-cached.time<6*3600000){const terms=specificTerms(concept);const stillRelevant=cached.images.filter(i=>{const name=i.title.toLocaleLowerCase('en');return terms.some(term=>matchesTerm(name,term))&&!(concept.excludeTerms||[]).some(term=>literalTerm(name,term))&&!(concept.id==='apple'&&/\b(?:museum|musée|bolo|computer|electronics|paneer|syzygium|wax|water|java|rose|custard|sugar|macintosh|iphone|ipad)\b/iu.test(name));});if(stillRelevant.length===cached.images.length)return{images:dedupeByUrl([...stillRelevant.map(i=>({...i})),...illustrations]).slice(0,6),status:'cached',conceptId:concept.id,candidatesExamined:0};CACHE.delete(concept.id);}
 const request=options.request||fetch;const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(4500)]):AbortSignal.timeout(4500);
 const common={action:'query',prop:'imageinfo',iiprop:'url|extmetadata|mime',iiurlwidth:'640',format:'json',formatversion:'2'};
 const params=[new URLSearchParams({...common,generator:'search',gsrsearch:concept.query+' filetype:bitmap',gsrnamespace:'6',gsrlimit:'16'})];
 const pinned=VERIFIED_IMAGE_FILES.filter(f=>f.conceptId===concept.id);if(pinned.length)params.push(new URLSearchParams({...common,titles:pinned.map(f=>f.title).join('|')}));
 let succeeded=0;const pages=(await Promise.allSettled(params.map(async p=>{const response=await request('https://commons.wikimedia.org/w/api.php?'+p,{signal,headers:{'User-Agent':'Wortgarten/1.2 vocabulary-learning'}});if(!response.ok)throw Error('Commons unavailable');const data:any=await response.json();if(!data.query?.pages||data.error)throw Error('Commons response invalid');succeeded++;return Array.isArray(data.query.pages)?data.query.pages:Object.values(data.query.pages);}))).flatMap(r=>r.status==='fulfilled'?r.value:[]).slice(0,20);
 if(options.signal?.aborted)return{images:[],status:'aborted',conceptId:concept.id,candidatesExamined:pages.length};
 const photos=filterVocabularyImages(concept,pages,Math.max(0,6-illustrations.length));if(photos.length&&options.cache!==false){if(CACHE.size>=150)CACHE.delete(CACHE.keys().next().value!);CACHE.set(concept.id,{time:Date.now(),images:photos});}
 const images=dedupeByUrl([...photos,...illustrations]).slice(0,6);
 return{images,status:images.length?'ok':succeeded?'no-match':'unavailable',conceptId:concept.id,candidatesExamined:pages.length};
}
