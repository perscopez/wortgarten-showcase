#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import * as Lucide from 'lucide-react';
import {renderSvg,iconByMotif} from './generate-teaching-scenes.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Input: an exported card snapshot (JSON array of sync rows). Never committed.
const snapshotPath=path.resolve(process.env.WORTGARTEN_CARD_SNAPSHOT||path.join(root,'outputs','card-snapshot.json'));
const output=path.join(root,'lib/new-word-scenes.json');
const assetDir=path.join(root,'public/vocabulary-art/teaching-scenes');
const auditDir=path.join(root,'outputs','new-word-scene-audit');
const targetedWords=['Flugmodus','Seitentaste','ungefähr'];
const targetedMode=process.argv.includes('--targeted');
const source='https://wortgarten-beta.vercel.app/visual-sources.html';
const license='CC BY 4.0',licenseUrl='https://creativecommons.org/licenses/by/4.0/';
const attribution='Özgün yerleşim: Wortgarten · CC BY 4.0. Lucide glifleri: ISC; Feather kökenli glifler: MIT. Tam metin: LUCIDE-LICENSE.txt.';
const componentLicense='ISC; MIT for Feather-derived glyphs';
const componentCredit='Lucide Icons and Contributors; Cole Bemis/Feather (derived glyphs)';

// New, specific motifs only. No substring inference or generic unknown-token fallback.
const extra={
 'sculptor':'UserRound','marble-block':'Box','chisel':'Hammer','memory-chip':'MemoryStick','storage-drive':'HardDrive','data-files':'Files',
 'text-input':'SquarePen','keyboard':'Keyboard','cursor':'MousePointer2','monitor':'Monitor','screen-frame':'Monitor','full-screen':'Fullscreen',
 'highlighted-sign':'MapPinned','power-meter':'Gauge','world-map':'Globe','champion-medal':'Medal','display-panel':'PanelsTopLeft',
 'finger-press':'Hand','phone-button':'Smartphone','stage-backdrop':'PanelsTopLeft','paint-roller':'PaintRoller','cancel-mark':'CircleX',
 'task-list':'ListTodo','route-link':'Route','plug-device':'Plug','idea-spark':'Lightbulb','app-grid':'Grid2X2','library-phone':'Smartphone',
 'missed-bus':'BusFront','utility-tool':'Wrench','phone-side':'Smartphone','access-granted':'LockKeyholeOpen','ad-screen':'Monitor',
 'low-battery':'BatteryLow','chat-pair':'MessagesSquare','place-pin':'MapPin','collection-jar':'Archive','bonus-gift':'Gift',
 'sales-counter':'Store','news-message':'Newspaper','final-step':'ListOrdered','salary-slip':'Banknote','newborn':'Baby',
 'move-object':'Move','link-connection':'Link2','generic-object':'Box','outline-list':'ListTree','request-form':'FileInput',
 'glare-sun':'Sun','accessibility-person':'Accessibility','proposal-bulb':'Lightbulb','response-signal':'BellRing',
 'shipping-box':'Package','notification-bubble':'MessageCircle','discount-tag':'Tags','painting-easel':'Paintbrush',
 'permission-check':'ShieldCheck','canvas':'Frame','glowing-lamp':'Lamp','upright-vase':'Amphora','other-menu':'Ellipsis',
 'drawing-pencil':'Pencil','short-ruler':'Ruler','wallpaper-phone':'Wallpaper','training-book':'BookOpenCheck',
 'event-calendar':'CalendarDays','earth-globe':'Globe2','depiction-frame':'Image','privacy-shield':'ShieldCheck',
 'pressure-gauge':'Gauge','sketch-paper':'FilePenLine','watercolor-palette':'Palette','reply-bubble':'Reply',
 'empty-map-pin':'MapPinOff','phone-settings':'Settings2','creative-palette':'Palette','calendar-stage':'CalendarCheck',
 'range-mark':'BetweenHorizontalStart','advertising-sign':'PanelsTopLeft','skip-arrow':'SkipForward',
 'gallery-art':'GalleryVerticalEnd','emergency-call':'Siren','settings-menu':'Settings2','sequence-dots':'ListOrdered',
 'cell-signal':'Signal','career-resume':'FileUser','follow-person':'PersonStanding','family-share':'UsersRound',
 'force-lever':'Pickaxe','inventor':'UserRound','prototype-gear':'Cog','uneasy-face':'Annoyed',
 'full-price-tag':'BadgeEuro','intro-card':'ContactRound','general-group':'PanelsTopLeft','question-message':'MessageCircleQuestion',
 'stalled-progress':'CirclePause','figurative-frame':'Frame','hide-layer':'EyeOff','art-palette':'Palette',
 'moving-box':'Package','house-move':'Truck','key-button':'Keyboard','growing-child':'Baby','height-arrow':'MoveUp',
 'notification-bell':'Bell','ghost-shadow':'Ghost','same-era':'CalendarClock','share-file':'Share2',
 'learning-cap':'GraduationCap','airplane-mode':'Plane','brightness-sun':'Sun','queue-line':'UsersRound',
 'add-plus':'CirclePlus','paint-stroke':'Paintbrush','approval-stamp':'Stamp','reading-device':'BookOpenCheck','no-signal':'WifiOff','side-button-phone':'Smartphone','button-detail':'ZoomIn','approximation':'EqualApproximately','trophy':'Trophy','down-arrow':'ArrowDown','footprints':'Footprints','send':'Send','eye':'Eye','package':'Package','truck':'Truck','frame':'Frame','droplets':'Droplets','sliders':'SlidersHorizontal'
};
for(const [motif,icon] of Object.entries(extra)){
 if(!Lucide[icon])throw new Error(`Missing installed Lucide glyph ${icon} for ${motif}`);
 if(iconByMotif[motif]&&iconByMotif[motif]!==icon)throw new Error(`Refusing to overwrite existing exact mapping ${motif}`);
 iconByMotif[motif]=icon;
}

