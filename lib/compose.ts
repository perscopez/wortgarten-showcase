/**
 * Checks a sentence the learner wrote with a pattern ("gegen eine Regel verstoßen").
 * It can only verify that the pattern's content words are used (any inflected form, any order);
 * grammar is judged by the learner against a checklist, so the check never claims more than it knows.
 */
const SKIP=new Set(['der','die','das','den','dem','des','ein','eine','einen','einem','einer','eines','jemand','jemanden','jemandem','jemandes','etwas','sich','mich','dich','uns','euch','mir','dir','ihm','ihr','ihn','es','man','zu','und','oder']);
const PREFIXES=['zusammen','zuruck','weiter','vorbei','kennen','wieder','runter','statt','teil','fest','fern','heim','hoch','raus','rein','weg','los','auf','aus','ein','mit','vor','nach','ab','an','zu','her','hin','um','bei'];
const fold=(s:string)=>s.normalize('NFC').toLocaleLowerCase('de').replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss');
const words=(s:string)=>(s.match(/[\p{L}]+/gu)||[]).map(fold);
const skeleton=(s:string)=>s.replace(/[aeiou]/g,'');

const IRREGULAR:Record<string,string[]>={
 sein:['bin','bist','ist','sind','seid','war','warst','waren','wart','gewesen','sei','seien'],
 haben:['habe','hast','hat','hatte','hattest','hatten','hattet','gehabt','hab','habt'],
 werden:['werde','wirst','wird','wurde','wurdest','wurden','wurdet','geworden','werdet'],
 gehen:['gehe','gehst','geht','ging','gingst','gingen','gingt','gegangen','geh'],
 geben:['gebe','gibst','gibt','gab','gabst','gaben','gabt','gegeben','gib','gebt'],
 nehmen:['nehme','nimmst','nimmt','nahm','nahmst','nahmen','nahmt','genommen','nimm','nehmt'],
 sehen:['sehe','siehst','sieht','sah','sahst','sahen','saht','gesehen','sieh','seht'],
 essen:['esse','isst','ass','assen','gegessen','iss','esst'],
 lesen:['lese','liest','las','lasen','gelesen','lies','lest'],
 sprechen:['spreche','sprichst','spricht','sprach','sprachen','gesprochen','sprich','sprecht'],
 helfen:['helfe','hilfst','hilft','half','halfen','geholfen','hilf','helft'],
 treffen:['treffe','triffst','trifft','traf','trafen','getroffen','triff','trefft'],
 fahren:['fahre','fahrst','fahrt','fuhr','fuhren','gefahren','fahr'],
 tragen:['trage','tragst','tragt','trug','trugen','getragen','trag'],
 lassen:['lasse','lasst','liess','liessen','gelassen','lass'],
 wissen:['weiss','weisst','wisst','wusste','wussten','gewusst'],
 denken:['denke','denkst','denkt','dachte','dachten','gedacht','denk'],
 bringen:['bringe','bringst','bringt','brachte','brachten','gebracht','bring'],
 stehen:['stehe','stehst','steht','stand','standen','gestanden','steh'],
 verstehen:['verstehe','verstehst','versteht','verstand','verstanden','versteh'],
 kommen:['komme','kommst','kommt','kam','kamen','gekommen','komm'],
 rufen:['rufe','rufst','ruft','rief','riefen','gerufen','ruf'],
 anrufen:['rufe','rufst','ruft','rief','riefen','gerufen','angerufen'],
 ziehen:['ziehe','ziehst','zieht','zog','zogen','gezogen','zieh'],
 umziehen:['ziehe','ziehst','zieht','zog','zogen','gezogen','umgezogen'],
 tun:['tue','tust','tut','tat','taten','getan','tu'],
 uben:['ube','ubst','ubt','ubte','ubten','geubt','ub'],
 film:['filme','filmen','films'],
 kurs:['kurse','kursen','kurses'],
 plan:['plane','planen','plans'],
 zug:['zuge','zugen','zugs','zuges'],
 weg:['wege','wegen','wegs','weges'],
 tag:['tage','tagen','tags','tages'],
 buch:['bucher','buchern','buchs','buches'],
 kind:['kinder','kindern','kinds','kindes'],
 hand:['hande','handen'],
 text:['texte','texten','texts','textes'],
 ort:['orte','orten','orts','ortes'],
 wort:['worter','wortern','worte','worten','worts','wortes'],
 jahr:['jahre','jahren','jahrs','jahres'],
 an:['am','ans','daran','woran'],
 in:['im','ins','darin','worin'],
 von:['vom','davon','wovon'],
 bei:['beim','dabei','wobei'],
 zu:['zum','zur','dazu','wozu'],
 um:['ums','darum','worum'],
 fur:['furs','dafur','wofur'],
 durch:['durchs','dadurch','wodurch'],
 auf:['aufs','darauf','worauf'],
 mit:['damit','womit'],
 uber:['ubers','daruber','woruber'],
 aus:['daraus','woraus'],
 vor:['davor','wovor'],
 unter:['unterm','unters','darunter','worunter'],
 hinter:['hinterm','dahinter','wohinter'],
 neben:['daneben','woneben'],
 gegen:['dagegen','wogegen'],
 nach:['danach','wonach'],
};
const FORMS=new Map<string,Set<string>>();
for(const [k,list] of Object.entries(IRREGULAR))FORMS.set(k,new Set(list));

