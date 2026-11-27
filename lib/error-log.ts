import type {ExerciseKind} from './daily-exercise';

/**
 * Error log: what kind of mistakes the learner makes, so practice can aim at the most frequent kind.
 * Stored on this device and included in file backups. Capped, newest first.
 */
export const ERROR_LOG_KEY='wortgarten-error-log-v1';
export type ErrorType='cekim'|'edat'|'hal'|'siralama'|'kalip'|'artikel'|'yazim'|'baglam'|'anlam'|'cumle';
export type ErrorEntry={at:number;type:ErrorType;word:string;expected:string;given:string};
export type ErrorLog={version:1;entries:ErrorEntry[]};
export const ERROR_LABELS:Record<ErrorType,{label:string;hint:string}>={
 edat:{label:'Edat seçimi',hint:'Fiil + edat kalıplarını Kalıplar bölümünde “Yazarak çalış” ile pekiştir.'},
 hal:{label:'Hâl (Akkusativ / Dativ)',hint:'Hâl sorularını Kalıplar’da ve “Hâl → biçim” bölümünde çalış.'},
 siralama:{label:'Kelime sırası',hint:'Kalıp ve cümle kurma alıştırmalarını tekrarla; fiil ikinci sırada.'},
 kalip:{label:'Kalıbı hatırlama',hint:'Kalıpları dikte ve “Kendi cümleni kur” ile çalış.'},
 artikel:{label:'Artikel',hint:'Artikel bölümünde ve kelimeleri artikeliyle yazarak çalış.'},
 yazim:{label:'Yazım',hint:'Yazarak sorulan kelimeleri ä ö ü ß tuşlarıyla tekrar et.'},
 baglam:{label:'Cümle içinde kelime',hint:'Cümlede boşluk doldurma ve örnek cümleleri sesli dinle.'},
 anlam:{label:'Anlam',hint:'Zorlandığın kelimeler turunu kullan.'},
 cekim:{label:'Çekim biçimi',hint:'“Biçim bul” bölümünde ilgili fiil ve isim çekimlerini çalış.'},
 cumle:{label:'Kendi cümlen',hint:'Kalıbı kullanıp cümleni kontrol listesiyle gözden geçir.'},
};
const MAX=300,DAY=86400000;
export const emptyErrorLog=():ErrorLog=>({version:1,entries:[]});
export function parseErrorLog(value:unknown):ErrorLog{
 if(value===null||value===undefined)return emptyErrorLog();
 const v=value as ErrorLog;
 if(!v||v.version!==1||!Array.isArray(v.entries)||v.entries.length>MAX)throw Error('Hata defteri okunamadı.');
 for(const e of v.entries)if(!e||!Object.hasOwn(ERROR_LABELS,e.type)||!Number.isFinite(e.at)||e.at<0||![e.word,e.expected,e.given].every(s=>typeof s==='string'&&s.length<=160))throw Error('Hata kaydı geçersiz.');
 return v;
}
export function mergeErrorLogs(local:ErrorLog,incoming:ErrorLog):ErrorLog{
 const entries=new Map<string,ErrorEntry>();
 for(const e of [...local.entries,...incoming.entries])entries.set(JSON.stringify([e.at,e.type,e.word,e.expected,e.given]),e);
 return {version:1,entries:[...entries.values()].sort((a,b)=>b.at-a.at).slice(0,MAX)};
}
export function addError(log:ErrorLog,e:ErrorEntry):ErrorLog{
 const clip=(s:string)=>s.slice(0,160);
 const entry={...e,word:clip(e.word),expected:clip(e.expected),given:clip(e.given)};
 return{version:1,entries:[entry,...log.entries].slice(0,MAX)};
}
const plainWord=(s:string)=>s.replace(/^(der|die|das)\s+/i,'').trim().toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');
/** Which kind of mistake an exercise miss counts as. Article-only slips in a recalled word are told apart from spelling slips. */
export function classifyError(kind:ExerciseKind,expected:string,given:string):ErrorType{
 switch(kind){
  case 'article':return 'artikel';
  case 'pattern':return 'edat';
  case 'pattern-case':return 'hal';
  case 'build-sentence':case 'build-pattern':return 'siralama';
  case 'pattern-type':case 'pattern-fill':return 'kalip';
  case 'cloze':return 'baglam';
  case 'choice':case 'reverse-choice':return 'anlam';
  default:{
   const a=/^(der|die|das)\s/i.exec(expected),b=/^(der|die|das)\s/i.exec(given.trim());
   if(a&&plainWord(expected)===plainWord(given)&&(!b||b[1].toLowerCase()!==a[1].toLowerCase()))return 'artikel';
   return 'yazim';
  }
 }
}
/** Counts per type within the last `days` days, most frequent first. */
export function summarizeErrors(log:ErrorLog,now=Date.now(),days=14){
 const since=now-days*DAY,counts=new Map<ErrorType,number>();
 for(const e of log.entries)if(e.at>=since)counts.set(e.type,(counts.get(e.type)||0)+1);
 const list=[...counts.entries()].map(([type,count])=>({type,count})).sort((a,b)=>b.count-a.count);
 return{total:list.reduce((n,x)=>n+x.count,0),list,top:list[0]?.type};
}
/** Fire-and-forget: a failed write never interrupts practice. */
export function recordError(e:Omit<ErrorEntry,'at'>&{at?:number}){
 void import('./learning-records').then(m=>m.updateLearningValue(ERROR_LOG_KEY,prev=>{let log:ErrorLog;try{log=parseErrorLog(prev);}catch{log=emptyErrorLog();}return addError(log,{...e,at:e.at??Date.now()});})).catch(()=>{});
}