// One authored, sense-scoped mnemonic cue per current photo-less card.
// Several polysemous entries deliberately identify which sense the composition teaches.
const raw=String.raw`Bildhauer|Atölyede heykeltıraş mermer bloğa keski ve çekiçle biçim veriyor; bu çizim heykel yapma bağlamını seçiyor.|sculptor,marble-block,chisel
Speicher|Dijital bağlam seçildi: bellek yongası dosyaları depolama sürücüsüne kaydediyor.|memory-chip,storage-drive,data-files
eingeben|Klavye tuşları metni giriş alanına yazıyor; imleç alanın içinde.|keyboard,text-input,cursor
Bildschirm|Bir masaüstü ekranında açık pencere ve görüntü alanı gösteriliyor.|monitor,screen-frame,cursor
hinweisen|Bir el haritadaki belirli yere işaret ediyor; işaretlenen nokta çevresinden ayrılıyor.|finger-press,place-pin,highlighted-sign
Leistung|Teknik güç anlamı seçildi: cihazın watt göstergesi yükseliyor.|power-meter,plug-device,up-arrow
Weltmeister|Şampiyonluk kupası, dünya küresi ve altın madalya başarıyı gösteriyor.|champion-medal,earth-globe,trophy
Vollbildschirm|Telefon ekranı kenarlara kadar görüntüyle doluyor; tam ekran simgesi açık.|library-phone,full-screen,display-panel
drücken|Parmak basınca fiziksel düğme aşağı hareket ediyor.|finger-press,phone-button,down-arrow
Bühnenmaler|Sahne ressamı tiyatro dekorunun geniş arka fonunu boyuyor.|sculptor,paint-roller,stage-backdrop
abbrechen|İşlem sürerken iptal düğmesine basılıyor; işlem çubuğu duruyor.|phone-side,cancel-mark,stalled-progress
erledigen|Görev listesindeki son madde işaretlenince iş tamamlandı durumuna geliyor.|task-list,approval-check,final-step
Verbindung|Ulaşım bağlantısı anlamı seçildi: iki istasyon metro hattıyla birleşiyor.|route-link,station-marker,train
Gerät|Elektronik bir cihazda ekran, güç bağlantısı ve ayar dişlisi görülüyor.|phone-side,plug-device,prototype-gear
anregen|Bir konuşma sırasında yeni bir fikir ampulü beliriyor; öneri balonu bunu izliyor.|chat-pair,idea-spark,proposal-bulb
App-Mediathek|Telefonun uygulama kitaplığı ekranında simgeler düzenli ızgarada.|library-phone,app-grid,other-menu
verpassen|Otobüs duraktan hareket etmiş; saatte geç kalma noktası ve bekleyen yolcu.|missed-bus,alarm,person
Dienstprogramm|Laptopun yanında küçük yardımcı araç simgesi ayar görevini gösteriyor.|monitor,utility-tool,settings-menu
Seitentaste|Telefon silüetinin sağ kenarındaki fiziksel yan düğme kırmızıyla vurgulanıyor; büyütme simgesi ayrıntıya dikkat çekiyor.|side-button-phone,button-detail
Freigabe|Erişim izni anlamı seçildi: kilit açılıyor ve onay işareti beliriyor.|access-granted,permission-check,person
Anzeige|Ekran göstergesi anlamı seçildi: panelde sayı ve durum göstergesi okunuyor.|display-panel,power-meter,monitor
schwach|Pil göstergesi boş seviyeye yaklaşmış; güç işareti zayıf.|low-battery,phone-side,down-arrow
Unterhaltung|Sohbet anlamı seçildi: iki kişinin konuşma balonları karşılıklı.|chat-pair,notification-bubble,person
Ort|Haritadaki konum iğnesi tek bir yeri belirginleştiriyor.|place-pin,map,highlighted-sign
sammeln|Koleksiyon için farklı nesneler biriktirme kutusunda toplanıyor.|collection-jar,coins,archive-files
Bonus|Ek kazanç/ödül anlamı seçildi: maaşın yanında ayrı hediye tutarı.|bonus-gift,salary-slip,coins
betreten|Bir kişi açık kapının eşiğini geçerek içeri adım atıyor.|person,open-door,footprints
Verkauf|Satıcı ürünü müşteriye uzatıyor; satış bedeli kasada beliriyor.|sales-counter,product,payment
erfahren|Haber almak anlamı seçildi: telefona gelen haber bildirimi kişiye ulaşıyor.|news-message,notification-bubble,person
zuletzt|Numaralı listede son madde seçili; öncekiler tamamlanmış.|final-step,approval-check,task-list
verdienen|Çalışan yaptığı iş karşılığında ücretini teslim alıyor.|person,salary-slip,coins
geboren werden|Yeni doğan bebek ve onu karşılayan aile üyeleri gösteriliyor.|newborn,family-members,heart
oben|Yukarı konumunu gösteren ok, alt referans çizgisinin üstüne yöneliyor.|up-arrow,range-mark,display-panel
bewegen|El nesneyi bir konumdan diğerine hareket ettiriyor.|finger-press,move-object,route-link
verbinden|İki ayrı kablo/uç bir bağlantı çizgisiyle birleştiriliyor.|link-connection,plug-device,route-link
Sache|Genel “şey/eşya” bağlamı seçildi: etiketsiz tek nesne, çevresindeki masa ve el ile ilişkilendiriliyor.|generic-object,table,hand
Gliederung|Başlık ve alt başlıklar girintili hiyerarşik taslak oluşturuyor.|outline-list,task-list,final-step
anfordern|Bir formda belge talebi gönderiliyor; gönder oku talebi alıcıya iletiyor.|request-form,send,document
blenden|Parlak güneş ışığı göze vuruyor ve kısa süreli kamaşma çizgileri oluşuyor.|glare-sun,eye,lightbulb
Bedienungshilfe|Erişilebilirlik menüsünde kişiye özel ekran yardım seçeneği açılıyor.|accessibility-person,phone-settings,permission-check
Vorschlag|Öneri balonunda yeni bir fikir sunuluyor; ampul fikri simgeliyor.|proposal-bulb,notification-bubble,person
reagieren|Uyarı sinyali gelir ve kişi hemen karşılık verir; uyaranla yanıt ayrı işaretli.|response-signal,person,reply-bubble
Versand|Paket sevkiyata hazırlanıp kargo aracına yükleniyor.|shipping-box,package,truck
Mitteilung|Telefonda yeni bir ileti bildirimi açılıyor.|notification-bubble,phone-side,news-message
Rabatt|Etiketli ürünün fiyatında indirim işareti ve düşen tutar görülüyor.|discount-tag,product,down-arrow
Gemälde|Çerçeve içindeki boyalı eser bir sanat tablosu olarak sergileniyor.|gallery-art,painting-easel,frame
erlauben|Bir kişi diğerine geçiş izni veriyor; izin işareti kapalı kapıyı açıyor.|person,permission-check,open-door
malen|Fırça, boya paleti ve tuval üzerinde renkli bir iz oluşturuyor.|painting-easel,art-palette,paint-stroke
leuchten|Lamba karanlık alana ışık yayıyor; ışınlar görünür.|glowing-lamp,brightness-sun,lightbulb
stellen|Nesne yatay yüzeyden dik konuma yerleştiriliyor; dikey yön işareti bunu gösteriyor.|generic-object,table,up-arrow
erhalten|Teslim alma anlamı seçildi: alıcı gelen paketi eline alıyor.|person,shipping-box,down-arrow
Sonstige|Menü başlığı altında kalan diğer öğeler üç noktalı “diğerleri” seçeneğinde gruplanıyor.|other-menu,app-grid,task-list
zeichnen|Kalem kâğıt üzerinde belirgin bir çizim konturu oluşturuyor.|drawing-pencil,sketch-paper,depiction-frame
verkürzen|Ölçü çizgisindeki uzun parça kısaltılmış sürümle karşılaştırılıyor.|short-ruler,range-mark,down-arrow
Hintergrundbild|Telefon ana ekranının arka planında seçilmiş duvar kâğıdı görülüyor.|wallpaper-phone,library-phone,display-panel
eine Ausbildung machen|Öğrenci mesleki eğitim kitabı ve uygulamalı aletlerle eğitim alıyor.|person,training-book,utility-tool
Ereignis|Takvimde özel etkinlik günü belirgin; alarm işareti olayı hatırlatıyor.|event-calendar,notification-bell,highlighted-sign
Welt|Dünya küresi kıtalarıyla gösteriliyor.|earth-globe,world-map,route-link
abbilden|Tanımlanabilir bir nesne çerçeve içinde görsel olarak tasvir ediliyor.|depiction-frame,generic-object,drawing-pencil
Datenschutz|Kişisel veriler kilitli kalkan arkasında korunuyor.|privacy-shield,data-files,lock
Druck|Basınç anlamı seçildi: ibreli basınç göstergesi yükselen kuvveti gösteriyor.|pressure-gauge,down-arrow,up-arrow
Zeichnung|Kâğıttaki çizgisel eskiz ve kalem, çizim ürününü gösteriyor.|sketch-paper,drawing-pencil,depiction-frame
Aquarell|Sulu boya paletindeki pigment damlaları suyla karışıp kâğıda yayılıyor.|watercolor-palette,droplets,sketch-paper
antworten|Yanıt balonu soru mesajına geri yöneliyor.|reply-bubble,question-message,chat-pair
nirgendwo|Haritada olası yerler soluk; hiçbir konum iğnesi seçili değil.|empty-map-pin,map,person
einstellen|Telefon ayarı bağlamı seçildi: kaydırıcı değeri kullanıcı tarafından değiştiriliyor.|phone-settings,sliders,phone-side
Kreativität|Yeni fikir, palet ve çizim araçları özgün bir tasarıma dönüşüyor.|creative-palette,idea-spark,drawing-pencil
stattfinden|Etkinlik takvimde planlanan saatte gerçekleşiyor; sahne ve onay işareti.|calendar-stage,stage-backdrop,approval-check
Kontrollzentrum|Telefondaki denetim merkezinde bağlantı ve parlaklık denetimleri birlikte açılıyor.|phone-settings,cell-signal,brightness-sun
ungefähr|Örnek değer yaklaşık 10 olarak yazılıyor; ≈ işareti kesin eşitlik olmadığını belirtir.|approximation,range-mark
Werbemaler|Reklam ressamı dükkân tabelasına dikkat çekici yazı ve renk uyguluyor.|advertising-sign,paint-roller,art-palette
überspringen|Bir adım atlanıp sonraki adıma geçiliyor; ara durak çizilmeden geçilir.|skip-arrow,sequence-dots,final-step
ausstellen|Galeri anlamı seçildi: eser çerçeveli olarak izleyiciye sunuluyor.|gallery-art,frame,person
Notruf|Acil çağrı düğmesine basılınca acil yardım sinyali gönderiliyor.|emergency-call,phone-side,response-signal
Einstellung|Telefon ayarları menüsü seçildi; kaydırıcı ve dişli seçenekleri görünür.|settings-menu,sliders,phone-side
anschließend|İlk olaydan hemen sonra ikinci olay numaralı sırada geliyor.|sequence-dots,forward-arrow,event-calendar
Mobilfunk|Cep telefonu şebekesi baz istasyonlarıyla cihaza bağlantı sağlıyor.|cell-signal,phone-side,route-link
Lebenslauf|Özgeçmişte eğitim ve iş durakları zaman sırasıyla listeleniyor.|career-resume,sequence-dots,outline-list
folgen|Takip eden kişi öndeki kişiyi belirli bir güzergâhta izliyor.|follow-person,route-link,person
Familienfreigabe|Aile üyeleri dijital hizmete ortak erişim izni alıyor.|family-share,access-granted,library-phone
ausüben|Baskı uygulama anlamı seçildi: kol mekanizması yüzeye kuvvet iletiyor.|force-lever,pressure-gauge,hand
Theatermaler|Tiyatro dekor ressamı sahne fonuna yeni bir görünüm boyuyor.|sculptor,paint-roller,stage-backdrop
erfinden|İcat eden kişi dişli, ampul ve prototipi bir araya getiriyor.|inventor,prototype-gear,generic-object
unangenehm|Hoş olmayan durum anlamı seçildi: kişi rahatsız edici sesten yüzünü buruşturuyor.|uneasy-face,sound-lines,person
zeitgenössisch|Çağdaş sanat eseri kendi dönemi ve bugünün takvim noktasıyla yan yana.|gallery-art,same-era,event-calendar
Vollpreisartikel|Ürün tam fiyat etiketinde indirim işareti olmadan gösteriliyor.|full-price-tag,product,coins
sich vorstellen|Kendini tanıtma anlamı seçildi: kişi ad kartını karşısındakine sunuyor.|intro-card,person,chat-pair
allgemein|Genel kategori başlığında farklı öğeler uzmanlık filtresi olmadan gruplanıyor.|general-group,app-grid,other-menu
anfragen|Bilgi talebi sorulu iletiyle gönderiliyor; alıcıdan yanıt bekleniyor.|question-message,send,person
stagnieren|İlerleme göstergesi bir noktada duruyor; artış işareti yok.|stalled-progress,range-mark,display-panel
gegenständlich|Figüratif sanat anlamı seçildi: tanınabilir meyve nesnesi çerçeve içinde betimleniyor.|figurative-frame,generic-object,painting-easel
ausblenden|Görüntü katmanı göz simgesiyle görünmez yapılıyor.|hide-layer,display-panel,screen-frame
Malerei|Resim sanatı bağlamı seçildi: palet, fırça ve tuval birlikte.|art-palette,painting-easel,frame
umziehen|Taşınma anlamı seçildi: kutular yeni eve taşınıyor.|moving-box,house-move,house
Taste|Telefon/klavye bağlamında basılabilir tek bir tuş gösteriliyor.|key-button,keyboard,phone-button
aufwachsen|Çocuk büyüdükçe boy göstergesi ve filizlenen ağaç yükseliyor.|growing-child,height-arrow,tree
benachrichtigen|Bir kişiye haber ulaştıran bildirim zili ve mesaj balonu.|person,notification-bell,notification-bubble
unheimlich|Tekinsiz bağlam seçildi: loş gölge ve hayalet silueti ürkütücü çağrışım veriyor.|ghost-shadow,brightness-sun,person
teilen|Dosya paylaşımı anlamı seçildi: bir dosya iki kullanıcıya gönderiliyor.|share-file,data-files,family-share
Bildung|Eğitim ve öğrenim anlamı seçildi: öğrenci kitap ve mezuniyet simgesiyle.|person,learning-cap,training-book
Flugmodus|Uçak modu açık: uçak simgesiyle birlikte hücresel sinyalin sıfırlandığı görülüyor.|airplane-mode,phone-side,no-signal
Helligkeit|Parlaklık kaydırıcısı güneş simgesiyle ekran ışığını yükseltiyor.|brightness-sun,sliders,display-panel
anstehen|Sırada bekleme anlamı seçildi: kişiler sıra çizgisinde bekliyor.|queue-line,person,sequence-dots
hinzufügen|Artı düğmesi yeni öğeyi var olan listeye ekliyor.|add-plus,task-list,product
streichen|Boyama anlamı seçildi: fırça yüzey üzerinde boya izi bırakıyor.|paint-stroke,art-palette,frame
Genehmigung|Resmî onay belgesi mühür ve onay işaretiyle geçerli oluyor.|approval-stamp,document,permission-check
Lesegerät|E-kitap okuyucu cihazda metin sayfası okunuyor.|reading-device,book,display-panel`;

