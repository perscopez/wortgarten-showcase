import type {LookupData} from './enrichment';

/** Precomputed full word data for the cards of a pack (public/pack-data/<packId>.json, built by scripts/generate-pack-data.mjs). */
export type PackExample={id:number;de:string;tr:string;by:string};
export type PackEntry={pos?:string;article?:string;plural?:string;source?:string;forms?:unknown;rection?:unknown;photo?:unknown;examples?:PackExample[];checked?:boolean};
export type PackData=Record<string,PackEntry>;
export const PACK_DATA_KEY='wortgarten-pack-data-v1';

export async function loadPackData(packId:string,request:typeof fetch=fetch):Promise<PackData|null>{
 try{
  const res=await request('/pack-data/'+encodeURIComponent(packId)+'.json',{signal:AbortSignal.timeout(15000)});
  if(!res.ok)return null;
  const data=await res.json();
  return data&&typeof data==='object'&&!Array.isArray(data)?data as PackData:null;
 }catch{return null;}
}
export function lookupFromEntry(entry:PackEntry):{data:LookupData;forms:unknown;rection:unknown;photo:unknown}{
 return{data:{partOfSpeech:entry.pos,article:entry.article,plural:entry.plural,source:entry.source,articleAmbiguous:false},forms:entry.forms,rection:entry.rection,photo:entry.photo};
}
/** Example sentences of every entry, ready for the examples cache: [word, sentences]. */
export function exampleEntries(data:PackData):[string,PackExample[]][]{
 if(!data||typeof data!=='object'||Array.isArray(data))return [];
 return Object.entries(data).filter(([,e])=>e&&Array.isArray(e.examples)&&e.examples.length>0).map(([w,e]):[string,PackExample[]]=>[w,e.examples!.filter(x=>x&&typeof x.de==='string'&&typeof x.tr==='string'&&Number.isFinite(x.id))]).filter(([,list])=>list.length>0);
}
