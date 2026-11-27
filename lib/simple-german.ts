/**
 * Checks that a German explanation only uses basic (A1–A2) words, so a learner can understand it.
 * The word list is lib/defining-vocabulary.txt; inflected forms, compounds of two known words and
 * un- adjectives are accepted. Used by the tests that guard lib/german-meanings.json.
 */
const IRREGULAR=`ist bin bist sind seid war warst waren wart gewesen hat hast habt hatte hatten gehabt wird wirst werdet wurde wurden geworden
kann kannst könnt konnte konnten muss musst müsst musste mussten will willst wollte wollten soll sollst sollte sollten darf darfst durfte durften mag magst mochte möchte möchtest
gibt gibst gab gaben gegeben nimmt nimmst nahm genommen isst aß gegessen trinkt trank getrunken sieht siehst sah gesehen liest las gelesen spricht sprach gesprochen
geht ging gegangen kommt kam gekommen fährt fuhr gefahren fliegt flog geflogen läuft lief gelaufen fällt fiel gefallen steigt stieg gestiegen bleibt blieb geblieben
schläft schlief geschlafen hält hielt gehalten trägt trug getragen wächst wuchs gewachsen wäscht wusch gewaschen stirbt starb gestorben hilft half geholfen
findet fand gefunden weiß wusste gewusst kennt kannte gekannt denkt dachte gedacht bringt brachte gebracht steht stand gestanden liegt lag gelegen sitzt saß gesessen
schreibt schrieb geschrieben ruft rief gerufen beginnt begann begonnen schließt schloss geschlossen zieht zog gezogen trifft traf getroffen schneidet schnitt geschnitten
wirft warf geworfen fängt fing gefangen schlägt schlug geschlagen heißt hieß geheißen tut tat getan lässt ließ gelassen scheint schien geschienen brennt brannte
riecht roch gerochen singt sang gesungen springt sprang gesprungen schwimmt schwamm geschwommen gewinnt gewann gewonnen verliert verlor verloren vergisst vergaß vergessen
versteht verstand verstanden bekommt bekam bekommen hängt hing gehangen gefällt gefiel misst maß gemessen wiegt wog gewogen hebt hob gehoben stiehlt stahl gestohlen
lügt log gelogen streitet stritt gestritten entscheidet entschied entschieden bittet bat gebeten verbietet verbot verboten erhält erhielt erhalten gilt galt gegolten
geschieht geschah geschehen entsteht entstand entstanden besteht bestand bestanden leiht lieh geliehen läuft rennt rannte gerannt nennt nannte genannt sendet sandte
mehr meisten besser beste besten lieber liebsten höher höchste näher nächste größer größte älter älteste jünger kürzer länger wärmer kälter stärker schwächer
mich mir dich dir ihn ihm ihr ihre ihren ihrem ihrer ihres uns unsere euch einem einen einer eines dem den des deren dessen diese diesen diesem dieses jedem jeden jede jedes
anderen anderem anderer anderes andere allen aller alle alles vielen vieles keine keinen keinem keiner keines meine meinen meinem meiner seine seinen seinem seiner seines
welche welchen welchem welches etwas jemandem jemanden niemandem
hohe hoher hohes hohen hohem teure teurer teures teuren teurem dunkle dunkler dunkles dunklen derselbe dieselbe dasselbe denselben demselben derselben desselben
gehst gehe kommst komme fährst fahre isst esse siehst sehe gab nahm hilfst Busse bewirbt bewarb beworben findet erschrickt erschrak erschrocken würden würdest brät brätst briet gebraten geschrieben geschriebene geschriebenen gesprochene gesprochenen gefundene tritt trittst trat getreten verspricht versprach versprochen lädt lud eingeladen geladen vertritt vertrat besitzt besaß besessen`.split(/\s+/);
const SEPARABLE=['auseinander','zusammen','hinaus','hinein','heraus','herein','hinauf','herunter','hinunter','ab','an','auf','aus','ein','mit','vor','zu','weg','zurück','los','fest','weiter','hin','her','herum','dazu','vorbei','um'];
const NOUN_END=['','e','en','n','er','s','es','ern','nen'];
const ADJ_END=['','e','en','er','es','em','ere','eren','erer','eres','erem','ste','sten','ster','stes','stem','este','esten'];
const VERB_END=['e','st','t','et','en','n','est','te','test','ten','tet','end','ende','enden','ender','endes'];
const UMLAUT:Record<string,string>={a:'ä',o:'ö',u:'ü',au:'äu'};