const drafts=new Map(raw.split('\n').filter(Boolean).map(line=>{const [word,scene,motifs]=line.split('|');return[word,{scene,motifs:motifs.split(',')}]}));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const slug=s=>s.toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const snapshot=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
const current=snapshot.map(x=>x.body);
const missing=current.filter(c=>!c.photo);
if(current.length!==276||missing.length!==107||drafts.size!==107||raw.split('\n').filter(Boolean).length!==drafts.size)throw new Error(`Expected 276/107/107 current/missing/drafts, got ${current.length}/${missing.length}/${drafts.size}`);
const expected=new Set(missing.map(c=>c.word));
if([...drafts.keys()].some(w=>!expected.has(w))||missing.some(c=>!drafts.has(c.word)))throw new Error('Scene drafts must match exactly current photo-less snapshot words.');
const ids=new Set();
const oldManifest=targetedMode?JSON.parse(fs.readFileSync(output,'utf8')):null;
if(targetedMode&&oldManifest.reviewedAssets.length!==107)throw new Error('Expected existing 107-row manifest for targeted update.');
for(const draft of drafts.values())for(const motif of draft.motifs)if(!iconByMotif[motif])throw new Error(`Unmapped explicit motif ${motif}`);
fs.mkdirSync(assetDir,{recursive:true});
function buildRow(card,index,writeAsset=true,previous=null){
 const draft=drafts.get(card.word),id='wortgarten-new-scene-'+slug(card.word),file=`new-${slug(card.word)}.svg`,assetPath=`/vocabulary-art/teaching-scenes/${file}`;
 if(ids.has(id))throw new Error(`Duplicate asset id ${id}`);ids.add(id);
 const row={assetId:id,conceptId:id,word:card.word,aliases:[],meaning:card.meaning,sense:card.meaning,partOfSpeech:card.partOfSpeech||'unknown',explanationTR:'Bu çağrışım şeması şu bağlamı hatırlatmak içindir: '+draft.scene,scene:draft.scene,motifs:draft.motifs,path:assetPath,source,archive:'wortgarten',version:'1.0.0',license,licenseUrl,author:'Wortgarten',kind:'illustration',reviewStatus:'pending-review',sourceAttribution:attribution,compositionLicense:license,componentCredit,componentLicense,...(previous?{}:{})};
 if(writeAsset){
  let svg=renderSvg(row,index);
  if(card.word==='Seitentaste'){
   const motif=row.motifs[0],node=new RegExp(`<svg x="[^"]+" y="160" width="210" height="210" viewBox="0 0 24 24" role="img" aria-label="${motif}">[\\s\\S]*?<\\/svg>`);
   const custom=`<svg x="225" y="160" width="210" height="210" viewBox="0 0 24 24" role="img" aria-label="phone with highlighted right-side button"><g fill="none" stroke="#38678a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="1.5" width="14" height="21" rx="2.5"/><path d="M10 4h4M10 20h4"/><path d="M19 7h1.5v4H19" fill="#dc7355" stroke="#dc7355"/><path d="M20.5 9H23" stroke="#dc7355" stroke-dasharray="1 1"/><circle cx="23" cy="9" r="1" fill="#dc7355"/></g></svg>`;
   if(!node.test(svg))throw new Error('Could not locate Seitentaste phone motif for targeted replacement.');
   svg=svg.replace(node,custom);
  }
  if(card.word==='ungefähr'){
   const mark='<g role="img" aria-label="approximately ten, not an exact value"><rect x="340" y="405" width="240" height="74" rx="24" fill="#fff3dc" stroke="#d78a24" stroke-width="3"/><text x="460" y="456" text-anchor="middle" font-family="Arial,sans-serif" font-size="44" font-weight="700" fill="#9b6013">≈ 10</text><text x="460" y="493" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#5d5648">YAKLAŞIK · KESİN DEĞİL</text></g>';
   svg=svg.slice(0,-6)+mark+'</svg>';
  }
  const filePath=path.join(assetDir,file);fs.writeFileSync(filePath,svg+'\n');row.sha256=hash(fs.readFileSync(filePath));
 }else if(previous)row.sha256=previous.sha256;
 return row;
}
let rows;
if(targetedMode){
 const oldRows=oldManifest.reviewedAssets;
 rows=oldRows.map((old,index)=>{
  if(!targetedWords.includes(old.word))return old;
  const card=missing.find(x=>x.word===old.word);if(!card)throw new Error(`Target disappeared from snapshot: ${old.word}`);
  return buildRow(card,index,true,old);
 });
 if(targetedWords.some(word=>!rows.some(row=>row.word===word)))throw new Error('Targeted scene row missing from old manifest.');
}else rows=missing.map((card,index)=>buildRow(card,index,true));
fs.writeFileSync(output,JSON.stringify({schemaVersion:1,archive:'wortgarten',version:'1.0.0',kind:'illustration',license,licenseUrl,author:'Wortgarten',sourceAttribution:attribution,reviewedAssets:rows},null,2)+'\n');
const licenseDest=path.join(assetDir,'LUCIDE-LICENSE.txt');if(!fs.existsSync(licenseDest))fs.copyFileSync(path.join(root,'node_modules/lucide-react/LICENSE'),licenseDest);

