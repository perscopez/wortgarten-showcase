import data from '../data/compact-card-data.json';
import type {InflectionTableData} from './inflections';
import type {RectionPattern} from './rection';

type Dictionary=Record<string,string[]|undefined>;
type PairDictionary=Record<string,string[][]|undefined>;
const nouns=data.nouns as PairDictionary, adverbs:Dictionary=data.adverbs, verbs:Dictionary=data.verbs, adjectives=data.adjectives as PairDictionary, verbPatterns=data.verbPatterns as PairDictionary, more=data.more as PairDictionary;
/** A usage pattern with its Turkish meaning; curated rows also carry no example, verified ones may. */
export type CompactPattern={de:string;tr:string;example?:{de:string;tr:string}};
const labels:Record<string,string>={noun:'İsim',verb:'Fiil',adjective:'Sıfat',adverb:'Zarf',preposition:'Edat',phrase:'Kalıp',contraction:'Birleşik biçim',conjunction:'Bağlaç',pronoun:'Zamir',article:'Artikel',numeral:'Sayı'};
const overrides:Record<string,string>={achten:'verb',gefallen:'verb',Leute:'noun',gegen:'preposition',während:'preposition',obwohl:'conjunction','im echten Leben':'phrase','Klatsch und Tratsch':'phrase'};
const fallbackExamples:Record<string,[string,string]>={hübsch:['Das Kleid ist hübsch.','Elbise güzel.'],'Klatsch und Tratsch':['Sie interessiert sich nicht für Klatsch und Tratsch.','Dedikoduyla ilgilenmiyor.']};
function lookup<T>(record:Record<string,T|undefined>,key:string){return Object.hasOwn(record,key)?record[key]:undefined;}
export function compactKind(word:string,pos:string){
 const key=word.trim().normalize('NFC');
 if(Object.hasOwn(overrides,key))return overrides[key];
 if(lookup(adverbs,key))return 'adverb';
 if((!pos||pos==='unknown')&&lookup(nouns,key))return 'noun';
 return ({substantiv:'noun',adjektiv:'adjective',adverb:'adverb',präposition:'preposition',konjunktion:'conjunction'} as Record<string,string>)[pos]||pos;
}
const lookupVerb=(record:PairDictionary,key:string)=>{
 const bare=key.replace(/^sich\s+/i,'');
 return lookup(record,key)||lookup(record,bare)||lookup(record,'sich '+bare);
};
export function compactFacts(word:string,kind:string,tables:InflectionTableData[],rection:RectionPattern[]){
 const key=word.trim().normalize('NFC'),bare=key.replace(/^sich\s+/i,'');
 const verifiedPatterns:CompactPattern[]=rection.map(({pattern,complements,example})=>{
  const rules=complements.filter(c=>c.preposition).map(c=>c.preposition+' + '+c.case);
  const sentence=example?.parts?.map(p=>p.text).join('').trim();
  return {de:rules.length&&!pattern.includes('+')?pattern+' · '+[...new Set(rules)].join(', '):pattern,tr:'',example:sentence&&example.translation?{de:sentence,tr:example.translation}:undefined};
 });
 const specific=kind==='noun'?lookup(nouns,key):kind==='adjective'?lookup(adjectives,key):kind==='verb'?lookupVerb(verbPatterns,key):undefined;
 // Every word the app knows has at least one Turkish-glossed pattern: authored extras fill the gaps.
 const curatedRows=specific?.length?specific:lookupVerb(more,key)||lookup(more,bare.toLocaleLowerCase('de'))||lookup(nouns,key)||lookupVerb(verbPatterns,key)||lookup(adjectives,key);
 const curated:CompactPattern[]|undefined=curatedRows?.map(([de,tr=''])=>({de,tr}));
 const relevant=kind==='adjective'?verifiedPatterns.filter((_,i)=>rection[i].complements.some(c=>c.preposition)):verifiedPatterns;
 const seen=new Set<string>();
 const patterns=(curated?.length?curated:relevant).filter(p=>!seen.has(p.de)&&!!seen.add(p.de)).slice(0,3);
 const row=(field:string)=>{
  for(const table of tables){
   if(!/indikativ|indicative/i.test(table.title))continue;
   const i=table.columns.indexOf(field);
   const value=i<0?undefined:table.rows.find(r=>/^er\s*\/\s*sie\s*\/\s*es$/i.test(r.label))?.cells[i]?.join(' / ');
   if(value)return value;
  }
  return '';
 };
 const short=lookup(verbs,key)||lookup(verbs,bare);
 return {
  pluralOnly:kind==='noun'&&['Leute','Ferien','Eltern','Kosten'].includes(key)?key:'',
  type:Object.hasOwn(labels,kind)?labels[kind]:'',
  patterns,
  synonym:kind==='adverb'?lookup(adverbs,key)?.[0]:'',
  verb:kind==='verb'?[['Infinitiv',key==='beeilen'?'sich beeilen':word],['Präteritum',short?.[0]||row('Präteritum')],['Perfekt',short?.[1]||row('Perfekt')]].filter(([,value])=>!!value):[],
  example:Object.hasOwn(fallbackExamples,key)?fallbackExamples[key]:undefined,
 };
}
