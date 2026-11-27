'use client';
import Reading from './reading';
import SpeakButton from './speak-button';
import {RotateCcw,Volume2} from 'lucide-react';
import {ARTICLE_CUES,isArticle} from '../lib/article-memory';
import {InflectionTable} from './inflection-table';
import type {Inflections} from '../lib/inflections';
import {RectionInfo} from './rection-info';
import {getRection,type RectionData} from '../lib/rection';
import {useCardLanguage,pick,tableTitle} from '../lib/card-language';
import {useGermanMeaning} from '../lib/use-german-meaning';
import TurkishHint from './turkish-hint';
import {maskWord} from '../lib/german-meaning';
import CardLanguageSwitch from './card-language-switch';
type Card={rection?:RectionData;inflections?:Inflections;word:string;article:string;plural:string;meaning:string;example:string;translation:string;photo?:{url:string;source:string;author:string;license:string;licenseUrl?:string;kind?:'photo'|'illustration'|'image';archive?:'openmoji'|'twemoji'|'wortgarten'|'wikimedia';attribution?:string;explanationTR?:string}};
type Props={card:Card;reverse:boolean;reveal:boolean;onReveal:()=>void;onSpeak:(text:string)=>void};
export default function ReviewCard({card,reverse,reveal,onReveal,onSpeak}:Props){
 const lang=useCardLanguage(),de=lang==='de';
 const german=useGermanMeaning(card.word,de);
 // German mode explains the word in German; while none is known, the saved Turkish meaning stays visible and is labelled.
 const meaningDE=de?german.meaning:'';
 const fallback=de&&!meaningDE&&!german.loading;
 const meaning=meaningDE||card.meaning;
 const liveRection=getRection(card.word);
 const rection=card.rection?.status==='known'?card.rection:liveRection.status==='known'?liveRection:card.rection;
 const archiveName=card.photo?.archive==='twemoji'?'Twemoji':'OpenMoji';
 const imageKind=card.photo?.kind==='illustration'?(card.photo.archive==='wortgarten'?pick(lang,'Lernskizze · Wortgarten','Eğitsel şema · Wortgarten'):`${pick(lang,'Illustration','Çizim')} · ${archiveName}`):card.photo?.kind==='photo'?pick(lang,'Foto','Fotoğraf'):pick(lang,'Wikimedia-Bild','Wikimedia görseli');
 const meaningLabel=fallback?<span className="meaning-fallback" lang="de">Türkische Bedeutung</span>:null;
 return <div className={'flashcard '+(reverse?'reverse-card':'')}>
  <div className="card-language-row"><CardLanguageSwitch compact/></div>
  <span className="eyebrow">{reveal?pick(lang,'ANTWORT UND VERWENDUNG','CEVAP VE KULLANIMI'):reverse?pick(lang,'WELCHES WORT IST GEMEINT?','ALMANCASINI HATIRLAYABİLİR MİSİN?'):pick(lang,'WEISST DU, WAS ES BEDEUTET?','TÜRKÇE ANLAMINI HATIRLIYOR MUSUN?')}</span>
  {(!reverse||reveal)&&<button className="flash-audio" aria-label={pick(lang,'Deutsche Aussprache anhören','Almanca telaffuzu dinle')} onClick={()=>onSpeak(card.article+' '+card.word)}><Volume2 size={22}/></button>}
  {reverse?<div className="flash-prompt"><small>{de?(meaningDE?'Bedeutung':'Türkisch'):'Türkçe'}</small><h2 lang={meaningDE?'de':'tr'}>{meaningDE?maskWord(meaningDE,card.word):card.meaning}</h2></div>:<div className={'flash-word '+card.article}><small>{isArticle(card.article)&&<span aria-hidden="true">{ARTICLE_CUES[card.article].symbol} </span>}{card.article}</small><h2>{card.word}</h2></div>}
  {reveal?<div className="answer">
   {reverse?<div className={'flash-word answer-word '+card.article}><small>{isArticle(card.article)&&<span aria-hidden="true">{ARTICLE_CUES[card.article].symbol} </span>}{card.article}</small><h2>{card.word}</h2><Reading text={card.word} card/></div>:<><p className="meaning" lang={meaningDE?'de':'tr'}>{meaningLabel}{meaning}</p>{meaningDE&&<TurkishHint key={card.word} meaning={card.meaning}/>}</>}
   {card.plural&&<p className="plural">{pick(lang,'Plural','Çoğul')}: die {card.plural}</p>}
   {card.photo&&<img src={card.photo.url} alt={pick(lang,'Bild zu '+card.word,card.word+' için seçilen görsel')} loading="lazy" width={460} height={270} className="review-photo" data-kind={card.photo.kind} data-archive={card.photo.archive} onError={e=>{e.currentTarget.style.display='none'}}/>}
   {card.example&&<blockquote><p lang="de">{card.example}</p>{!de&&<small>{card.translation}</small>} <SpeakButton de={card.example} tr={de?'':card.translation} label={pick(lang,'Satz anhören','Cümleyi dinle')}/></blockquote>}
   {!de&&card.photo?.explanationTR&&<p className="micro">{card.photo.explanationTR}</p>}{card.photo&&<><p className="photo-credit"><b>{imageKind}</b> · {card.photo.attribution||card.photo.author||card.word}</p>{card.photo.source&&<a className="photo-credit" target="_blank" rel="noreferrer" href={card.photo.source}>{pick(lang,'Quelle','Kaynak')}: {card.photo.archive||'Commons'}</a>}{card.photo.licenseUrl&&<a className="photo-credit" target="_blank" rel="noreferrer" href={card.photo.licenseUrl}>{pick(lang,'Lizenz','Lisans')}: {card.photo.license}</a>}</>}
   {rection&&<details className="review-inflections"><summary>{pick(lang,'Welche Ergänzung, welcher Fall?','Hangi tamlayıcı, hangi hâl?')} {rection.status==='known'&&`(${[...new Set(rection.patterns.flatMap(p=>p.complements.map(c=>c.preposition?`${c.preposition} + ${c.case}`:c.case)))].join(' · ')})`}</summary><RectionInfo data={rection} lang={lang}/></details>}
   {card.inflections&&<details className="review-inflections"><summary>{pick(lang,'Formentabelle öffnen','Çekim tablosunu aç')}</summary><InflectionTable data={{...card.inflections,tables:card.inflections.tables.map(t=>({...t,title:tableTitle(lang,t.title)}))}} lang={lang}/></details>}
  </div>:<button className="secondary reveal" onClick={onReveal}>{reverse?pick(lang,'Deutsches Wort zeigen','Almancasını göster'):pick(lang,'Bedeutung zeigen','Anlamını göster')} <RotateCcw size={16}/></button>}
 </div>
}
