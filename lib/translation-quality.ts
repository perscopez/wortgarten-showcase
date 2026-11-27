/** Shared validation of untrusted machine-translation responses. No provider error is a translation. */
function decodeHtmlEntities(s:string){return s.replace(/&#(?:39|039|x27|x027);|&apos;/gi,"'").replace(/&quot;|&#(?:34|034|x22);/gi,'"').replace(/&nbsp;|&#(?:160|xa0);/gi,' ').replace(/&amp;|&#(?:38|038|x26);/gi,'&');}
export function parseMachineTranslation(input:string,payload:unknown):{text:string;status:string}{
 const p=payload as any;if(p?.quotaFinished===true||p?.quotaFinished==='true')return{text:'',status:'quota'};
 if(Number(p?.responseStatus)!==200)return{text:'',status:String(p?.responseStatus||'empty')};
 const raw=p?.responseData?.translatedText;if(typeof raw!=='string'||!raw.trim()||raw.length>10000)return{text:'',status:'empty'};
 const text=decodeHtmlEntities(raw).normalize('NFC').trim();
 if(!text)return{text:'',status:'empty'};
 if(/MYMEMORY\s+(WARNING|ERROR)|YOU USED ALL AVAILABLE|QUERY LENGTH LIMIT|INVALID LANGUAGE PAIR|NO QUERY SPECIFIED|PLEASE SELECT TWO DISTINCT LANGUAGES|TRANSLATION QUOTA/i.test(text))return{text:'',status:'provider_error'};
 const normalize=(s:string)=>decodeHtmlEntities(s).normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
 if(normalize(text)===normalize(input))return{text:'',status:'unchanged'};
 return{text,status:'ok'};
}
