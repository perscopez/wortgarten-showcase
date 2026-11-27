import { GRAMMAR_REFERENCE, type GrammarReferenceTable } from './grammar-reference';
import { RULE_CATALOG, type RuleRecord } from './rule-catalog';
import { getRection, listRectionLemmas, type RectionPattern } from './rection';

export type KnowledgeCategory = 'Tümü' | 'Tablolar' | 'Kurallar' | 'Rektion';
export type KnowledgeCard =
  | {id:string;kind:'table';category:'Tablolar';title:string;prompt:string;summary:string;table:GrammarReferenceTable}
  | {id:string;kind:'rule';category:'Kurallar';title:string;prompt:string;rule:RuleRecord}
  | {id:string;kind:'rection';category:'Rektion';title:string;prompt:string;lemma:string;pattern:RectionPattern;notes:string[]};
export type KnowledgeLength = 10 | 20 | 'all';
export type KnowledgeSession = {queue:KnowledgeCard[];index:number;revealed:boolean;attempts:number;answeredIds:string[];knownIds:string[];missedIds:string[];skipped:number;revisitUsed:string[];finished:boolean};

export function buildKnowledgeDeck():KnowledgeCard[]{
  const tables:KnowledgeCard[]=GRAMMAR_REFERENCE.map(table=>({id:`table:${table.id}`,kind:'table',category:'Tablolar',title:table.title,prompt:`${table.title} — ${table.summary}`,summary:table.summary,table}));
  const rules:KnowledgeCard[]=RULE_CATALOG.map(rule=>({id:rule.ruleId,kind:'rule',category:'Kurallar',title:rule.title,prompt:rule.retrievalPrompt,rule}));
  const rections:KnowledgeCard[]=[];
  for(const lemma of listRectionLemmas()){
    const data=getRection(lemma);
    data.patterns.forEach((pattern,index)=>rections.push({id:`rection:${lemma}:${index}`,kind:'rection',category:'Rektion',title:lemma,prompt:`${lemma}: Bu kullanımda hangi tamlayıcı kalıbını ve hâli öğrenmelisin?`,lemma,pattern,notes:data.notes}));
  }
  return [...tables,...rules,...rections];
}

const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('tr').replace(/ı/g,'i');
export function filterKnowledgeDeck(deck:KnowledgeCard[],category:KnowledgeCategory='Tümü',query=''):KnowledgeCard[]{
  const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
  return deck.filter(card=>(category==='Tümü'||card.category===category)&&terms.every(term=>normalize([card.title,card.prompt,card.kind==='table'?card.summary:card.kind==='rule'?card.rule.shortTR:card.pattern.pattern].join(' ')).includes(term)));
}
export function createKnowledgeSession(deck:KnowledgeCard[],length:KnowledgeLength=20):KnowledgeSession{
  const count=length==='all'?deck.length:Math.min(length,deck.length);
  return {queue:deck.slice(0,count),index:0,revealed:false,attempts:0,answeredIds:[],knownIds:[],missedIds:[],skipped:0,revisitUsed:[],finished:count===0};
}
export function currentKnowledgeCard(session:KnowledgeSession):KnowledgeCard|null{return session.finished?null:session.queue[session.index]??null;}
export function revealKnowledgeAnswer(session:KnowledgeSession):KnowledgeSession{return currentKnowledgeCard(session)?{...session,revealed:true}:session;}
function advance(session:KnowledgeSession):KnowledgeSession{
  const index=session.index+1;
  return {...session,index,revealed:false,finished:index>=session.queue.length};
}
export function skipKnowledgeCard(session:KnowledgeSession):KnowledgeSession{
  if(!currentKnowledgeCard(session))return session;
  return {...advance(session),skipped:session.skipped+1};
}
export function deferKnowledgeCard(session:KnowledgeSession):KnowledgeSession{
  const card=currentKnowledgeCard(session);if(!card)return session;
  const queue=[...session.queue];queue.splice(session.index,1);queue.push(card);
  return {...session,queue,revealed:false,finished:false};
}
export function assessKnowledgeCard(session:KnowledgeSession,known:boolean):KnowledgeSession{
  const card=currentKnowledgeCard(session);if(!card||!session.revealed)return session;
  const answeredIds=session.answeredIds.includes(card.id)?session.answeredIds:[...session.answeredIds,card.id];
  const knownIds=known&&!session.knownIds.includes(card.id)?[...session.knownIds,card.id]:session.knownIds;
  const missedIds=!known&&!session.missedIds.includes(card.id)?[...session.missedIds,card.id]:session.missedIds;
  let next={...session,attempts:session.attempts+1,answeredIds,knownIds,missedIds};
  if(!known&&!session.revisitUsed.includes(card.id)&&session.index+1<session.queue.length){
    const queue=[...next.queue];queue.splice(Math.min(session.index+4,queue.length),0,card);
    next={...next,queue,revisitUsed:[...session.revisitUsed,card.id]};
  }
  return advance(next);
}
export function finishKnowledgeSession(session:KnowledgeSession):KnowledgeSession{return {...session,finished:true,revealed:false};}

/** Vary cards while balancing topics; default20 must not always be the first20 tables. */
export function balancedKnowledgeOrder(cards:KnowledgeCard[],random= Math.random):KnowledgeCard[]{
 const groups=new Map<string,KnowledgeCard[]>();for(const card of cards){const group=groups.get(card.category)||[];group.push(card);groups.set(card.category,group);}for(const group of groups.values())for(let i=group.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[group[i],group[j]]=[group[j],group[i]];}
 const out:KnowledgeCard[]=[];for(let i=0;out.length<cards.length;i++)for(const group of groups.values())if(group[i])out.push(group[i]);return out;
}
