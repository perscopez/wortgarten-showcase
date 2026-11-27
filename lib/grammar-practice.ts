import {getRection,type GovernedCase} from './rection';
export const GRAMMAR_STORAGE_KEY='wortgarten-grammar-progress-v1';
export const GRAMMAR_CASES:GovernedCase[]=['Dativ','Akkusativ','Genitiv'];
export type GrammarExercise={id:string;lemma:string;patternIndex:number;before:string;after:string;translation:string;focus:string;case:GovernedCase;answer:string;options:string[];reason:string;hint:string;steps:string[]};
// Explicit authored forms: never infer declensions or case from Turkish wording.
const rows:[string,string,number,string,string,string,string,GovernedCase,string,string[],string,string?,string[]?][]=[
['helfen-mir','helfen',0,'Kannst du ',' helfen?','Bana yardım edebilir misin?','ich → bana','Dativ','mir',['mich','mir','ich'],'helfen ile yardım edilen kişi Dativ: ich → mir.'],
['sehen-mich','sehen',0,'Kannst du ',' sehen?','Beni görebiliyor musun?','ich → beni','Akkusativ','mich',['mir','ich','mich'],'sehen ile görülen kişi Akkusativ: ich → mich.'],
['helfen-dir','helfen',0,'Ich helfe ','.','Sana yardım ediyorum.','du → sana','Dativ','dir',['du','dich','dir'],'helfen + Dativ: du → dir.'],
['sehen-dich','sehen',0,'Ich sehe ','.','Seni görüyorum.','du → seni','Akkusativ','dich',['dir','dich','du'],'sehen + Akkusativ: du → dich.'],
['helfen-mann','helfen',0,'Die Frau hilft ','.','Kadın adama yardım ediyor.','der Mann','Dativ','dem Mann',['den Mann','der Mann','dem Mann'],'der Mann → dem Mann: yardım edilen kişi Dativ.'],
['sehen-mann','sehen',0,'Die Frau sieht ','.','Kadın adamı görüyor.','der Mann','Akkusativ','den Mann',['dem Mann','den Mann','der Mann'],'der Mann → den Mann: görülen kişi Akkusativ.'],
['geben-person','geben',0,'Ich gebe ',' das Buch.','Adama kitabı veriyorum.','der Mann (alıcı)','Dativ','dem Mann',['den Mann','dem Mann','der Mann'],'Alıcı Dativ, verilen şey Akkusativ: dem Mann + das Buch.'],
['geben-thing','geben',0,'Ich gebe dem Kind ','.','Çocuğa kalemi veriyorum.','der Stift (verilen şey)','Akkusativ','den Stift',['der Stift','dem Stift','den Stift'],'Verilen şey Akkusativ: den Stift. Alıcı dem Kind ise Dativ.'],
['geben-mir','geben',0,'Gib ',' bitte das Buch!','Lütfen bana kitabı ver!','ich (alıcı)','Dativ','mir',['ich','mich','mir'],'Verilen nesne das Buch; alıcı ich → mir (Dativ).'],
['geben-dir','geben',0,'Ich gebe ',' den Schlüssel.','Sana anahtarı veriyorum.','du (alıcı)','Dativ','dir',['dich','dir','du'],'Alıcı du → dir. Anahtar den Schlüssel ise Akkusativ.'],
['warten-bus','warten',0,'Ich warte auf ','.','Otobüsü bekliyorum.','der Bus','Akkusativ','den Bus',['dem Bus','der Bus','den Bus'],'Beklemek: warten auf + Akkusativ. Bu sabit kalıpta Wo/Wohin aranmaz.'],
['warten-dich','warten',0,'Ich warte auf ','.','Seni bekliyorum.','du','Akkusativ','dich',['dir','dich','du'],'auf ile beklenen kişi: dich. Hareket olmadığı hâlde Akkusativ.'],
['sprechen-mit','sprechen',0,'Ich spreche mit ','.','Öğretmenle konuşuyorum.','der Lehrer','Dativ','dem Lehrer',['den Lehrer','der Lehrer','dem Lehrer'],'Konuşulan kişi mit + Dativ ile: mit dem Lehrer.'],
['sprechen-dir','sprechen',0,'Ich spreche mit ','.','Seninle konuşuyorum.','du','Dativ','dir',['du','dir','dich'],'mit + Dativ: mit dir.'],
['sprechen-über','sprechen',1,'Wir sprechen über ','.','Film hakkında konuşuyoruz.','der Film','Akkusativ','den Film',['dem Film','der Film','den Film'],'Konu için sprechen über + Akkusativ. Bu bir mekânsal yön değildir.'],
['sprechen-mich','sprechen',1,'Sie sprechen über ','.','Benim hakkımda konuşuyorlar.','ich','Akkusativ','mich',['mir','ich','mich'],'Konuşulan konu/kişi über + Akkusativ: über mich.'],
['in-location','in',0,'Ich bin in ','.','Parktayım.','der Park','Dativ','dem Park',['den Park','der Park','dem Park'],'Wo? Mevcut yer: in dem Park (im Park).'],
['in-motion-within','in',0,'Ich laufe in ','.','Parkta koşuyorum; parkın içindeyim.','der Park','Dativ','dem Park',['dem Park','den Park','der Park'],'Koşmak hareketlidir ama burada olayın yeri anlatılır: Wo? Dativ.'],
['in-destination','in',1,'Ich laufe in ','.','Parka koşuyorum; hedefim parkın içi.','der Park','Akkusativ','den Park',['der Park','den Park','dem Park'],'Wohin? Parkın içine yönelinen hedef: in den Park.'],
['auf-location','auf',0,'Das Buch liegt auf ','.','Kitap masanın üzerinde duruyor.','der Tisch','Dativ','dem Tisch',['den Tisch','dem Tisch','der Tisch'],'Mevcut konum (Wo?): auf dem Tisch.'],
['auf-destination','auf',1,'Ich lege das Buch auf ','.','Kitabı masanın üzerine koyuyorum.','der Tisch','Akkusativ','den Tisch',['dem Tisch','der Tisch','den Tisch'],'Yerleştirme hedefi (Wohin?): auf den Tisch.'],
['unter-location','unter',0,'Die Katze spielt unter ','.','Kedi masanın altında oynuyor.','der Tisch','Dativ','dem Tisch',['der Tisch','dem Tisch','den Tisch'],'Oynamak hareket içerse de yer masanın altıdır: Wo? Dativ.'],
['unter-destination','unter',1,'Die Katze läuft unter ','.','Kedi masanın altına koşuyor.','der Tisch','Akkusativ','den Tisch',['den Tisch','der Tisch','dem Tisch'],'Bu bağlamda hedef masanın altı: Wohin? Akkusativ.'],
['an-location','an',0,'Das Bild hängt an ','.','Resim duvarda asılı.','die Wand','Dativ','der Wand',['die Wand','der Wand','den Wand'],'Wo? die Wand → der Wand (Dativ).'],
['an-destination','an',1,'Ich hänge das Bild an ','.','Resmi duvara asıyorum.','die Wand','Akkusativ','die Wand',['der Wand','den Wand','die Wand'],'Yerleştirme hedefi: an die Wand (Akkusativ).'],
['mit-bus','mit',0,'Ich fahre mit ','.','Otobüsle gidiyorum.','der Bus','Dativ','dem Bus',['der Bus','den Bus','dem Bus'],'mit daima Dativ yönetir; yolculuk/hareket bunu değiştirmez.'],
['für-dich','für',0,'Das Geschenk ist für ','.','Hediye senin için.','du','Akkusativ','dich',['dir','du','dich'],'für + Akkusativ: für dich.'],
['fragen-lehrer','fragen',0,'Ich frage ','.','Öğretmene soruyorum.','der Lehrer','Akkusativ','den Lehrer',['dem Lehrer','den Lehrer','der Lehrer'],'Türkçedeki “öğretmene” yanıltmasın: fragen ile sorulan kişi Akkusativ.'],
['folgen-mann','folgen',0,'Ich folge ','.','Adamı takip ediyorum.','der Mann','Dativ','dem Mann',['den Mann','dem Mann','der Mann'],'Türkçede “adamı” olsa da folgen ile takip edilen kişi Dativ.'],
['zwischen-plural','zwischen',0,'Die Tasche liegt zwischen ','.','Çanta sandalyelerin arasında.','die Stühle (çoğul)','Dativ','den Stühlen',['die Stühle','den Stühlen','den Stühle'],'Yer bildiren Dativ çoğul: den Stühlen; burada isme de -n gelir.'],
['in-welchem-stock','in',0,'In ',' Stock wohnen Sie?','Hangi katta yaşıyorsunuz?','der Stock + welcher','Dativ','welchem',['welcher','welchem','welchen'],'Nerede yaşıyorsunuz (Wo?) → in + Dativ. der Stock eril tekildir; der → dem olduğu gibi welcher → welchem olur.','Cümlede “nerede?” (mevcut yer) mi yoksa “nereye?” (hedef) mi sorulduğuna ve der Stock kelimesinin artikel değişimine dikkat et.',['1. Soru neyi soruyor? → Nerede yaşıyorsunuz? (bir yerde bulunma: Wo?)','2. Bu kullanımda edat hangi hâli ister? → in + Dativ','3. İsim nedir? → der Stock (eril, tekil) — kelimenin sözlükte der olması her cümlede der kalacağı anlamına gelmez.','4. Dativ dönüşümü nasıl olur? → der → dem, bu yüzden soru kelimesi de welcher → welchem (-em eki alır).','5. Sonuç: In welchem Stock wohnen Sie?']],
['gefallen-mir','gefallen',0,'Der Film gefällt ','.','Film hoşuma gidiyor.','ich (beğenen kişi)','Dativ','mir',['mich','mir','ich'],'gefallen fiilinde hoşa giden şey öznedir (der Film); beğenen kişi Dativ olur: ich → mir.','Hoşa giden şey cümlenin öznesidir; beğenen kişinin hangi rolü aldığına odaklan (mögen ile karıştırma).',['1. Kalıp nedir? → gefallen (birinin hoşuna gitmek)','2. Özne hangisi? → der Film (Nominativ — hoşa giden şey)','3. Beğenen kişi hangi hâlde olur? → gefallen + Dativ','4. Zamir dönüşümü: ich → Dativ’de mir (Akkusativ mich değil).','5. Sonuç: Der Film gefällt mir.']],
['finden-film','finden',0,'Ich finde ',' gut.','Filmi iyi buluyorum.','der Film','Akkusativ','den Film',['dem Film','der Film','den Film'],'finden fiilinde bulunan/değerlendirilen nesne doğrudan tümleçtir (Akkusativ): der Film → den Film.','Burada değerlendirilen nesne doğrudan fiilin nesnesidir; eril tekil der artikelinin değişimini düşün.',['1. Kalıp nedir? → finden (bir şeyi bulmak / bir şeyi … bulmak)','2. Hangi hâli ister? → finden + Akkusativ','3. İsim nedir? → der Film (eril, tekil)','4. Akkusativ dönüşümü: eril tekilde der → den olur.','5. Sonuç: Ich finde den Film gut.']],
];
function buildHint(lemma:string,focus:string):string{
 if(['in','auf','unter','an','zwischen'].includes(lemma))return `“${lemma}” edatında önce cümlenin mevcut yeri mi (bulunma) yoksa yönelinen hedefi mi anlattığını belirle; sonra “${focus}” için artikel/zamir çekimini seç.`;
 if(['warten','sprechen'].includes(lemma))return `Buradaki edat mekânsal değil, “${lemma}” fiilinin sabit kalıbıdır; kalıbın istediği hâli ve “${focus}” dönüşümünü düşün.`;
 return `Türkçe ekine değil, “${lemma}” kelimesinin Almanca kalıbına bak; sonra “${focus}” öğesinin o hâldeki biçimini seç.`;
}
function buildSteps(lemma:string,patternIndex:number,focus:string,case_:GovernedCase,answer:string,reason:string):string[]{
 const p=getRection(lemma).patterns[patternIndex];
 return [
  `1. Kalıp: ${p.pattern} (${p.explanation})`,
  `2. İstenen hâl: ${case_}`,
  `3. Temel öğe: ${focus}`,
  `4. Biçim dönüşümü: ${focus} → ${case_} hâlinde “${answer}” olur.`,
  `5. Açıklama: ${reason}`,
 ];
}
export const GRAMMAR_EXERCISES:GrammarExercise[]=rows.map(([id,lemma,patternIndex,before,after,translation,focus,case_,answer,options,reason,hint,steps])=>({id,lemma,patternIndex,before,after,translation,focus,case:case_,answer,options,reason,hint:hint||buildHint(lemma,focus),steps:steps||buildSteps(lemma,patternIndex,focus,case_,answer,reason)}));
export function grammarSource(exercise:GrammarExercise){return getRection(exercise.lemma).patterns[exercise.patternIndex];}
export type GrammarItemProgress={attempts:number;correct:number;streak:number;intervalDays:number;due:number;lastAnswered:number};
export type GrammarProgress=Record<string,GrammarItemProgress>;
const DAY=86400000;
export function updateGrammarProgress(progress:GrammarProgress,id:string,correct:boolean,now=Date.now()):GrammarProgress{
 if(!GRAMMAR_EXERCISES.some(e=>e.id===id))return progress;
 const old=progress[id];
 // Repeated success in the same short window is practice, not a new spaced recall.
 if(correct&&old?.streak>0){
  if(now<old.due)return {...progress,[id]:{...old,attempts:old.attempts+1,correct:old.correct+1}};
  if(new Date(now).toDateString()===new Date(old.lastAnswered).toDateString())return {...progress,[id]:{...old,attempts:old.attempts+1,correct:old.correct+1,lastAnswered:now}};
 }
 const streak=correct?(old?.streak||0)+1:0;
 const intervalDays=correct?[1,3,7,14,30][Math.min(streak-1,4)]:0;
 return {...progress,[id]:{attempts:(old?.attempts||0)+1,correct:(old?.correct||0)+(correct?1:0),streak,intervalDays,due:now+intervalDays*DAY,lastAnswered:now}};
}
export function parseGrammarProgress(value:unknown):GrammarProgress{
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const result:GrammarProgress={};
 for(const e of GRAMMAR_EXERCISES){const p=(value as Record<string,unknown>)[e.id] as GrammarItemProgress|undefined;if(p&&['attempts','correct','streak','intervalDays','due','lastAnswered'].every(k=>Number.isFinite(p[k as keyof GrammarItemProgress])&&p[k as keyof GrammarItemProgress]>=0)&&Number.isInteger(p.attempts)&&Number.isInteger(p.correct)&&Number.isInteger(p.streak)&&p.correct<=p.attempts&&p.streak<=p.correct)result[e.id]=p;}
 return result;
}
export function grammarQueue(progress:GrammarProgress,now=Date.now(),limit=12):string[]{
 return GRAMMAR_EXERCISES.filter(e=>!progress[e.id]||progress[e.id].due<=now).sort((a,b)=>{const x=progress[a.id],y=progress[b.id];const priority=(p?:GrammarItemProgress)=>p&&p.streak===0?0:p?1:2;return priority(x)-priority(y)||(x?.due||0)-(y?.due||0);}).slice(0,limit).map(e=>e.id);
}
export function advanceGrammarQueue(queue:string[],correct:boolean):string[]{const [id,...rest]=queue;if(!id||correct)return rest;const result=rest.filter(x=>x!==id);result.splice(Math.min(2,result.length),0,id);return result;}
