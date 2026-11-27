/**
 * Which case a pattern governs, when its wording makes that certain.
 * Used to complete patterns whose source row does not state "· auf + Akkusativ" itself.
 */
const DATIVE=new Set(['mit','bei','nach','von','zu','aus','seit','gegenüber']);
const ACCUSATIVE=new Set(['für','um','durch','gegen','ohne','bis']);
const TWO_WAY=new Set(['an','auf','in','unter','vor','hinter','neben','zwischen','über']);
const DAT_FORMS=new Set(['dem','einem','jemandem','diesem','meinem','seinem','ihrem','der','einer','dieser','meiner','seiner','ihrer','keinem','keiner','allem']);
const ACC_FORMS=new Set(['einen','jemanden','die','das','ein','eine','dieses','diese','etwas']);
const EN_DETS=new Set(['den','meinen','seinen','ihren','diesen','keinen']);
const DAT_PLURAL=new Set(['ferien','eltern','kindern','leuten','jahren','tagen','wochen','freunden','stunden','minuten']);
const MASC_SING=new Set(['bus','tisch','bahnhof','arzt','preis','vertrag','beruf','kunden','kollegen','patienten','nachbarn']);
const NOT_ZU_PREP=new Set(['tun','sein','haben','kommen','helfen','sprechen','sehen','hören','gehen','machen','teuer','spät','früh','viel','wenig','groß','klein','weit','nah','laut','leise','schnell','langsam','schwer','leicht','alt','jung','gut','schlecht','müde','voll','eng','oft','lange','sehr']);
const CLOCK_NUMS=new Set(['eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn','elf','zwölf']);
// Forms that only occur in one case when there is no preposition: jemandem, jemanden, jemandes, einem, einen, eines
const BARE_DAT=new Set(['jemandem','einem']);
const BARE_ACC=new Set(['jemanden','einen','etwas']);
const BARE_GEN=new Set(['jemandes','eines']);
export type CaseHint={prep?:string;governed:'Akkusativ'|'Dativ'|'Genitiv'|'Dativ + Akkusativ'};
const STATED=/Akkusativ|Dativ|Genitiv/;

export function caseHint(de:string):CaseHint|null{
 if(STATED.test(de))return null;
 const tokens=de.replace(/\([^)]*\)/g,' ').toLocaleLowerCase('de').match(/[\p{L}]+/gu)||[];
 const i=tokens.findIndex((t,idx)=>{
  if(!DATIVE.has(t)&&!ACCUSATIVE.has(t)&&!TWO_WAY.has(t))return false;
  if(idx===tokens.length-1)return t==='nach'&&idx>=2&&tokens[idx-2]==='meiner'&&tokens[idx-1]==='meinung';
  if(t==='zu'&&NOT_ZU_PREP.has(tokens[idx+1]))return false;
  if(t==='um'&&(CLOCK_NUMS.has(tokens[idx+1])||tokens.slice(idx+1).some((w,j)=>w==='zu'&&NOT_ZU_PREP.has(tokens[idx+2+j]))))return false;
  if(t==='bis'&&(tokens[idx+1]==='zu'||tokens[idx+1]==='zum'||tokens[idx+1]==='zur'))return false;
  return true;
 });
 if(i>=0){
  const prep=tokens[i];
  if(DATIVE.has(prep))return{prep,governed:'Dativ'};
  if(ACCUSATIVE.has(prep))return{prep,governed:'Akkusativ'};
  const detIdx=tokens.slice(i+1,i+3).findIndex(t=>DAT_FORMS.has(t)||ACC_FORMS.has(t)||EN_DETS.has(t));
  if(detIdx>=0){
   const det=tokens[i+1+detIdx];
   if(EN_DETS.has(det)){
    const noun=tokens[i+2+detIdx];
    if(noun&&DAT_PLURAL.has(noun))return{prep,governed:'Dativ'};
    if(noun&&(!noun.endsWith('n')||MASC_SING.has(noun)))return{prep,governed:'Akkusativ'};
    return null;
   }
   if(det!=='etwas'){
    const d=DAT_FORMS.has(det)&&!ACC_FORMS.has(det),a=ACC_FORMS.has(det)&&!DAT_FORMS.has(det);
    if(d)return{prep,governed:'Dativ'};if(a)return{prep,governed:'Akkusativ'};
   }
  }
  return null;
 }
 const found:CaseHint['governed'][]=[];
 tokens.forEach((t,k)=>{
  if(BARE_DAT.has(t))found.push('Dativ');else if(BARE_ACC.has(t))found.push('Akkusativ');else if(BARE_GEN.has(t)){
   if(t==='jemandes'&&found.includes('Akkusativ'))return;
   found.push('Genitiv');
  }
  // "den" + a singular noun is masculine Akkusativ; a noun ending in -n could be a dative plural or a weak noun, so it is left alone
  else if(t==='den'&&tokens[k+1]&&!tokens[k+1].endsWith('n'))found.push('Akkusativ');
 });
 const uniq=[...new Set(found)];
 if(uniq.length===1)return{governed:uniq[0]};
 if(uniq.length===2&&uniq[0]==='Dativ'&&uniq[1]==='Akkusativ')return{governed:'Dativ + Akkusativ'};
 return null;
}
/** Adds the missing grammar note in the same format the curated rows use ("· auf + Akkusativ"). */
export function withCaseNote(de:string):string{
 const h=caseHint(de);if(!h)return de;
 return de+' · '+(h.prep?h.prep+' + ':'')+h.governed;
}
