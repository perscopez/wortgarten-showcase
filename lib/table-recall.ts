import {GRAMMAR_REFERENCE,type GrammarReferenceTable} from './grammar-reference';
export const TABLE_RECALL_SESSION_KEY='wortgarten-table-session-v1';
export const TABLE_RECALL_KEY='wortgarten-table-recall-v1';
export const TABLE_RECALL_INTERVALS=[1,3,7,14,30] as const;
export type RecallOutcome='correct'|'wrong'|'assisted'|'revealed';
export type TableRecallCell={id:string;signature:string;tableId:string;rowLabel:string;columnLabel:string;rowIndex:number;columnIndex:number;context:string;answers:string[];sources:GrammarReferenceTable['sources']};
export type RecallTable={id:string;title:string;summary:string;columns:string[];rows:{label:string;cells:{text:string;recallId?:string}[]}[];cells:TableRecallCell[];sources:GrammarReferenceTable['sources']};
export type TableRecallItem={signature:string;attempts:number;unassistedCorrect:number;assistedCorrect:number;wrong:number;revealed:number;hints:number;recallDays:number;intervalIndex:number;dueDay:string;lastAdvancedDay:string|null;lastAnsweredDay:string;lastOutcome:RecallOutcome;lastAttemptToken?:string};
export type TableRecallProgress=Record<string,TableRecallItem>;
const supported=new Set(['definite','indefinite','kein','possessive-declension','personal-pronouns','reflexive','demonstrative-dies','interrogative-welch','stem-change','modal-past']);
export function normalizeTableRecallAnswer(value:string){return value.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');}
function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(36);}
function sourceAnswers(value:string):string[]{const parts=value.split(/\s*\/\s*/).map(s=>s.trim());return parts.length&&parts.every(s=>/^[\p{L}]+$/u.test(s))?[...new Set(parts)]:[];}
const personContexts:Record<string,string>={ben:'1. kişi · tekil (ich)',sen:'2. kişi · tekil (du)','o (erkek)':'3. kişi · tekil · Maskulin (er)','o (kadın)':'3. kişi · tekil · Feminin (sie)','o (nötr)':'3. kişi · tekil · Neutrum (es)',biz:'1. kişi · çoğul (wir)','siz (samimi çoğul)':'2. kişi · çoğul (ihr)',onlar:'3. kişi · çoğul (sie)','siz (resmî)':'resmî hitap · tekil veya çoğul (Sie)',ich:'1. kişi · tekil (ich)',du:'2. kişi · tekil (du)','er / sie / es':'3. kişi · tekil (er / sie / es)',wir:'1. kişi · çoğul (wir)',ihr:'2. kişi · çoğul (ihr)','sie / Sie':'3. kişi çoğul / resmî tekil veya çoğul (sie / Sie)'};
function columnContext(label:string){return label.includes('Maskulin')?'Maskulin · tekil':label.includes('Feminin')?'Feminin · tekil':label.includes('Neutrum')?'Neutrum · tekil':label;}
/** Explicit paradigms only; no inference from arbitrary reference prose. */
export function buildRecallTables(reference:GrammarReferenceTable[]=GRAMMAR_REFERENCE):RecallTable[]{
 return reference.filter(t=>supported.has(t.id)).map(t=>{
  const cells:TableRecallCell[]=[];const rows=t.rows.map((row,rowIndex)=>({label:row.label,cells:row.cells.map((text,columnIndex)=>{
   const columnLabel=t.columns[columnIndex];const answers=columnLabel?sourceAnswers(text):[];
   if(!answers.length||(t.id==='stem-change'&&answers.some(a=>normalizeTableRecallAnswer(a)===normalizeTableRecallAnswer(columnLabel))))return{text};
   const signature=JSON.stringify([t.id,row.label,columnLabel,answers.map(normalizeTableRecallAnswer).sort()]);const id=`table-cell-v1:${t.id}:${hash(signature)}`;
   const person=t.id==='personal-pronouns'||t.id==='reflexive'||t.id==='stem-change'||t.id==='modal-past';const context=person?`${personContexts[row.label]||row.label} · ${columnLabel}`:`${row.label} · ${columnContext(columnLabel)}`;
   cells.push({id,signature,tableId:t.id,rowLabel:row.label,columnLabel,rowIndex,columnIndex,context,answers,sources:t.sources.map(s=>({...s}))});return{text,recallId:id};
  })}));
  return{id:t.id,title:t.title,summary:t.summary,columns:t.columns.map(columnContext),rows,cells,sources:t.sources.map(s=>({...s}))};
 });
}
export function checkTableRecallAnswer(cell:TableRecallCell,answer:string){const value=normalizeTableRecallAnswer(answer);return !!value&&cell.answers.some(a=>normalizeTableRecallAnswer(a)===value);}
export function tableRecallDay(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
function validDay(v:unknown):v is string{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;}
function plusDays(day:string,n:number){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
const count=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
export function isTableRecallItem(v:unknown):v is TableRecallItem{
 if(!v||typeof v!=='object')return false;const p=v as TableRecallItem;
 return typeof p.signature==='string'&&p.signature.length<5000&&[p.attempts,p.unassistedCorrect,p.assistedCorrect,p.wrong,p.revealed,p.hints,p.recallDays].every(count)&&p.attempts===p.unassistedCorrect+p.assistedCorrect+p.wrong+p.revealed&&p.hints<=p.attempts&&p.recallDays<=p.unassistedCorrect&&Number.isInteger(p.intervalIndex)&&p.intervalIndex>=-1&&p.intervalIndex<5&&validDay(p.dueDay)&&validDay(p.lastAnsweredDay)&&(p.lastAdvancedDay===null||validDay(p.lastAdvancedDay))&&['correct','wrong','assisted','revealed'].includes(p.lastOutcome);
}
function current(cell:TableRecallCell,progress:TableRecallProgress){const p=progress[cell.id];return isTableRecallItem(p)&&p.signature===cell.signature?p:undefined;}
export function hasLearnedRecallTable(table:RecallTable,progress:TableRecallProgress){return table.cells.some(c=>(current(c,progress)?.attempts||0)>0);}
export function getDueTableCells(progress:TableRecallProgress,day=tableRecallDay(),includeNew=false){if(!validDay(day))return[];return buildRecallTables().flatMap(t=>t.cells).filter(c=>{const p=current(c,progress);return p?p.dueDay<=day:includeNew;});}
export function nextTableRecallDue(progress:TableRecallProgress):number|null{
 const due=buildRecallTables().flatMap(t=>t.cells).map(c=>current(c,progress)).filter((p):p is TableRecallItem=>!!p&&p.attempts>0).map(p=>{const[y,m,d]=p.dueDay.split('-').map(Number);return new Date(y,m-1,d).getTime();});return due.length?Math.min(...due):null;
}
/** Scaffolding grows 1 → 3 blanks; full table requires two spaced recalls for every form. */
export function selectTableRecallRound(table:RecallTable,progress:TableRecallProgress,{day=tableRecallDay(),maxCells=5,includeEarly=false,scaffold=true}:{day?:string;maxCells?:number;includeEarly?:boolean;scaffold?:boolean}={}){
 const full=table.cells.length>0&&table.cells.every(c=>(current(c,progress)?.recallDays||0)>=2);const mode:'partial'|'full'=full?'full':'partial';
 const ranked=table.cells.filter(c=>{const p=current(c,progress);return includeEarly||!p||p.dueDay<=day;}).map((cell,index)=>({cell,index})).sort((a,b)=>{const ap=current(a.cell,progress),bp=current(b.cell,progress);const rank=(p?:TableRecallItem)=>p&&p.lastOutcome!=='correct'?0:!p?1:2;return rank(ap)-rank(bp)||(ap?.dueDay||'').localeCompare(bp?.dueDay||'')||a.index-b.index;}).map(x=>x.cell);
 const budget=Number.isFinite(maxCells)?Math.max(0,Math.floor(maxCells)):0;
 if(full)return{mode,cells:ranked.slice(0,budget).map(c=>({...c,answers:[...c.answers]}))};
 const size=scaffold?(table.cells.some(c=>(current(c,progress)?.unassistedCorrect||0)>0)?3:1):budget;return{mode,cells:ranked.slice(0,Math.max(0,Math.min(size,budget)))};
}
/** Outcome updates never mutate source tables or existing progress. */
export function recordTableRecallRound(progress:TableRecallProgress,cells:TableRecallCell[],values:Record<string,string>,support:{hint:boolean;reveal:boolean;attemptToken?:string},day=tableRecallDay()):TableRecallProgress{
 if(!validDay(day))throw Error('Geçersiz çalışma günü');const next={...progress};
 for(const cell of cells){const old=current(cell,progress);if(support.attemptToken&&old?.lastAttemptToken===support.attemptToken)continue;const right=checkTableRecallAnswer(cell,values[cell.id]||'');const outcome:RecallOutcome=support.reveal?'revealed':!right?'wrong':support.hint?'assisted':'correct';
  const p:TableRecallItem={signature:cell.signature,attempts:(old?.attempts||0)+1,unassistedCorrect:(old?.unassistedCorrect||0)+(outcome==='correct'?1:0),assistedCorrect:(old?.assistedCorrect||0)+(outcome==='assisted'?1:0),wrong:(old?.wrong||0)+(outcome==='wrong'?1:0),revealed:(old?.revealed||0)+(outcome==='revealed'?1:0),hints:(old?.hints||0)+(support.hint?1:0),recallDays:old?.recallDays||0,intervalIndex:old?.intervalIndex??-1,dueDay:old?.dueDay||day,lastAdvancedDay:old?.lastAdvancedDay||null,lastAnsweredDay:day,lastOutcome:outcome,...(support.attemptToken?{lastAttemptToken:support.attemptToken}:{})};
  if(outcome!=='correct'){p.recallDays=0;p.intervalIndex=-1;p.dueDay=plusDays(day,1);}
  else if((!old||day>=old.dueDay)&&(!old?.lastAdvancedDay||day>old.lastAdvancedDay)){p.recallDays++;p.intervalIndex=Math.min(4,(old?.intervalIndex??-1)+1);p.dueDay=plusDays(day,TABLE_RECALL_INTERVALS[p.intervalIndex]);p.lastAdvancedDay=day;}
  next[cell.id]=p;
 }
 return next;
}
export function parseTableRecallValue(value:unknown):{valid:boolean;progress:TableRecallProgress}{
 if(value===null||value===undefined)return{valid:true,progress:{}};
 if(!value||typeof value!=='object'||Array.isArray(value))return{valid:false,progress:{}};
 const v=value as{version?:unknown;progress?:unknown};if(v.version!==1||!v.progress||typeof v.progress!=='object'||Array.isArray(v.progress))return{valid:false,progress:{}};
 const entries=Object.entries(v.progress);if(entries.length>10000||!entries.every(([id,p])=>id.startsWith('table-cell-v1:')&&id.length<1000&&isTableRecallItem(p)))return{valid:false,progress:{}};
 return{valid:true,progress:Object.fromEntries(entries.map(([id,p])=>[id,{...p as TableRecallItem}]))};
}
export async function persistTableRecallProgress(progress:TableRecallProgress,write:(key:string,value:unknown)=>Promise<void>):Promise<void>{const envelope={version:1,progress};if(!parseTableRecallValue(envelope).valid)throw Error('Çekim ilerlemesi geçersiz; eski kayıt korunuyor.');await write(TABLE_RECALL_KEY,envelope);}
