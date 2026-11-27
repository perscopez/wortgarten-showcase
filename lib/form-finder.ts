import {buildInflectionQuestions,normalizeInflectionAnswer,type InflectionPracticeCard,type InflectionQuestion} from './inflection-practice';

/**
 * "Biçim bul": form-finding practice built only from the saved inflection tables of the learner's own words.
 *  - produce:   lemma → type the form of a given cell      (gehen → Präteritum · er/sie/es → ging)
 *  - transform: one form is given → type another form      (der Pfleger → Genitiv · Tekil → des Pflegers)
 *  - identify:  a form is given → which cell is it?        (ging → Präteritum · er/sie/es)
 *  - lemma:     a form is given → type the base form       (ging → gehen)
 * No form is ever generated or guessed: every answer is a cell the source table contains.
 */
export type FormType='produce'|'transform'|'identify'|'lemma';
export type FormMode='mix'|'write'|'recognize';
export const MODE_TYPES:Record<FormMode,FormType[]>={mix:['produce','transform','identify','lemma'],write:['produce','transform'],recognize:['identify','lemma']};
export type Cell={row:string;column:string;answers:string[];tableTitle:string};
export type FormItem={
 id:string;type:FormType;cardId:string;word:string;tableTitle:string;
 /** What is shown as the starting point (a form), if any. */
 given?:{form:string;cell:string};
 /** Description of the cell that is asked for. */
 target:string;
 answers:string[];
 choices?:{label:string;correct:boolean}[];
 /** The whole table, so it can be shown after the answer with the asked cell marked. */
 table:{columns:string[];rows:{label:string;cells:string[][]}[];hit:[number,number][]};
};
const PRONOUNS=new Set(['ich','du','er','sie','es','wir','ihr','er/sie/es']);

