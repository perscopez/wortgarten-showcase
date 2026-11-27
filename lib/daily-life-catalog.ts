export type DailyLifeCategory = "market" | "ulaşım" | "doktor" | "ev" | "sohbet";
export type DailyLifeLevel = "A1" | "A2" | "B1-bridge";

export interface DailyLifeTurn {
  speaker: string;
  de: string;
  tr: string;
}

export interface DailyLifeExercise {
  id: string;
  kind: "choice" | "fill";
  prompt: string;
  sentence: string;
  translation: string;
  options?: string[];
  answers: string[];
  explanation: string;
}

export interface DailyLifeDialogue {
  id: string;
  category: DailyLifeCategory;
  title: string;
  level: DailyLifeLevel;
  targets: string[];
  turns: DailyLifeTurn[];
  exercises: DailyLifeExercise[];
  provenance: {
    kind: "original";
    note: string;
    references: { label: string; url: string }[];
  };
}

/** Short, original practice dialogs for everyday German. */
export const DAILY_LIFE_CATALOG: DailyLifeDialogue[] = [
  {
    id: "market-bakery-a1",
    category: "market",
    title: "Fırında alışveriş",
    level: "A1",
    targets: ["alışverişte rica etmek", "miktar söylemek", "fiyat sormak"],
    turns: [
      { speaker: "Kundin", de: "Guten Morgen. Ich hätte gern zwei Brötchen.", tr: "Günaydın. İki küçük ekmek alabilir miyim?" },
      { speaker: "Verkäufer", de: "Gern. Möchten Sie noch etwas?", tr: "Tabii. Başka bir şey ister misiniz?" },
      { speaker: "Kundin", de: "Ja, ein Stück Apfelkuchen, bitte.", tr: "Evet, bir dilim elmalı kek lütfen." },
      { speaker: "Verkäufer", de: "Zusammen sind das vier Euro zwanzig.", tr: "Toplam dört avro yirmi sent tutuyor." },
      { speaker: "Kundin", de: "Hier, bitte. Auf Wiedersehen!", tr: "Buyurun. Hoşça kalın!" },
    ],
    exercises: [
      { id: "market-bakery-a1-choice", kind: "choice", prompt: "Satıcı, başka bir şey isteyip istemediğini soruyor. Uygun yanıtı seç.", sentence: "Verkäufer: Möchten Sie noch etwas? — Kundin: ___", translation: "Satıcı: Başka bir şey ister misiniz? — Müşteri: ___", options: ["Nein, danke. Das ist alles.", "Wo ist der Bahnhof?", "Ich war gestern zu Hause."], answers: ["Nein, danke. Das ist alles."], explanation: "Doğru seçenek, alışverişi nazikçe bitirir: ‘Hayır, teşekkürler. Hepsi bu.’" },
      { id: "market-bakery-a1-fill", kind: "fill", prompt: "Boşluğu, iki küçük ekmek istemek için doldur.", sentence: "Ich hätte gern ___ Brötchen.", translation: "İki küçük ekmek alabilir miyim?", answers: ["zwei"], explanation: "‘Brötchen’ burada çoğul kullanılır; miktar için ‘zwei’ denir." },
    ],
    provenance: { kind: "original", note: "Günlük alışveriş için özgün, kısa dil alıştırması.", references: [] },
  },
  {
    id: "market-checkout-a2",
    category: "market",
    title: "Pazarda domates",
    level: "A2",
    targets: ["miktar ve fiyat konuşmak", "tercih belirtmek", "nazikçe rica etmek"],
    turns: [
      { speaker: "Kunde", de: "Guten Tag. Was kosten die Tomaten?", tr: "İyi günler. Domatesler ne kadar?" },
      { speaker: "Verkäuferin", de: "Drei Euro pro Kilo.", tr: "Kilosu üç avro." },
      { speaker: "Kunde", de: "Dann nehme ich ein halbes Kilo, bitte.", tr: "O zaman yarım kilo alayım lütfen." },
      { speaker: "Verkäuferin", de: "Möchten Sie die reifen oder die festen?", tr: "Olgun olanlardan mı, sert olanlardan mı istersiniz?" },
      { speaker: "Kunde", de: "Die festen bitte. Sie sind für einen Salat.", tr: "Sert olanlardan lütfen. Salata içinler." },
      { speaker: "Verkäuferin", de: "Gute Wahl. Das macht einen Euro fünfzig.", tr: "İyi seçim. Bir avro elli sent tutuyor." },
    ],
    exercises: [
      { id: "market-checkout-a2-choice", kind: "choice", prompt: "Satıcı iki tür domates sunuyor; müşteri salata için sert olanları tercih ediyor. Doğru yanıtı seç.", sentence: "Verkäuferin: Reife oder feste Tomaten? — Kunde: ___", translation: "Satıcı: Olgun domates mi, sert domates mi? — Müşteri: ___", options: ["Die festen bitte. Sie sind für einen Salat.", "Ich brauche eine Fahrkarte.", "Seit Montag habe ich Urlaub."], answers: ["Die festen bitte. Sie sind für einen Salat."], explanation: "‘Die festen bitte’ sert olanları seçer; ikinci cümle tercihin nedenini açıklar." },
      { id: "market-checkout-a2-fill", kind: "fill", prompt: "Müşteri yarım kilo domates alıyor. Boşluğu tamamla.", sentence: "Dann nehme ich ___ Kilo, bitte.", translation: "O zaman yarım kilo alayım lütfen.", answers: ["ein halbes"], explanation: "‘Ein halbes Kilo’ yarım kilo demektir; ‘Kilo’ nötr olduğu için ‘halbes’ biçimi kullanılır." },
    ],
    provenance: { kind: "original", note: "Pazar alışverişi bağlamında özgün diyalog.", references: [] },
  },
  {
    id: "transport-ticket-a1",
    category: "ulaşım",
    title: "Otobüs bileti",
    level: "A1",
    targets: ["bilet istemek", "varış yeri söylemek", "ücret sormak"],
    turns: [
      { speaker: "Fahrgast", de: "Guten Tag. Eine Fahrkarte zum Zentrum, bitte.", tr: "İyi günler. Merkeze bir bilet lütfen." },
      { speaker: "Fahrer", de: "Eine einfache Fahrt oder hin und zurück?", tr: "Tek yön mü, gidiş-dönüş mü?" },
      { speaker: "Fahrgast", de: "Eine einfache Fahrt, bitte. Was kostet die Fahrkarte?", tr: "Tek yön. Ne kadar?" },
      { speaker: "Fahrer", de: "Zwei Euro. Sie können hier bezahlen.", tr: "İki avro. Burada ödeyebilirsiniz." },
      { speaker: "Fahrgast", de: "Danke. Wo muss ich aussteigen?", tr: "Teşekkürler. Nerede inmem gerekiyor?" },
    ],
    exercises: [
      { id: "transport-ticket-a1-choice", kind: "choice", prompt: "Şoför tek yön mü gidiş-dönüş mü istediğini soruyor. Tek yön için yanıtı seç.", sentence: "Fahrer: Eine einfache Fahrt oder hin und zurück? — Fahrgast: ___", translation: "Şoför: Tek yön mü, gidiş-dönüş mü? — Yolcu: ___", options: ["Eine einfache Fahrt, bitte.", "Ein Kilo Äpfel.", "Mir geht es gut."], answers: ["Eine einfache Fahrt, bitte."], explanation: "‘Eine einfache Fahrt’ tek yön yolculuk demektir; ‘hin und zurück’ gidiş-dönüştür." },
      { id: "transport-ticket-a1-fill", kind: "fill", prompt: "Boşluğu, merkeze bilet istemek için doldur.", sentence: "Eine Fahrkarte ___ Zentrum, bitte.", translation: "Merkeze bir bilet lütfen.", answers: ["zum"], explanation: "‘Zu dem’ kısaltılarak ‘zum’ olur: ‘zum Zentrum’." },
    ],
    provenance: { kind: "original", note: "Toplu taşımada bilet alma pratiği için özgün örnek.", references: [] },
  },
  {
    id: "transport-platform-a2",
    category: "ulaşım",
    title: "Tren peronunu bulmak",
    level: "A2",
    targets: ["yol tarifi sormak", "gecikme bildirmek", "peron bilgisi anlamak"],
    turns: [
      { speaker: "Reisende", de: "Entschuldigung, fährt der Zug nach Köln von Gleis vier?", tr: "Affedersiniz, Köln treni dördüncü perondan mı kalkıyor?" },
      { speaker: "Mitarbeiter", de: "Heute fährt er von Gleis sechs.", tr: "Bugün altıncı perondan kalkıyor." },
      { speaker: "Reisende", de: "Ist der Zug pünktlich?", tr: "Tren zamanında mı?" },
      { speaker: "Mitarbeiter", de: "Nein, er hat zehn Minuten Verspätung.", tr: "Hayır, on dakika gecikmesi var." },
      { speaker: "Reisende", de: "Danke. Wie komme ich zu Gleis sechs?", tr: "Teşekkürler. Altıncı perona nasıl gidebilirim?" },
      { speaker: "Mitarbeiter", de: "Gehen Sie die Treppe hinunter und dann nach links.", tr: "Merdivenlerden aşağı inin, sonra sola dönün." },
    ],
    exercises: [
      { id: "transport-platform-a2-choice", kind: "choice", prompt: "Görevli trenin on dakika gecikeceğini söylüyor. Buna uygun yanıtı seç.", sentence: "Mitarbeiter: Der Zug hat zehn Minuten Verspätung. — Reisende: ___", translation: "Görevli: Tren on dakika gecikmeli. — Yolcu: ___", options: ["Danke für die Information.", "Ich hätte gern zwei Brötchen.", "Gute Besserung!"], answers: ["Danke für die Information."], explanation: "Bu yanıt verilen gecikme bilgisine uygun, doğal bir teşekkürdür." },
      { id: "transport-platform-a2-fill", kind: "fill", prompt: "Tren on dakika gecikmeli. Boşluğu tamamla.", sentence: "Der Zug hat zehn Minuten ___.", translation: "Tren on dakika gecikmeli.", answers: ["Verspätung"], explanation: "‘Verspätung haben’ gecikmesi olmak demektir." },
    ],
    provenance: { kind: "original", note: "İstasyonda bilgi alma için özgün konuşma alıştırması.", references: [] },
  },
  {
    id: "doctor-appointment-a2",
    category: "doktor",
    title: "Muayene randevusu",
    level: "A2",
    targets: ["randevu istemek", "uygun zamanı sormak", "gün belirtmek"],
    turns: [
      { speaker: "Patientin", de: "Guten Tag. Ich möchte einen Termin vereinbaren.", tr: "İyi günler. Bir randevu ayarlamak istiyorum." },
      { speaker: "Praxis-Mitarbeiter", de: "Gern. Passt Ihnen Donnerstag?", tr: "Tabii. Perşembe size uyar mı?" },
      { speaker: "Patientin", de: "Am Donnerstag kann ich leider nicht. Haben Sie am Freitag Zeit?", tr: "Perşembe maalesef gelemem. Cuma için vaktiniz var mı?" },
      { speaker: "Praxis-Mitarbeiter", de: "Ja, um zehn Uhr ist noch etwas frei.", tr: "Evet, saat onda hâlâ boşluk var." },
      { speaker: "Patientin", de: "Das passt gut. Vielen Dank.", tr: "Bu çok uygun. Çok teşekkür ederim." },
    ],
    exercises: [
      { id: "doctor-appointment-a2-choice", kind: "choice", prompt: "Hasta randevu almak istiyor. Telefonda bunu doğal biçimde nasıl söyler?", sentence: "Patientin: ___", translation: "Hasta: ___", options: ["Ich möchte einen Termin vereinbaren.", "Ich nehme ein halbes Kilo.", "Wo ist Gleis sechs?"], answers: ["Ich möchte einen Termin vereinbaren."], explanation: "‘Einen Termin vereinbaren’ randevu ayarlamak için kullanılan doğal ifadedir." },
      { id: "doctor-appointment-a2-fill", kind: "fill", prompt: "Görevli cuma günü saat onda boşluk olduğunu söylüyor. Boşluğu tamamla.", sentence: "Am Freitag um zehn Uhr ist noch etwas ___.", translation: "Cuma saat onda hâlâ boşluk var.", answers: ["frei"], explanation: "Randevu takviminde ‘etwas frei sein’ bir zaman aralığının boş olmasıdır." },
    ],
    provenance: { kind: "original", note: "Yalnızca randevu dili pratiği sunan özgün rol oyunu; sağlık önerisi içermez.", references: [] },
  },
  {
    id: "doctor-symptoms-b1-bridge",
    category: "doktor",
    title: "Belirtiyi tarif etmek",
    level: "B1-bridge",
    targets: ["belirtiyi tarif etmek", "ne zamandır sürdüğünü söylemek", "soruyu netleştirmek"],
    turns: [
      { speaker: "Arzt", de: "Was führt Sie heute zu mir?", tr: "Bugün sizi buraya getiren nedir?" },
      { speaker: "Patient", de: "Ich habe seit gestern Halsschmerzen und fühle mich müde.", tr: "Dünden beri boğazım ağrıyor ve kendimi yorgun hissediyorum." },
      { speaker: "Arzt", de: "Haben Sie auch Husten?", tr: "Öksürüğünüz de var mı?" },
      { speaker: "Patient", de: "Entschuldigung, ich habe die Frage nicht verstanden. Können Sie sie bitte wiederholen?", tr: "Affedersiniz, soruyu anlamadım. Tekrar edebilir misiniz?" },
      { speaker: "Arzt", de: "Natürlich. Husten Sie manchmal?", tr: "Elbette. Bazen öksürüyor musunuz?" },
      { speaker: "Patient", de: "Ja, aber nicht sehr oft.", tr: "Evet, ama çok sık değil." },
    ],
    exercises: [
      { id: "doctor-symptoms-b1-bridge-choice", kind: "choice", prompt: "Hasta soruyu duymadığı için tekrar rica ediyor. Uygun cümleyi seç.", sentence: "Patient: ___", translation: "Hasta: ___", options: ["Können Sie die Frage bitte wiederholen?", "Können Sie mir ein Kilo geben?", "Wann fährt der Bus?"], answers: ["Können Sie die Frage bitte wiederholen?"], explanation: "Doğru seçenek, sorunun tekrar edilmesini nazikçe ister." },
      { id: "doctor-symptoms-b1-bridge-fill", kind: "fill", prompt: "Hasta boğaz ağrısının dünden beri sürdüğünü söylüyor. Boşluğu doldur.", sentence: "Ich habe ___ gestern Halsschmerzen.", translation: "Dünden beri boğazım ağrıyor.", answers: ["seit"], explanation: "Şu ana kadar devam eden bir süre başlangıcını anlatırken ‘seit’ kullanılır." },
    ],
    provenance: { kind: "original", note: "Belirti ifade etme ve iletişimi netleştirme üzerine özgün dil rol oyunu; tanı veya tedavi önermez.", references: [] },
  },
  {
    id: "home-neighbor-a1",
    category: "ev",
    title: "Yeni komşuyla tanışma",
    level: "A1",
    targets: ["tanışmak", "nerede oturduğunu söylemek", "yardım teklif etmek"],
    turns: [
      { speaker: "Nachbarin", de: "Hallo! Ich bin Mira. Sind Sie neu hier?", tr: "Merhaba! Ben Mira. Burada yeni misiniz?" },
      { speaker: "Nachbar", de: "Ja, ich heiße Deniz. Ich wohne im zweiten Stock.", tr: "Evet, benim adım Deniz. İkinci katta oturuyorum." },
      { speaker: "Nachbarin", de: "Willkommen im Haus! Brauchen Sie Hilfe mit den Kisten?", tr: "Apartmana hoş geldiniz! Kutular için yardıma ihtiyacınız var mı?" },
      { speaker: "Nachbar", de: "Danke, das ist sehr nett. Könnten Sie bitte diese Kiste tragen?", tr: "Teşekkürler, çok naziksiniz. Bu kutuyu taşıyabilir misiniz?" },
      { speaker: "Nachbarin", de: "Natürlich. Ich nehme diese hier.", tr: "Elbette. Şunu ben alayım." },
    ],
    exercises: [
      { id: "home-neighbor-a1-choice", kind: "choice", prompt: "Komşu yeni taşınana hoş geldin diyor ve yardım teklif ediyor. Kabul eden yanıtı seç.", sentence: "Nachbarin: Brauchen Sie Hilfe mit den Kisten? — Nachbar: ___", translation: "Komşu: Kutular için yardıma ihtiyacınız var mı? — Komşu: ___", options: ["Ja, danke. Könnten Sie bitte diese Kiste tragen?", "Nein, ich fahre nach Köln.", "Die Tomaten kosten drei Euro."], answers: ["Ja, danke. Könnten Sie bitte diese Kiste tragen?"], explanation: "Bu yanıt yardımı kabul eder ve nazikçe teşekkür eder." },
      { id: "home-neighbor-a1-fill", kind: "fill", prompt: "Deniz ikinci katta oturduğunu söylüyor. Boşluğu tamamla.", sentence: "Ich wohne im zweiten ___.", translation: "İkinci katta oturuyorum.", answers: ["Stock"], explanation: "Kat için ‘der Stock’ kullanılır; ‘im’ burada ‘in dem’ biçiminin kısaltmasıdır." },
    ],
    provenance: { kind: "original", note: "Komşuluk ve taşınma bağlamında özgün gündelik diyalog.", references: [] },
  },
  {
    id: "home-repair-b1-bridge",
    category: "ev",
    title: "Ev sahibine arıza bildirmek",
    level: "B1-bridge",
    targets: ["arıza bildirmek", "zaman aralığı ayarlamak", "kibarca bilgi vermek"],
    turns: [
      { speaker: "Mieterin", de: "Guten Abend, ich wollte Bescheid sagen, dass die Heizung nicht funktioniert.", tr: "İyi akşamlar, kaloriferin çalışmadığını haber vermek istedim." },
      { speaker: "Vermieter", de: "Seit wann ist das so?", tr: "Ne zamandan beri böyle?" },
      { speaker: "Mieterin", de: "Seit heute Morgen. Im Wohnzimmer wird es langsam kalt.", tr: "Bu sabahtan beri. Oturma odası yavaş yavaş soğuyor." },
      { speaker: "Vermieter", de: "Ich kann morgen einen Techniker schicken. Sind Sie am Vormittag zu Hause?", tr: "Yarın bir teknisyen gönderebilirim. Sabah evde misiniz?" },
      { speaker: "Mieterin", de: "Ja, zwischen neun und zwölf Uhr. Danke, dass Sie sich darum kümmern.", tr: "Evet, dokuz ile on iki arasında. Bununla ilgilendiğiniz için teşekkürler." },
      { speaker: "Vermieter", de: "Gut, ich bestätige den Termin noch per Nachricht.", tr: "Peki, randevuyu ayrıca mesajla teyit edeceğim." },
    ],
    exercises: [
      { id: "home-repair-b1-bridge-choice", kind: "choice", prompt: "Kiracı kalorifer arızasını ev sahibine bildiriyor. Konuya uygun cümleyi seç.", sentence: "Mieterin: ___", translation: "Kiracı: ___", options: ["Die Heizung funktioniert nicht.", "Ich möchte zwei Brötchen.", "Der Zug ist pünktlich."], answers: ["Die Heizung funktioniert nicht."], explanation: "Doğru cümle kaloriferin çalışmadığını açıkça bildirir." },
      { id: "home-repair-b1-bridge-fill", kind: "fill", prompt: "Kiracı arızanın bu sabahtan beri sürdüğünü söylüyor. Boşluğu doldur.", sentence: "Das Problem besteht ___ heute Morgen.", translation: "Sorun bu sabahtan beri devam ediyor.", answers: ["seit"], explanation: "‘Seit heute Morgen’ bu sabahtan beri anlamına gelir." },
    ],
    provenance: { kind: "original", note: "Ev içi arıza ve randevu ayarlama üzerine özgün dil pratiği.", references: [] },
  },
  {
    id: "chat-weekend-a1",
    category: "sohbet",
    title: "Hafta sonu planı",
    level: "A1",
    targets: ["hal hatır sormak", "plan önermek", "saati netleştirmek"],
    turns: [
      { speaker: "Lena", de: "Hallo Can, wie geht es dir?", tr: "Merhaba Can, nasılsın?" },
      { speaker: "Can", de: "Gut, danke! Und dir?", tr: "İyiyim, teşekkürler! Ya sen?" },
      { speaker: "Lena", de: "Auch gut. Hast du am Samstag Zeit?", tr: "Ben de iyiyim. Cumartesi vaktin var mı?" },
      { speaker: "Can", de: "Ja. Möchtest du im Park spazieren gehen?", tr: "Evet. Parkta yürüyüş yapmak ister misin?" },
      { speaker: "Lena", de: "Gern! Um drei Uhr?", tr: "Memnuniyetle! Saat üçte mi?" },
      { speaker: "Can", de: "Ja, bis dann!", tr: "Evet, görüşürüz!" },
    ],
    exercises: [
      { id: "chat-weekend-a1-choice", kind: "choice", prompt: "Arkadaşı cumartesi için parkta yürüyüş öneriyor. Kabul eden yanıtı seç.", sentence: "Can: Möchtest du im Park spazieren gehen? — Lena: ___", translation: "Can: Parkta yürüyüş yapmak ister misin? — Lena: ___", options: ["Gern! Um drei Uhr?", "Ich habe Halsschmerzen.", "Eine einfache Fahrt oder hin und zurück?"], answers: ["Gern! Um drei Uhr?"], explanation: "‘Gern!’ teklifi memnuniyetle kabul eder; ardından saat sorulur." },
      { id: "chat-weekend-a1-fill", kind: "fill", prompt: "Lena cumartesi vakti olup olmadığını soruyor. Boşluğu doldur.", sentence: "Hast du am Samstag ___?", translation: "Cumartesi vaktin var mı?", answers: ["Zeit"], explanation: "‘Zeit haben’ vakti olmak anlamındadır." },
    ],
    provenance: { kind: "original", note: "Arkadaşlar arasında hafta sonu planı için özgün diyalog.", references: [] },
  },
  {
    id: "chat-smalltalk-b1-bridge",
    category: "sohbet",
    title: "Yeni iş hakkında sohbet",
    level: "B1-bridge",
    targets: ["deneyim sormak", "görüş belirtmek", "gerekçe eklemek"],
    turns: [
      { speaker: "Nora", de: "Wie gefällt dir deine neue Arbeit bisher?", tr: "Yeni işin şu ana kadar nasıl gidiyor?" },
      { speaker: "Can", de: "Ganz gut. Das Team ist freundlich, und ich lerne jeden Tag etwas Neues.", tr: "Gayet iyi. Ekip arkadaş canlısı ve her gün yeni bir şey öğreniyorum." },
      { speaker: "Nora", de: "Was gefällt dir am besten?", tr: "En çok neyi seviyorsun?" },
      { speaker: "Can", de: "Dass ich mit verschiedenen Leuten zusammenarbeite. So bleibt der Tag abwechslungsreich.", tr: "Farklı insanlarla birlikte çalışmayı. Böylece gün çeşitlilik kazanıyor." },
      { speaker: "Nora", de: "Das klingt spannend. Ist der Arbeitsweg weit?", tr: "Kulağa ilginç geliyor. İşe gidiş yolun uzun mu?" },
      { speaker: "Can", de: "Nicht besonders. Mit dem Bus brauche ich ungefähr zwanzig Minuten.", tr: "Pek sayılmaz. Otobüsle yaklaşık yirmi dakika sürüyor." },
    ],
    exercises: [
      { id: "chat-smalltalk-b1-bridge-choice", kind: "choice", prompt: "Can, farklı insanlarla çalışmayı sevdiğini açıklıyor. Bu görüşe uygun devamı seç.", sentence: "Can: Ich arbeite gern mit verschiedenen Leuten zusammen, weil ___.", translation: "Can: Farklı insanlarla çalışmayı seviyorum, çünkü ___.", options: ["der Tag dadurch abwechslungsreich bleibt.", "ich ein halbes Kilo brauche.", "der Zug zehn Minuten Verspätung hat."], answers: ["der Tag dadurch abwechslungsreich bleibt."], explanation: "Doğru seçenek, farklı kişilerle çalışmanın günü çeşitlendirmesi fikrini tamamlar." },
      { id: "chat-smalltalk-b1-bridge-fill", kind: "fill", prompt: "Can otobüsle yaklaşık yirmi dakika yol yaptığını söylüyor. Boşluğu tamamla.", sentence: "Mit dem Bus brauche ich ungefähr zwanzig ___.", translation: "Otobüsle yaklaşık yirmi dakika sürüyor.", answers: ["Minuten"], explanation: "‘Zwanzig Minuten’ yirmi dakika demektir; süre ‘brauche ich’ yapısıyla anlatılır." },
    ],
    provenance: { kind: "original", note: "İş deneyimi üzerine özgün kısa sohbet; A2'den B1'e geçiş pratiği.", references: [] },
  },
];