export function parseVocabulary(text:string):string[]{
 return text.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')).flatMap(l=>l.split(/\s+/));
}

export function createChecker(lemmas:string[]){
 const forms=new Set<string>(IRREGULAR.map(s=>s.toLocaleLowerCase('de')));
 const add=(s:string)=>forms.add(s.toLocaleLowerCase('de'));
 for(const raw of lemmas){
  const w=raw.toLocaleLowerCase('de');add(w);
  for(const e of NOUN_END)add(w+e);
  for(const e of ADJ_END)add(w+e);
  if(w.endsWith('e'))for(const e of ['r','n','s','m'])add(w+e);
  if(w.endsWith('a'))add(w.slice(0,-1)+'en');
  if(w.endsWith('um'))add(w.slice(0,-2)+'en');
  // Umlaut plurals and comparatives: Hand → Hände, alt → älter.
  const m=w.match(/^(.*?)(au|a|o|u)([^aeiouäöü]*)$/);
  if(m){const u=m[1]+UMLAUT[m[2]]+m[3];for(const e of ['','e','en','er','ern','ste','sten','ere','eren','es'])add(u+e);}
  const m2=w.match(/^(.*?)(au|a|o|u)([^aeiouäöü]*)(e|el|er|en)$/);
  if(m2){const u=m2[1]+UMLAUT[m2[2]]+m2[3]+m2[4];for(const e of ['','n','s'])add(u+e);}
  if(/(en|ern|eln|n)$/.test(w)&&w.length>3){
   const stem=w.replace(/(en|n)$/,'');
   for(const e of VERB_END)add(stem+e);
   add(stem);add('zu'+w);
   for(const p of ['ge'+stem+'t','ge'+stem+'et',stem+'t'])for(const e of ADJ_END)add(p+e);
   const pre=SEPARABLE.find(p=>w.startsWith(p)&&w.length>p.length+3);
   if(pre){const rest=w.slice(pre.length),rs=rest.replace(/(en|n)$/,'');for(const e of ADJ_END){add(pre+'ge'+rs+'t'+e);add(pre+'ge'+rs+'et'+e);}add(pre+'zu'+rest);add(rest);for(const e of VERB_END)add(rs+e);}
   else if(!/^(be|ge|er|ver|zer|ent|emp|miss)/.test(w)){/* ge-participle already added */}
   else{add(stem+'t');}
  }
 }
 const known=(t:string)=>forms.has(t);
 function knownWord(token:string):boolean{
  const t=token.toLocaleLowerCase('de');
  if(t.length<=2||known(t))return true;
  if(/^un/.test(t)&&known(t.slice(2)))return true;
  // Separable verb parts written together with a prefix: aufgemacht, anzurufen …
  for(const p of SEPARABLE)if(t.startsWith(p)&&known(t.slice(p.length))&&t.length-p.length>2)return true;
  // Compounds of two known words, with an optional linking s/n/en/e: Tischlampe, Arbeitsplatz.
  for(let i=3;i<=t.length-3;i++){
   const a=t.slice(0,i),b=t.slice(i);
   if(!known(b))continue;
   if(known(a)||known(a.replace(/(s|n|en|e|es)$/,''))&&a.length>3)return true;
  }
  return false;
 }
 /** Words in the explanation that are outside the basic vocabulary (names and the word itself excluded by the caller). */
 return function unknownWords(text:string):string[]{
  const tokens=text.match(/[\p{L}]+(?:-[\p{L}]+)*/gu)||[];
  return [...new Set(tokens.flatMap(t=>t.split('-')).filter(t=>!knownWord(t)))];
 };
}
