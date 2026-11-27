/**
 * Merging what a lookup (live or precomputed) knows into a saved card.
 * Only empty fields are filled; the learner's own meaning, note, photo and review history are never overwritten.
 */
export type CardLike={word:string;article?:string;plural?:string;example?:string;translation?:string;partOfSpeech?:string;source?:string;note?:string;photo?:unknown;inflections?:{tables:unknown[]}|null;rection?:{status:string}|null;informationCheckedAt?:number};
export type LookupData={partOfSpeech?:string;article?:string;articleAmbiguous?:boolean;plural?:string;source?:string;example?:string;translation?:string};
export function mergeLookup<T extends CardLike>(old:T,d:LookupData,forms:T['inflections']|undefined,rection:T['rection']|undefined,photo:unknown,now=Date.now()):T{
 const realPos=old.partOfSpeech&&old.partOfSpeech!=='unknown'?old.partOfSpeech:'';
 return{...old,informationCheckedAt:now,
  partOfSpeech:realPos||d.partOfSpeech||old.partOfSpeech,
  article:old.article||(!d.articleAmbiguous?d.article:'')||'',
  plural:old.plural||d.plural||'',
  inflections:old.inflections?.tables?.length?old.inflections:forms||old.inflections,
  rection:old.rection?.status==='known'?old.rection:rection||old.rection,
  source:old.source||d.source,
  example:old.example||d.example||'',
  translation:old.translation||((!old.example||old.example===d.example)?d.translation:'')||'',
  ...(old.photo||!photo?{}:{photo})};
}
/** Applies many lookups to a card list in one pass (one storage write instead of one per card). */
export function applyLookups<T extends CardLike&{id:string}>(cards:T[],results:{id:string;word:string;data:LookupData;forms?:T['inflections'];rection?:T['rection'];photo?:unknown}[],now=Date.now()):T[]{
 if(!results.length)return cards;
 const byId=new Map(results.map(r=>[r.id,r]));
 return cards.map(c=>{const r=byId.get(c.id);return r&&r.word===c.word?mergeLookup(c,r.data,r.forms,r.rection,r.photo,now):c;});
}
