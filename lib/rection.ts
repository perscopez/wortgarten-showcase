/** Curated A1–B1 usage patterns, not an automatic valency guesser.
 * Sources checked 2026-10-25. Examples/translations are authored for this app.
 * A case belongs to the complement, never to the verb/preposition itself.
 */
export type GovernedCase = 'Akkusativ' | 'Dativ' | 'Genitiv';
export type RectionPattern = {
  pattern: string;
  complements: { role: string; case: GovernedCase; preposition?: string; requirement: 'usage-dependent' | 'optional' }[];
  explanation: string;
  example: { parts: { text: string; case?: GovernedCase }[]; translation: string };
  sources: { label: string; url: string }[];
};
export type RectionData = { version: 1; lemma: string; status: 'known' | 'unknown'; summary: string; patterns: RectionPattern[]; notes: string[] };
const wiki = (lemma: string) => ({label:`Wiktionary · ${lemma}`,url:`https://de.wiktionary.org/wiki/${encodeURIComponent(lemma)}`});
const spatial = {label:'IDS grammis · Präpositionalgruppe',url:'https://grammis.ids-mannheim.de/sgt/2262'};
const prepSource = {label:'IDS grammis · Präpositionalphrase',url:'https://grammis.ids-mannheim.de/kontrastive-grammatik/5747'};
const dudenWegen = {label:'Duden · wegen',url:'https://www.duden.de/rechtschreibung/wegen_infolge_bezueglich'};
const data: Record<string, RectionData> = {};
function example(marked: string, translation: string): RectionPattern['example'] {
  const parts: RectionPattern['example']['parts'] = [];
  for (const part of marked.split(/(\{(?:Dativ|Akkusativ|Genitiv):[^}]+\})/g)) {
    if (!part) continue;
    const match = part.match(/^\{(Dativ|Akkusativ|Genitiv):([^}]+)\}$/);
    parts.push(match ? {text:match[2],case:match[1] as GovernedCase} : {text:part});
  }
  return {parts,translation};
}
function add(lemma: string, patterns: RectionPattern[], notes: string[] = []) {
  data[lemma] = {version:1,lemma,status:'known',summary:'Bu kullanımda tamlayıcının hâli',patterns,notes:[
    'Bunlar seçilmiş yaygın kullanımlardır, kelimenin bütün anlamları değildir. Hâl etiketi kelimenin kendisine değil, tamlayıcısına aittir.',
    'Tamlayıcı kullanıldığında belirtilen hâl gerekir. Tamlayıcının açıkça söylenmesi ise kullanım ve bağlama bağlıdır; “isteğe bağlı” olanlar ayrıca işaretlenir.', ...notes,
  ]};
}
function simpleVerb(lemma: string, governed: GovernedCase, pattern: string, role: string, marked: string, translation: string, explanation: string) {
  add(lemma,[{pattern,complements:[{role,case:governed,requirement:'usage-dependent'}],explanation,example:example(marked,translation),sources:[wiki(lemma)]}]);
}
const datives = [
 ['helfen','Ich helfe {Dativ:dem Kind}.','Çocuğa yardım ediyorum.','Yardım edilen kişi/varlık Dativ olur.'],
 ['antworten','Ich antworte {Dativ:meiner Lehrerin}.','Öğretmenime cevap veriyorum.','Cevap verilen kişi Dativ olur; auf + Akkusativ ayrıca neye cevap verildiğini belirtebilir.'],
 ['danken','Ich danke {Dativ:meinem Freund}.','Arkadaşıma teşekkür ediyorum.','Teşekkür edilen kişi Dativ olur; teşekkürün nedeni für + Akkusativ ile eklenebilir.'],
 ['folgen','Ich folge {Dativ:dem Mann}.','Adamı takip ediyorum.','Takip edilen kişi/şey bu anlamda Dativ olur; Türkçedeki “kimi?” seni yanıltmasın.'],
 ['gefallen','Das Buch gefällt {Dativ:meiner Schwester}.','Kız kardeşim kitabı beğeniyor.','Beğenen kişi Dativ olur; beğenilen şey cümlenin öznesidir.'],
 ['gehören','Das Fahrrad gehört {Dativ:meinem Bruder}.','Bisiklet erkek kardeşime ait.','Sahip Dativ olur; ait olan şey öznedir. “zu etwas gehören” başka bir kalıptır.'],
 ['vertrauen','Ich vertraue {Dativ:meiner Ärztin}.','Doktoruma güveniyorum.','Güvenilen kişi/varlık bu kullanımda Dativ olur.'],
];
for (const [lemma,marked,tr,explanation] of datives) simpleVerb(lemma,'Dativ',`${lemma} + jemandem/etwas (Dativ)`,'kişi / ilgili varlık',marked,tr,explanation);
const accusatives = [
 ['sehen','Ich sehe {Akkusativ:den Hund}.','Köpeği görüyorum.','Görülen kişi/şey bu kullanımda Akkusativ olur.'],
 ['besuchen','Ich besuche {Akkusativ:meinen Onkel}.','Amcamı ziyaret ediyorum.','Ziyaret edilen kişi/yer Akkusativ olur.'],
 ['kaufen','Ich kaufe {Akkusativ:einen Apfel}.','Bir elma satın alıyorum.','Satın alınan şey Akkusativ olur; ek alıcı/yararlanan Dativ ile belirtilebilir.'],
 ['kennen','Ich kenne {Akkusativ:den Lehrer}.','Öğretmeni tanıyorum.','Tanınan kişi/bilinen şey Akkusativ olur.'],
 ['fragen','Ich frage {Akkusativ:den Lehrer}.','Öğretmene soruyorum.','Sorulan kişi Akkusativ olur; Türkçedeki “kime?” birebir taşınmaz. Konu için nach + Dativ kullanılabilir.'],
];
for (const [lemma,marked,tr,explanation] of accusatives) simpleVerb(lemma,'Akkusativ',`${lemma} + jemanden/etwas (Akkusativ)`,'ilgili kişi / şey',marked,tr,explanation);
for (const [lemma,verb,obj,tr] of [
 ['geben','gebe','das Buch','Çocuğa kitabı veriyorum.'],
 ['schenken','schenke','einen Ball','Çocuğa bir top hediye ediyorum.'],
 ['erklären','erkläre','die Regel','Çocuğa kuralı açıklıyorum.'],
]) add(lemma,[{pattern:`jemandem (Dativ) etwas (Akkusativ) ${lemma}`,complements:[{role:'alıcı / muhatap',case:'Dativ',requirement:'optional'},{role:'verilen / açıklanan şey',case:'Akkusativ',requirement:'usage-dependent'}],explanation:'Alıcı veya muhatap Dativ, verilen/açıklanan şey Akkusativ olur. Bu, fiilin her anlamını kapsayan tek etiket değildir.',example:example(`Ich ${verb} {Dativ:dem Kind} {Akkusativ:${obj}}.`,tr),sources:[wiki(lemma)]}]);
const moreDatives = [
 ['raten','Ich rate {Dativ:meinem Freund} zur Vorsicht.','Arkadaşıma dikkatli olmasını tavsiye ediyorum.','Tavsiye edilen kişi Dativ olur.'],
 ['glauben','Ich glaube {Dativ:dir}.','Sana inanıyorum.','Kişiye inanmak Dativ ister; an + Akkusativ ise bir şeye inanmak içindir.'],
 ['begegnen','Ich begegne {Dativ:meinem Nachbarn} oft im Treppenhaus.','Komşumla sık sık merdivende karşılaşıyorum.','Karşılaşılan kişi Dativ olur.'],
 ['dienen','Das Zimmer dient {Dativ:meiner Schwester} als Büro.','Oda kız kardeşime ofis olarak hizmet ediyor.','Hizmet edilen kişi/amaç Dativ olur.'],
 ['drohen','Er droht {Dativ:dem Nachbarn}.','Komşuyu tehdit ediyor.','Tehdit edilen kişi Dativ olur.'],
 ['gelingen','Der Kuchen gelingt {Dativ:meiner Mutter} immer.','Pasta annemin hep başarılı oluyor.','Başaran kişi Dativ olur; başarılan şey öznedir.'],
 ['genügen','Das genügt {Dativ:mir}.','Bu bana yeter.','Yeterli bulan kişi Dativ olur.'],
 ['nützen','Das nützt {Dativ:den Kindern}.','Bu çocuklara yarar sağlıyor.','Yararlanan kişi Dativ olur.'],
 ['ähneln','Er ähnelt {Dativ:seinem Vater}.','Babasına benziyor.','Benzetilen kişi/şey Dativ olur.'],
 ['zuschauen','Ich schaue {Dativ:dem Spiel} zu.','Maçı izliyorum.','İzlenen kişi/olay Dativ olur.'],
 ['imponieren','Das Ergebnis imponiert {Dativ:dem Lehrer}.','Sonuç öğretmeni etkiliyor.','Etkilenen kişi Dativ olur.'],
] as const;
for (const [lemma,marked,tr,explanation] of moreDatives) simpleVerb(lemma,'Dativ',`${lemma} + jemandem (Dativ)`,'kişi / ilgili varlık',marked,tr,explanation);
const moreAccusatives = [
 ['machen','Ich mache {Akkusativ:die Hausaufgaben}.','Ödevleri yapıyorum.','Yapılan şey Akkusativ olur.'],
 ['beantworten','Ich beantworte {Akkusativ:die Frage}.','Soruyu cevaplıyorum.','Cevaplanan soru/mektup Akkusativ olur; antworten ise kişiyle Dativ kurar.'],
 ['benutzen','Ich benutze {Akkusativ:den Computer}.','Bilgisayarı kullanıyorum.','Kullanılan şey Akkusativ olur.'],
 ['bestellen','Ich bestelle {Akkusativ:einen Kaffee}.','Bir kahve sipariş ediyorum.','Sipariş edilen şey Akkusativ olur.'],
 ['bekommen','Ich bekomme {Akkusativ:einen Brief}.','Bir mektup alıyorum.','Alınan şey Akkusativ olur.'],
 ['erreichen','Ich erreiche {Akkusativ:den Zug}.','Trene yetişiyorum.','Ulaşılan yer/hedef Akkusativ olur.'],
 ['holen','Ich hole {Akkusativ:das Buch}.','Kitabı getiriyorum.','Getirilen şey Akkusativ olur.'],
 ['mieten','Wir mieten {Akkusativ:eine Wohnung}.','Bir daire kiralıyoruz.','Kiralanan şey Akkusativ olur.'],
 ['putzen','Ich putze {Akkusativ:das Fenster}.','Camı siliyorum.','Temizlenen şey Akkusativ olur.'],
 ['tragen','Er trägt {Akkusativ:den Koffer}.','Bavulu taşıyor.','Taşınan şey Akkusativ olur.'],
 ['verkaufen','Sie verkauft {Akkusativ:ihr Auto}.','Arabasını satıyor.','Satılan şey Akkusativ olur.'],
 ['verlieren','Ich verliere {Akkusativ:den Schlüssel}.','Anahtarı kaybediyorum.','Kaybedilen şey Akkusativ olur.'],
 ['wählen','Wir wählen {Akkusativ:den Weg}.','Yolu seçiyoruz.','Seçilen şey Akkusativ olur.'],
 ['wiederholen','Ich wiederhole {Akkusativ:die Regel}.','Kuralı tekrar ediyorum.','Tekrarlanan şey Akkusativ olur.'],
 ['vermissen','Ich vermisse {Akkusativ:meine Familie}.','Ailemi özlüyorum.','Özlenen kişi Akkusativ olur; fehlen ise Dativ ister: Du fehlst mir.'],
 ['verpassen','Ich verpasse {Akkusativ:den Bus}.','Otobüsü kaçırıyorum.','Kaçırılan şey Akkusativ olur.'],
 ['unterstützen','Wir unterstützen {Akkusativ:den Plan}.','Planı destekliyoruz.','Desteklenen kişi/şey Akkusativ olur.'],
 ['überzeugen','Ich überzeuge {Akkusativ:den Chef}.','Patronu ikna ediyorum.','İkna edilen kişi Akkusativ olur.'],
 ['beraten','Wir beraten {Akkusativ:den Kunden}.','Müşteriye danışmanlık yapıyoruz.','Danışmanlık verilen kişi Akkusativ olur.'],
 ['waschen','Ich wasche {Akkusativ:das Auto}.','Arabayı yıkıyorum.','Yıkanan şey Akkusativ olur.'],
 ['planen','Wir planen {Akkusativ:eine Reise}.','Bir yolculuk planlıyoruz.','Planlanan şey Akkusativ olur.'],
 ['kochen','Ich koche {Akkusativ:eine Suppe}.','Bir çorba pişiriyorum.','Pişirilen yemek Akkusativ olur.'],
] as const;
for (const [lemma,marked,tr,explanation] of moreAccusatives) simpleVerb(lemma,'Akkusativ',`${lemma} + jemanden/etwas (Akkusativ)`,'ilgili kişi / şey',marked,tr,explanation);
for (const [lemma,verb,obj,tr] of [
 ['zeigen','zeige','das Bild','Çocuğa resmi gösteriyorum.'],
 ['sagen','sage','die Wahrheit','Çocuğa gerçeği söylüyorum.'],
 ['schicken','schicke','einen Brief','Çocuğa bir mektup gönderiyorum.'],
 ['empfehlen','empfehle','ein Buch','Çocuğa bir kitap öneriyorum.'],
 ['erzählen','erzähle','eine Geschichte','Çocuğa bir hikâye anlatıyorum.'],
 ['leihen','leihe','einen Stift','Çocuğa bir kalem ödünç veriyorum.'],
 ['verbieten','verbiete','das Handy','Çocuğa telefonu yasaklıyorum.'],
 ['erlauben','erlaube','das Spiel','Çocuğa oyuna izin veriyorum.'],
 ['wünschen','wünsche','viel Glück','Çocuğa bol şans diliyorum.'],
]) add(lemma,[{pattern:`jemandem (Dativ) etwas (Akkusativ) ${lemma}`,complements:[{role:'alıcı / muhatap',case:'Dativ',requirement:'optional'},{role:'verilen / söylenen şey',case:'Akkusativ',requirement:'usage-dependent'}],explanation:'Alıcı veya muhatap Dativ, verilen/söylenen şey Akkusativ olur. Bu, fiilin her anlamını kapsayan tek etiket değildir.',example:example(`Ich ${verb} {Dativ:dem Kind} {Akkusativ:${obj}}.`,tr),sources:[wiki(lemma)]}]);
add('warten',[
 {pattern:'warten auf + Akkusativ',complements:[{role:'beklenen kişi / şey',case:'Akkusativ',preposition:'auf',requirement:'optional'}],explanation:'“Beklemek” anlamında neyin/kimin beklendiği auf + Akkusativ ile söylenir. “Ich warte.” de mümkündür. Buradaki auf için Wo/Wohin kuralı uygulanmaz.',example:example('Ich warte auf {Akkusativ:den Bus}.','Otobüsü bekliyorum.'),sources:[wiki('warten'),spatial]},
 {pattern:'etwas (Akkusativ) warten',complements:[{role:'bakımı yapılan cihaz',case:'Akkusativ',requirement:'usage-dependent'}],explanation:'Teknik “bakımını yapmak” anlamı başka bir kullanımdır; burada auf gelmez.',example:example('Die Technikerin wartet {Akkusativ:die Maschine}.','Teknisyen makinenin bakımını yapıyor.'),sources:[wiki('warten')]},
]);
add('sprechen',[
 {pattern:'sprechen mit + Dativ',complements:[{role:'konuşulan kişi',case:'Dativ',preposition:'mit',requirement:'optional'}],explanation:'Konuşma partneri mit + Dativ ile belirtilir. Her sprechen cümlesinde mit tamlayıcısı zorunlu değildir.',example:example('Ich spreche mit {Dativ:meinem Bruder}.','Erkek kardeşimle konuşuyorum.'),sources:[wiki('sprechen')]},
 {pattern:'sprechen über + Akkusativ',complements:[{role:'konuşulan konu',case:'Akkusativ',preposition:'über',requirement:'optional'}],explanation:'Konu über + Akkusativ ile belirtilir; bu mekânsal yön değildir. mit ve über aynı cümlede birlikte de kullanılabilir.',example:example('Wir sprechen über {Akkusativ:den Film}.','Film hakkında konuşuyoruz.'),sources:[wiki('sprechen'),{label:'Duden · sprechen',url:'https://www.duden.de/rechtschreibung/sprechen'}]},
],['“Ich spreche.” de tam bir cümledir. Dil söylemek (Deutsch sprechen) ve von + Dativ gibi başka kullanımlar da vardır.']);
const datPreps = [
 ['aus','Ich komme aus {Dativ:der Schule}.','Okuldan geliyorum.'],
 ['bei','Ich wohne bei {Dativ:meinem Onkel}.','Amcamın yanında yaşıyorum.'],
 ['mit','Ich fahre mit {Dativ:dem Bus}.','Otobüsle gidiyorum.'],
 ['nach','Nach {Dativ:dem Kurs} gehe ich nach Hause.','Kurstan sonra eve gidiyorum.'],
 ['seit','Ich lerne seit {Dativ:einem Monat} Deutsch.','Bir aydır Almanca öğreniyorum.'],
 ['von','Das Geschenk ist von {Dativ:meinem Vater}.','Hediye babamdan.'],
 ['zu','Ich gehe zu {Dativ:meinem Freund}.','Arkadaşımın yanına gidiyorum.'],
 ['außer','Alle kommen außer {Dativ:meinem Bruder}.','Erkek kardeşim dışında herkes geliyor.'],
];
const akkPreps = [
 ['durch','Ich gehe durch {Akkusativ:den Park}.','Parkın içinden yürüyorum.'],
 ['für','Das Geschenk ist für {Akkusativ:meine Mutter}.','Hediye annem için.'],
 ['gegen','Das Auto fährt gegen {Akkusativ:den Baum}.','Araba ağaca çarpıyor.'],
 ['ohne','Ich komme ohne {Akkusativ:meinen Bruder}.','Erkek kardeşim olmadan geliyorum.'],
 ['um','Wir sitzen um {Akkusativ:den Tisch}.','Masanın etrafında oturuyoruz.'],
];
for (const [governed,items] of [['Dativ',datPreps],['Akkusativ',akkPreps]] as const) for (const [lemma,marked,tr] of items) add(lemma,[{pattern:`${lemma} + ${governed}`,complements:[{role:'edatın isim / zamir tamlayıcısı',case:governed,preposition:lemma,requirement:'usage-dependent'}],explanation:`Bu edatlı isim/zamir grubunda ${governed} kullanılır. Hâli hareket olup olmaması değil, bu edatın yönetimi belirler.`,example:example(marked,tr),sources:[prepSource]}]);
const alternating = [
 ['an','der Wand','die Wand','Das Bild hängt an','Ich hänge das Bild an','Resim duvarda asılı.','Resmi duvara asıyorum.'],
 ['auf','dem Tisch','den Tisch','Das Buch liegt auf','Ich lege das Buch auf','Kitap masanın üzerinde.','Kitabı masanın üzerine koyuyorum.'],
 ['in','dem Park','den Park','Ich laufe in','Ich gehe in','Parkta koşuyorum.','Parka gidiyorum.'],
 ['über','dem Tisch','den Tisch','Die Lampe hängt über','Ich hänge die Lampe über','Lamba masanın üzerinde asılı.','Lambayı masanın üzerine asıyorum.'],
 ['unter','dem Tisch','den Tisch','Die Katze liegt unter','Die Katze läuft unter','Kedi masanın altında yatıyor.','Kedi masanın altına koşuyor.'],
 ['hinter','dem Haus','das Haus','Das Auto steht hinter','Ich fahre das Auto hinter','Araba evin arkasında duruyor.','Arabayı evin arkasına götürüyorum.'],
 ['neben','dem Bett','das Bett','Die Tasche liegt neben','Ich lege die Tasche neben','Çanta yatağın yanında.','Çantayı yatağın yanına koyuyorum.'],
 ['vor','der Tür','die Tür','Der Stuhl steht vor','Ich stelle den Stuhl vor','Sandalye kapının önünde.','Sandalyeyi kapının önüne koyuyorum.'],
 ['zwischen','den Stühlen','die Stühle','Die Tasche liegt zwischen','Ich lege die Tasche zwischen','Çanta sandalyelerin arasında.','Çantayı sandalyelerin arasına koyuyorum.'],
];
for (const [lemma,dat,akk,datStart,akkStart,datTr,akkTr] of alternating) add(lemma,[
 {pattern:`${lemma} + Dativ · Wo? (yer)`,complements:[{role:'olayın gerçekleştiği yer',case:'Dativ',preposition:lemma,requirement:'usage-dependent'}],explanation:'Mekânsal kullanımda mevcut yer/konum anlatılır. Aynı yerin içinde hareket olması Dativ kullanımını değiştirmez.',example:example(`${datStart} {Dativ:${dat}}.`,datTr),sources:[spatial]},
 {pattern:`${lemma} + Akkusativ · Wohin? (hedef)`,complements:[{role:'yönelinen / yerleştirme hedefi',case:'Akkusativ',preposition:lemma,requirement:'usage-dependent'}],explanation:'Mekânsal kullanımda bir hedefe yönelme veya bir şeyi o konuma yerleştirme anlatılır.',example:example(`${akkStart} {Akkusativ:${akk}}.`,akkTr),sources:[spatial]},
],['“Her hareket Akkusativ” yanlıştır: Ich laufe im Park (parkta koşuyorum, Dativ). Ich laufe in den Park (parka koşuyorum, Akkusativ).', 'Wo/Wohin ayrımı burada mekânsal kullanımlar içindir. Zaman ifadeleri ve warten auf / sprechen über gibi sabit fiil–edat kalıpları ayrıca öğrenilir.']);
add('wegen',[{pattern:'wegen + Genitiv · özellikle yazılı standart dil',complements:[{role:'neden',case:'Genitiv',preposition:'wegen',requirement:'usage-dependent'}],explanation:'Özellikle yazılı standart dilde temel kalıp Genitivdir.',example:example('Wegen {Genitiv:des Regens} bleiben wir zu Hause.','Yağmur nedeniyle evde kalıyoruz.'),sources:[dudenWegen]},
 {pattern:'wegen + Dativ · konuşma ve belirli yapılar',complements:[{role:'neden',case:'Dativ',preposition:'wegen',requirement:'usage-dependent'}],explanation:'Dativ konuşma dilinde yaygındır; bazı özel yapılarda standart dilde de gerekir. Sadece “yanlış” diye etiketlenmez.',example:example('Wegen {Dativ:dem Regen} bleiben wir zu Hause.','Yağmur nedeniyle evde kalıyoruz. (konuşma kullanımı)'),sources:[dudenWegen]},
],['A1–B1 yazı ve sınav pratiğinde önce wegen + Genitiv kalıbını kullan. “wegen Problemen” gibi Genitivin görünmediği çoğul yapılarda Dativ standarttır.']);

