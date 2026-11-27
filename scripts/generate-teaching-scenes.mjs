#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as Lucide from 'lucide-react';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Inputs: an exported card snapshot and photo review verdicts. Never committed.
const cardsPath=path.resolve(process.env.WORTGARTEN_CARD_SNAPSHOT||path.join(root,'outputs','card-snapshot.json'));
const verdictsPath=path.resolve(process.env.WORTGARTEN_PHOTO_VERDICTS||path.join(root,'outputs','root-photo-verdicts.json'));
const output=path.join(root,'lib/teaching-scenes.json');
const assetDir=path.join(root,'public/vocabulary-art/teaching-scenes');
const license='CC BY 4.0', licenseUrl='https://creativecommons.org/licenses/by/4.0/';
const attribution='Özgün yerleşim: Wortgarten · CC BY 4.0. Lucide glifleri: ISC; Feather kökenli glifler: MIT. Tam metin: LUCIDE-LICENSE.txt.';
const iconLicense='ISC; MIT for Feather-derived glyphs';
const iconCredit='Lucide Icons and Contributors; Cole Bemis/Feather (derived glyphs)';
const source='https://wortgarten-beta.vercel.app/visual-sources.html';

// Each row is a distinct visual teaching cue; no word labels are rendered into the illustration.
const raw=String.raw`Faulpelz|Kişi kanepede uzanırken yarım kalmış görevler masada birikiyor.|person,sofa,unfinished-paper
bequem|Yolcu yumuşak koltukta gevşemiş; sert tabure karşıtlığı belirgin.|person,armchair,stool
gegen|İki yönlü oklar ortak bir sınırın karşı taraflarına bakıyor.|opposing-arrows,boundary,sign
dauern|Başlayan görev, saatin yayı boyunca bitiş işaretine kadar sürüyor.|clock,task,duration-arc
nun|Saatin şimdi noktasında kişi sayfayı çevirip işe devam ediyor.|clock,person,page
anzeigen|Görgü tanığı olayı görevliye gösterirken görevli not alıyor.|witness,officer,notepad
fern|Öndeki kişi ile uzaktaki evin arasına perspektifli uzun yol giriyor.|person,road,distant-house
einst|Geçmiş güneş ile gelecekte doğan güneş zaman çizgisinin iki ucunda.|timeline,sunset,sunrise
Zeitverschwendung|Oyalanan kişinin yanında kum saati boşalıyor, takvim yaprakları düşüyor.|person,hourglass,calendar
ergänzen|Eksik şekle son parça eklenince kontur kapanıp bütünleşiyor.|incomplete-shape,missing-piece,completed-shape
sehen|Kişi dürbünle uzaktaki yelkenliyi fark ediyor.|person,binoculars,sailboat
Ordnung|Dağınık kitap ve araçlar biçimlerine göre raflarda düzenleniyor.|books,tools,organized-shelves
entschuldigen|Dökülen kahve için özür jesti ve sakinleştiren açık el aynı sahnede.|two-people,spilled-cup,open-hand
Ausstellungsbesucher|Ziyaretçi galeride çerçeveli eserin önünde durup inceliyor.|visitor,gallery-wall,framed-art
halten|El nesneyi tutuyor; düşünce balonu aynı nesne hakkındaki kanaati gösteriyor.|hand,object,thought-bubble
Baum|Kökleri görünen ağaç dallarında yaprak ve küçük kuş taşıyor.|tree,roots,bird
Tätigkeit|Kişi masada çalışırken tamamlanan görev kartları birikiyor.|person,desk,task-cards
eben|Terazideki tahta dümdüz; yanındaki saat ibresi az önceki anı gösteriyor.|level-board,spirit-level,clock
momentan|Bugünün takvim karesi parlak, saat ibresi bu ana sabitlenmiş.|calendar,clock,highlight
ziehen|Kişi ipi kendine çekiyor ve bağlı kutu ona yaklaşıyor.|person,rope,box
spazieren|İki kişi park yolunda yürürken ağaçlar ve bank rotayı belirliyor.|two-people,park-path,trees
Klatsch und Tratsch|İki kişi fısıldaşırken konuşma balonunun gerisinde üçüncü siluet var.|two-people,whisper,silhouette
gegenwärtig|Saat çizgisinde yalnızca ortadaki şimdi noktası belirgin kalıyor.|clock,now-marker,faded-timeline
Gegenwart|Kişi geçmiş ve gelecek arasındaki çizginin tam merkezinde duruyor.|timeline,person,center-marker
Stelle|İş yerindeki boş görev noktası belirgin; başvuran kişi ona yöneliyor.|workplace,vacant-desk,person
Becher|El kulpsuz içecek kabını tutuyor; yanında ikinci kap duruyor.|hand,cup,steam
Weiterbildung|Çalışan akşam dersinde açık kitaba bakarken beceri basamakları yükseliyor.|worker,open-book,skill-stairs
störend|Sessiz çalışan kişi çalan telefona dönünce dikkati dağılıyor.|person,ringing-phone,broken-focus
bewerben|Aday özgeçmişini işverene sunuyor; ürün standında ayrı tanıtım var.|applicant,resume,product-stand
unterhalten|Sokak sanatçısı grubu güldürüyor; dinleyiciler ayrıca sohbet ediyor.|performer,audience,talking-pair
sich erkundigen|Yolcu danışma görevlisine harita üzerinde güzergâhı soruyor.|traveler,information-desk,map
gleich|Eşitlik için ✓ ve karşıtı için ✕; ayrıca zaman çizgisinde ŞİMDİ ve BİRAZDAN ayrı gösteriliyor.|matching-blocks,balance,clock
damals|Eski fotoğraf çerçevesi zaman çizgisinin geçmiş tarafında duruyor.|old-photo,timeline,calendar
werden|Kapalı tomurcuk okların yönünde açıp çiçeğe dönüşüyor.|bud,flower,transformation-arrows
Kunsthandel|Galerici tabloyu alıcıya gösteriyor; masada ödeme ve satış belgesi var.|dealer,painting,payment
Begegnung|İki kişi kesişen park yolunda karşılaşıp selamlaşıyor.|two-people,crossing-paths,greeting
Medium|Gazete, radyo ve ekran aynı haberi farklı kanallarda taşıyor.|newspaper,radio,screen
kürzlich|Takvimde birkaç gün önceki kare bugünün hemen yanında işaretli.|calendar,recent-marker,today-marker
nachher|Görev tamamlanıyor; zaman çizgisinde sonraki durak akşam.|person,task,timeline
vorgestern|Üç günlük takvim şeridinde bugünden iki kare önceki gün seçili.|three-day-calendar,today,highlight
Gehaltserhöhung|Ücret çubuğu sözleşmede önceki seviyeden daha yüksek düzeye çıkıyor.|contract,salary-bars,up-arrow
neulich|Yakın zamanda çekilmiş fotoğraf bugünden birkaç gün geriye bağlanıyor.|recent-photo,short-timeline,calendar
wissen|Kişinin zihnindeki ampul açık kitaptaki doğru bilgiyle eşleşiyor.|person,open-book,lightbulb
kennen|Kişi tanıdığı komşusunu yüzünden fark edip selamlıyor.|two-people,recognition,wave
zurück|Yolcu geldiği patikada geri dönerken kıvrımlı ok yönü gösteriyor.|traveler,path,return-arrow
Erfolg|Tırmanıcı son basamağa bayrak dikiyor; tırmandığı merdiven geride.|climber,steps,flag
Abteilungsbesprechung|Aynı ekibin üyeleri ortak masada iş akışını konuşuyor.|coworkers,meeting-table,workflow-chart
eigentlich|Öndeki görünüş perdesi çekilince arkasındaki gerçek durum açılıyor.|curtain,revealed-scene,person
Satzbau|Özne, fiil ve nesne blokları sırayla birleşip cümle iskeleti kuruyor.|subject-block,verb-block,object-block
fahren|Sürücü aracı yolda ilerletiyor; arka koltukta yolcu var.|driver,car,road
während|Kişi yemek pişirirken başka biri aynı zaman bandında sofrayı kuruyor.|cooking-person,table-setting,parallel-timeline
tun|Kişi dağınık parçaları kutuya koyarak somut bir iş yapıyor.|person,loose-items,box
Verspätung|Otobüs durağa tarifedeki saatten sonra ulaşıyor; yolcular bekliyor.|bus,clock,waiting-passengers
Treppe|Kişi basamak basamak yükseliyor; korkuluk merdiveni izliyor.|stairs,person,handrail
unbedingt|Kontrol listesinde tek zorunlu adım kalın çerçeveyle öne çıkıyor.|checklist,required-mark,pen
sitzen|Kişinin gövdesi sandalyede, ayakları zeminde oturur durumda.|person,chair,floor
warten|Bir yolcu durakta beklerken saat ve yaklaşan otobüse bakıyor.|traveler,bus,clock
Bericht|Muhabir notları başlık, metin ve grafik içeren rapor sayfasında düzenliyor.|reporter,document,chart
lauft herum|İki kişi odanın içinde farklı yönlerde dolaşırken rota çevreyi çiziyor.|two-people,room,looping-path
vorhin|Şimdi noktasının hemen solundaki kısa süre dilimi belirgin.|clock,now-marker,near-past-marker
sinnvoll|Düzenli plan hedefe bağlı; dağınık rota arka planda kalıyor.|lightbulb,plan,connected-path
aufstehen|Kişinin yataktaki silueti doğrulup zeminde dik konuma geçiyor.|bed,person,up-arrow
obwohl|Yağmurda yürüyen kişi ıslansa da açık kapıya gülümseyerek ilerliyor.|rain,walking-person,open-door
zeitraubend|Karmaşık montaj işi çok gün ve uzun kum saati tüketiyor.|hourglass,calendar,unfinished-project
verzichten|Kişi sepetindeki ürünü geri rafa koyup elini çekiyor.|person,shopping-basket,shelf
verschieben|Toplantı kartı takvimde bugünden ileri bir güne okla taşınıyor.|meeting-card,calendar,forward-arrow
erzählen|Anlatıcı küçük gruba olayları sıralı konuşma balonlarıyla aktarıyor.|storyteller,listeners,speech-bubbles
heutzutage|Modern şehirde telefon kullanan kişi bugünün zaman noktasında duruyor.|person,smartphone,modern-city
heiraten|İki partner yüzük değiştirirken çiçekli tören masası sahneyi kuruyor.|couple,rings,flowers
Gegenstand|Anahtar, kitap ve top masada ayrı somut nesneler olarak duruyor.|key,book,ball
ärgern|Kişinin işi sık sık bölününce karşısındaki kaşlarını çatıp uzaklaşıyor.|two-people,interrupted-task,frown
Spinnen|Eğirici yünü çıkrıkta bükerek uzun ipliğe dönüştürüyor.|spinner,wool,spinning-wheel
sparen|Kişi bozuk paraları kumbaraya atıyor; harcama cüzdanı kapalı.|person,coins,piggy-bank
Verkehrssystem|Otobüs, tramvay ve metro durakları ağ çizgileriyle bağlanıyor.|bus,tram,metro-map
entdecken|Kâşif yaprak altındaki fosili büyüteçle fark ediyor.|explorer,magnifier,fossil
bilden|Ayrı parçalar birleşerek tek köprü biçimi oluşturuyor.|shapes,bridge,joining-arrows
verlieren|Kişi anahtarlığa bakarken anahtar çimlerde biraz uzakta düşmüş.|person,key,grass
angenehm|Kişi ılık güneşte bankta dinleniyor; esinti yaprakları oynatıyor.|person,bench,sun-breeze
künftig|Gelecek zaman çizgisinde takvim yaprağı ve yeni filiz beliriyor.|timeline,calendar,sprout
ebenfalls|İlk kişi şemsiye açınca yanındaki de aynı hareketi yapıyor.|two-people,umbrellas,parallel-arrows
denken|Kişi çenesine elini koymuş, düşünce balonunda labirent var.|person,thought-bubble,maze
zusammenrechnen|Üç para yığını toplama işareti üzerinden tek toplam yığınına birleşiyor.|coin-piles,plus-sign,total-pile
Mantel|Uzun palto askıda; yanında kişi soğuk havada onu giymiş.|coat,hanger,person
beschäftigen|Kişi açık alet kutusuyla mekanik parçayı dikkatle onarıyor.|person,gear,toolbox
Besitzer|Kişi bisikleti kullanıyor; sahiplik belgesi ayrı gösteriliyor.|person,bicycle,ownership-document
beschweren|İki görsel çağrışım: müşteri şikâyet iletiyor; ağırlık bir kâğıdı bastırıyor.|customer,complaint-bubble,paperweight,weight
verlängern|Kısa şeride ek parça takılınca ölçülen uzunluğu artıyor.|short-strip,extension-piece,ruler
verschwenden|Açık musluk kullanmadan kovayı taşıracak kadar su akıtıyor.|running-tap,overflowing-bucket,person
nennen|Kişi adsız bitkiye ad etiketi iliştiriyor.|person,plant,name-tag
Zukunft|Zaman çizgisi ufka, doğan güneşe ve açılan yeni yola ilerliyor.|timeline,sunrise,road
demnächst|Saatin yakındaki gelecek ibresi sonraki takvim kutusuna yöneliyor.|clock,next-calendar-day,short-arrow
im echten Leben|Ekrandaki oyun yerine dışarıda gerçek kişi bisikleti tamir ediyor.|screen,person,bicycle
Eigentümer|Tapu, anahtar ve ev aynı kişiyle mülkiyet bağı kuruyor.|deed,key,house
Vergangenheit|Geride solan fotoğraf ve takvim yaprakları; kişi şimdi noktasında.|timeline,old-photos,calendar-pages
dringend|Uyarı ışıklı zarf sıradaki sıradan dosyaların önüne alınmış.|warning-light,urgent-envelope,file-stack
Ernährung|Sebze, tahıl ve protein tabağın ayrı bölümlerinde; yanında su.|plate,vegetables,water-glass
trennen|Bir ayırma simgesi iki rengi ayrı gösteriyor; boncuklar iki ayrı kaba ayrılmış.|hand,mixed-beads,two-bowls
Zusammenfassung|Uzun dosya listesi kısalıp temel maddelerden oluşan tek belgeye dönüşüyor.|document-stack,highlighted-points,single-page
bleiben|Tren ayrılırken yolcu platformda kalıyor; konum işareti sabit.|train,person,station-marker
sofort|Alarm çalar çalmaz kişi düğmeye basıyor; tepki gecikmiyor.|alarm,person,button
beantworten|Kişi soru işaretli kartın karşısına cevap kartını koyuyor.|question-card,person,answer-card
bedeutend|Toplantı masasındaki tek belge çerçeveyle öne çıkıyor; notlar soluk.|meeting-table,highlighted-document,faded-notes
folgend|İlk duraktan sonra ikinci durak ok ve sıra işaretiyle geliyor.|sequence-arrows,first-stop,next-stop
schließen|Açık kapının kapanmasını hatırlatan sembolik bir kapı ve yön işareti.|hand,door,closing-arrow
reden|İki kişi yüz yüze konuşurken balonlar aralarında gidip geliyor.|two-people,speech-bubbles,sound-lines
dürfen|Kişi geçmeden görevli onay veriyor; izin sonrası geçit açılıyor.|person,gate,approval-check
gefallen|Ziyaretçi tabloyu beğenip gülümsüyor; yan sahnede yaprak düşüyor.|visitor,painting,fallen-leaf
treffen|İki arkadaş meydanda beklenmedik biçimde karşılaşıp el sıkışıyor.|two-people,town-square,handshake
losfahren|Otobüs duraktan yola çıkıyor; durak çizgisi geride kalıyor.|bus,starting-stop,road
Thema|Toplantıdaki herkesin bakışı ortadaki konu kartına yönelmiş.|meeting-table,topic-card,people
Küche|Aşçı tezgahta tencere ve kesme tahtasıyla yemek hazırlıyor.|counter,pot,chef
erinnern|Takvim bildirimi randevuyu hatırlatıyor; kişi eski fotoğrafı anımsıyor.|calendar-alert,person,old-photo
Vorlesung|Öğretim görevlisi amfide tahtayı kullanırken öğrenciler not tutuyor.|lecturer,lecture-hall,notebooks
gerade|Cetvel düz çizgiyi gösteriyor; küçük saatte tam şimdi noktası var.|ruler,straight-line,clock
Recherche|Araştırmacı arşiv dosyası ve bilgisayardaki kaynakları karşılaştırıyor.|researcher,archive-files,computer
Kunde|Müşteri seçtiği ürünü dükkân kasasında görevliye uzatıyor.|customer,shop-counter,product
ablösen|Yeni görevli vardiyada anahtarı devralıyor; etiket yüzeyden ayrılıyor.|two-workers,key,peeling-label
Lösung|Labirentten çıkış hedefe ulaşıyor; alternatif çözelti küçük damlalıkta.|maze,exit,dropper
anwesend|Toplantıdaki kişiler yoklama listesindeki işaretlerle eşleşiyor.|meeting-room,people,attendance-sheet
Preisexplosion|Fiyat çizgisi dik yükselirken sepetteki ürün miktarı aynı kalıyor.|price-chart,shopping-basket,up-arrow
achten|Yaya uyarı levhasına dikkatle bakıp diğer kişiyi saygıyla selamlıyor.|pedestrian,warning-sign,greeting
verlassen|Kişi ev kapısından dışarı çıkıp uzaklaşırken ev geride kalıyor.|person,house-door,departure-path
handeln|Pazarda satıcı ürünü alıcıya sunuyor; yanındaki kişi harekete geçiyor.|seller,buyer,market-stall
Verwandte|Farklı kuşaklardan aile üyeleri ortak masada; bağları çizgilerle.|family-members,table,relationship-lines
Schriftsteller|Yazar çalışma masasında el yazmasına cümle ekliyor.|writer,manuscript,fountain-pen
notwendig|Tamir için gereken tek anahtar kırmızı işaretli; onsuz kilit açılmıyor.|key,lock,required-mark
Pfleger|Bakım görevlisi yaşlı kişiye yürürken destek oluyor; baston yakınında.|caregiver,older-person,walking-cane
Pflegerin|Bakım görevlisi hastanın tansiyonunu ölçüp not ediyor.|caregiver,patient,blood-pressure-cuff
Speise|Servis edilen sıcak tabakta sebze ve ekmek var.|serving-plate,vegetables,bread
Wirtschaft|Para, üretim ve çalışanlar ekonomik akış oluşturuyor; lokanta anlamı seçilmiyor.|coins,factory,workers`;