function seeded(seed:string){let h=2166136261;for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619);}return()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return((h>>>0)%100000)/100000;};}
function shuffle<T>(list:T[],r:()=>number){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

type Group={cardId:string;word:string;tableTitle:string;cells:InflectionQuestion[]};
function groupsOf(cards:InflectionPracticeCard[],advanced:boolean):Group[]{
 const map=new Map<string,Group>();
 for(const q of buildInflectionQuestions(cards,advanced?'advanced':'basic')){
  const key=q.cardId+'|'+q.tableTitle;const g=map.get(key)||{cardId:q.cardId,word:q.word,tableTitle:q.tableTitle,cells:[]};g.cells.push(q);map.set(key,g);
 }
 return [...map.values()];
}
const label=(q:InflectionQuestion)=>q.column==='Kaynakta verilen'?q.row:q.row+' · '+q.column;
const formOf=(q:InflectionQuestion)=>q.answers[0];
const sameForm=(a:InflectionQuestion,b:InflectionQuestion)=>a.answers.some(x=>b.answers.some(y=>normalizeInflectionAnswer(x)===normalizeInflectionAnswer(y)));
const isAuxRow=(q:InflectionQuestion)=>/^hilfsverb$/i.test(q.row.trim());

function tableOf(group:Group,hit:InflectionQuestion[]){
 const columns=[...new Set(group.cells.map(c=>c.column))],rows=[...new Set(group.cells.map(c=>c.row))];
 const cellAt=(r:string,c:string)=>group.cells.find(x=>x.row===r&&x.column===c)?.answers||[];
 return{columns,rows:rows.map(r=>({label:r,cells:columns.map(c=>cellAt(r,c))})),hit:hit.map(h=>[rows.indexOf(h.row),columns.indexOf(h.column)] as [number,number])};
}
/** Usable groups: at least two distinct forms, so there is something to transform or tell apart. */
export const usableGroups=(cards:InflectionPracticeCard[],advanced=false)=>groupsOf(cards,advanced).filter(g=>new Set(g.cells.map(c=>normalizeInflectionAnswer(formOf(c)))).size>=2);

export function buildFormItems(cards:InflectionPracticeCard[],opts:{mode?:FormMode;advanced?:boolean;seed?:string;size?:number}={}):FormItem[]{
 const {mode='mix',advanced=false,seed='x',size=10}=opts,r=seeded(seed+mode+(advanced?'a':'b'));
 const groups=usableGroups(cards,advanced);if(!groups.length)return[];
 const types=MODE_TYPES[mode],out:FormItem[]=[];const used=new Set<string>();
 const order=shuffle(groups,r);
 for(let n=0;out.length<size&&n<size*6;n++){
  const type=types[n%types.length];const g=order[n%order.length];
  const cells=shuffle(g.cells,r);
  const target=cells[0];
  const base={cardId:g.cardId,word:g.word,tableTitle:g.tableTitle};
  let item:FormItem|null=null;
  if(type==='produce'){
   item={...base,id:'',type,target:label(target),answers:target.answers,table:tableOf(g,[target])};
  }else if(type==='transform'){
   const source=cells.find(c=>!sameForm(c,target)&&!isAuxRow(c));if(!source)continue;
   item={...base,id:'',type,given:{form:formOf(source),cell:label(source)},target:label(target),answers:target.answers,table:tableOf(g,[source,target])};
  }else if(type==='identify'){
   const correct=g.cells.filter(c=>sameForm(c,target));
   const wrong=shuffle(g.cells.filter(c=>!sameForm(c,target)),r);
   const seen=new Set<string>();const distractors=wrong.filter(c=>{const k=label(c);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,3);
   if(distractors.length<2)continue;
   const choices=shuffle([...correct.slice(0,2).map(c=>({label:label(c),correct:true})),...distractors.map(c=>({label:label(c),correct:false}))],r);
   item={...base,id:'',type,given:{form:formOf(target),cell:''},target:'Bu biçim hangi hücre?',answers:correct.map(label),choices,table:tableOf(g,correct)};
  }else{
   // Base form: the infinitive for verbs, Nominativ Singular for nouns (taken from the saved lemma, never generated).
   const kind=/^fiil/i.test(g.tableTitle)?'verb':/^isim/i.test(g.tableTitle)?'noun':'';
   if(!kind||g.tableTitle.toLocaleLowerCase('tr').includes('ek biçimler'))continue;
   const givenCell=cells.find(c=>!isAuxRow(c));if(!givenCell)continue;
   const lemma=g.word.normalize('NFC').trim();
   if(!lemma||givenCell.answers.some(x=>normalizeInflectionAnswer(x).replace(/^(?:der|die|das|den|dem|des)\s+/,'')===normalizeInflectionAnswer(lemma)))continue;
   const nominative=kind==='noun'?g.cells.find(c=>c.row==='Nominativ'&&c.column==='Tekil')?.answers:undefined;
   item={...base,id:'',type,given:{form:formOf(givenCell),cell:''},target:kind==='noun'?'Sözlük biçimi (Nominativ Tekil)':'Sözlük biçimi (Infinitiv)',answers:[...new Set([lemma,...(nominative||[])])],table:tableOf(g,[givenCell])};
  }
  if(!item)continue;
  item.id=`${type}:${g.cardId}:${g.tableTitle}:${item.target}:${item.given?.form||''}`;
  if(used.has(item.id))continue;used.add(item.id);out.push(item);
 }
 return out;
}
function validPronounsForTarget(target=''):Set<string>{
 const head=(target.split('·')[0]||target).toLocaleLowerCase('de');
 const tokens=head.split(/[^a-zäöüß/]+/).filter(Boolean);
 const allowed=new Set<string>();
 for(const t of tokens){
  if(t==='er/sie/es'){allowed.add('er');allowed.add('sie');allowed.add('es');allowed.add('er/sie/es');}
  else if(PRONOUNS.has(t))allowed.add(t);
 }
 if(head.includes('er')&&head.includes('sie')&&head.includes('es'))allowed.add('er/sie/es');
 return allowed;
}
/** Accepts the form alone, with its matching pronoun ("ich beantworte") or, for nouns, with the right article or bare noun (without a wrong article). */
export function checkFormAnswer(item:FormItem,typed:string):'correct'|'close'|'wrong'{
 const n=normalizeInflectionAnswer(typed);if(!n)return 'wrong';
 const stripArticle=(s:string)=>normalizeInflectionAnswer(s).replace(/^(?:der|die|das|den|dem|des)\s+/,'');
 const accepted=new Set(item.answers.flatMap(a=>{const x=normalizeInflectionAnswer(a);return[x,stripArticle(a)];}));
 const allowedPronouns=validPronounsForTarget(item.target);
 const words=n.split(' ');
 const candidates=[n];
 if(words.length>1&&allowedPronouns.has(words[0]))candidates.push(words.slice(1).join(' '));
 if(candidates.some(c=>accepted.has(c)))return 'correct';
 // umlaut written as ae/oe/ue or ß as ss counts as close, not as wrong
 const fold=(s:string)=>s.replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');
 if(candidates.some(c=>[...accepted].some(a=>fold(a)===fold(c))))return 'close';
 return 'wrong';
}
export const TYPE_LABEL:Record<FormType,string>={produce:'BİÇİMİ YAZ',transform:'BAŞKA BİR BİÇİM YAZ',identify:'HANGİ HÜCRE?',lemma:'SÖZLÜK BİÇİMİNİ YAZ'};