// Expansion: lexical cases and prepositional patterns checked against each linked
// Wiktionary entry. IDS A1/A2 VmP lists were used as a cross-check, not as a
// claim that every verb has just one obligatory complement.
const extraDatives: [string,string,string,string][] = [
 ['zuhören','Ich höre {Dativ:der Lehrerin} zu.','Öğretmeni dinliyorum.','Dikkatle dinlenen kişi/şey Dativ olur. hören + Akkusativ ile aynı yapı değildir.'],
 ['zustimmen','Ich stimme {Dativ:deinem Vorschlag} zu.','Önerine katılıyorum.','Katılınan görüş/kişi Dativ olur.'],
 ['widersprechen','Ich widerspreche {Dativ:dem Chef}.','Patrona itiraz ediyorum.','Karşı çıkılan kişi/görüş Dativ olur.'],
 ['gratulieren','Ich gratuliere {Dativ:meiner Schwester}.','Kız kardeşimi tebrik ediyorum.','Tebrik edilen kişi Dativ olur; ne için tebrik edildiği zu + Dativ ile de belirtilebilir.'],
 ['verzeihen','Ich verzeihe {Dativ:meinem Freund}.','Arkadaşımı affediyorum.','Affedilen kişi Dativ; affedilen davranış ayrıca Akkusativ olabilir: jemandem etwas verzeihen.'],
 ['gehorchen','Das Kind gehorcht {Dativ:seiner Mutter}.','Çocuk annesinin sözünü dinliyor.','İtaat edilen kişi/kurala Dativ verilir.'],
 ['schaden','Rauchen schadet {Dativ:der Gesundheit}.','Sigara içmek sağlığa zarar verir.','Zarar gören kişi/varlık Dativ olur.'],
 ['fehlen','Du fehlst {Dativ:mir}.','Seni özlüyorum.','Eksikliğini hisseden kişi Dativdir; eksik olan/özlenen kişi veya şey öznedir. Diğer fehlen kalıpları ayrıca öğrenilir.'],
 ['schmecken','Die Suppe schmeckt {Dativ:dem Kind}.','Çocuk çorbanın tadını beğeniyor.','Tadı değerlendiren kişi Dativ olur; tadı değerlendirilen yiyecek öznedir.'],
 ['passen','Die Jacke passt {Dativ:meinem Bruder}.','Ceket erkek kardeşime oluyor.','Giysinin uyduğu kişi Dativ olur; giysi öznedir.'],
];
for(const [lemma,marked,tr,explanation] of extraDatives) simpleVerb(lemma,'Dativ',`${lemma} + jemandem/etwas (Dativ)`,'ilgili kişi / varlık',marked,tr,explanation);
const extraAccusatives: [string,string,string,string][] = [
 ['haben','Ich habe {Akkusativ:einen Hund}.','Bir köpeğim var.','Sahip olunan kişi/şey bu asıl fiil kullanımında Akkusativ olur. Perfekt yardımcı fiili olan haben burada anlatılmaz.'],
 ['brauchen','Ich brauche {Akkusativ:einen Stift}.','Bir kaleme ihtiyacım var.','İhtiyaç duyulan şey/kişi Akkusativ olur. brauchen + zu + Infinitiv farklı bir yapıdır.'],
 ['suchen','Ich suche {Akkusativ:meinen Schlüssel}.','Anahtarımı arıyorum.','Aranan kişi/şey doğrudan nesne olduğunda Akkusativ olur. nach ile kurulan ayrı kullanım da aşağıdadır.'],
 ['finden','Ich finde {Akkusativ:meinen Schlüssel}.','Anahtarımı buluyorum.','Bulunan kişi/şey bu anlamda Akkusativ olur; bu, bütün finden anlamlarını kapsamaz.'],
 ['nehmen','Ich nehme {Akkusativ:den Bus}.','Otobüse biniyorum.','Alınan/seçilen şey bu kullanımda Akkusativ olur.'],
 ['trinken','Ich trinke {Akkusativ:einen Kaffee}.','Bir kahve içiyorum.','İçilen şey açıkça söylendiğinde Akkusativ olur. “Ich trinke.” gibi nesnesiz kullanımlar mümkündür.'],
 ['essen','Ich esse {Akkusativ:einen Apfel}.','Bir elma yiyorum.','Yenilen şey açıkça söylendiğinde Akkusativ olur. “Ich esse.” de mümkündür.'],
 ['lesen','Ich lese {Akkusativ:den Brief}.','Mektubu okuyorum.','Okunan şey Akkusativ olur; bu geçişli kullanımdır. Nesne belirtilmeden “Ich lese.” de söylenebilir.'],
 ['schreiben','Ich schreibe {Akkusativ:einen Brief}.','Bir mektup yazıyorum.','Yazılan metin doğrudan nesne olarak Akkusativ olur. Alıcı ayrıca Dativ veya an + Akkusativ ile belirtilebilir.'],
 ['hören','Ich höre {Akkusativ:den Vogel}.','Kuşu duyuyorum.','Duyulan ses/kişi/varlık doğrudan nesne olduğunda Akkusativ olur. von ile haber alma kullanımı aşağıda ayrıdır.'],
 ['lernen','Ich lerne {Akkusativ:die Wörter}.','Kelimeleri öğreniyorum.','Öğrenilen içerik bu kullanımda Akkusativ olur. “Ich lerne.” nesnesiz kullanılabilir.'],
 ['lieben','Ich liebe {Akkusativ:meine Familie}.','Ailemi seviyorum.','Sevilen kişi/şey bu geçişli kullanımda Akkusativ olur.'],
 ['mögen','Ich mag {Akkusativ:den Film}.','Filmi beğeniyorum.','Sevilen/beğenilen kişi/şey Akkusativ olur; burada asıl fiil anlamı öğretilir.'],
 ['vergessen','Ich vergesse {Akkusativ:den Termin}.','Randevuyu unutuyorum.','Unutulan kişi/şey güncel yaygın geçişli kullanımda Akkusativ olur. Bölgesel ve eski kalıplar ayrıca incelenmelidir.'],
 ['verstehen','Ich verstehe {Akkusativ:die Frage}.','Soruyu anlıyorum.','Anlaşılan kişi/içerik bu geçişli kullanımda Akkusativ olur. sich verstehen başka bir yapıdır.'],
 ['öffnen','Ich öffne {Akkusativ:die Tür}.','Kapıyı açıyorum.','Açılan şey bu geçişli kullanımda Akkusativ olur. “Die Tür öffnet sich.” aynı cümle yapısı değildir.'],
 ['schließen','Ich schließe {Akkusativ:das Fenster}.','Pencereyi kapatıyorum.','Kapatılan şey bu geçişli kullanımda Akkusativ olur; başka schließen anlamları ayrıca öğrenilir.'],
 ['bezahlen','Ich bezahle {Akkusativ:die Rechnung}.','Hesabı ödüyorum.','Ödenen fatura/borç bu kalıpta Akkusativ olur. Birine ödeme veya bir şeyin ücretini karşılama başka kalıplarla da kurulabilir.'],
 ['anrufen','Ich rufe {Akkusativ:meinen Vater} an.','Babamı telefonla arıyorum.','Telefonla aranan kişi standart kullanımda Akkusativ olur. Bazı bölgesel Dativ kullanımları bu temel kalıbın yerine genellenmez.'],
 ['treffen','Ich treffe {Akkusativ:meinen Freund}.','Arkadaşımla karşılaşıyorum / buluşuyorum.','Karşılaşılan/buluşulan kişi doğrudan nesne olduğunda Akkusativ olur. Dönüşlü mit kalıbı aşağıda ayrı gösterilir.'],
];
for(const [lemma,marked,tr,explanation] of extraAccusatives) simpleVerb(lemma,'Akkusativ',`${lemma} + jemanden/etwas (Akkusativ)`,'ilgili kişi / şey',marked,tr,explanation);
add('bringen',[{pattern:'jemandem (Dativ) etwas (Akkusativ) bringen',complements:[{role:'alıcı',case:'Dativ',requirement:'optional'},{role:'getirilen şey',case:'Akkusativ',requirement:'usage-dependent'}],explanation:'Getirilen şey Akkusativ, alıcı belirtilirse Dativ olur. Yer/yön grubu bunun yerine farklı bir tamlayıcı olabilir.',example:example('Ich bringe {Dativ:meiner Mutter} {Akkusativ:einen Tee}.','Anneme bir çay getiriyorum.'),sources:[wiki('bringen')]}]);
function appendPattern(lemma:string,pattern:RectionPattern,notes:string[]=[]){
  if(data[lemma]){data[lemma].patterns.push(pattern);data[lemma].notes.push(...notes);}else add(lemma,[pattern],notes);
}
function prepPattern(lemma:string,preposition:string,governed:GovernedCase,role:string,marked:string,tr:string,explanation:string,optional=false){
  appendPattern(lemma,{pattern:`${lemma} ${preposition} + ${governed}`,complements:[{role,case:governed,preposition,requirement:optional?'optional':'usage-dependent'}],explanation,example:example(marked,tr),sources:[wiki(lemma)]});
}
const extraPreps:[string,string,GovernedCase,string,string,string,string,boolean?][]=[
 ['denken','an','Akkusativ','düşünülen kişi / konu','Ich denke an {Akkusativ:meinen Urlaub}.','Tatilimi düşünüyorum.','Aklında tutma/düşünme anlamında an + Akkusativ; bu mekânsal hedef değildir.',true],
 ['hoffen','auf','Akkusativ','umut edilen şey','Ich hoffe auf {Akkusativ:eine Antwort}.','Bir cevap ümit ediyorum.','Umut edilen şey auf + Akkusativ ile belirtilir. “Ich hoffe.” de bağlamda kullanılabilir.',true],
 ['teilnehmen','an','Dativ','katılınan etkinlik','Ich nehme an {Dativ:einem Kurs} teil.','Bir kursa katılıyorum.','Katılınan etkinlik an + Dativ olur; hareket/hedef kuralı uygulanmaz.'],
 ['träumen','von','Dativ','rüyada görülen / hayal edilen','Ich träume von {Dativ:einem Haus}.','Bir evin hayalini kuruyorum.','Rüya/hayalin içeriği von + Dativ ile belirtilir; nesnesiz träumen de mümkündür.',true],
 ['lachen','über','Akkusativ','gülünen şey','Wir lachen über {Akkusativ:den Witz}.','Fıkraya gülüyoruz.','Gülmenin konusu über + Akkusativ ile eklenebilir. “Wir lachen.” da mümkündür.',true],
 ['nachdenken','über','Akkusativ','üzerinde düşünülen konu','Ich denke über {Akkusativ:deinen Vorschlag} nach.','Önerin üzerinde düşünüyorum.','Üzerinde düşünülen konu über + Akkusativ olur; bu yer/yön değildir.',true],
 ['aufpassen','auf','Akkusativ','gözetilen kişi / dikkat edilen şey','Ich passe auf {Akkusativ:das Kind} auf.','Çocuğa göz kulak oluyorum.','Gözetmek/göz kulak olmak anlamında auf + Akkusativ. “Pass auf!” gibi nesnesiz uyarı da vardır.'],
 ['aufhören','mit','Dativ','bırakılan / son verilen etkinlik','Ich höre mit {Dativ:dem Rauchen} auf.','Sigarayı bırakıyorum.','Son verilen etkinlik mit + Dativ ile belirtilir; “Ich höre auf.” da mümkündür.',true],
 ['bestehen','aus','Dativ','oluşumu meydana getiren parçalar','Der Kurs besteht aus {Dativ:vier Teilen}.','Kurs dört bölümden oluşuyor.','“Oluşmak” anlamında aus + Dativ. “Eine Prüfung bestehen” anlamıyla karıştırma.'],
 ['reagieren','auf','Akkusativ','tepkiye yol açan şey','Ich reagiere auf {Akkusativ:die Nachricht}.','Habere tepki veriyorum.','Tepkinin yöneldiği uyaran auf + Akkusativ olur.',true],
 ['riechen','nach','Dativ','yayılan kokunun benzetildiği şey','Es riecht nach {Dativ:frischem Brot}.','Taze ekmek kokuyor.','“Kokmak” anlamında nach + Dativ. “Etwas riechen” ile bir şeyi koklayıp algılama farklıdır.'],
 ['reden','mit','Dativ','konuşulan kişi','Ich rede mit {Dativ:meiner Nachbarin}.','Komşumla konuşuyorum.','Konuşma partneri mit + Dativ; konu ayrıca über ile gelebilir.',true],
 ['reden','über','Akkusativ','konuşulan konu','Wir reden über {Akkusativ:den Kurs}.','Kurs hakkında konuşuyoruz.','Konu über + Akkusativ; mekânsal yön anlamı yoktur.',true],
 ['telefonieren','mit','Dativ','telefondaki konuşma partneri','Ich telefoniere mit {Dativ:meiner Schwester}.','Kız kardeşimle telefonda konuşuyorum.','Yaygın standart kalıpta partner mit + Dativ ile eklenir; “Ich telefoniere.” de mümkündür.',true],
 // Existing new lemmas can have more than one selected usage.
 ['suchen','nach','Dativ','aranan kişi / şey','Ich suche nach {Dativ:meinem Schlüssel}.','Anahtarımı arıyorum.','Doğrudan Akkusativ nesnenin alternatifi nach + Dativ kalıbıdır; aynı tamlayıcıya iki etiket birden verilmez.'],
 ['hören','von','Dativ','haberi alınan kişi / olay','Ich höre von {Dativ:dem Unfall}.','Kazadan haberim oluyor.','Burada duymak/haber almak von + Dativ kalıbıdır; doğrudan ses algılama nesnesinden ayrıdır.'],
];
for(const row of extraPreps)prepPattern(...row);
function reflexivePattern(lemma:string,preposition:string,governed:GovernedCase,role:string,marked:string,tr:string,explanation:string,optional=false){
  appendPattern(lemma,{pattern:`sich ${lemma} ${preposition} + ${governed}`,complements:[{role:'dönüşlü zamir (özneyle aynı)',case:'Akkusativ',requirement:'usage-dependent'},{role,case:governed,preposition,requirement:optional?'optional':'usage-dependent'}],explanation:`Dönüşlü kullanım: sich kişiyle birlikte değişir (ich → mich). ${explanation}`,example:example(marked,tr),sources:[wiki(lemma)]});
}
const extraReflexive:[string,string,GovernedCase,string,string,string,string,boolean?][]=[
 ['freuen','auf','Akkusativ','beklenen sevindirici olay','Ich freue {Akkusativ:mich} auf {Akkusativ:den Urlaub}.','Tatili heyecanla bekliyorum.','Henüz beklenen olay için auf + Akkusativ. Bu kalıp, aşağıdaki über kullanımından ayrıdır.'],
 ['freuen','über','Akkusativ','sevinç nedeni','Ich freue {Akkusativ:mich} über {Akkusativ:das Geschenk}.','Hediyeye seviniyorum.','Mevcut/öğrenilen sevinç nedeni için über + Akkusativ. “Ich freue mich.” de mümkündür.',true],
 ['interessieren','für','Akkusativ','ilgi duyulan konu','Ich interessiere {Akkusativ:mich} für {Akkusativ:den Kurs}.','Kursa ilgi duyuyorum.','İlgi duyulan konu für + Akkusativ; “Etwas interessiert mich” farklı geçişli yapıdır.'],
 ['erinnern','an','Akkusativ','hatırlanan kişi / şey','Ich erinnere {Akkusativ:mich} an {Akkusativ:meinen Lehrer}.','Öğretmenimi hatırlıyorum.','Hatırlamak anlamında an + Akkusativ. Birine bir şeyi hatırlatmak farklı geçişli kullanımdır.'],
 ['kümmern','um','Akkusativ','ilgilenilen kişi / iş','Ich kümmere {Akkusativ:mich} um {Akkusativ:das Kind}.','Çocukla ilgileniyorum.','Bakmak/ilgilenmek anlamında um + Akkusativ.'],
 ['beschäftigen','mit','Dativ','uğraşılan konu / etkinlik','Ich beschäftige {Akkusativ:mich} mit {Dativ:der Grammatik}.','Dil bilgisiyle uğraşıyorum.','Uğraşma anlamında mit + Dativ. İşe almak anlamındaki beschäftigen ayrı bir kullanımdır.'],
 ['konzentrieren','auf','Akkusativ','odaklanılan şey','Ich konzentriere {Akkusativ:mich} auf {Akkusativ:die Aufgabe}.','Göreve odaklanıyorum.','Odaklanılan şey auf + Akkusativ; “Ich konzentriere mich.” da mümkündür.',true],
 ['bedanken','bei','Dativ','teşekkür edilen kişi','Ich bedanke {Akkusativ:mich} bei {Dativ:meiner Lehrerin}.','Öğretmenime teşekkür ediyorum.','Teşekkür edilen kişi bei + Dativ ile eklenir; neden für ile söylenebilir.',true],
 ['bedanken','für','Akkusativ','teşekkürün nedeni','Ich bedanke {Akkusativ:mich} für {Akkusativ:die Hilfe}.','Yardım için teşekkür ediyorum.','Teşekkürün nedeni für + Akkusativ. bei ile birlikte kullanılabilir.',true],
 ['entschuldigen','bei','Dativ','özür dilenen kişi','Ich entschuldige {Akkusativ:mich} bei {Dativ:meinem Freund}.','Arkadaşımdan özür diliyorum.','Özür dilenen kişi bei + Dativ; neden için für + Akkusativ gelebilir.',true],
 ['entschuldigen','für','Akkusativ','özrün nedeni','Ich entschuldige {Akkusativ:mich} für {Akkusativ:den Fehler}.','Hata için özür diliyorum.','Özrün nedeni für + Akkusativ; “Entschuldigen Sie mich” başka bir yapıdır.',true],
 ['bewerben','bei','Dativ','başvurulan kurum / kişi','Ich bewerbe {Akkusativ:mich} bei {Dativ:einer Firma}.','Bir şirkete başvuruyorum.','İş başvurusunda kurum bei + Dativ; istenen pozisyon um + Akkusativ ile ayrıca gelebilir.',true],
 ['bewerben','um','Akkusativ','istenen pozisyon / yer','Ich bewerbe {Akkusativ:mich} um {Akkusativ:eine Stelle}.','Bir işe başvuruyorum.','İstenen pozisyon um + Akkusativ; reklamını yapmak anlamındaki etwas bewerben ayrı geçişli yapıdır.'],
 ['beschweren','bei','Dativ','şikâyetin iletildiği kişi / kurum','Ich beschwere {Akkusativ:mich} bei {Dativ:dem Vermieter}.','Ev sahibine şikâyette bulunuyorum.','Şikâyetin muhatabı bei + Dativ ile eklenir.',true],
 ['beschweren','über','Akkusativ','şikâyet edilen şey / kişi','Ich beschwere {Akkusativ:mich} über {Akkusativ:den Lärm}.','Gürültüden şikâyet ediyorum.','Şikâyet konusu über + Akkusativ olur; ağırlık koymak anlamındaki beschweren farklıdır.',true],
 ['verlieben','in','Akkusativ','âşık olunan kişi','Ich verliebe {Akkusativ:mich} in {Akkusativ:meinen Kollegen}.','Erkek iş arkadaşıma âşık oluyorum.','Âşık olunan kişi in + Akkusativ. “Ich habe mich verliebt.” de mümkündür; bu yer/hedef kuralı değildir.',true],
 ['vorbereiten','auf','Akkusativ','hazırlanılan olay','Ich bereite {Akkusativ:mich} auf {Akkusativ:die Prüfung} vor.','Sınava hazırlanıyorum.','Kendini hazırlama anlamında auf + Akkusativ; bir şeyi/birini hazırlamak geçişli başka bir yapıdır.'],
 ['unterhalten','mit','Dativ','sohbet edilen kişi','Ich unterhalte {Akkusativ:mich} mit {Dativ:meinem Freund}.','Arkadaşımla sohbet ediyorum.','Sohbet partneri mit + Dativ; geçindirmek/eğlendirmek anlamları farklıdır.',true],
 ['unterhalten','über','Akkusativ','sohbet konusu','Wir unterhalten {Akkusativ:uns} über {Akkusativ:den Film}.','Film hakkında sohbet ediyoruz.','Sohbet konusu über + Akkusativ olur.',true],
 ['verabreden','mit','Dativ','buluşma kararlaştırılan kişi','Ich verabrede {Akkusativ:mich} mit {Dativ:meiner Freundin}.','Arkadaşımla buluşmak üzere sözleşiyorum.','Buluşma kararlaştırılan kişi mit + Dativ; bir şeyi kararlaştırmak başka bir yapıdır.',true],
 ['treffen','mit','Dativ','buluşulan kişi','Ich treffe {Akkusativ:mich} mit {Dativ:meinem Freund}.','Arkadaşımla buluşuyorum.','Dönüşlü mit kalıbı, jemanden treffen doğrudan nesne kalıbından ayrıdır.'],
];
for(const row of extraReflexive)reflexivePattern(...row);
appendPattern('bitten',{pattern:'jemanden (Akkusativ) um etwas (Akkusativ) bitten',complements:[{role:'ricanın yöneltildiği kişi',case:'Akkusativ',requirement:'optional'},{role:'rica edilen şey',case:'Akkusativ',preposition:'um',requirement:'usage-dependent'}],explanation:'İstenen şey um + Akkusativ, rica edilen kişi doğrudan Akkusativ nesne olur. Kişi bağlamdan belliyse söylenmeyebilir.',example:example('Ich bitte {Akkusativ:meinen Bruder} um {Akkusativ:Hilfe}.','Erkek kardeşimden yardım rica ediyorum.'),sources:[wiki('bitten')]});
appendPattern('einladen',{pattern:'jemanden (Akkusativ) zu etwas (Dativ) einladen',complements:[{role:'davet edilen kişi',case:'Akkusativ',requirement:'usage-dependent'},{role:'davetin etkinliği',case:'Dativ',preposition:'zu',requirement:'optional'}],explanation:'Davet edilen kişi Akkusativ, etkinlik belirtildiğinde zu + Dativ olur. Ödeme/ikram etme gibi başka anlamlar ayrıca incelenmelidir.',example:example('Ich lade {Akkusativ:meinen Nachbarn} zu {Dativ:meiner Party} ein.','Komşumu partime davet ediyorum.'),sources:[wiki('einladen')]});
// Additional contrasts for lemmas introduced above; do not replace their first pattern.
prepPattern('schmecken','nach','Dativ','algılanan tat','Die Suppe schmeckt nach {Dativ:Knoblauch}.','Çorbanın tadı sarımsağı andırıyor.','Yiyeceğin tat niteliği nach + Dativ ile belirtilir; tadı beğenen kişi başka bir tamlayıcıdır.');
appendPattern('bestehen',{pattern:'etwas (Akkusativ) bestehen · sınavı geçmek',complements:[{role:'başarıyla tamamlanan sınav',case:'Akkusativ',requirement:'usage-dependent'}],explanation:'Sınavı geçmek anlamında doğrudan Akkusativ nesne vardır; aus + Dativ ile oluşmak anlamından ayrıdır.',example:example('Ich bestehe {Akkusativ:die Prüfung}.','Sınavı geçiyorum.'),sources:[wiki('bestehen')]});

