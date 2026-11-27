import patternWords from './pattern-words.json';
import b1Words from './b1-words.json';
import frequencyWords from './frequency-words.json';
import frequencyMeaningCorrections from '../data/frequency-meaning-corrections.json';
/**
 * Word packs: ready-made sets the learner can add from Kelimelerim → Araçlar.
 * Each pack comes from a lesson the learner is working on; meanings and example sentences are written for this app.
 */
export type PackWord={word:string;article:string;plural:string;meaning:string;example:string;translation:string;partOfSpeech:string;source:string};
export type WordPack={id:string;title:string;note:string;words:PackWord[]};
const rows:[string,string,string,string,string,string,string][]=[
 ["Werbung", "die", "Werbungen", "reklam; tanıtım", "Die moderne Werbung begann im 17. Jahrhundert.", "Modern reklamcılık 17. yüzyılda başladı.", "noun"],
 ["Anzeige", "die", "Anzeigen", "ilan; reklam ilanı", "Der Staat verdiente bei jeder Anzeige mit.", "Devlet her ilandan pay alıyordu.", "noun"],
 ["Werbeanzeige", "die", "Werbeanzeigen", "reklam ilanı", "Die Tageszeitungen durften wieder Werbeanzeigen drucken.", "Günlük gazeteler yeniden reklam ilanı basabildi.", "noun"],
 ["Werbezeitung", "die", "Werbezeitungen", "yalnızca reklam içeren gazete", "Händler trugen ihre Waren in Werbezeitungen ein.", "Tüccarlar mallarını reklam gazetelerine kaydettirdi.", "noun"],
 ["Marktschreier", "der", "Marktschreier", "pazarda bağırarak mal satan satıcı", "Der Marktschreier bot laut seine Produkte an.", "Pazar satıcısı ürünlerini yüksek sesle sundu.", "noun"],
 ["Pressefreiheit", "die", "", "basın özgürlüğü", "Nach der Einführung der Pressefreiheit gab es wieder Werbung.", "Basın özgürlüğünün getirilmesinden sonra yeniden reklam vardı.", "noun"],
 ["Scheinwelt", "die", "Scheinwelten", "yapay, hayali dünya", "Die Werbung schuf Scheinwelten.", "Reklam hayali dünyalar yarattı.", "noun"],
 ["Zielgruppe", "die", "Zielgruppen", "hedef kitle", "Die Anzeigen richteten sich an bestimmte Zielgruppen.", "İlanlar belirli hedef kitlelere yönelikti.", "noun"],
 ["Zielgruppenwerbung", "die", "", "hedef kitleye yönelik reklam", "Heute nennt man das Zielgruppenwerbung.", "Bugün buna hedef kitle reklamcılığı deniyor.", "noun"],
 ["Boom", "der", "Booms", "ani yükseliş; patlama", "In der Werbebranche gab es den ersten Boom.", "Reklam sektöründe ilk patlama yaşandı.", "noun"],
 ["Absatzförderung", "die", "", "satış teşviki", "Werbung dient der Absatzförderung.", "Reklam satışı teşvik etmeye hizmet eder.", "noun"],
 ["Maßnahme", "die", "Maßnahmen", "önlem; tedbir; adım", "Alle Maßnahmen zur Absatzförderung gehören zur Werbung.", "Satışı artıran tüm önlemler reklama dahildir.", "noun"],
 ["Verkaufszahl", "die", "Verkaufszahlen", "satış rakamı", "Die Firma will die Verkaufszahlen steigern.", "Firma satış rakamlarını artırmak istiyor.", "noun"],
 ["Werbekampagne", "die", "Werbekampagnen", "reklam kampanyası", "Nivea startete große Werbekampagnen.", "Nivea büyük reklam kampanyaları başlattı.", "noun"],
 ["Werbebranche", "die", "Werbebranchen", "reklam sektörü", "Sie arbeitet in der Werbebranche.", "Reklam sektöründe çalışıyor.", "noun"],
 ["Werbeaktion", "die", "Werbeaktionen", "reklam etkinliği", "Aus frühen Werbeaktionen entstanden berühmte Markennamen.", "İlk reklam etkinliklerinden ünlü marka adları doğdu.", "noun"],
 ["Werbetafel", "die", "Werbetafeln", "reklam panosu; reklam levhası", "In Pompeji fand man Werbetafeln aus Stein.", "Pompeii’de taştan reklam levhaları bulundu.", "noun"],
 ["Werbetext", "der", "Werbetexte", "reklam metni", "Schreiben Sie einen Werbetext für das Produkt.", "Ürün için bir reklam metni yazın.", "noun"],
 ["Produkt", "das", "Produkte", "ürün", "Dieses Produkt ist sehr beliebt.", "Bu ürün çok popüler.", "noun"],
 ["Produktbeschreibung", "die", "Produktbeschreibungen", "ürün tanımı", "Die ersten Anzeigen waren Produktbeschreibungen.", "İlk ilanlar ürün tanımlarından ibaretti.", "noun"],
 ["Produktpräsentation", "die", "Produktpräsentationen", "ürün sunumu", "Wir bereiten eine Produktpräsentation vor.", "Bir ürün sunumu hazırlıyoruz.", "noun"],
 ["Konsument", "der", "Konsumenten", "tüketici", "Die Firmen wollten bei den Konsumenten Wünsche wecken.", "Firmalar tüketicilerde istek uyandırmak istedi.", "noun"],
 ["Händler", "der", "Händler", "satıcı; tüccar", "Die Händler boten ihre Waren an.", "Tüccarlar mallarını sundu.", "noun"],
 ["Ware", "die", "Waren", "mal; ticari ürün", "Die Waren wurden auf dem Markt verkauft.", "Mallar pazarda satıldı.", "noun"],
 ["Tageszeitung", "die", "Tageszeitungen", "günlük gazete", "Die erste Tageszeitung erschien 1650 in Leipzig.", "İlk günlük gazete 1650’de Leipzig’de çıktı.", "noun"],
 ["Verbreitung", "die", "", "yayılma; yayma", "Das Medium diente der Verbreitung der Werbung.", "Bu araç reklamın yayılmasına hizmet etti.", "noun"],
 ["Einführung", "die", "Einführungen", "uygulamaya koyma; giriş", "Nach der Einführung der Pressefreiheit änderte sich viel.", "Basın özgürlüğünün getirilmesinden sonra çok şey değişti.", "noun"],
 ["Anteil", "der", "Anteile", "pay; oran", "Der Anteil der Werbung wurde immer größer.", "Reklamın payı giderek büyüdü.", "noun"],
 ["Anzeigenteil", "der", "Anzeigenteile", "gazetede ilan bölümü", "Der Anzeigenteil nahm immer mehr Platz ein.", "İlan bölümü giderek daha çok yer kapladı.", "noun"],
 ["Marke", "die", "Marken", "marka", "Die Firmen wollten ihre Produkte als Marken etablieren.", "Firmalar ürünlerini marka olarak yerleştirmek istedi.", "noun"],
 ["Markenname", "der", "Markennamen", "marka adı", "Viele Markennamen kennt man noch heute.", "Birçok marka adı bugün hâlâ biliniyor.", "noun"],
 ["Industrie", "die", "Industrien", "sanayi", "Die Industrie warb für ihre Produkte.", "Sanayi ürünleri için reklam yaptı.", "noun"],
 ["Wunsch", "der", "Wünsche", "dilek; istek", "Die Werbung weckt Wünsche.", "Reklam istekler uyandırır.", "noun"],
 ["Traum", "der", "Träume", "rüya; hayal", "Das Produkt wurde mit Träumen verbunden.", "Ürün hayallerle ilişkilendirildi.", "noun"],
 ["Erfüllung", "die", "", "gerçekleşme; yerine gelme", "Die Träume gehen in Erfüllung.", "Hayaller gerçek oluyor.", "noun"],
 ["Entwicklung", "die", "Entwicklungen", "gelişme; gelişim", "Eine weitere Entwicklung war die Etablierung von Scheinwelten.", "Bir başka gelişme, hayali dünyaların yerleşmesiydi.", "noun"],
 ["Etablierung", "die", "", "yerleşme; yerleştirme", "Die Etablierung neuer Marken dauerte Jahre.", "Yeni markaların yerleşmesi yıllar sürdü.", "noun"],
 ["Kontrolle", "die", "Kontrollen", "denetim; kontrol", "Die Zeitungen standen unter staatlicher Kontrolle.", "Gazeteler devlet denetimi altındaydı.", "noun"],
 ["Bezahlung", "die", "", "ödeme; ücret", "Händler konnten gegen Bezahlung Waren eintragen.", "Tüccarlar ücret karşılığı mallarını kaydettirebildi.", "noun"],
 ["Historiker", "der", "Historiker", "tarihçi", "Historiker sind der Meinung, dass Werbung sehr alt ist.", "Tarihçiler reklamın çok eski olduğu görüşünde.", "noun"],
 ["Definition", "die", "Definitionen", "tanım", "Geht man von dieser Definition aus, ist Werbung sehr alt.", "Bu tanımdan yola çıkılırsa reklam çok eskidir.", "noun"],
 ["Meinung", "die", "Meinungen", "görüş; fikir", "Das ist meine Meinung.", "Bu benim görüşüm.", "noun"],
 ["Ruine", "die", "Ruinen", "harabe", "In den Ruinen von Pompeji fand man Werbetafeln.", "Pompeii harabelerinde reklam levhaları bulundu.", "noun"],
 ["Käufergruppe", "die", "Käufergruppen", "alıcı grubu", "Die Werbung richtet sich an eine bestimmte Käufergruppe.", "Reklam belirli bir alıcı grubuna yönelir.", "noun"],
 ["Schicht", "die", "Schichten", "tabaka; toplumsal kesim", "Die Werbung richtete sich an spezielle soziale Schichten.", "Reklam belirli toplumsal kesimlere yöneldi.", "noun"],
 ["Auftrag", "der", "Aufträge", "görev; sipariş", "Sie haben den Auftrag, die Werbung zu übernehmen.", "Reklamı üstlenme göreviniz var.", "noun"],
 ["Werbeagentur", "die", "Werbeagenturen", "reklam ajansı", "Die Werbeagentur sucht einen Namen für das Produkt.", "Reklam ajansı ürün için bir isim arıyor.", "noun"],
 ["Wasserkocher", "der", "Wasserkocher", "elektrikli su ısıtıcısı", "Der Wasserkocher kocht Wasser in zwei Minuten.", "Su ısıtıcısı suyu iki dakikada kaynatır.", "noun"],
 ["Einrad", "das", "Einräder", "tek tekerlekli bisiklet", "Ein Einrad hat nur ein Rad.", "Tek tekerlekli bisikletin yalnızca bir tekerleği var.", "noun"],
 ["Einkaufstrolley", "der", "Einkaufstrolleys", "tekerlekli alışveriş arabası", "Mit dem Einkaufstrolley muss man nichts tragen.", "Tekerlekli alışveriş arabasıyla bir şey taşımak gerekmez.", "noun"],
 ["Taschenmesser", "das", "Taschenmesser", "çakı", "Das Taschenmesser hat viele Funktionen.", "Çakının birçok işlevi var.", "noun"],
 ["Eigenschaft", "die", "Eigenschaften", "özellik", "Welche Eigenschaften hat das Produkt?", "Ürünün hangi özellikleri var?", "noun"],
 ["Firma", "die", "Firmen", "firma; şirket", "Nur eine einzige Firma stellt es her.", "Bunu yalnızca tek bir firma üretiyor.", "noun"],
 ["Heimatland", "das", "Heimatländer", "anavatan; memleket", "Stellen Sie ein Produkt aus Ihrem Heimatland vor.", "Memleketinizden bir ürün tanıtın.", "noun"],
 ["anbieten", "", "", "sunmak; satışa sunmak", "Marktschreier boten laut ihre Produkte zum Verkauf an.", "Pazar satıcıları ürünlerini yüksek sesle satışa sundu.", "verb"],
 ["verbinden", "", "", "bağlamak; ilişkilendirmek", "Das Produkt wurde mit Träumen verbunden.", "Ürün hayallerle ilişkilendirildi.", "verb"],
 ["verdienen", "", "", "kazanmak", "Der Staat verdiente bei jeder Anzeige mit.", "Devlet her ilandan pay alıyordu.", "verb"],
 ["entstehen", "", "", "ortaya çıkmak; oluşmak", "Es entstanden schnell spezielle Werbezeitungen.", "Kısa sürede özel reklam gazeteleri ortaya çıktı.", "verb"],
 ["verändern", "", "", "değiştirmek; (sich verändern) değişmek", "Die Werbung veränderte sich stark.", "Reklam çok değişti.", "verb"],
 ["starten", "", "", "başlatmak; başlamak", "Unternehmen starteten große Werbekampagnen.", "Şirketler büyük reklam kampanyaları başlattı.", "verb"],
 ["versuchen", "", "", "denemek; çalışmak", "Die Firmen versuchten erstmals, Wünsche zu wecken.", "Firmalar ilk kez istek uyandırmaya çalıştı.", "verb"],
 ["beginnen", "", "", "başlamak", "Die moderne Werbung begann im 17. Jahrhundert.", "Modern reklamcılık 17. yüzyılda başladı.", "verb"],
 ["bestehen", "", "", "var olmak; -den oluşmak (aus); (sınavı) geçmek", "Die Zeitungen bestanden zu 80 % aus Werbung.", "Gazeteler yüzde 80 oranında reklamdan oluşuyordu.", "verb"],
 ["stehen", "", "", "durmak; (unter) -in altında olmak", "Die Werbezeitungen standen unter staatlicher Kontrolle.", "Reklam gazeteleri devlet denetimi altındaydı.", "verb"],
 ["spielen", "", "", "oynamak; (mit) ile oynamak", "Die Werbung spielte mit den Träumen der Menschen.", "Reklam insanların hayalleriyle oynadı.", "verb"],
 ["verbieten", "", "", "yasaklamak", "Der König verbot die Werbung in Tageszeitungen.", "Kral günlük gazetelerde reklamı yasakladı.", "verb"],
 ["drucken", "", "", "basmak", "Zeitungen durften wieder Werbeanzeigen drucken.", "Gazeteler yeniden reklam ilanı basabildi.", "verb"],
 ["eintragen", "", "", "kaydetmek; yazdırmak", "Händler konnten ihre Waren eintragen.", "Tüccarlar mallarını kaydettirebildi.", "verb"],
 ["umfassen", "", "", "kapsamak", "Werbung umfasst alle Maßnahmen zur Absatzförderung.", "Reklam satışı artıran tüm önlemleri kapsar.", "verb"],
 ["zählen", "", "", "saymak; (zu) -e dahil olmak", "Dazu zählen kommerzielle Werbetafeln.", "Buna ticari reklam levhaları da dahildir.", "verb"],
 ["ziehen", "", "", "çekmek; (bir yere) göç etmek, gezmek", "Marktschreier zogen von Markt zu Markt.", "Pazar satıcıları pazardan pazara dolaştı.", "verb"],
 ["gleichsetzen", "", "", "eşit tutmak; özdeşleştirmek", "Markennamen werden mit Produktnamen gleichgesetzt.", "Marka adları ürün adlarıyla özdeşleştiriliyor.", "verb"],
 ["etablieren", "", "", "yerleştirmek; kabul ettirmek", "Firmen wollten ihre Produkte als Marken etablieren.", "Firmalar ürünlerini marka olarak yerleştirmek istedi.", "verb"],
 ["wecken", "", "", "uyandırmak", "Die Werbung weckt Wünsche.", "Reklam istekler uyandırır.", "verb"],
 ["überzeugen", "", "", "ikna etmek", "Die Werbung wollte die Konsumenten überzeugen.", "Reklam tüketicileri ikna etmek istedi.", "verb"],
 ["einnehmen", "", "", "(yer) kaplamak; almak", "Der Anzeigenteil nahm immer mehr Platz ein.", "İlan bölümü giderek daha çok yer kapladı.", "verb"],
 ["herstellen", "", "", "üretmek", "Wie wird das Produkt hergestellt?", "Ürün nasıl üretiliyor?", "verb"],
 ["benutzen", "", "", "kullanmak", "Wie wird das Produkt benutzt?", "Ürün nasıl kullanılıyor?", "verb"],
 ["empfehlen", "", "", "tavsiye etmek", "Wem würden Sie dieses Produkt empfehlen?", "Bu ürünü kime tavsiye ederdiniz?", "verb"],
 ["vorstellen", "", "", "tanıtmak; sunmak", "Stellen Sie ein Produkt aus Ihrem Heimatland vor.", "Memleketinizden bir ürün tanıtın.", "verb"],
 ["eingehen", "", "", "(auf) -e değinmek; girmek", "Gehen Sie auf folgende Punkte ein.", "Şu noktalara değinin.", "verb"],
 ["übernehmen", "", "", "üstlenmek; devralmak", "Sie übernehmen die Werbung für die Produkte.", "Ürünlerin reklamını siz üstleniyorsunuz.", "verb"],
 ["präsentieren", "", "", "sunmak", "Präsentieren Sie anschließend Ihre Ideen.", "Ardından fikirlerinizi sunun.", "verb"],
 ["erfinden", "", "", "icat etmek; uydurmak", "Er hat eine neue Welt erfunden.", "Yeni bir dünya icat etti.", "verb"],
 ["halten", "", "", "tutmak; (von) hakkında düşünmek", "Was halten Sie von dem Produkt?", "Ürün hakkında ne düşünüyorsunuz?", "verb"],
 ["richten", "", "", "yöneltmek; (sich richten an) -e hitap etmek", "Die Anzeigen richteten sich an bestimmte Zielgruppen.", "İlanlar belirli hedef kitlelere yönelikti.", "verb"],
 ["tatsächlich", "", "", "gerçekten; aslında", "Es gab tatsächlich schon im alten Ägypten Werbung.", "Eski Mısır’da bile gerçekten reklam vardı.", "adverb"],
 ["kommerziell", "", "", "ticari", "Dazu zählen kommerzielle Werbetafeln.", "Buna ticari reklam levhaları da dahildir.", "adjective"],
 ["fantasievoll", "", "", "hayal gücü zengin", "Die Werbung wurde immer fantasievoller.", "Reklam giderek daha hayal gücü zengin oldu.", "adjective"],
 ["staatlich", "", "", "devlete ait; resmî", "Die Zeitungen standen unter staatlicher Kontrolle.", "Gazeteler devlet denetimi altındaydı.", "adjective"],
 ["erstmals", "", "", "ilk kez", "Die Firmen versuchten erstmals, Wünsche zu wecken.", "Firmalar ilk kez istek uyandırmaya çalıştı.", "adverb"],
 ["unbedingt", "", "", "mutlaka; kesinlikle", "Er braucht das Produkt unbedingt.", "Bu ürüne kesinlikle ihtiyacı var.", "adverb"],
 ["berühmt", "", "", "ünlü", "Es entstanden berühmte Markennamen.", "Ünlü marka adları ortaya çıktı.", "adjective"],
 ["speziell", "", "", "özel; özel olarak", "Es entstanden spezielle Werbezeitungen.", "Özel reklam gazeteleri ortaya çıktı.", "adjective"],
 ["wirtschaftlich", "", "", "ekonomik", "Das war der erste wirtschaftliche Erfolg.", "Bu, ilk ekonomik başarıydı.", "adjective"],
 ["einzig", "", "", "tek; biricik", "Gibt es nur eine einzige Firma?", "Yalnızca tek bir firma mı var?", "adjective"],
 ["laut", "", "", "yüksek sesli; yüksek sesle", "Sie boten laut ihre Produkte an.", "Ürünlerini yüksek sesle sundular.", "adjective"],
 ["früher", "", "", "eskiden; daha önce", "Früher zogen Marktschreier von Markt zu Markt.", "Eskiden pazar satıcıları pazardan pazara dolaşırdı.", "adverb"],
 ["passend", "", "", "uygun", "Finden Sie passende Namen zu den Produkten.", "Ürünlere uygun isimler bulun.", "adjective"],
];

