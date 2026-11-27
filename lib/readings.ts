/** Short original reading texts (written for this app) with a Turkish translation and three comprehension questions each. */
export type ReadingQuestion={q:string;options:string[];answer:number};
export type Reading={id:string;title:string;level:'A1'|'A2';de:string;tr:string;questions:ReadingQuestion[]};
export const READINGS:Reading[]=[
 {id:'tag',title:'Mein Tag',level:'A1',
  de:'Ich heiße Ayşe und ich wohne in Köln. Jeden Morgen stehe ich um sieben Uhr auf. Ich frühstücke Brot mit Käse und trinke Tee. Dann fahre ich mit dem Bus zur Arbeit. Ich arbeite in einem Büro. Am Abend koche ich eine Suppe und lese ein Buch.',
  tr:'Benim adım Ayşe ve Köln’de oturuyorum. Her sabah saat yedide kalkarım. Peynirli ekmek yerim ve çay içerim. Sonra otobüsle işe giderim. Bir ofiste çalışıyorum. Akşam bir çorba pişirir ve bir kitap okurum.',
  questions:[{q:'Wo wohnt Ayşe?',options:['In Köln','In Berlin','In Wien'],answer:0},{q:'Wie fährt sie zur Arbeit?',options:['Mit dem Auto','Mit dem Bus','Zu Fuß'],answer:1},{q:'Was macht sie am Abend?',options:['Sie kocht eine Suppe und liest.','Sie geht ins Kino.','Sie arbeitet im Büro.'],answer:0}]},
 {id:'supermarkt',title:'Im Supermarkt',level:'A1',
  de:'Heute gehe ich in den Supermarkt. Ich brauche Milch, Eier und Äpfel. Die Milch kostet einen Euro. Die Äpfel sind teuer, aber sie sind frisch. An der Kasse bezahle ich mit Karte. Der Verkäufer sagt: „Danke und einen schönen Tag!“',
  tr:'Bugün süpermarkete gidiyorum. Süt, yumurta ve elma lazım. Süt bir euro. Elmalar pahalı ama taze. Kasada kartla ödüyorum. Satıcı diyor ki: “Teşekkürler, güzel bir gün dilerim!”',
  questions:[{q:'Was braucht die Person?',options:['Brot, Käse und Tee','Milch, Eier und Äpfel','Fisch und Reis'],answer:1},{q:'Wie sind die Äpfel?',options:['Teuer, aber frisch','Billig und alt','Klein und sauer'],answer:0},{q:'Wie bezahlt die Person?',options:['Bar','Mit Karte','Gar nicht'],answer:1}]},
 {id:'bahnhof',title:'Am Bahnhof',level:'A1',
  de:'Der Zug nach München fährt um 8.15 Uhr ab, aber heute hat er zehn Minuten Verspätung. Ich warte auf Gleis drei. Neben mir steht eine Frau mit einem großen Koffer. Sie fragt mich: „Entschuldigung, ist das der Zug nach München?“ Ich antworte: „Ja, genau.“',
  tr:'Münih treni 8.15’te kalkıyor ama bugün on dakika rötarlı. Üç numaralı peronda bekliyorum. Yanımda büyük bir bavullu bir kadın duruyor. Bana soruyor: “Affedersiniz, bu Münih treni mi?” Cevap veriyorum: “Evet, aynen.”',
  questions:[{q:'Wohin fährt der Zug?',options:['Nach Hamburg','Nach München','Nach Köln'],answer:1},{q:'Was ist heute anders?',options:['Der Zug hat Verspätung.','Der Zug fährt nicht.','Der Zug ist früher da.'],answer:0},{q:'Was hat die Frau?',options:['Einen kleinen Hund','Eine Fahrkarte aus Papier','Einen großen Koffer'],answer:2}]},
 {id:'wochenende',title:'Das Wochenende',level:'A2',
  de:'Am Samstag besuche ich meine Eltern. Sie wohnen in einer kleinen Stadt. Wir essen zusammen zu Mittag und spielen Karten. Am Nachmittag gehen wir im Park spazieren, weil das Wetter schön ist. Am Sonntag bleibe ich zu Hause, denn ich muss für die Prüfung lernen.',
  tr:'Cumartesi anne babamı ziyaret ediyorum. Küçük bir şehirde oturuyorlar. Birlikte öğle yemeği yiyor ve kâğıt oynuyoruz. Öğleden sonra hava güzel olduğu için parkta yürüyoruz. Pazar günü evde kalıyorum, çünkü sınav için çalışmam gerekiyor.',
  questions:[{q:'Wen besucht die Person am Samstag?',options:['Ihre Freunde','Ihre Eltern','Ihre Kollegen'],answer:1},{q:'Warum gehen sie spazieren?',options:['Weil das Wetter schön ist.','Weil sie Hunger haben.','Weil der Park neu ist.'],answer:0},{q:'Warum bleibt die Person am Sonntag zu Hause?',options:['Sie ist krank.','Sie muss lernen.','Sie hat Besuch.'],answer:1}]},
 {id:'arzt',title:'Beim Arzt',level:'A2',
  de:'Ich habe seit zwei Tagen Kopfschmerzen und Fieber. Deshalb rufe ich bei der Ärztin an. Die Sprechstundenhilfe gibt mir einen Termin für Donnerstag um zehn Uhr. In der Praxis wartet man lange. Die Ärztin untersucht mich und sagt: „Sie müssen viel trinken und im Bett bleiben.“ Sie schreibt mir ein Rezept für die Apotheke.',
  tr:'İki gündür başım ağrıyor ve ateşim var. Bu yüzden doktoru arıyorum. Sekreter bana perşembe saat ona randevu veriyor. Muayenehanede uzun beklenir. Doktor beni muayene ediyor ve diyor ki: “Çok su içmeli ve yatakta kalmalısınız.” Eczane için bana bir reçete yazıyor.',
  questions:[{q:'Was hat die Person?',options:['Bauchschmerzen','Kopfschmerzen und Fieber','Eine Erkältung ohne Fieber'],answer:1},{q:'Wann ist der Termin?',options:['Am Donnerstag um zehn Uhr','Am Montag um neun Uhr','Am Freitag um zwei Uhr'],answer:0},{q:'Was bekommt die Person von der Ärztin?',options:['Ein Rezept','Eine Rechnung','Eine Fahrkarte'],answer:0}]},
 {id:'wohnung',title:'Eine neue Wohnung',level:'A2',
  de:'Familie Yılmaz sucht eine neue Wohnung, denn die alte ist zu klein. Die neue Wohnung hat drei Zimmer, eine Küche und einen Balkon. Die Miete beträgt 750 Euro im Monat. Am Samstag ziehen sie um. Freunde helfen beim Tragen der Möbel.',
  tr:'Yılmaz ailesi yeni bir daire arıyor, çünkü eski daire çok küçük. Yeni dairede üç oda, bir mutfak ve bir balkon var. Kira ayda 750 euro. Cumartesi taşınıyorlar. Arkadaşlar mobilyaları taşımaya yardım ediyor.',
  questions:[{q:'Warum sucht die Familie eine neue Wohnung?',options:['Die alte ist zu klein.','Die alte ist zu teuer.','Sie zieht in eine andere Stadt.'],answer:0},{q:'Wie viele Zimmer hat die neue Wohnung?',options:['Zwei','Drei','Vier'],answer:1},{q:'Wer hilft beim Umzug?',options:['Die Nachbarn','Freunde','Die Firma'],answer:1}]},
 {id:'sprachkurs',title:'Der Sprachkurs',level:'A2',
  de:'Seit September besuche ich einen Deutschkurs. Der Kurs findet dreimal pro Woche am Abend statt. Unser Lehrer erklärt die Grammatik sehr gut. Am schwierigsten finde ich die Artikel, denn im Türkischen gibt es keine. Ich übe jeden Tag zwanzig Minuten und schreibe kurze Sätze.',
  tr:'Eylülden beri bir Almanca kursuna gidiyorum. Kurs haftada üç kez akşamları yapılıyor. Öğretmenimiz grameri çok iyi açıklıyor. En zor bulduğum şey artikeller, çünkü Türkçede yok. Her gün yirmi dakika çalışıyor ve kısa cümleler yazıyorum.',
  questions:[{q:'Wann findet der Kurs statt?',options:['Jeden Tag am Morgen','Dreimal pro Woche am Abend','Nur am Wochenende'],answer:1},{q:'Was findet die Person am schwierigsten?',options:['Die Artikel','Die Zahlen','Die Aussprache'],answer:0},{q:'Wie lange übt sie jeden Tag?',options:['Zehn Minuten','Zwanzig Minuten','Eine Stunde'],answer:1}]},
 {id:'brief',title:'Ein Brief an Freunde',level:'A2',
  de:'Liebe Anna, lieber Tom, ich hoffe, es geht euch gut. Ich bin jetzt seit einem Monat in Hamburg und fühle mich schon wohl. Meine Arbeit ist interessant, obwohl sie manchmal anstrengend ist. Letzte Woche habe ich eine Hafenrundfahrt gemacht. Im Sommer möchte ich euch besuchen. Schreibt mir bald! Viele Grüße, Deniz',
  tr:'Sevgili Anna, sevgili Tom, umarım iyisinizdir. Bir aydır Hamburg’dayım ve kendimi şimdiden iyi hissediyorum. İşim ilginç, ama bazen yorucu. Geçen hafta liman turu yaptım. Yazın sizi ziyaret etmek istiyorum. Bana yakında yazın! Sevgilerimle, Deniz',
  questions:[{q:'Wie lange ist Deniz schon in Hamburg?',options:['Eine Woche','Einen Monat','Ein Jahr'],answer:1},{q:'Wie findet Deniz die Arbeit?',options:['Interessant, aber manchmal anstrengend','Langweilig','Sehr leicht'],answer:0},{q:'Was möchte Deniz im Sommer tun?',options:['Nach Istanbul fahren','Anna und Tom besuchen','Einen Kurs machen'],answer:1}]},
];
export const readingWords=(text:string)=>text.match(/[\p{L}'’-]+/gu)||[];
/** Glosses for the most frequent function words, so tapping "Ich" never returns the noun "das Ich" from the dictionary. */
export const FUNCTION_WORDS:Record<string,string>={
 ich:'ben',du:'sen',er:'o (erkek)',sie:'o (kadın) / onlar / siz (Sie)',es:'o (nötr)',wir:'biz',ihr:'siz / onun / onların',mich:'beni',mir:'bana',dich:'seni',dir:'sana',
 und:'ve',oder:'veya',aber:'ama',denn:'çünkü',weil:'çünkü (yan cümle)',dass:'-diğini (yan cümle bağlacı)',wenn:'eğer / -dığında',obwohl:'-e rağmen',
 in:'-de / -e (içinde)',im:'-de (in dem)',an:'-de / -e (yanında, yüzeyinde)',am:'-de (an dem)',auf:'üstünde / üstüne',aus:'-den (içinden)',mit:'ile',zu:'-e / -a',zur:'-e (zu der)',zum:'-e (zu dem)',von:'-den / -nin',bei:'yanında / -de',nach:'-den sonra / -e doğru',für:'için',um:'etrafında / saat -de',über:'üzerinde / hakkında',vor:'önünde / önce',seit:'-den beri',ohne:'-sız',
 der:'belirli artikel (eril)',die:'belirli artikel (dişil / çoğul)',das:'belirli artikel (nötr) / bu',dem:'belirli artikel (Dativ)',den:'belirli artikel (Akkusativ)',des:'belirli artikel (Genitiv)',ein:'bir (eril / nötr)',eine:'bir (dişil)',einen:'bir (Akkusativ eril)',einem:'bir (Dativ)',einer:'bir (Dativ dişil)',
 ist:'-dir / olmak (er ist)',bin:'-im (ich bin)',sind:'-ler / -lar (wir sind)',war:'idi',hat:'var (er hat)',habe:'var (ich habe)',haben:'sahip olmak',
 nicht:'değil',kein:'hiç / -sız',keine:'hiç / -sız (dişil, çoğul)',ja:'evet',nein:'hayır',dann:'sonra / o zaman',jetzt:'şimdi',heute:'bugün',morgen:'yarın / sabah',schon:'zaten',sehr:'çok',viel:'çok',mein:'benim',meine:'benim (dişil, çoğul)',unser:'bizim',unsere:'bizim (dişil, çoğul)',
};
export const functionGloss=(word:string,index=0)=>{const cleanToken=word.normalize('NFC').trim();if(index>0&&/^Morgen$/.test(cleanToken))return undefined;const k=cleanToken.toLocaleLowerCase('de');return Object.hasOwn(FUNCTION_WORDS,k)?FUNCTION_WORDS[k]:undefined;};
