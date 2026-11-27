/**
 * German explanations for word cards. Bundled words use the reviewed texts in german-meanings.json;
 * other words are explained from the German Wiktionary ("Bedeutungen") via /api/meaning-de.
 * This module stays free of large imports so that it can be used on the client.
 */
export const GERMAN_MEANING_SOURCE='https://de.wiktionary.org/wiki/';
export function meaningKey(word:string){return (word||'').normalize('NFC').trim().replace(/^(der|die|das)\s+/i,'').replace(/\s+/g,' ');}
export function findGermanMeaning(words:Record<string,string>,word:string):string{
 const key=meaningKey(word);if(!key)return '';
 if(Object.hasOwn(words,key))return words[key];
 const lower=key.toLocaleLowerCase('de');
 for(const k of Object.keys(words))if(k.toLocaleLowerCase('de')===lower)return words[k];
 const bare=key.replace(/^sich\s+/i,'');
 return bare!==key&&Object.hasOwn(words,bare)?words[bare]:'';
}
/** Reads the numbered senses after {{Bedeutungen}} from the German section of a Wiktionary page. */
export function parseGermanMeanings(section:string,clean:(text:string)=>string,limit=2):string{
 const block=section.split(/\{\{Bedeutungen\}\}/)[1];if(!block)return '';
 const senses:string[]=[];
 for(const line of block.split('\n').slice(1)){
  if(!line.trim())break;
  if(/^\{\{/.test(line.trim()))break;
  const m=line.match(/^:\s*\[(\d+[a-z]?)\]\s*(.*)$/);
  if(!m||!/^\d+$/.test(m[1]))continue;
  const text=clean(m[2]).replace(/\s+([,;.:])/g,'$1').replace(/^[,;:\s]+|[,;:\s]+$/g,'').replace(/\s{2,}/g,' ').trim();
  if(text.length<3||/^(siehe|vergleiche)\b/i.test(text))continue;
  if(!senses.includes(text))senses.push(text);
  if(senses.length>=limit)break;
 }
 return senses.join('; ').slice(0,400);
}
/** Hides the answer word inside its own explanation, e.g. for the "which word is meant?" side. */
export function maskWord(text:string,word:string):string{
 const key=meaningKey(word).replace(/^sich\s+/i,'');if(!text||key.length<3)return text;
 const stem=key.length>5?key.slice(0,key.length-2):key;
 const escaped=stem.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return text.replace(new RegExp('\\p{L}*'+escaped+'\\p{L}*','giu'),'…');
}