const adverbRows:[string,string,string,string,string,string,string][]=[
 ["völlig", "", "", "tamamen; büsbütün", "Ich bin völlig überzeugt.", "Tamamen ikna oldum.", "adverb"],
 ["ungefähr", "", "", "yaklaşık; aşağı yukarı", "Es dauert ungefähr zwei Stunden.", "Yaklaşık iki saat sürer.", "adverb"],
 ["ziemlich", "", "", "epey; oldukça", "Das Produkt ist ziemlich teuer.", "Ürün epey pahalı.", "adverb"],
 ["beinahe", "", "", "neredeyse", "Ich hätte beinahe den Zug verpasst.", "Neredeyse treni kaçıracaktım.", "adverb"],
 ["nahezu", "", "", "hemen hemen; neredeyse", "Die Zeitungen bestanden nahezu nur aus Werbung.", "Gazeteler hemen hemen yalnızca reklamdan oluşuyordu.", "adverb"],
 ["fast", "", "", "neredeyse", "Es ist fast zwölf Uhr.", "Saat neredeyse on iki.", "adverb"],
 ["kaum", "", "", "neredeyse hiç; zar zor", "Ich habe kaum Zeit.", "Neredeyse hiç vaktim yok.", "adverb"],
 ["etwa", "", "", "yaklaşık; örneğin", "Etwa die Hälfte der Kunden kommt wieder.", "Müşterilerin yaklaşık yarısı geri geliyor.", "adverb"],
 ["ganz", "", "", "tamamen; oldukça; bütün", "Das ist ganz einfach.", "Bu çok basit.", "adverb"],
 ["überhaupt", "", "", "hiç; zaten; genel olarak", "Hast du überhaupt Hunger?", "Hiç acıktın mı?", "adverb"],
 ["eigentlich", "", "", "aslında", "Eigentlich wollte ich früher kommen.", "Aslında daha erken gelmek istiyordum.", "adverb"],
 ["besonders", "", "", "özellikle; çok", "Das Wetter ist heute besonders schön.", "Hava bugün özellikle güzel.", "adverb"],
 ["hauptsächlich", "", "", "esas olarak; başlıca", "Wir arbeiten hauptsächlich mit Firmen.", "Esas olarak firmalarla çalışıyoruz.", "adverb"],
 ["insgesamt", "", "", "toplamda; genel olarak", "Insgesamt waren es zwanzig Personen.", "Toplamda yirmi kişiydi.", "adverb"],
 ["durchschnittlich", "", "", "ortalama olarak", "Er schläft durchschnittlich sieben Stunden.", "Ortalama yedi saat uyuyor.", "adverb"],
 ["mindestens", "", "", "en az", "Du musst mindestens zwei Stunden warten.", "En az iki saat beklemen gerekiyor.", "adverb"],
 ["höchstens", "", "", "en fazla; olsa olsa", "Das dauert höchstens fünf Minuten.", "Bu en fazla beş dakika sürer.", "adverb"],
 ["mehrere", "", "", "birkaç; çeşitli", "Ich habe mehrere Fragen.", "Birkaç sorum var.", "adjective"],
 ["zahlreich", "", "", "çok sayıda", "Zahlreiche Firmen warben in Zeitungen.", "Çok sayıda firma gazetelerde reklam verdi.", "adjective"],
 ["weitgehend", "", "", "büyük ölçüde", "Das Problem ist weitgehend gelöst.", "Sorun büyük ölçüde çözüldü.", "adverb"],
 ["ausschließlich", "", "", "yalnızca; sadece", "Die Zeitung bestand ausschließlich aus Werbung.", "Gazete yalnızca reklamdan oluşuyordu.", "adverb"],
 ["bereits", "", "", "zaten; daha şimdiden", "Das gab es bereits im alten Ägypten.", "Bu, eski Mısır’da bile vardı.", "adverb"],
 ["bisher", "", "", "şimdiye kadar", "Bisher hatte ich keine Probleme.", "Şimdiye kadar sorunum olmadı.", "adverb"],
 ["plötzlich", "", "", "aniden; birden", "Plötzlich ging das Licht aus.", "Birden ışık söndü.", "adverb"],
 ["allmählich", "", "", "yavaş yavaş; giderek", "Allmählich verstehe ich es.", "Yavaş yavaş anlıyorum.", "adverb"],
 ["schließlich", "", "", "sonunda; nihayetinde", "Schließlich habe ich es geschafft.", "Sonunda başardım.", "adverb"],
 ["endlich", "", "", "nihayet; sonunda", "Endlich ist Wochenende!", "Nihayet hafta sonu!", "adverb"],
 ["zunächst", "", "", "önce; ilk olarak", "Zunächst möchte ich mich vorstellen.", "Önce kendimi tanıtmak istiyorum.", "adverb"],
 ["anschließend", "", "", "ardından; sonra", "Anschließend präsentieren wir unsere Ideen.", "Ardından fikirlerimizi sunuyoruz.", "adverb"],
 ["außerdem", "", "", "ayrıca; bunun dışında", "Außerdem brauche ich noch Zeit.", "Ayrıca biraz daha zamana ihtiyacım var.", "adverb"],
 ["trotzdem", "", "", "yine de; buna rağmen", "Es regnet, trotzdem gehen wir spazieren.", "Yağmur yağıyor, yine de yürüyüşe çıkıyoruz.", "adverb"],
 ["deshalb", "", "", "bu yüzden", "Ich bin krank, deshalb bleibe ich zu Hause.", "Hastayım, bu yüzden evde kalıyorum.", "adverb"],
 ["dennoch", "", "", "buna rağmen; yine de", "Er war müde, dennoch arbeitete er weiter.", "Yorgundu, buna rağmen çalışmaya devam etti.", "adverb"],
 ["jedoch", "", "", "ancak; fakat", "Das Angebot ist gut, jedoch zu teuer.", "Teklif iyi, ancak çok pahalı.", "adverb"],
 ["sogar", "", "", "hatta; bile", "Sogar der König verbot die Werbung.", "Hatta kral reklamı yasakladı.", "adverb"],
 ["zumindest", "", "", "en azından", "Zumindest hat es uns Spaß gemacht.", "En azından bize eğlenceli geldi.", "adverb"],
 ["ebenfalls", "", "", "aynı şekilde; de", "Danke, ebenfalls!", "Teşekkürler, size de!", "adverb"],
 ["genauso", "", "", "aynı şekilde; tıpkı", "Das sehe ich genauso.", "Ben de aynı şekilde görüyorum.", "adverb"],
 ["selbstverständlich", "", "", "elbette; doğal olarak", "Selbstverständlich helfe ich dir.", "Elbette sana yardım ederim.", "adverb"],
 ["wahrscheinlich", "", "", "muhtemelen", "Er kommt wahrscheinlich später.", "Muhtemelen daha geç gelecek.", "adverb"],
 ["hoffentlich", "", "", "umarım", "Hoffentlich klappt alles.", "Umarım her şey yolunda gider.", "adverb"],
 ["leider", "", "", "maalesef", "Leider habe ich keine Zeit.", "Maalesef vaktim yok.", "adverb"],
 ["natürlich", "", "", "tabii ki; doğal olarak", "Natürlich kannst du kommen.", "Tabii ki gelebilirsin.", "adverb"],
];
const pack=(id:string,title:string,note:string,list:typeof rows):WordPack=>({id,title,note,words:list.map(([word,article,plural,meaning,example,translation,partOfSpeech])=>({word,article,plural,meaning,example,translation,partOfSpeech,source:'https://de.wiktionary.org/wiki/'+encodeURIComponent(word)}))});
const jobRows:[string,string,string,string,string,string,string][]=[
 ["wegnehmen", "", "", "elinden almak; (birinden bir şeyi) almak", "Er hat mir den Job weggenommen.", "İşimi elimden aldı.", "verb"],
 ["abnehmen", "", "", "(iş, yük) üstlenmek; kilo vermek", "Kannst du mir die Arbeit abnehmen?", "İşimi üstlenebilir misin?", "verb"],
 ["ersetzen", "", "", "yerini almak; yerine koymak", "Der neue Kollege ersetzt ihn.", "Yeni iş arkadaşı onun yerini alıyor.", "verb"],
 ["wegschnappen", "", "", "(konuşma dili) kapmak; elinden kapmak", "Sie hat mir die Stelle vor der Nase weggeschnappt.", "Pozisyonu burnumun dibinden kaptı.", "verb"],
 ["ablösen", "", "", "yerini almak; görevi devralmak", "Der Nachtdienst löst den Tagdienst ab.", "Gece vardiyası gündüz vardiyasının yerini alır.", "verb"],
 ["vertreten", "", "", "temsil etmek; yerine bakmak", "Ich vertrete heute meine Kollegin.", "Bugün iş arkadaşımın yerine bakıyorum.", "verb"],
 ["Job", "der", "Jobs", "iş (konuşma dili)", "Er hat seinen Job verloren.", "İşini kaybetti.", "noun"],
 ["Arbeitsplatz", "der", "Arbeitsplätze", "iş yeri; iş (pozisyon)", "Viele Arbeitsplätze gehen verloren.", "Birçok iş kayboluyor.", "noun"],
 ["Stelle", "die", "Stellen", "iş pozisyonu; kadro", "Die Stelle ist noch frei.", "Pozisyon hâlâ boş.", "noun"],
 ["Vertretung", "die", "Vertretungen", "vekâlet; yerine bakma", "Wer übernimmt die Vertretung?", "Yerine kim bakacak?", "noun"],
 ["Nachfolger", "der", "Nachfolger", "halef; yerine geçen kişi", "Sein Nachfolger beginnt im Mai.", "Yerine geçen kişi mayısta başlıyor.", "noun"],
];