// Extra directly checked sources where a lexical entry has sparse case notation.
data['widersprechen'].patterns[0].sources.push({label:'IDS E-VALBU · widersprechen',url:'https://grammis.ids-mannheim.de/verbs/view/401223/2'});
data['schmecken'].patterns[0].sources.push({label:'PONS · schmecken',url:'https://de.pons.com/übersetzung/deutsche-rechtschreibung/schmecken'});
data['verabreden'].patterns[0].sources.push({label:'IDS · Verben mit Präpositionen A2',url:'https://grammis.ids-mannheim.de/pdf/VmP-A2-Liste.pdf'});

/** Counts confirmed canonical lemmas only; reflexive aliases are not extra entries. */
export function listRectionLemmas():string[]{return Object.keys(data).sort((a,b)=>a.localeCompare(b,'de'));}

/** Expects a confirmed dictionary lemma, not an arbitrary conjugated form.
 * Preserve capitalization: nominalized Sehen must not silently become sehen.
 */
export function getRection(lemma: string): RectionData {
  const key = lemma.trim().normalize('NFC');
  const reflexiveLemma=key.startsWith('sich ')?key.slice(5):'';
  const selectedReflexive=reflexiveLemma && Object.prototype.hasOwnProperty.call(data,reflexiveLemma) && data[reflexiveLemma].patterns.some(p=>p.pattern.startsWith('sich ')) ? reflexiveLemma : key;
  const canonical = key === 'warten auf' ? 'warten' : key === 'sprechen mit' || key === 'sprechen über' ? 'sprechen' : selectedReflexive;
  const found = Object.prototype.hasOwnProperty.call(data,canonical) ? data[canonical] : undefined;
  return found ? JSON.parse(JSON.stringify(found)) as RectionData : {version:1,lemma:key,status:'unknown',summary:'Hâl bilgisi bulunamadı',patterns:[],notes:['Bu temel biçim için doğrulanmış kullanım kalıbı henüz eklenmedi. Bu, kelimenin tamlayıcı almadığı anlamına gelmez.']};
}