function stemOf(r:string){
 if(r.length<=4){
  if(r.endsWith('en')&&r.length===4)return r.slice(0,2);
  return r;
 }
 return r.slice(0,Math.max(4,r.length-2));
}
function matches(token:string,req:string){
 if(token===req)return true;
 if(FORMS.get(req)?.has(token))return true;
 // short 3-4 letter nouns/verbs: allow regular inflections (-e, -en, -er, -ern, -es, -s, -st, -t, -te, -ten, ge-...-t)
 if(req.length>=3&&req.length<=4){
  const vStem=req.endsWith('en')&&req.length===4?req.slice(0,2):req.endsWith('n')&&req.length===4?req.slice(0,3):'';
  if(vStem&&(token===vStem||/^(e|st|t|te|ten|tet|est|et)$/.test(token.slice(vStem.length))||token==='ge'+vStem+'t'||token==='ge'+vStem+'et'||token==='ge'+req))return true;
  if(token.startsWith(req)&&/^(e|en|er|ern|es|s|n|se|sen)$/.test(token.slice(req.length)))return true;
  return false;
 }
 if(req.length<3)return false;
 const stem=stemOf(req);
 if(token.startsWith(stem))return true;
 // Perfekt participle: ge- + stem (e.g. lernen -> gelernt, kaufen -> gekauft, arbeiten -> gearbeitet)
 if(token.startsWith('ge')&&matches(token.slice(2),req))return true;
 // Separable participle in one word: prefix + ge + rest (e.g. anrufen -> angerufen, einkaufen -> eingekauft)
 for(const p of PREFIXES)if(req.startsWith(p)&&req.length>p.length+2&&token.startsWith(p+'ge')&&matches(token.slice(p.length+2),req.slice(p.length)))return true;
 // stem-changing verbs (helfen → hilft, sprechen → gesprochen): same consonant skeleton
 const sk=skeleton(stem);
 const tokBody=token.startsWith('ge')&&token.length>stem.length+1?token.slice(2):token;
 return sk.length>=3&&skeleton(tokBody).startsWith(sk)&&Math.abs(tokBody.length-req.length)<=3;
}
export type Composition={status:'ok'|'short'|'missing'|'empty';missing:string[];used:string[];wordCount:number};
export function contentWords(phrase:string):string[]{return words(phrase).filter(w=>!SKIP.has(w));}
/** Separable verbs: "anrufen" is satisfied by "rufe … an" or "angerufen". */
function present(tokens:string[],req:string){
 if(tokens.some(t=>matches(t,req)))return true;
 for(const p of PREFIXES)if(req.startsWith(p)&&req.length>p.length+2){
  const rest=req.slice(p.length);
  if(tokens.some(t=>t.startsWith(p+'ge')&&matches(t.slice(p.length+2),rest)))return true;
  if(tokens.includes(p)&&tokens.some(t=>matches(t,rest)))return true;
 }
 return false;
}
export function checkComposition(sentence:string,phrase:string):Composition{
 const tokens=words(sentence);
 if(!tokens.length)return{status:'empty',missing:[],used:[],wordCount:0};
 const shown=phrase.match(/[\p{L}]+/gu)||[];
 const required=shown.map(o=>({o,f:fold(o)})).filter(w=>!SKIP.has(w.f));
 const used:string[]=[],missing:string[]=[];
 for(const r of required)(present(tokens,r.f)?used:missing).push(r.o);
 // at least a subject and a few words around the pattern
 const minWords=Math.max(4,required.length+2);
 if(missing.length)return{status:'missing',missing,used,wordCount:tokens.length};
 if(tokens.length<minWords)return{status:'short',missing:[],used,wordCount:tokens.length};
 return{status:'ok',missing:[],used,wordCount:tokens.length};
}
const normCopy=(s:string)=>fold(s).replace(/\//g,' ').replace(/[^a-z ]/g,'').replace(/\s+/g,' ').trim();
/** Same sentence as the pattern itself is not an original sentence. */
export const isCopy=(sentence:string,phrase:string)=>normCopy(sentence)===normCopy(phrase);