// Produce 12-up sheets for root's visual review, outside the application tree.
fs.mkdirSync(auditDir,{recursive:true});
const require=createRequire(import.meta.url),sharp=require('sharp');
const auditRows=targetedMode?targetedWords.map(word=>rows.find(row=>row.word===word)):rows;
const columns=4,rowsPerPage=3,perPage=12,cellW=375,cellH=320,pad=18,pageCount=Math.ceil(auditRows.length/perPage);
for(let page=0;page<pageCount;page++){
 const items=auditRows.slice(page*perPage,(page+1)*perPage);
 const pieces=[`<svg xmlns="http://www.w3.org/2000/svg" width="${columns*cellW}" height="${rowsPerPage*cellH}"><rect width="100%" height="100%" fill="#eef1ea"/>`];
 for(let i=0;i<items.length;i++){
  const item=items[i],x=(i%columns)*cellW,y=Math.floor(i/columns)*cellH,input=path.join(root,'public',item.path.slice(1)),temp=path.join(os.tmpdir(),`wortgarten-new-scene-${page}-${i}.png`);
  const converted=spawnSync('/usr/bin/sips',['-s','format','png','--resampleWidth','250',input,'--out',temp],{encoding:'utf8'});if(converted.status!==0)throw new Error(`sips failed: ${input}: ${converted.stderr}`);
  const png=fs.readFileSync(temp).toString('base64');fs.rmSync(temp,{force:true});
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  pieces.push(`<rect x="${x+8}" y="${y+8}" width="${cellW-16}" height="${cellH-16}" rx="16" fill="#fff" stroke="#bcc8bd"/><image href="data:image/png;base64,${png}" x="${x+pad}" y="${y+16}" width="${cellW-2*pad}" height="210" preserveAspectRatio="xMidYMid meet"/><text x="${x+pad}" y="${y+246}" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#253c33">${String(page*perPage+i+1).padStart(3,'0')} ${esc(item.word)}</text><text x="${x+pad}" y="${y+270}" font-family="Arial,sans-serif" font-size="14" fill="#385a51">${esc(item.meaning).slice(0,72)}</text><text x="${x+pad}" y="${y+292}" font-family="Arial,sans-serif" font-size="11" fill="#64746e">${esc(item.explanationTR).slice(0,110)}</text>`);
 }
 pieces.push('</svg>');const dest=path.join(auditDir,(targetedMode?'new-word-scenes-targeted-three.png':`new-word-scenes-${String(page+1).padStart(2,'0')}-of-${pageCount}.png`));await sharp(Buffer.from(pieces.join(''))).png().toFile(dest);console.log(dest);
}
console.log(targetedMode?'Updated only Flugmodus, Seitentaste, ungefähr and wrote a 3-row audit sheet.':`Wrote ${rows.length} new pending-review mnemonic diagrams; did not modify the existing 130-row archive.`);