const einkaufenRows:[string,string,string,string,string,string,string][]=[
 ["Kühlschrank", "der", "Kühlschränke", "buzdolabı", "Frau Seifert braucht einen neuen Kühlschrank.", "Bayan Seifert yeni bir buzdolabına ihtiyaç duyuyor.", "noun"],
 ["Fachgeschäft", "das", "Fachgeschäfte", "uzman mağaza", "Im Fachgeschäft berät man die Kunden gut.", "Uzman mağazada müşterilere iyi danışmanlık yapılır.", "noun"],
 ["Typ", "der", "Typen", "tip; model", "Was ist das Problem mit dem Typ AX 1000?", "AX 1000 modelinde sorun ne?", "noun"],
 ["Farbe", "die", "Farben", "renk", "Welche Farbe gefällt Ihnen?", "Hangi renk hoşunuza gidiyor?", "noun"],
 ["Glasplatte", "die", "Glasplatten", "cam raf; cam levha", "Das Besondere sind die Glasplatten.", "Özelliği cam raflar.", "noun"],
 ["Strom", "der", "", "elektrik; akım", "Ohne Strom bleibt die Ware lange kühl.", "Elektrik olmadan da mal uzun süre serin kalır.", "noun"],
 ["Garantie", "die", "Garantien", "garanti", "Der Kühlschrank hat zwei Jahre Garantie.", "Buzdolabının iki yıl garantisi var.", "noun"],
 ["Garantiezeit", "die", "Garantiezeiten", "garanti süresi", "Wie lang ist die Garantiezeit?", "Garanti süresi ne kadar?", "noun"],
 ["Waschmaschine", "die", "Waschmaschinen", "çamaşır makinesi", "Wie viel kostet die Waschmaschine?", "Çamaşır makinesi ne kadar?", "noun"],
 ["Liefertermin", "der", "Liefertermine", "teslim tarihi", "Wann ist der Liefertermin?", "Teslim tarihi ne zaman?", "noun"],
 ["Banküberweisung", "die", "Banküberweisungen", "banka havalesi", "Sie können per Banküberweisung bezahlen.", "Banka havalesiyle ödeyebilirsiniz.", "noun"],
 ["Kreditkarte", "die", "Kreditkarten", "kredi kartı", "Ich bezahle mit Kreditkarte.", "Kredi kartıyla ödüyorum.", "noun"],
 ["Schnelligkeit", "die", "", "hız; çabukluk", "Ich frage nach der Schnelligkeit des Autos.", "Arabanın hızını soruyorum.", "noun"],
 ["Besonderheit", "die", "Besonderheiten", "özellik; farklılık", "Ich möchte Sie auf eine Besonderheit aufmerksam machen.", "Sizin dikkatinizi bir özelliğe çekmek istiyorum.", "noun"],
 ["Umtauschmöglichkeit", "die", "Umtauschmöglichkeiten", "değiştirme imkânı", "Gibt es eine Umtauschmöglichkeit?", "Değiştirme imkânı var mı?", "noun"],
 ["Material", "das", "Materialien", "malzeme; kumaş", "Aus welchem Material ist der Pullover?", "Kazak hangi malzemeden?", "noun"],
 ["Wolle", "die", "", "yün", "Der Pullover ist aus Wolle.", "Kazak yünden.", "noun"],
 ["Baumwolle", "die", "", "pamuk", "Das T-Shirt besteht aus Baumwolle.", "Tişört pamuktan.", "noun"],
 ["Regenschirm", "der", "Regenschirme", "şemsiye", "In welchen Farben gibt es diesen Regenschirm?", "Bu şemsiye hangi renklerde var?", "noun"],
 ["Pullover", "der", "Pullover", "kazak", "Ich suche einen warmen Pullover.", "Sıcak bir kazak arıyorum.", "noun"],
 ["T-Shirt", "das", "T-Shirts", "tişört", "Das gelbe T-Shirt gefällt mir.", "Sarı tişört hoşuma gidiyor.", "noun"],
 ["Höchstgeschwindigkeit", "die", "Höchstgeschwindigkeiten", "azami hız", "Die Höchstgeschwindigkeit liegt bei 180 km/h.", "Azami hız saatte 180 km.", "noun"],
 ["Spitzengeschwindigkeit", "die", "Spitzengeschwindigkeiten", "tepe hız; azami hız", "Wie hoch ist die Spitzengeschwindigkeit?", "Azami hız ne kadar?", "noun"],
 ["Pferdestärke", "die", "Pferdestärken", "beygir gücü (PS)", "Das Auto hat 90 Pferdestärken.", "Arabanın 90 beygir gücü var.", "noun"],
 ["Modell", "das", "Modelle", "model", "Ich kann Ihnen ein paar neue Modelle zeigen.", "Size birkaç yeni model gösterebilirim.", "noun"],
 ["Knopf", "der", "Knöpfe", "düğme", "Diesen Knopf muss man drücken.", "Bu düğmeye basmak gerekir.", "noun"],
 ["Möbel", "das", "Möbel", "mobilya", "Diese Farbe passt gut zu meinen anderen Möbeln.", "Bu renk diğer mobilyalarıma iyi uyuyor.", "noun"],
 ["Einparkhilfe", "die", "Einparkhilfen", "park yardımcısı", "Das Auto hat eine Einparkhilfe.", "Arabada park yardımcısı var.", "noun"],
 ["Beschleunigungszeit", "die", "Beschleunigungszeiten", "hızlanma süresi", "Die Beschleunigungszeit von 0 auf 100 ist kurz.", "0’dan 100’e hızlanma süresi kısa.", "noun"],
 ["Außenspiegel", "der", "Außenspiegel", "dış dikiz aynası", "Die Außenspiegel sind einklappbar.", "Dış aynalar katlanabilir.", "noun"],
 ["Navigationssystem", "das", "Navigationssysteme", "navigasyon sistemi", "Gibt es ein Navigationssystem?", "Navigasyon sistemi var mı?", "noun"],
 ["Soundanlage", "die", "Soundanlagen", "ses sistemi", "Die Soundanlage ist hochwertig.", "Ses sistemi kaliteli.", "noun"],
 ["Sitz", "der", "Sitze", "koltuk", "Die Sitze sind beheizbar.", "Koltuklar ısıtmalı.", "noun"],
 ["Panoramadach", "das", "Panoramadächer", "panoramik tavan", "Das Auto hat ein Panoramadach.", "Arabada panoramik tavan var.", "noun"],
 ["Dachgepäckträger", "der", "Dachgepäckträger", "tavan bagaj taşıyıcısı", "Für den Urlaub brauchen wir einen Dachgepäckträger.", "Tatil için tavan bagaj taşıyıcısına ihtiyacımız var.", "noun"],
 ["Videobildschirm", "der", "Videobildschirme", "video ekranı", "Es gibt einen Videobildschirm für Kinder.", "Çocuklar için video ekranı var.", "noun"],
 ["Gangschaltung", "die", "Gangschaltungen", "vites sistemi", "Das Fahrrad hat eine Gangschaltung.", "Bisikletin vites sistemi var.", "noun"],
 ["Gang", "der", "Gänge", "vites; koridor; yemek (servis)", "Das Fahrrad hat sieben Gänge.", "Bisikletin yedi vitesi var.", "noun"],
 ["Komfortsattel", "der", "Komfortsättel", "konforlu sele", "Gibt es einen Komfortsattel?", "Konforlu sele var mı?", "noun"],
 ["Sportsattel", "der", "Sportsättel", "spor sele", "Ich möchte einen Sportsattel.", "Spor sele istiyorum.", "noun"],
 ["Reifen", "der", "Reifen", "lastik", "Breite Reifen sind bequemer.", "Geniş lastikler daha rahat.", "noun"],
 ["Diebstahlsicherung", "die", "Diebstahlsicherungen", "hırsızlık önleme sistemi; kilit", "Das Fahrrad hat eine Diebstahlsicherung.", "Bisikletin hırsızlık önleme sistemi var.", "noun"],
 ["Spiegelreflexkamera", "die", "Spiegelreflexkameras", "aynalı (DSLR) fotoğraf makinesi", "Eine Spiegelreflexkamera ist teurer.", "Aynalı fotoğraf makinesi daha pahalı.", "noun"],
 ["Kompaktkamera", "die", "Kompaktkameras", "kompakt fotoğraf makinesi", "Eine Kompaktkamera passt in die Tasche.", "Kompakt fotoğraf makinesi çantaya sığar.", "noun"],
 ["Autofokus", "der", "", "otomatik netleme", "Autofokus ist sehr wichtig für mich.", "Otomatik netleme benim için çok önemli.", "noun"],
 ["Zoomfunktion", "die", "Zoomfunktionen", "yakınlaştırma özelliği", "Die Zoomfunktion ist stark.", "Yakınlaştırma özelliği güçlü.", "noun"],
 ["Belichtung", "die", "Belichtungen", "pozlama", "Die Kamera hat eine intelligente Belichtung.", "Kameranın akıllı pozlaması var.", "noun"],
 ["Gesichtserkennung", "die", "", "yüz tanıma", "Die Kamera hat eine Gesichtserkennung.", "Kamerada yüz tanıma var.", "noun"],
 ["Wechselobjektiv", "das", "Wechselobjektive", "değiştirilebilir objektif", "Die Kamera hat Wechselobjektive.", "Kameranın değiştirilebilir objektifleri var.", "noun"],
 ["SD-Karte", "die", "SD-Karten", "SD kart", "Ist eine SD-Karte dabei?", "SD kart da var mı?", "noun"],
 ["Tank", "der", "Tanks", "depo (yakıt)", "Wie viele Kilometer kommt man mit einem vollen Tank?", "Dolu depoyla kaç kilometre gidilir?", "noun"],
 ["Kilometer", "der", "Kilometer", "kilometre", "Wie viele Kilometer kommt man mit diesem Auto?", "Bu arabayla kaç kilometre gidilir?", "noun"],
 ["Gefrierfach", "das", "Gefrierfächer", "dondurucu bölmesi", "Der Kühlschrank hat ein eingebautes Gefrierfach.", "Buzdolabının yerleşik bir dondurucu bölmesi var.", "noun"],
 ["Handlung", "die", "Handlungen", "eylem; hareket; olay örgüsü", "Die Handlung ist meistens abgeschlossen.", "Eylem çoğunlukla tamamlanmıştır.", "noun"],
 ["Adjektivendung", "die", "Adjektivendungen", "sıfat eki", "Hier fehlt die Adjektivendung.", "Burada sıfat eki eksik.", "noun"],
 ["Pflichtfrage", "die", "Pflichtfragen", "zorunlu soru", "Das sind die Pflichtfragen: Alle stellen sie.", "Bunlar zorunlu sorular: Herkes sorar.", "noun"],
 ["Bonusfrage", "die", "Bonusfragen", "ek soru; isteğe bağlı soru", "Die Bonusfragen sind frei.", "Ek sorular isteğe bağlı.", "noun"],
 ["Anfänger", "der", "Anfänger", "yeni başlayan", "Ist es gut für Anfänger?", "Yeni başlayanlar için iyi mi?", "noun"],
 ["Service", "der", "Services", "servis; hizmet", "Gibt es Garantie und Service?", "Garanti ve servis var mı?", "noun"],
 ["Fragebogen", "der", "Fragebögen", "anket formu", "Der Kunden-Fragebogen hat sieben Fragen.", "Müşteri anket formunda yedi soru var.", "noun"],
 ["Reise", "die", "Reisen", "yolculuk; seyahat", "Ist es gut für Reisen?", "Seyahat için iyi mi?", "noun"],
 ["einfrieren", "", "", "dondurmak; donmak", "Wie viel Ware kann man einfrieren?", "Ne kadar mal dondurulabilir?", "verb"],
 ["liefern", "", "", "teslim etmek; getirmek", "Wann können Sie den Kühlschrank liefern?", "Buzdolabını ne zaman teslim edebilirsiniz?", "verb"],
 ["zeigen", "", "", "göstermek", "Ich kann Ihnen ein paar neue Modelle zeigen.", "Size birkaç yeni model gösterebilirim.", "verb"],
 ["glauben", "", "", "inanmak; sanmak", "Ich glaube, die Farbe passt nicht.", "Sanırım renk uymuyor.", "verb"],
 ["testen", "", "", "test etmek; denemek", "Kann ich es testen?", "Deneyebilir miyim?", "verb"],
 ["beschleunigen", "", "", "hızlanmak; hızlandırmak", "Das Auto beschleunigt in zehn Sekunden auf 100.", "Araba on saniyede 100’e hızlanıyor.", "verb"],
 ["einklappen", "", "", "katlamak", "Man kann die Außenspiegel einklappen.", "Dış aynalar katlanabiliyor.", "verb"],
 ["einbauen", "", "", "monte etmek; yerleştirmek", "Der Hersteller baut ein Gefrierfach ein.", "Üretici bir dondurucu bölmesi yerleştiriyor.", "verb"],
 ["abschließen", "", "", "kilitlemek; tamamlamak", "Wir schließen den Kauf heute ab.", "Alışverişi bugün tamamlıyoruz.", "verb"],
 ["kühl", "", "", "serin; soğuk", "Halten Sie die Ware kühl.", "Malı serin tutun.", "adjective"],
 ["hochwertig", "", "", "kaliteli; değerli", "Die Soundanlage ist hochwertig.", "Ses sistemi kaliteli.", "adjective"],
 ["beheizbar", "", "", "ısıtmalı", "Die Sitze sind beheizbar.", "Koltuklar ısıtmalı.", "adjective"],
 ["einklappbar", "", "", "katlanabilir", "Die Außenspiegel sind einklappbar.", "Dış aynalar katlanabilir.", "adjective"],
 ["seltsam", "", "", "garip; tuhaf", "Die Farbe finde ich seltsam.", "Rengi garip buluyorum.", "adjective"],
 ["synthetisch", "", "", "sentetik", "Das Material ist synthetisch.", "Malzeme sentetik.", "adjective"],
 ["bar", "", "", "nakit", "Ich zahle bar.", "Nakit ödüyorum.", "adverb"],
 ["nachhaltig", "", "", "sürdürülebilir; kalıcı", "Ist es nachhaltig?", "Sürdürülebilir mi?", "adjective"],
 ["aufmerksam", "", "", "dikkatli; (aufmerksam machen) dikkat çekmek", "Er hört aufmerksam zu.", "Dikkatle dinliyor.", "adjective"],
 ["eingebaut", "", "", "yerleşik; monte edilmiş", "Das Gefrierfach ist eingebaut.", "Dondurucu bölmesi yerleşik.", "adjective"],
 ["hergestellt", "", "", "üretilmiş", "Das Teil wird von uns selbst hergestellt.", "Parça bizim tarafımızdan üretiliyor.", "adjective"],
 ["abgeschlossen", "", "", "tamamlanmış; kapalı", "Die Handlung ist abgeschlossen.", "Eylem tamamlanmıştır.", "adjective"],
 ["rosa", "", "", "pembe", "Die Farbe Rosa finde ich seltsam.", "Pembe rengi garip buluyorum.", "adjective"],
 ["hellgrün", "", "", "açık yeşil", "Hellgrün gefällt mir besser.", "Açık yeşil daha çok hoşuma gidiyor.", "adjective"],
 ["elektrisch", "", "", "elektrikli", "Ich möchte ein elektrisches Fahrrad.", "Elektrikli bir bisiklet istiyorum.", "adjective"],
 ["breit", "", "", "geniş", "Breite Reifen sind bequemer.", "Geniş lastikler daha rahat.", "adjective"],
 ["dünn", "", "", "ince", "Dünne Reifen sind schneller.", "İnce lastikler daha hızlı.", "adjective"],
];
export const WORD_PACKS:WordPack[]=[{
 id:'werbung-b1',title:'Kapitel 4 · Werbung (B1+)',note:'Kapitel 4 · Werbung (B1+) ders kitabı sayfalarından.',
 words:rows.map(([word,article,plural,meaning,example,translation,partOfSpeech])=>({word,article,plural,meaning,example,translation,partOfSpeech,source:'https://de.wiktionary.org/wiki/'+encodeURIComponent(word)})),
},
 pack('zarflar-b1','Zarflar ve sık bağlaç ifadeleri (B1)','Völlig, ungefähr gibi sık zarflar ve niceleyiciler; Kapitel 4 metinlerinden ve günlük kullanımdan.',adverbRows),
 pack('einkaufen-b1','Kapitel 4 · Einkaufen (B1+)','Kapitel 4 · Einkaufen (B1+) ders kitabı sayfalarından: ürün, fiyat, garanti, araba, bisiklet, kamera.',einkaufenRows),
 pack('is-yeri-b1','İş hayatı: birinin yerini almak, işi devralmak','Birinin işini almak, devralmak ve yerine bakmak ile ilgili kelimeler.',jobRows),
];

