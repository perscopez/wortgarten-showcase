'use client';
import {useEffect,useRef,useState} from 'react';
import {dailyPhoto,type DailyCard,type dailyMeaning} from '../lib/daily-vocabulary';
import type {Inflections} from '../lib/inflections';
import {getRection} from '../lib/rection';
import {readAloud,type SpokenLine} from '../lib/read-aloud';
import DailyWordPhoto from './daily-word-photo';
import WordResult from './word-result';
import {useCardLanguage,pick} from '../lib/card-language';

export default function DailyAnswer({card,info}:{card:DailyCard;info:NonNullable<ReturnType<typeof dailyMeaning>>}){
 const lang=useCardLanguage(),L=<T,>(g:T,t:T)=>pick(lang,g,t);
 const stop=useRef<(()=>void)|null>(null);
 const [reading,setReading]=useState<string|null>(null),[notice,setNotice]=useState('');
 const [extra,setExtra]=useState<Inflections|null>(null),[loading,setLoading]=useState(false);
 const lookup=useRef<AbortController|null>(null);
 const inflections=card.inflections?.tables.length?card.inflections:extra;
 async function loadTables(){const ctrl=new AbortController();lookup.current=ctrl;setLoading(true);setNotice('');try{
  const r=await fetch('/api/word-inflections?word='+encodeURIComponent(card.word),{signal:AbortSignal.any([ctrl.signal,AbortSignal.timeout(10000)])});
  if(!r.ok)throw Error();const data:Inflections=await r.json();if(data.tables.length)setExtra(data);else setNotice(L('Für dieses Wort gibt es im Wörterbuch keine belegte Formentabelle.','Bu sözcük için sözlükte doğrulanmış çekim tablosu bulunamadı.'));
 }catch{if(!ctrl.signal.aborted)setNotice(L('Tabellen konnten nicht geladen werden. Versuch es noch einmal.','Tablolar yüklenemedi. Yeniden dene.'));}finally{if(!ctrl.signal.aborted)setLoading(false);}}
 const rection=card.rection?.status==='known'?card.rection:getRection(card.word);
 useEffect(()=>()=>{stop.current?.();lookup.current?.abort();},[]);
 function stopReading(){stop.current?.();stop.current=null;setReading(null);}
 function sectionAudio(id:string,label:string,lines:SpokenLine[]){
  return <button type="button" className="text-button section-audio" aria-label={reading===id?label+L(' — stoppen',' — durdur'):label} onClick={()=>{
   stopReading();if(reading===id)return;setNotice('');
   const spoken=lines.filter(line=>line.text.trim());
   if(!spoken.length)return;
   try{setReading(id);stop.current=readAloud(spoken,()=>{stop.current=null;setReading(null);});}
   catch(e){setReading(null);setNotice(e instanceof Error?e.message:L('Vorlesen konnte nicht gestartet werden.','Sesli okuma başlatılamadı.'));}
  }}>{reading===id?L('Stopp','Durdur'):label}</button>;
 }
 return <div className="daily-answer-detail">
  {notice&&<p role="status">{notice}</p>}
  <WordResult compact collapseTables sectionAudio={sectionAudio} onTablesClosed={()=>{if(reading?.startsWith('table-'))stopReading()}} data={{...card,meaning:info.meaning,example:card.example||info.example,translation:card.example?card.translation:info.translation,rection,inflections}} media={<DailyWordPhoto photo={dailyPhoto(card)} word={card.word}/>}/>
  {!inflections&&<button type="button" className="text-button" disabled={loading} onClick={()=>void loadTables()}>{loading?L('Formen werden gesucht …','Çekimler aranıyor…'):L('Formentabelle im Wörterbuch suchen','Sözlükte çekim tablosu ara')}</button>}
  {(card.note||(card.meaning&&card.meaning!==info.meaning))&&<details className="word-result-inflections" onToggle={e=>{if(!e.currentTarget.open&&(reading==='original'||reading==='note'))stopReading()}}><summary>{L('Notizen zur Karte','Kart notları')}</summary>
  {card.meaning&&card.meaning!==info.meaning&&<section className="daily-other-gloss"><div className="word-result-audio-row"><h4>{L('Gespeicherte türkische Bedeutung','Kartta kayıtlı karşılık')}</h4>{sectionAudio('original',L('Anhören','Karşılığı dinle'),[{text:card.meaning,lang:'tr-TR'}])}</div><p>{card.meaning}</p></section>}
  {card.note&&<section className="daily-personal-note"><div className="word-result-audio-row"><h4>{L('Notiz','Kart notu')}</h4>{sectionAudio('note',L('Notiz anhören','Notu dinle'),[{text:card.note,lang:'tr-TR'}])}</div><p>{card.note}</p></section>}
  </details>}
 </div>;
}
