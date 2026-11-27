/** Own A2 mini-test in the four skills of the Goethe-Zertifikat. Written for this app: not an official exam and not its tasks. */
import {READINGS,type ReadingQuestion} from './readings';
export type ListenItem={id:string;title:string;de:string;questions:ReadingQuestion[]};
export const EXAM_READING=['wochenende','arzt'].map(id=>READINGS.find(r=>r.id===id)!);
export const EXAM_LISTENING:ListenItem[]=[
 {id:'bus',title:'Am Busbahnhof',de:'Entschuldigung, wann fährt der nächste Bus zum Bahnhof? Der nächste Bus fährt um 14.20 Uhr. Und wie lange dauert die Fahrt? Ungefähr zwanzig Minuten. Danke schön!',
  questions:[{q:'Wohin will die Person fahren?',options:['Zum Flughafen','Zum Bahnhof','Zur Schule'],answer:1},{q:'Wann fährt der Bus?',options:['Um 14.20 Uhr','Um 12.40 Uhr','Um 16.00 Uhr'],answer:0},{q:'Wie lange dauert die Fahrt?',options:['Zwei Stunden','Fünf Minuten','Ungefähr zwanzig Minuten'],answer:2}]},
 {id:'durchsage',title:'Durchsage im Geschäft',de:'Achtung, eine Durchsage für unsere Kunden: Das Geschäft schließt in zehn Minuten. Bitte gehen Sie jetzt zur Kasse. Morgen sind wir ab neun Uhr wieder für Sie da.',
  questions:[{q:'Was passiert in zehn Minuten?',options:['Das Geschäft öffnet.','Das Geschäft schließt.','Es gibt Rabatt.'],answer:1},{q:'Was sollen die Kunden tun?',options:['Zur Kasse gehen','Nach Hause fahren','Auf den Chef warten'],answer:0},{q:'Wann ist das Geschäft morgen wieder offen?',options:['Ab acht Uhr','Ab neun Uhr','Ab zehn Uhr'],answer:1}]},
 {id:'nachricht',title:'Nachricht auf dem Handy',de:'Hallo Lena, hier ist Mark. Ich kann heute leider nicht zum Sport kommen, weil ich arbeiten muss. Wollen wir uns am Freitag um sieben Uhr im Café treffen? Ruf mich bitte zurück.',
  questions:[{q:'Warum kommt Mark nicht zum Sport?',options:['Er ist krank.','Er muss arbeiten.','Er hat keine Zeit am Wochenende.'],answer:1},{q:'Wo wollen sie sich treffen?',options:['Im Café','Im Park','Im Kino'],answer:0},{q:'Was soll Lena tun?',options:['Ihn zurückrufen','Ihm schreiben','Zum Sport gehen'],answer:0}]},
];
export type WritingTask={id:string;title:string;prompt:string;points:string[];minWords:number;maxWords:number};
export const EXAM_WRITING:WritingTask[]=[
 {id:'krank',title:'E-Mail an einen Freund',prompt:'Du bist krank und kannst nicht zu Marks Geburtstagsfeier kommen. Schreibe ihm eine E-Mail.',points:['Warum du nicht kommen kannst','Was du jetzt machst','Wann ihr euch wiedersehen könnt'],minWords:30,maxWords:60},
 {id:'wohnung',title:'Nachricht an die Vermieterin',prompt:'Die Heizung in deiner Wohnung funktioniert nicht. Schreibe der Vermieterin eine kurze Nachricht.',points:['Was das Problem ist','Seit wann es das Problem gibt','Was du von ihr möchtest'],minWords:30,maxWords:60},
];
export type SpeakingCard={id:string;title:string;prompt:string;points:string[]};
export const EXAM_SPEAKING:SpeakingCard[]=[
 {id:'vorstellen',title:'Sich vorstellen',prompt:'Stelle dich vor. Sprich etwa eine Minute.',points:['Name und Herkunft','Wohnort','Beruf oder Studium','Hobbys']},
 {id:'restaurant',title:'Einen Tisch reservieren',prompt:'Du rufst im Restaurant an und reservierst einen Tisch. Sprich so, als wäre der Anruf echt.',points:['Für wie viele Personen','An welchem Tag und um wie viel Uhr','Eine besondere Bitte (z. B. am Fenster)','Name und Telefonnummer']},
];
export const EXAM_NOTICE='Bu, Goethe-Zertifikat A2’nin dört becerisine (okuma, dinleme, yazma, konuşma) benzeyen kendi yazdığımız bir mini testtir. Resmî sınav değildir ve resmî görevleri içermez. Gerçek format, süre ve puanlama için goethe.de’deki model sınavlara bak.';