type Row={word:string;article:string;plural:string;meaning:string;example:string;translation:string;partOfSpeech:string};
const fromRows=(list:Row[])=>list.map(w=>({...w,source:'https://de.wiktionary.org/wiki/'+encodeURIComponent(w.word)}));
/** Core A1–B1 vocabulary written for this app (family, food, health, work, travel, media, environment, society, verbs, adjectives, connectors). Built by scripts/generate-core-words.mjs. */
WORD_PACKS.push({id:'b1-kern-v1',title:'A1–B1 temel kelimeler',note:'A1–B1 temel kelime: uygulama için yazıldı.',words:fromRows((b1Words as unknown as {words:Row[]}).words)});
/** The most frequent nouns and verbs (Wiktionary list, CC BY-SA 4.0). */
const frequencyRows=frequencyWords.words as Row[];
const reviewedMeanings:Readonly<Record<string,string>>=frequencyMeaningCorrections;
/** Every word that has patterns in the pattern data gets a card, so no pattern is left without its word. Generated by scripts/generate-pattern-words.mjs. */
const fromPatterns=(patternWords as unknown as {words:Row[]}).words;
const OLD_MEANINGS:Readonly<Record<string,readonly string[]>>={
 liegen:['şezlong'],
 hängen:['yamaç'],
 decken:['güverte'],
 bauen:['inşaat; bina; yuva; kodes'],
 berichten:['rapor; bülten'],
 kämpfen:['savaş; muharebe; kavga; mücadele'],
 treffen:['buluşma'],
 wechseln:['değişim; değişme'],
 geöffnet:['açmak'],
 schuld:['görev; vazife; suç; borç; kabahat'],
 betrunken:['sarhoş; içkili; hoş'],
 gebrochen:['kesirli; köşeli; çat pat'],
 gewissen:['vicdan'],
};
const packRowByWord=new Map<string,Row>();
for(const w of frequencyRows)packRowByWord.set(w.word,{...w,meaning:Object.hasOwn(reviewedMeanings,w.word)?reviewedMeanings[w.word]:w.meaning});
for(const w of fromPatterns)packRowByWord.set(w.word,w);

