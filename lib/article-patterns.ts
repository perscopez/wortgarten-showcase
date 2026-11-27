/** Curated genus recognition material, checked against linked sources 2026-10-25.
 * These helpers never infer a new noun's article from its last letters.
 */
export type FamilyArticle = 'der' | 'die' | 'das';
export type Example = {
  id: string; word: string; article: FamilyArticle; meaning: string;
  stem?: string; ending?: string;
  compound?: { prefix: string; head: string; headArticle: FamilyArticle };
};
export type ArticleFamily = {
  id: string; title: string; article: FamilyArticle | null;
  strength: 'rule' | 'strong-tendency' | 'tendency' | 'contrast';
  explanation: string; caution: string;
  examples: Example[]; counterexamples: Example[];
  sources: {label:string;url:string}[];
};
const derivation={label:'IDS grammis · Genus ve türetme',url:'https://grammis.ids-mannheim.de/systematische-grammatik/2269'};
const genus={label:'IDS grammis · Genus örüntüleri',url:'https://grammis.ids-mannheim.de/progr%40mm/6913'};
const suffix={label:'IDS grammis · Suffix',url:'https://grammis.ids-mannheim.de/terminologie/376'};
const composition={label:'IDS grammis · Bileşik isimler',url:'https://grammis.ids-mannheim.de/systematische-grammatik/2268'};
const time={label:'LEO dil bilgisi · Anlam grupları',url:'https://dict.leo.org/grammatik/deutsch/Wort/Nomen/Kategorien/Genus/Bedeutung.xml?lang=de'};
const wiktionary=(word:string)=>({label:`Wiktionary · ${word}`,url:`https://de.wiktionary.org/wiki/${encodeURIComponent(word)}`});
function ex(word:string,article:FamilyArticle,meaning:string,ending?:string):Example {
  return {id:word.normalize('NFC').toLocaleLowerCase('de'),word,article,meaning,...(ending?{stem:word.slice(0,-ending.length),ending}:{})};
}
function derived(id:string,title:string,article:FamilyArticle,ending:string,words:[string,string][],strength:ArticleFamily['strength']='rule'):ArticleFamily {
  return {id,title,article,strength,
    explanation:`Bu ailedeki gerçek ${ending.startsWith('-')?ending:'-'+ending} ${ending==='chen'||ending==='lein'?'küçültme ekiyle':'yapım ekiyle'} kurulmuş isimler “${article}” ile öğrenilir.`,
    caution:'Sondaki benzer harfler tek başına yeterli değildir; gerçek ek ile kelimenin kendi parçasını ayır. Renkli parçalama görsel tanıma içindir; her gövde tek başına kullanılan bir kelime olmayabilir.',
    examples:words.map(([word,meaning])=>ex(word,article,meaning,ending)),counterexamples:[],sources:[derivation,genus,...(ending==='chen'||ending==='lein'?[suffix]:[])],
  };
}
export const ARTICLE_FAMILIES:ArticleFamily[]=[
  derived('suffix-ung','-ung · türemiş isimler','die','ung',[
    ['Wohnung','ev, daire'],['Zeitung','gazete'],['Rechnung','hesap, fatura'],['Übung','alıştırma'],['Prüfung','sınav'],
  ]),
  derived('suffix-heit','-heit · durum ve özellik','die','heit',[
    ['Gesundheit','sağlık'],['Freiheit','özgürlük'],['Krankheit','hastalık'],['Sicherheit','güvenlik'],
  ]),
  derived('suffix-keit','-keit · durum ve özellik','die','keit',[
    ['Möglichkeit','olanak, ihtimal'],['Freundlichkeit','nezaket, güler yüzlülük'],['Schwierigkeit','zorluk'],['Sauberkeit','temizlik'],
  ]),
  derived('suffix-schaft','-schaft · topluluk ve durum','die','schaft',[
    ['Freundschaft','arkadaşlık'],['Mannschaft','takım'],['Gesellschaft','toplum, şirket'],['Wirtschaft','ekonomi'],
  ]),
  {...derived('suffix-ion','-ion · yaygın isim ailesi','die','ion',[
    ['Station','istasyon, durak'],['Information','bilgi'],['Diskussion','tartışma'],['Reaktion','tepki'],
  ],'strong-tendency'),explanation:'-ion (-tion/-sion dâhil) ile kurulan bu yaygın isim ailesinde artikel die olur.',caution:'Bu bir son-harf makinesi değildir: der Spion ve das Stadion, die ailesine sokulmaz. Kelime yapısını ve sözlük artikelini birlikte kontrol et.'},
  derived('suffix-chen','-chen · küçültme eki','das','chen',[
    ['Mädchen','kız çocuğu'],['Brötchen','küçük ekmek'],['Häuschen','küçük ev'],['Kätzchen','yavru / küçük kedi'],
  ]),
  derived('suffix-lein','-lein · küçültme eki','das','lein',[
    ['Tischlein','küçük masa'],['Büchlein','küçük kitap'],['Häuslein','küçük ev'],
  ]),
  derived('suffix-ismus','-ismus · akım ve kavram','der','ismus',[
    ['Tourismus','turizm'],['Realismus','gerçekçilik'],['Kapitalismus','kapitalizm'],
  ]),
  {
    id:'ending-e',title:'-e · yararlı ama istisnalı eğilim',article:'die',strength:'tendency',
    explanation:'Vurgusuz -e ile biten birçok isim die alır. Bu, tahmin etmeye yardım eden bir eğilimdir; kesin kural değildir.',
    caution:'der Junge, der Käse ve der Name karşı örneklerdir. Her -e ismi die yapma.',
    examples:[ex('Blume','die','çiçek','e'),ex('Straße','die','cadde, sokak','e'),ex('Tasche','die','çanta','e'),ex('Lampe','die','lamba','e'),ex('Schule','die','okul','e')],
    counterexamples:[ex('Junge','der','erkek çocuk','e'),ex('Käse','der','peynir','e'),ex('Name','der','isim','e')],
    sources:[genus,wiktionary('Junge'),wiktionary('Käse'),wiktionary('Name')],
  },
  {
    id:'weekdays',title:'Haftanın yedi günü',article:'der',strength:'rule',
    explanation:'Montag ile Sonntag arasındaki bu yedi gün adını der ile öğren.',
    caution:'Bu aile yalnız gün adları içindir: die Woche veya das Wochenende için aynı artikel sonucu çıkarılmaz.',
    examples:[['Montag','pazartesi'],['Dienstag','salı'],['Mittwoch','çarşamba'],['Donnerstag','perşembe'],['Freitag','cuma'],['Samstag','cumartesi'],['Sonntag','pazar']].map(([word,meaning])=>ex(word,'der',meaning)),counterexamples:[],sources:[time],
  },
  {
    id:'months',title:'Ay adları',article:'der',strength:'rule',
    explanation:'Takvim aylarının Almanca adları der alır. Burada dört örnekle başlıyoruz.',
    caution:'die Woche ve das Jahr ay adı değildir; takvimle ilgili her kelime der olmaz.',
    examples:[['Januar','ocak'],['März','mart'],['Oktober','ekim'],['Dezember','aralık']].map(([word,meaning])=>ex(word,'der',meaning)),counterexamples:[],sources:[time],
  },
  {
    id:'seasons',title:'Dört yaygın mevsim adı',article:'der',strength:'strong-tendency',
    explanation:'Frühling, Sommer, Herbst ve Winter adlarını der ile birlikte hatırla.',
    caution:'“Mevsimle ilgili her kelime der” deme: bahar anlamındaki alternatif ad das Frühjahr olur. Bu örnek aynı zamanda Jahr başlı bir bileşiktir.',
    examples:[['Frühling','ilkbahar'],['Sommer','yaz'],['Herbst','sonbahar'],['Winter','kış']].map(([word,meaning])=>ex(word,'der',meaning)),
    counterexamples:[{...ex('Frühjahr','das','ilkbahar'),compound:{prefix:'Früh',head:'jahr',headArticle:'das'}}],sources:[time,wiktionary('Frühjahr')],
  },
  {
    id:'compound-head',title:'Bileşik isim · son isim yön verir',article:null,strength:'rule',
    explanation:'Bu şeffaf isim bileşiklerinde en sağdaki baş ismin artikeli bütün kelimenin artikelini belirler: Tür → die Haustür, Haus → das Krankenhaus.',
    caution:'Yalnız birkaç son harfe bakma; gerçek baş ismi bul. Verilen baş parçalar bileşiğin içindeki yazımlarıyla gösterilir (tür → Tür). Bağlayıcı sesler, özel adlar ve belirsiz bölümlenmeler ayrıca incelenmelidir.',
    examples:[
      {...ex('Haustür','die','evin giriş kapısı'),compound:{prefix:'Haus',head:'tür',headArticle:'die'}},
      {...ex('Krankenhaus','das','hastane'),compound:{prefix:'Kranken',head:'haus',headArticle:'das'}},
      {...ex('Apfelbaum','der','elma ağacı'),compound:{prefix:'Apfel',head:'baum',headArticle:'der'}},
      {...ex('Wörterbuch','das','sözlük'),compound:{prefix:'Wörter',head:'buch',headArticle:'das'}},
      {...ex('Bushaltestelle','die','otobüs durağı'),compound:{prefix:'Bus',head:'haltestelle',headArticle:'die'}},
    ],counterexamples:[],sources:[composition],
  },
  {
    id:'false-suffix',title:'Benzer harfler ≠ gerçek ek',article:null,strength:'contrast',
    explanation:'Sprung ve Dung, -ung ile türetilmiş die isimleri değildir. Kuchen küçültme eki -chen içermez. Spion ve Stadion da -ion harfleri nedeniyle die olmaz.',
    caution:'Burada bir artikel kuralı ezberlemiyorsun; yanlış bir son-harf genellemesini durdurmayı öğreniyorsun. Bu kelimeleri kendi artikelleriyle hatırla.',
    examples:[ex('Sprung','der','sıçrama, atlayış'),ex('Dung','der','hayvan gübresi'),ex('Kuchen','der','kek, pasta'),ex('Spion','der','casus'),ex('Stadion','das','stadyum')],
    counterexamples:[],sources:[derivation,...['Sprung','Dung','Kuchen','Spion','Stadion'].map(wiktionary)],
  },
];
export type FamilyQuestion={id:string;familyId:string;example:Example;isCounterexample:boolean};
export type FamilyProgress=Record<string,{attempts:number;correct:number;wrong:number;lastCorrect:boolean;lastAnswered:number;recallDays?:number;due?:number;lastSuccessfulAt?:number}>;
function allQuestions():FamilyQuestion[]{
  return ARTICLE_FAMILIES.flatMap(family=>[
    ...family.examples.map(example=>({id:`${family.id}:${example.id}`,familyId:family.id,example,isCounterexample:false})),
    ...family.counterexamples.map(example=>({id:`${family.id}:${example.id}`,familyId:family.id,example,isCounterexample:true})),
  ]);
}
/** Exact curated noun AND matching confirmed article; never a suffix prediction.
 * Ambiguous dictionary entries, verbs and articleless cards receive no family.
 */