const draftMap=new Map(raw.split('\n').filter(Boolean).map(line=>{const [word,scene,motifs]=line.split('|');return[word,{scene,motifs:motifs.split(',')}]}));
const SVG_NS='http://www.w3.org/2000/svg';
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function hash(s){return crypto.createHash('sha256').update(s).digest('hex');}
function slug(s){return s.toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
const palettes=[['#235d53','#f2b960','#dc7355'],['#38678a','#f4bb58','#d97565'],['#7661a7','#efbb5d','#43a39a'],['#b45e4a','#4d8990','#e3af50'],['#43744f','#dd855e','#577fb2'],['#ac6e23','#45808c','#9461a4']];
function person(x,y,scale,color,variant='person'){
 const recline=/reclin|lying|lie/.test(variant), lean=/walk|climb|run|departure|dancer|explorer/.test(variant), sit=/sit|chair|sofa|desk|bench|relaxed/.test(variant), arms=/wave|talk|hand|help|point|hold|raise|greet|present|reach|witness|show|pull/.test(variant);
 if(recline)return `<g transform="translate(${x} ${y}) scale(${scale})"><circle cx="32" cy="40" r="13" fill="#f2c49b" stroke="#243c46" stroke-width="4"/><path d="M45 44h42l13 13-4 14H44z" fill="${color}" stroke="#243c46" stroke-width="4" stroke-linejoin="round"/><path d="M60 69 48 94M91 69l12 22M58 49 36 64" fill="none" stroke="#243c46" stroke-width="6" stroke-linecap="round"/><path d="M23 100h87" stroke="#243c46" stroke-width="5" stroke-linecap="round"/></g>`;
 const cx=60+(lean?8:0), torso=sit?'M38 45 Q60 35 78 46 L76 76 L43 76 Z':'M43 42 Q60 34 77 42 L73 80 L47 80 Z';
 const legs=sit?'M48 76 L45 98 L72 98 L72 84':'M50 77 L40 103 M69 77 L82 101';
 const armsPath=/pull/.test(variant)?'M45 48 L22 64 M76 48 L54 66':arms?'M45 48 L24 36 M76 48 L95 28':'M44 49 L27 72 M76 49 L93 70';
 return `<g transform="translate(${x} ${y}) scale(${scale})"><circle cx="${cx}" cy="22" r="13" fill="#f2c49b" stroke="#243c46" stroke-width="4"/><path d="${torso}" fill="${color}" stroke="#243c46" stroke-width="4" stroke-linejoin="round"/><path d="${armsPath} ${legs}" fill="none" stroke="#243c46" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${cx+4}" cy="21" r="1.7" fill="#243c46"/></g>`;
}
function clockIcon(color,small=false){return `<circle cx="60" cy="60" r="42" fill="#fffdf8" stroke="#243c46" stroke-width="5"/><circle cx="60" cy="60" r="3" fill="#243c46"/><path d="M60 60 L60 31 M60 60 L83 67" stroke="${color}" stroke-width="6" stroke-linecap="round"/><path d="M60 18v7 M102 60h-7 M60 102v-7 M18 60h7" stroke="#243c46" stroke-width="3"/>`}
// Exact motif-to-icon assignments. Every token is reviewed as a named visual cue;
// there is intentionally no fuzzy substring fallback.
const iconByMotif={};
const assign=(icon,tokens)=>tokens.trim().split(/\s+/).filter(Boolean).forEach(t=>iconByMotif[t]=icon);
assign('UserRound','applicant audience buyer caregiver chef climber cooking-person customer dealer driver explorer family-members lecturer listeners older-person officer applicant patient pedestrian performer reporter researcher seller storyteller traveler visitor witness worker workers writer two-people two-workers couple coworkers people greeting handshake recognition silhouette spinner talking-pair audience');
assign('Armchair','armchair'); assign('Sofa','sofa'); assign('Bed','bed'); assign('Armchair','chair stool'); assign('Armchair','bench'); assign('Table','table desk counter meeting-table shop-counter vacant-desk');
assign('Binoculars','binoculars'); assign('Sailboat','sailboat'); assign('Hand','hand open-hand'); assign('KeyRound','key'); assign('LockKeyhole','lock'); assign('Puzzle','incomplete-shape missing-piece completed-shape extension-piece'); assign('Shapes','shapes object-block subject-block verb-block'); assign('Ruler','ruler spirit-level level-board'); assign('Shirt','coat'); assign('Wrench','tools toolbox gear');
assign('Clock','clock alarm duration-arc'); assign('CalendarDays','calendar calendar-alert calendar-pages three-day-calendar next-calendar-day attendance-sheet'); assign('Hourglass','hourglass'); assign('Timer','clock'); assign('House','house distant-house house-door'); assign('Building2','factory workplace meeting-room');
assign('BookOpen','book books open-book notebooks manuscript'); assign('FileText','document archive-files deed contract attendance-sheet highlighted-document ownership-document report'); assign('Files','archive-files file-stack document-stack'); assign('NotebookPen','notepad'); assign('ClipboardList','checklist task-cards meeting-card question-card answer-card topic-card'); assign('FilePlus2','single-page page'); assign('Newspaper','newspaper'); assign('ChartNoAxesColumnIncreasing','chart price-chart salary-bars'); assign('Presentation','workflow-chart');
assign('Bus','bus'); assign('Car','car'); assign('TrainFront','train tram metro'); assign('Bike','bicycle'); assign('Map','map metro-map'); assign('Route','path road park-path connected-path crossing-paths departure-path return-arrow looping-path straight-line timeline short-timeline'); assign('ArrowRight','forward-arrow short-arrow next-stop sequence-arrows closing-arrow'); assign('ArrowLeftRight','opposing-arrows parallel-arrows joining-arrows'); assign('Signpost','sign warning-sign'); assign('DoorOpen','door open-door exit gate');
assign('TreeDeciduous','tree trees fallen-leaf roots'); assign('Sprout','bud sprout plant grass'); assign('Cog','spinning-wheel'); assign('Flower2','flower flowers'); assign('Bird','bird'); assign('Sun','sunrise sunset sun-breeze'); assign('CloudRain','rain');
assign('CupSoda','cup water-glass two-bowls'); assign('Coffee','spilled-cup'); assign('CookingPot','pot'); assign('Utensils','serving-plate plate vegetables bread'); assign('ShoppingBasket','shopping-basket'); assign('Package','box product product-stand task task unfinished-project interrupted-task'); assign('Droplets','dropper running-tap');
assign('Smartphone','smartphone ringing-phone'); assign('Radio','radio'); assign('Monitor','computer screen'); assign('Speech','speech-bubbles'); assign('MessageCircleMore','whisper'); assign('Cloud','thought-bubble'); assign('MessageCircleQuestion','question-card'); assign('Newspaper','newspaper');
assign('Wallet','coins coin-piles coins payment'); assign('Coins','coin'); assign('PiggyBank','piggy-bank'); assign('Banknote','salary-bars'); assign('BadgeEuro','price-chart'); assign('ReceiptText','contract deed ownership-document');
assign('Paintbrush','painting framed-art gallery-wall'); assign('Image','old-photo old-photos recent-photo'); assign('GalleryVerticalEnd','gallery-wall'); assign('PenLine','pen fountain-pen'); assign('Lightbulb','lightbulb warning-light'); assign('Eye','highlight highlighted-points magnifier');
assign('CircleCheck','approval-check required-mark'); assign('TriangleAlert','warning-sign'); assign('X','frown broken-focus'); assign('Plus','plus-sign'); assign('Flag','flag'); assign('Scale','balance'); assign('Heart','heart'); assign('Puzzle','maze'); assign('Landmark','bridge'); assign('Umbrella','umbrella umbrellas'); assign('BriefcaseBusiness','resume'); assign('Tag','name-tag peeling-label'); assign('Archive','archive-files'); assign('Layers','plan'); assign('Grid2X2','matching-blocks'); assign('Box','object'); assign('Bolt','button'); assign('Paperclip','short-strip');  assign('Cable','rope'); assign('HandHelping','walking-cane'); assign('CalendarClock','schedule'); assign('Clock3','now-marker center-marker today today-marker first-stop starting-stop station-marker recent-marker near-past-marker faded-timeline faded-notes'); assign('MoveRight','duration-arc'); assign('PersonStanding','walking-person'); assign('UsersRound','family-members couple coworkers two-people two-workers talking-pair listeners audience'); assign('Music2','sound-lines'); assign('Waves','steam'); assign('BookText','single-page'); assign('Clipboard','meeting-card'); assign('MapPinned','information-desk market-stall'); assign('Building','house workshop'); assign('GlassWater','water-glass'); assign('CircleDot','required-mark'); assign('Play','performer'); assign('Flower','flower'); assign('CloudRain','rain'); assign('PackageOpen','shopping-basket'); assign('MailWarning','urgent-envelope'); assign('Activity','blood-pressure-cuff'); assign('Shirt','coat'); assign('Lamp','lightbulb'); assign('ArrowUpRight','up-arrow'); assign('ClockArrowUp','duration-arc'); assign('MoveHorizontal','parallel-timeline'); assign('SquareStack','task-cards'); assign('GraduationCap','lecture-hall'); assign('Briefcase','workplace'); assign('PersonStanding','person walking-person'); assign('Users','people'); assign('FileCheck2','highlighted-document'); assign('ListChecks','checklist'); assign('BookMarked','open-book'); assign('MapPinned','map'); assign('MessageCircle','answer-card'); assign('CircleHelp','question-card'); assign('Construction','toolbox'); assign('Coffee','cup'); assign('PersonStanding','traveler'); assign('MoveRight','forward-arrow'); assign('ArrowDown','fallen-leaf'); assign('Shapes','shapes'); assign('Goal','flag'); assign('ChartNoAxesColumnIncreasing','salary-bars'); assign('HandCoins','payment'); assign('WalletCards','payment'); assign('UsersRound','family-members'); assign('BriefcaseBusiness','workplace'); assign('Clock4','duration-arc'); assign('CalendarDays','today'); assign('Milestone','timeline'); assign('CircleArrowRight','forward-arrow'); assign('ArrowUp','up-arrow'); assign('Lightbulb','warning-light');  assign('Archive','archive-files'); assign('PanelsTopLeft','door'); assign('PanelsLeftBottom','curtain'); assign('ContactRound','name-tag'); assign('NotebookTabs','notebooks'); assign('ScrollText','manuscript'); assign('HandCoins','payment'); assign('CircleDollarSign','coins'); assign('HousePlus','vacant-desk'); assign('Armchair','stool'); assign('Ruler','level-board'); assign('Blocks','object-block'); assign('FolderOpen','file-stack'); assign('Workflow','workflow-chart'); assign('ChartNoAxesCombined','chart'); assign('MessagesSquare','talking-pair'); assign('Handshake','handshake'); assign('Footprints','path'); assign('Trees','trees'); assign('Landmark','town-square'); assign('MapPinned','market-stall'); assign('PersonStanding','climber'); assign('Trophy','flag'); assign('UsersRound','two-people'); assign('CircleArrowLeft','return-arrow'); assign('SquarePen','document'); assign('CircleCheckBig','approval-check'); assign('ClockArrowDown','duration-arc'); assign('CalendarRange','three-day-calendar'); assign('SunMoon','timeline'); assign('Sunrise','sunrise'); assign('Sunset','sunset'); assign('CircleDot','now-marker'); assign('Clock3','today-marker'); assign('AlarmClock','alarm'); assign('AudioLines','sound-lines'); assign('FileClock','archive-files'); assign('PanelTop','screen'); assign('Lightbulb','warning-light'); assign('PersonStanding','person'); assign('TreePine','tree'); assign('Bird','bird'); assign('BriefcaseBusiness','vacant-desk'); assign('BadgeCheck','approval-check'); assign('HandHelping','open-hand'); assign('SquareStack','document-stack'); assign('FilePlus','extension-piece'); assign('PenTool','fountain-pen'); assign('Briefcase','resume'); assign('CircleDollarSign','payment'); assign('Archive','archive-files'); assign('GalleryVertical','gallery-wall'); assign('Building2','meeting-room'); assign('UtensilsCrossed','serving-plate'); assign('ChefHat','chef'); assign('Trees','park-path'); assign('DoorClosed','house-door'); assign('CloudSun','sun-breeze'); assign('BadgeEuro','salary-bars'); assign('FileText','document'); assign('Footprints','walking-person'); assign('SquareActivity','workflow-chart'); assign('Milestone','station-marker'); assign('ArrowLeftRight','boundary'); assign('CircleUserRound','older-person'); assign('HandHeart','caregiver'); assign('HeartPulse','blood-pressure-cuff'); assign('Salad','vegetables'); assign('Factory','factory'); assign('Shirt','coat'); assign('Shapes','completed-shape'); assign('Check','required-mark'); assign('ShoppingBag','product'); assign('Landmark','lecture-hall'); assign('FileSpreadsheet','attendance-sheet'); assign('Clapperboard','performer'); assign('GalleryVerticalEnd','framed-art'); assign('CircleOff','faded-timeline'); assign('CalendarCheck','calendar'); assign('AlarmClock','clock'); assign('Clock3','now-marker'); assign('Timer','duration-arc'); assign('BookOpenCheck','open-book'); assign('UserRoundSearch','researcher'); assign('HandCoins','coins'); assign('ClipboardPen','notepad'); assign('UserRoundCheck','caregiver'); assign('HeartPulse','patient'); assign('Soup','serving-plate'); assign('Utensils','bread'); assign('Factory','factory');

assign('MessageCircleWarning','complaint-bubble'); assign('FileText','unfinished-paper'); assign('LayoutGrid','organized-shelves'); assign('Award','skill-stairs steps stairs'); assign('ArrowLeftRight','transformation-arrows relationship-lines'); assign('Hand','wave'); assign('PanelsTopLeft','revealed-scene'); assign('Table','table-setting'); assign('Package','loose-items'); assign('Bus','waiting-passengers'); assign('Building','room modern-city'); assign('Library','shelf'); assign('CircleDashed','rings'); assign('Circle','ball'); assign('Cog','spinning-wheel'); assign('Bone','fossil'); assign('ChartNoAxesColumnIncreasing','total-pile'); assign('Shirt','hanger'); assign('Weight','paperweight weight'); assign('Container','overflowing-bucket'); assign('Split','mixed-beads'); assign('Files','document-stack'); assign('ListCollapse','highlighted-points'); assign('FileText','single-page'); assign('DoorClosed','door'); assign('Square','floor'); assign('Circle','wool'); assign('Fence','handrail');
function drawToken(token,x,y,scale,colors,idx){
 const stroke=colors[idx%colors.length];
 if(token==='coat')return `<svg x="${x}" y="${y}" width="210" height="210" viewBox="0 0 24 24" role="img" aria-label="long coat"><g fill="none" stroke="${stroke}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 12 5 16 3 20 7 18 11 17 21H7L6 11 4 7 8 3Z"/><path d="m8 3 4 4 4-4M12 7v14M12 10h.01M12 13h.01M12 16h.01"/></g></svg>`;
 if(token==='hanger')return `<svg x="${x}" y="${y}" width="210" height="210" viewBox="0 0 24 24" role="img" aria-label="coat hanger"><g fill="none" stroke="${stroke}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M10 7a2 2 0 1 1 3.8 1c-.5 1-.8 1-1 2L21 15H3l8.2-5.2"/></g></svg>`;
 if(token==='paperweight')return `<svg x="${x}" y="${y}" width="210" height="210" viewBox="0 0 24 24" role="img" aria-label="paperweight"><g fill="none" stroke="${stroke}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M6 7l1 14h10l1-14M9 4h6v3"/><path d="M4 18h16"/></g></svg>`;
 if(token==='wool')return `<svg x="${x}" y="${y}" width="210" height="210" viewBox="0 0 24 24" role="img" aria-label="yarn ball"><g fill="none" stroke="${stroke}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M6 8c4 0 8 2 12 8M5 13c4-2 9-2 14 1M9 4c0 4 2 9 7 15"/></g></svg>`;
 if(['stairs','steps','skill-stairs'].includes(token))return `<svg x="${x}" y="${y}" width="210" height="210" viewBox="0 0 24 24" role="img" aria-label="stairs"><path d="M3 21h5v-5h5v-5h5V6h3" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
 if(token==='stool')return `<svg x="${x}" y="${y}" width="210" height="210" viewBox="0 0 24 24" role="img" aria-label="stool"><g fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14M7 8l-1 13M17 8l1 13M12 8v13"/></g></svg>`;
 const iconName=iconByMotif[token]; if(!iconName)throw new Error(`No exact Lucide icon assignment for motif: ${token}`);
 const Icon=Lucide[iconName]; if(!Icon)throw new Error(`Installed Lucide icon missing: ${iconName} (${token})`);
 const markup=renderToStaticMarkup(React.createElement(Icon,{width:112,height:112,strokeWidth:2.5,color:stroke,'aria-hidden':true}));
 const paths=markup.replace(/^<svg[^>]*>|<\/svg>$/g,'').replace(/currentColor/g,stroke);
 return `<svg x="${x}" y="${y}" width="210" height="210" viewBox="0 0 24 24" role="img" aria-label="${esc(token)}"><g fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
}

const timeConfig={
 einst:{points:[['BİR ZAMANLAR',245],['ŞİMDİ',460],['BİR GÜN',675]],focus:[0,2]},
 nun:{points:[['ÖNCE',285],['ŞİMDİ',460],['DEVAM',635]],focus:[1]},
 eben:{points:[['AZ ÖNCE',375],['ŞİMDİ',535]],focus:[0]},
 momentan:{points:[['ÖNCE',285],['ŞİMDİ',460],['SONRA',635]],focus:[1]},
 gegenwärtig:{points:[['ÖNCE',285],['ŞİMDİ',460],['SONRA',635]],focus:[1]},
 Gegenwart:{points:[['GEÇMİŞ',285],['ŞİMDİ',460],['GELECEK',635]],focus:[1]},
 damals:{points:[['O ZAMANLAR',245],['ŞİMDİ',530]],focus:[0]},
 kürzlich:{points:[['BİRKAÇ GÜN ÖNCE',335],['ŞİMDİ',535]],focus:[0]},
 nachher:{points:[['ŞİMDİ',385],['DAHA SONRA',565]],focus:[1]},
 vorgestern:{points:[['EVVELSİ GÜN',300],['DÜN',460],['BUGÜN',620]],focus:[0]},
 neulich:{points:[['GEÇENLERDE',330],['ŞİMDİ',535]],focus:[0]},
 künftig:{points:[['ŞİMDİ',340],['GELECEKTE',635]],focus:[1]},
 heutzutage:{points:[['GEÇMİŞ',285],['GÜNÜMÜZDE',460],['GELECEK',635]],focus:[1]},
 vorhin:{points:[['AZ ÖNCE',390],['ŞİMDİ',535]],focus:[0]},
 während:{points:[['AYNI ZAMAN',460]],focus:[0]},
 demnächst:{points:[['ŞİMDİ',365],['YAKINDA',555]],focus:[1]},
 Vergangenheit:{points:[['GEÇMİŞ',285],['ŞİMDİ',535]],focus:[0]},
 Zukunft:{points:[['ŞİMDİ',340],['GELECEK',635]],focus:[1]},
 sofort:{points:[['HEMEN · BEKLEMEDEN',460]],focus:[0]},
 gerade:{points:[['ŞİMDİ · TAM ŞU AN',460]],focus:[0]},
 gleich:{points:[['ŞİMDİ',460],['BİRAZDAN',620]],focus:[1]},
 folgend:{points:[['İLK',350],['ARDINDAN',570]],focus:[1]},
};
const contrastWords=new Set(['bequem','gleich','eben','dunkel','angenehm','sinnvoll','bedeutend','notwendig','dringend','unbedingt','gerade']);
function timelineSvg(item){
 const conf=timeConfig[item.word];if(!conf)return'';
 const line=`<path d="M155 500H765" stroke="#334f57" stroke-width="5" stroke-linecap="round"/><path d="M752 489l17 11-17 11" fill="none" stroke="#334f57" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
 const dots=conf.points.map(([label,x],i)=>{const selected=conf.focus.includes(i);const color=selected?'#d35f49':'#86a39d';return `<circle cx="${x}" cy="500" r="${selected?17:11}" fill="${color}" stroke="#fffdf8" stroke-width="4"/><rect x="${x-74}" y="535" width="148" height="34" rx="17" fill="${selected?'#d35f49':'#e5ece7'}"/><text x="${x}" y="557" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="${selected?'#fff':'#344f56'}">${label}</text>`;}).join('');
 const now=`<path d="M460 451v65" stroke="#243c46" stroke-width="3" stroke-dasharray="4 5"/>`;
 return `<g>${line}${dots}${!['nun','gegenwärtig','Gegenwart','momentan'].includes(item.word)?now:''}</g>`;
}
function renderSvg(item,index){
 const colors=palettes[index%palettes.length],motifs=item.motifs;
 const centers=motifs.length===2?[330,590]:motifs.length===3?[200,460,720]:[130,350,570,790];
 const nodes=motifs.map((m,i)=>drawToken(m,centers[i]-105,160,1,colors,i)).join('');
 const isVerb=item.partOfSpeech==='verb';
 const connector='';
 const contrast=contrastWords.has(item.word)?`<g><circle cx="240" cy="400" r="21" fill="#2f8c67"/><path d="m229 400 8 8 15-18" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="680" cy="400" r="21" fill="#bd554d"/><path d="m671 391 18 18m0-18-18 18" stroke="white" stroke-width="5" stroke-linecap="round"/><text x="240" y="440" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#2d765d">UYGUN</text><text x="680" y="440" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#a5403c">KARŞIT</text></g>`:'';
 const timeline=timelineSvg(item);
 const compositionNote=timeConfig[item.word]?'Eğitsel çağrışım şeması: etiketli zaman çizgisi sabit ŞİMDİ referansıyla karşılaştırılır.':contrastWords.has(item.word)?'Eğitsel çağrışım şeması: ✓ ve ✕ işaretli karşılaştırmalı semboller kullanılır.':'Eğitsel çağrışım şeması: ayrı Lucide sembolleri kelimenin anlamını çağrıştırır; literal bir sahne veya eylem iddiası değildir.';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="640" viewBox="0 0 920 640" role="img" aria-labelledby="title desc"><title id="title">${esc(item.word)} — özgün eğitsel görsel çağrışım</title><desc id="desc">${esc(compositionNote)} ${esc(item.explanationTR)}</desc><rect width="920" height="640" rx="32" fill="#f7f4ec"/><text x="460" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#334f57">EĞİTİMSEL ÇAĞRIŞIM ŞEMASI</text><circle cx="120" cy="112" r="64" fill="#fff" opacity=".5"/><circle cx="800" cy="520" r="92" fill="#fff" opacity=".46"/><rect x="40" y="72" width="840" height="450" rx="28" fill="#fffdf8" stroke="#e4e6da" stroke-width="3"/><path d="M72 118h776" stroke="#e8ece4" stroke-width="3"/>${connector}${nodes}${contrast}${timeline}<g transform="translate(410 588)"><rect x="-132" y="0" width="264" height="30" rx="15" fill="${colors[0]}" opacity=".11"/><circle cx="-92" cy="15" r="6" fill="${colors[1]}"/><circle cx="-68" cy="15" r="6" fill="${colors[2]}"/><circle cx="-44" cy="15" r="6" fill="${colors[0]}"/><path d="M-10 15h100" stroke="#b7c4bb" stroke-width="4" stroke-linecap="round"/></g></svg>`;
}

export {renderSvg, iconByMotif};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
const cards=JSON.parse(fs.readFileSync(cardsPath,'utf8')).map(x=>x.body);
const verdicts=new Map(JSON.parse(fs.readFileSync(verdictsPath,'utf8')).map(x=>[x.word,x]));
const compatible=cards.filter(c=>verdicts.get(c.word)?.status==='compatible');
const target=cards.filter(c=>verdicts.get(c.word)?.status!=='compatible');
if(cards.length!==169||compatible.length!==39||target.length!==130)throw new Error(`Expected 169/39/130 source split; got ${cards.length}/${compatible.length}/${target.length}`);
if(target.length!==draftMap.size)throw new Error(`Expected one scene draft per card; got ${target.length} cards, ${draftMap.size} drafts`);
const words=new Set();fs.mkdirSync(assetDir,{recursive:true});
const rows=target.map((card,i)=>{
 const draft=draftMap.get(card.word);if(!draft)throw new Error(`Missing scene plan for ${card.word}`);if(words.has(card.word))throw new Error(`Duplicate current word: ${card.word}`);words.add(card.word);
 const file=slug(card.word)+'.svg';const filePath=path.join(assetDir,file);
 const row={assetId:'wortgarten-scene-'+slug(card.word),conceptId:'wortgarten-scene-'+slug(card.word),word:card.word,aliases:[],meaning:card.meaning,sense:card.meaning,partOfSpeech:card.partOfSpeech||'unknown',explanationTR:'Bu çağrışım şeması şu durumu hatırlatmak içindir: '+draft.scene,scene:draft.scene,motifs:draft.motifs,path:'/vocabulary-art/teaching-scenes/'+file,source,archive:'wortgarten',version:'1.0.0',license,licenseUrl,author:'Wortgarten',kind:'illustration',reviewStatus:'pending-review',sourceAttribution:attribution,compositionLicense:license,componentCredit:iconCredit,componentLicense:iconLicense};
 const svg=renderSvg(row,i);fs.writeFileSync(filePath,svg+'\n');row.sha256=hash(fs.readFileSync(filePath));return row;
});
fs.writeFileSync(output,JSON.stringify({schemaVersion:1,archive:'wortgarten',version:'1.0.0',kind:'illustration',license,licenseUrl,author:'Wortgarten',sourceAttribution:attribution,reviewedAssets:rows},null,2)+'\n');
console.log(`Wrote ${rows.length} pending-review scenes at ${assetDir}`);
}
