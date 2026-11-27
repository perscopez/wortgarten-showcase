import freq from './frequency-de.json';

/**
 * Rule-based first look at a sentence the learner wrote. It only reports what it can know for sure:
 * missing capital or full stop, a common noun written in lower case, and a wrong case after the pattern's preposition.
 * Never more than two notes, so it does not drown the learner in corrections; it does not judge the rest of the grammar.
 */
const EXCLUDE_NOUNS=new Set(['teil','fahren','folge','sorge','reise','ruhig','fein','wessen','dank','laden','wagen','nerven','gründen','schmerzen','fernsehen','klopfen','reifen','schulden','grenzen','kraft','fall','preis','angst','leben','essen','trinken','schlafen','wissen','können','müssen','wollen','sollen','dürfen','mögen','sein','haben','werden','lassen','halten','stehen','gehen','kommen','sehen','hören','lesen','schreiben','lernen','arbeiten','wohnen','kaufen','finden','nehmen','geben','sagen','fragen','bleiben','warten','bezahlen','verstehen','sprechen','bringen','setzen','stellen','legen','liegen','sitzen','ziehen','führen','tragen','spielen','öffnen','schließen','erklären','versuchen','erreichen','bekommen','verlieren','vergessen','besuchen','benutzen','ändern','wechseln','sparen','planen','kochen','putzen','reisen','tanzen','singen','lachen','weinen','denken','glauben','hoffen','meinen','fühlen','freuen','ärgern','kümmern','interessieren','bewerben','entscheiden','erinnern','entschuldigen','bedanken','beschweren','vorstellen','unterhalten','treffen','heiraten','studieren','probieren','reparieren','organisieren','kontrollieren','informieren','diskutieren','telefonieren','fotografieren','reservieren','akzeptieren','garantieren','funktionieren','passieren','morgen','gestern','heute','abends','morgens','mittags','nachts','recht','schuld','leid','wert','egal','schade','ernst','fest','bereit','voll','arm','reich','gut','böse','jung','alt','neu','hoch','tief','weit','nah','lang','kurz','groß','klein','rund','klar','wahr','tot','frei','laut','still','dunkel','hell']);
const NOUNS=new Set((freq as unknown as {words:[string,number,'n'|'v'][]}).words.filter(w=>w[2]==='n').map(w=>w[0].toLocaleLowerCase('de')).filter(w=>!EXCLUDE_NOUNS.has(w)));
const DAT_ONLY=new Set(['dem','einem','meinem','keinem','diesem','seinem','ihrem','deinem','unserem']);
const ACC_ONLY=new Set(['einen']);
const PRONOUNS=new Set(['mir','dir','ihm','ihr','uns','euch','ihnen','mich','dich','sich','ihn']);
const tokenOf=(s:string)=>s.match(/[\p{L}]+/gu)||[];
export type SentenceNote={kind:'capital'|'punctuation'|'noun'|'case';text:string};

export function sentenceNotes(sentence:string,patternDe:string):SentenceNote[]{
 const s=sentence.trim(),notes:SentenceNote[]=[];
 if(!s)return notes;
 // 1) a wrong case after the preposition the pattern governs
 const m=patternDe.match(/·\s*([a-zäöüß]+)\s*\+\s*(Akkusativ|Dativ|Genitiv)/i);
 if(m){
  const prep=m[1].toLocaleLowerCase('de'),want=m[2];
  const toks=tokenOf(s);const i=toks.findIndex(t=>t.toLocaleLowerCase('de')===prep);
  if(i>=0){
   const next=toks[i+1]?.toLocaleLowerCase('de');
   const window=next&&PRONOUNS.has(next)?[next]:toks.slice(i+1,i+3).map(t=>t.toLocaleLowerCase('de'));
   const det=window.find(t=>DAT_ONLY.has(t)||ACC_ONLY.has(t));
   if(det){
    const isDat=DAT_ONLY.has(det);
    if(want==='Akkusativ'&&isDat)notes.push({kind:'case',text:`“${prep}” Akkusativ ister; “${det}” Dativ biçimi. Eril isimde “den/einen”, dişil ve nötrde “die/das/eine/ein” gelir.`});
    if(want==='Dativ'&&!isDat)notes.push({kind:'case',text:`“${prep}” Dativ ister; “${det}” Akkusativ biçimi. “dem/einem” (eril, nötr) ya da “der/einer” (dişil) kullan.`});
   }
  }
 }
 // 2) common nouns in lower case (nouns are capitalised in German)
 const lower=tokenOf(s).filter((t,i)=>i>0&&t===t.toLocaleLowerCase('de')&&NOUNS.has(t));
 if(lower.length)notes.push({kind:'noun',text:`İsimler büyük harfle yazılır: ${[...new Set(lower)].slice(0,2).map(w=>w[0].toLocaleUpperCase('de')+w.slice(1)).join(', ')}.`});
 // 3) capital letter and full stop
 const unquoted=s.replace(/^[„“”"'«»\s]+|[„“”"'«»\s]+$/g,'');
 if(unquoted&&!/^\p{Lu}/u.test(unquoted))notes.push({kind:'capital',text:'Cümle büyük harfle başlar.'});
 if(unquoted&&!/[.!?]$/.test(unquoted))notes.push({kind:'punctuation',text:'Cümlenin sonuna nokta (ya da ! ?) koy.'});
 return notes.slice(0,2);
}