export function repairFrequencyCards<T extends {id:string;word:string;meaning:string;partOfSpeech?:string;article?:string;plural?:string}>(cards:T[]):T[]{
 let changed=false;
 const updated=cards.map(card=>{
  const isFreq=card.id.startsWith('pack-sik-kelimeler-v1-');
  const isPat=card.id.startsWith('pack-kalip-kelimeleri-v1-');
  if(!isFreq&&!isPat)return card;
  const target=packRowByWord.get(card.word);
  if(!target)return card;
  const oldList=OLD_MEANINGS[card.word];
  const shouldFixMeaning=(oldList?.includes(card.meaning))||(isFreq&&Object.hasOwn(reviewedMeanings,card.word)&&card.meaning!==target.meaning);
  const nextMeaning=shouldFixMeaning?target.meaning:card.meaning;
  const nextPos=card.partOfSpeech!==undefined&&target.partOfSpeech&&card.partOfSpeech!==target.partOfSpeech?target.partOfSpeech:card.partOfSpeech;
  const nextArt=card.article!==undefined&&target.article&&!card.article?target.article:card.article;
  const nextPl=card.plural!==undefined&&target.plural&&!card.plural?target.plural:card.plural;
  if(nextMeaning===card.meaning&&nextPos===card.partOfSpeech&&nextArt===card.article&&nextPl===card.plural)return card;
  changed=true;
  return{
   ...card,
   meaning:nextMeaning,
   ...(nextPos!==undefined?{partOfSpeech:nextPos}:{}),
   ...(nextArt!==undefined?{article:nextArt}:{}),
   ...(nextPl!==undefined?{plural:nextPl}:{}),
  };
 });
 return changed?updated:cards;
}
WORD_PACKS.push({
 id:'sik-kelimeler-v1',title:'En sık kullanılan isimler ve fiiller',
 note:'Sık kullanılan kelime; anlam uygulamanın sözlüğünden (ilk anlamlar).',
 words:fromRows(frequencyRows.map(w=>({...w,meaning:Object.hasOwn(reviewedMeanings,w.word)?reviewedMeanings[w.word]:w.meaning}))),
});
WORD_PACKS.push({id:'kalip-kelimeleri-v1',title:'Kalıplarda geçen kelimeler',note:'Kalıpları olan kelime; anlamı uygulamanın sözlüğünden.',words:fromPatterns.map(w=>({...w,source:'https://de.wiktionary.org/wiki/'+encodeURIComponent(w.word)}))});

/** Packs are added to the library automatically, once per pack per device; this key remembers which ones. */
export const PACKS_KEY='wortgarten-packs-v1';
export function parseInstalled(raw:string|null):string[]{try{const v=JSON.parse(raw||'[]');return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string').slice(0,100):[];}catch{return [];}}
export const pendingPacks=(installed:string[])=>WORD_PACKS.filter(p=>!installed.includes(p.id));
