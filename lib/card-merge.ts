import {sameCardIdentity,type DuplicateCandidate} from './card-duplicates';
import {parsePersonalPatterns,phraseOf,type PersonalPattern} from './pattern-practice';
import {validReviewState,type ScheduledCard} from './review-scheduler';

export type MergeCard=DuplicateCandidate&ScheduledCard&{meaning:string;patterns?:PersonalPattern[]};
const text=(value:unknown)=>typeof value==='string'?value.trim():'';
const senses=(meaning:string)=>new Set(meaning.split(';').map(part=>part.replace(/\s*\([^)]*\)\s*$/,'').trim().toLocaleLowerCase('tr')).filter(Boolean));

export function isMergeCard(value:unknown):value is MergeCard{
 if(!value||typeof value!=='object')return false;
 const c=value as MergeCard;
 return typeof c.id==='string'&&typeof c.word==='string'&&typeof c.meaning==='string'&&
  [c.reviews,c.interval,c.due].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0);
}

export function safeDuplicate(a:MergeCard,b:MergeCard){
 if(!sameCardIdentity(a,b))return false;
 // Match explicit word types before considering senses, especially noun/verb homographs.
 const kind=(c:MergeCard)=>c.partOfSpeech&&c.partOfSpeech!=='unknown'?c.partOfSpeech:c.article?'noun':'';
 if(!kind(a)||kind(a)!==kind(b)||(kind(a)==='noun'&&a.article!==b.article))return false;
 const left=senses(a.meaning),right=senses(b.meaning);
 return [...left].some(value=>right.has(value));
}

function contentScore(card:MergeCard){
 const flagged=!!card.qualityFlag&&typeof card.qualityFlag==='object'&&'status' in card.qualityFlag&&card.qualityFlag.status==='pending';
 const paired=text(card.example)&&text(card.translation);
 const tables=(card.inflections?.tables?.length||0)>0;
 const governed=!!card.rection&&typeof card.rection==='object'&&'status' in card.rection&&card.rection.status==='known';
 const lexical=Math.min(4,senses(card.meaning).size)*4+Math.min(120,text(card.meaning).length)/120;
 return (flagged?-1000:0)+lexical+(paired?3:0)+(tables?3:0)+(governed?2:0)+(card.photo?1:0)+Math.min(3,card.patterns?.length||0);
}

export function strongestSchedule<T extends MergeCard>(a:T,b:T):T{
 if(a.reviews!==b.reviews)return a.reviews>b.reviews?a:b;
 const reviewedAt=(c:T)=>validReviewState(c.reviewState)?c.reviewState.lastReviewedAt:0;
 if(reviewedAt(a)!==reviewedAt(b))return reviewedAt(a)>reviewedAt(b)?a:b;
 return a;
}

/** Keep the coherent lexical version and the strongest full schedule independently. */
export function mergeCardVersions<T extends MergeCard>(existing:T,incoming:T):T{
 const preferred=contentScore(incoming)>contentScore(existing)?incoming:existing;
 const other=preferred===existing?incoming:existing;
 const schedule=strongestSchedule(existing,incoming);
 const merged={...preferred,id:existing.id,due:schedule.due,interval:schedule.interval,reviews:schedule.reviews,reviewState:schedule.reviewState};
 const created=[existing.created,incoming.created].filter((n):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0);
 if(created.length)merged.created=Math.min(...created);
 if(!text(merged.note)&&text(other.note))Object.assign(merged,{note:other.note});
 const patterns=new Map<string,PersonalPattern>();
 for(const row of [...(preferred.patterns||[]),...(other.patterns||[])]){
  if(!Array.isArray(row)||typeof row[0]!=='string'||typeof row[1]!=='string')continue;
  try{
   const valid=parsePersonalPatterns([row]);
   if(!valid?.length)continue;
   const key=phraseOf(valid[0][0]).normalize('NFC').trim().toLocaleLowerCase('de');
   if(!patterns.has(key))patterns.set(key,valid[0]);
  }catch{}
 }
 if(patterns.size)merged.patterns=[...patterns.values()].slice(0,24);
 return merged;
}