export function familyForKnownNoun(card:{word:string;article?:string;partOfSpeech?:string;articleAmbiguous?:boolean}):ArticleFamily|null {
  if(card.articleAmbiguous || !['der','die','das'].includes(card.article||'') || (card.partOfSpeech && card.partOfSpeech!=='noun'))return null;
  const word=card.word.trim().normalize('NFC');
  // Keep noun capitalization and exact lemma: plurals/aliases must be resolved elsewhere.
  const found=ARTICLE_FAMILIES.find(f=>[...f.examples,...f.counterexamples].some(e=>e.word===word&&e.article===card.article));
  return found?structuredClone(found):null;
}
function count(value:unknown):number{return typeof value==='number'&&Number.isFinite(value)?Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Math.floor(value))):0;}
function safeEntry(entry:FamilyProgress[string]|undefined):FamilyProgress[string]|null {
  if(!entry||typeof entry!=='object')return null;
  const attempts=count(entry.attempts),correct=Math.min(attempts,count(entry.correct));
  return {attempts,correct,wrong:Math.min(attempts,count(entry.wrong)),lastCorrect:entry.lastCorrect===true,lastAnswered:count(entry.lastAnswered),recallDays:count(entry.recallDays),due:count(entry.due),lastSuccessfulAt:count(entry.lastSuccessfulAt)};
}
/** Last-wrong first, unseen next, last-correct last. Stable and deterministic. */
export function buildFamilyQueue(progress:FamilyProgress={},familyId?:string):FamilyQuestion[]{
  const queue=allQuestions().filter(q=>!familyId||q.familyId===familyId);
  const rank=(q:FamilyQuestion)=>{const p=safeEntry(progress[q.id]);return !p||!p.attempts?1:p.lastCorrect?2:0;};
  return queue.map((question,index)=>({question,index})).sort((a,b)=>{
    const r=rank(a.question)-rank(b.question);if(r)return r;
    const ap=safeEntry(progress[a.question.id]),bp=safeEntry(progress[b.question.id]);
    if(rank(a.question)===0){const errors=(bp?.wrong||0)-(ap?.wrong||0);if(errors)return errors;}
    return (ap?.lastAnswered||0)-(bp?.lastAnswered||0)||a.index-b.index;
  }).map(({question})=>structuredClone(question));
}
/** Pure update, separate from existing personal-card article statistics. */
export function updateFamilyProgress(progress:FamilyProgress,questionId:string,correct:boolean,now=Date.now()):FamilyProgress {
  if(!allQuestions().some(q=>q.id===questionId))return {...progress};
  const old=safeEntry(progress[questionId]);const timestamp=typeof now==='number'&&Number.isFinite(now)?Math.max(0,now):0;
  const dayPassed=correct&&(!old?.recallDays||timestamp>=(old?.due||0)&&new Date(timestamp).toDateString()!==new Date(old?.lastSuccessfulAt||0).toDateString());const recallDays=correct?(old?.recallDays||0)+(dayPassed?1:0):0;const interval=[1,3,7,14,30][Math.min(Math.max(recallDays-1,0),4)];
  return {...progress,[questionId]:{recallDays,due:correct?(dayPassed?timestamp+interval*86400000:old?.due||timestamp+86400000):timestamp,lastSuccessfulAt:correct?(dayPassed?timestamp:old?.lastSuccessfulAt||timestamp):old?.lastSuccessfulAt||0,attempts:(old?.attempts||0)+1,correct:(old?.correct||0)+(correct?1:0),wrong:(old?.wrong||0)+(correct?0:1),lastCorrect:correct,lastAnswered:timestamp}};
}
