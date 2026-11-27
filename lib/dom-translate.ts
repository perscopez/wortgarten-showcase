/**
 * Turkish → German interface translation. The app's interface was written in Turkish; when the
 * language setting is German, visible text and accessible labels are swapped through this dictionary.
 * Pure functions only, so tests can run them without a browser.
 */
export type Dictionary=Record<string,string>;

const TURKISH_LETTERS=/[çğışİÇĞŞ]/;
const TURKISH_WORDS=/(?<!\p{L})(ve|bir|bu|şu|için|ile|ama|gibi|daha|veya|kelime\p{L}*|görsel\p{L}*|göster|gizle|tekrar|yeni|doğru|yanlış|tamam|kaydet|seç|yaz|dinle|bugün|gün|saat|dakika|kart\p{L}*|örnek|anlam\p{L}*|cümle\p{L}*|büyüt|ör|örn)(?!\p{L})/iu;
export function looksTurkish(text:string){return TURKISH_LETTERS.test(text)||TURKISH_WORDS.test(text);}

const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

export function createTranslator(dict:Dictionary){
 const exact=new Map<string,string>();
 for(const [tr,de] of Object.entries(dict))exact.set(tr.replace(/\s+/g,' ').trim(),de);
 // Pieces of longer strings (template literals, labels joined with a word) are replaced inside the text,
 // longest first; the result is kept only if nothing Turkish is left, so mixed sentences never appear.
 const fragments=[...exact.keys()].filter(k=>k.length>=4&&/\p{L}/u.test(k)).sort((a,b)=>b.length-a.length);
 const fragmentPattern=fragments.length?new RegExp(`(?<![\\p{L}\\p{N}])(?:${fragments.map(escape).join('|')})(?![\\p{L}\\p{N}])`,'gu'):null;
 const cache=new Map<string,string|null>();
 /** Returns the German text, or null when the text is not a known interface string. */
 function translate(text:string):string|null{
  if(!text||!/\p{L}/u.test(text))return null;
  const cached=cache.get(text);if(cached!==undefined)return cached;
  const lead=text.match(/^\s*/)![0],trail=text.slice(lead.length).match(/\s*$/)![0];
  const core=text.slice(lead.length,text.length-trail.length).replace(/\s+/g,' ');
  let out:string|null=null;
  const hit=exact.get(core);
  if(hit!==undefined)out=lead+hit+trail;
  else if(fragmentPattern){
   const replaced=core.replace(fragmentPattern,m=>exact.get(m)!);
   if(replaced!==core&&!looksTurkish(replaced))out=lead+replaced+trail;
  }
  if(cache.size>5000)cache.clear();
  cache.set(text,out);
  return out;
 }
 return translate;
}

/** Illustrations with Turkish labels have German copies in "<dir>-de". */
const ART=/\/vocabulary-art\/(teaching-scenes|lesson-20261108|audit-20261109)\//;
export function germanArtSrc(src:string):string|null{
 if(!src||!ART.test(src))return null;
 return src.replace(ART,(_,dir:string)=>`/vocabulary-art/${dir}-de/`);
}
