'use client';
import Reading from './reading';
import type {ReactNode} from 'react';
import type {SpokenLine} from '../lib/read-aloud';
import type {Inflections,InflectionTableData} from '../lib/inflections';
import {compactKind,compactFacts} from '../lib/compact-card';
import {candidatesFor} from '../lib/examples';
import SpeakButton from './speak-button';
import {rowsFor,type PersonalPattern} from '../lib/pattern-practice';
import type {RectionData,RectionPattern} from '../lib/rection';
import {useCardLanguage,pick,tableTitle,kindLabel} from '../lib/card-language';
import {useGermanMeaning} from '../lib/use-german-meaning';
import TurkishHint from './turkish-hint';
import CardLanguageSwitch from './card-language-switch';

type WordData={word?:unknown;meaning?:unknown;article?:unknown;plural?:unknown;partOfSpeech?:unknown;articleAmbiguous?:unknown;example?:unknown;translation?:unknown;patterns?:PersonalPattern[];inflections?:Inflections|null;rection?:RectionData|null;source?:unknown;[key:string]:unknown};
type Props={data:WordData;onSpeak?:(text:string)=>void;media?:ReactNode;collapseTables?:boolean;compact?:boolean;sectionAudio?:(id:string,label:string,lines:SpokenLine[])=>ReactNode;onTablesClosed?:()=>void};
const CASES=['Nominativ','Akkusativ','Dativ','Genitiv'] as const;
const GOVERNED=new Set<string>(['Akkusativ','Dativ','Genitiv']);
const GENDERS:Record<string,string>={der:'Maskulin',die:'Feminin',das:'Neutrum'};
/** Placeholder strings are not facts. Real text is always rendered through React escaping. */
function positive(value:unknown,allowYok=false):string{if(typeof value!=='string')return '';const text=value.trim();if(allowYok&&/^yok[.!]?$/iu.test(text))return text;return /^(?:[-—–?]+|∅|unknown|n\/a|not found|bulunamadı(?:\s*\/.*)?|bilinmiyor|uygulanmaz|bilgi bulunamadı|henüz alınmadı|yok)[.!]?$/iu.test(text)?'':text;}
function forms(value:unknown):string[]{return Array.isArray(value)?[...new Set(value.map(v=>positive(v)).filter(Boolean))]:[];}
function cleanTables(value:unknown):InflectionTableData[]{
 if(!Array.isArray(value))return[];
 return value.flatMap(raw=>{
  if(!raw||!Array.isArray(raw.rows))return[];
  const rows=raw.rows.filter((r:any)=>r&&Array.isArray(r.cells)).map((r:any)=>({label:positive(r.label),cells:r.cells.map(forms) as string[][]}));
  const width=Math.max(Array.isArray(raw.columns)?raw.columns.length:0,...rows.map((r:any)=>r.cells.length),0);
  const columns=Array.from({length:width},(_,i)=>i).filter(i=>rows.some((r:any)=>r.cells[i]?.length));
  if(!columns.length)return[];
  const populated=rows.filter((r:any)=>columns.some(i=>r.cells[i]?.length)).map((r:any)=>({label:r.label,cells:columns.map(i=>r.cells[i]||[])}));
  if(!populated.length)return[];
  return[{title:positive(raw.title),columns:columns.map(i=>positive(raw.columns?.[i])),rows:populated}];
 });
}
function knownPatterns(data:RectionData|null|undefined):RectionPattern[]{
 if(data?.status!=='known'||!Array.isArray(data.patterns))return[];
 const seen=new Set<string>();
 return data.patterns.flatMap(raw=>{
  const pattern=positive(raw?.pattern);const complements=Array.isArray(raw?.complements)?raw.complements.filter(c=>c&&GOVERNED.has(c.case)):[];
  if(!pattern||!complements.length)return[];
  const parts=Array.isArray(raw.example?.parts)?raw.example.parts.filter(p=>p&&positive(p.text)).map(p=>({text:p.text,...(GOVERNED.has(p.case||'')?{case:p.case}:{} )})):[];
  const key=JSON.stringify([pattern,complements.map(c=>[c.case,c.preposition,c.role]),parts]);if(seen.has(key))return[];seen.add(key);
  return[{...raw,pattern,complements,explanation:positive(raw.explanation),example:{parts,translation:positive(raw.example?.translation)},sources:Array.isArray(raw.sources)?raw.sources:[]}];
 });
}
function safeSources(data:WordData,patterns:RectionPattern[],sourceLabel='Sözlük kaynağı'){
 const all=[{label:sourceLabel,url:data.source},...(Array.isArray(data.inflections?.sources)?data.inflections!.sources:[]),...(data.inflections?.license?[data.inflections.license]:[]),...patterns.flatMap(p=>p.sources)];
 const seen=new Set<string>();return all.flatMap(source=>{const label=positive(source?.label),url=positive(source?.url);if(!label||!/^https?:\/\//i.test(url)||seen.has(url))return[];try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))return[];}catch{return[];}seen.add(url);return[{label,url}];});
}
/** Positive-only presentation; compact cards put longer tables behind an optional disclosure. */
export default function WordResult({data,onSpeak,media,collapseTables,compact,sectionAudio,onTablesClosed}:Props){

 const word=positive(data.word),meaning=positive(data.meaning,true),article=positive(data.article);
 const lang=useCardLanguage(),de=lang==='de',L=<T,>(g:T,t:T)=>pick(lang,g,t);
 // German cards explain the word in German; the saved Turkish meaning is shown (labelled) only when no German explanation exists.
 const german=useGermanMeaning(word,de);const meaningDE=de?german.meaning:'';const shownMeaning=meaningDE||meaning;const turkishFallback=de&&!meaningDE&&!german.loading&&!!meaning;
 const pos=positive(data.partOfSpeech).toLocaleLowerCase('de');const kind=compact?compactKind(word,pos):pos;const noun=kind==='noun'||kind==='substantiv'||((!kind||kind==='unknown')&&!!GENDERS[article]);
 const certainArticle=noun&&!data.articleAmbiguous&&GENDERS[article]?article:'';
 const gender=certainArticle?GENDERS[certainArticle]:'';
 const pluralText=noun&&!data.articleAmbiguous?positive(data.plural):'';const plural=pluralText&&!/^(?:kein(?:e[nr]?)? plural|ohne plural|nur singular|çoğul(?:u)? yok)$/iu.test(pluralText)?pluralText.replace(/^die\s+/i,'').trim():'';
 const singular=certainArticle&&word?certainArticle+' '+word.replace(new RegExp('^'+certainArticle+'\\s+','i'),''):'';
 const patterns=knownPatterns(data.rection),tables=cleanTables(data.inflections?.tables);
 const personal=data.patterns?.length?rowsFor({word,patterns:data.patterns}).filter(r=>r.id.startsWith('personal-')):[];
 const cases=[...new Set(tables.flatMap(table=>table.rows.flatMap(row=>CASES.filter(c=>new RegExp('^'+c+'(?:\\s|$|[·:–—-])','i').test(row.label)))))];

 const facts=compact?compactFacts(word,kind,tables,patterns):null;
 const shownPlural=plural||facts?.pluralOnly||'';
 const savedExample=positive(data.example);const fallback=!savedExample&&!facts?.example&&word?candidatesFor({word},{}).find(c=>c.tr)||candidatesFor({word},{})[0]:undefined;const example=savedExample||facts?.example?.[0]||fallback?.de||'',translation=savedExample?positive(data.translation):facts?.example?.[1]||fallback?.tr||(!compact?positive(data.translation):'');const knownType=pos==='verb'?L('Verb','Fiil'):pos==='adjective'||pos==='adjektiv'?L('Adjektiv','Sıfat'):noun?L('Nomen','İsim'):'';
 if(!word&&!meaning&&!patterns.length&&!tables.length&&!example&&!translation)return null;
 const sources=safeSources(data,patterns,L('Wörterbuchquelle','Sözlük kaynağı'));
 const TablesContainer=collapseTables?'details':'section';
 // Every example and pattern can be heard: the host page may provide its own player, otherwise a built-in button is used.
 const audio=(id:string,label:string,deText='',trText='')=>{const tr=de&&id!=='meaning'?'':trText;return sectionAudio?sectionAudio(id,label,[{text:deText,lang:'de-DE'},{text:tr,lang:'tr-TR'}]):deText.trim()?<SpeakButton de={deText} tr={tr} label={label||L('Anhören','Dinle')}/>:null;};
 const exampleBlock=(example||translation)&&<section className="word-result-example"><div className="word-result-audio-row"><h3>{compact&&kind==='adverb'?L('Im Satz','Cümlede kullanımı'):L('Beispielsatz','Örnek cümle')}</h3>{audio('example',L('Beispiel anhören','Örneği dinle'),example,translation)}</div>{example&&<p lang="de">{example}</p>}{example&&<Reading text={example} sentence card/>}{!de&&translation&&<p className="word-result-translation">{translation}</p>}</section>;
 return <section className={compact?'word-result word-result-compact':'word-result'} aria-label={L('Wortinformationen','Bulunan kelime bilgileri')}>
  <div className="card-language-row"><CardLanguageSwitch compact/></div>
  {(word||shownMeaning)&&<header className="word-result-header word-result-heading">
   {word&&<div className="word-result-audio-row"><h2 lang="de">{word}</h2>{audio('word',L('Wort anhören','Kelimeyi dinle'),singular||word)}</div>}{word&&<Reading text={singular||word} card/>}
   {shownMeaning&&<div className="word-result-audio-row"><p className="word-result-meaning" lang={meaningDE?'de':'tr'}>{turkishFallback&&<span className="meaning-fallback" lang="de">Türkische Bedeutung</span>}{shownMeaning}</p>{audio('meaning',L('Bedeutung anhören','Anlamı dinle'),meaningDE,meaningDE?'':shownMeaning)}</div>}{meaningDE&&meaning&&<TurkishHint key={word} meaning={meaning}/>}
   {onSpeak&&word&&<button type="button" className="text-button word-result-audio" aria-label={L('Deutsche Aussprache anhören','Kelimenin Almanca telaffuzunu dinle')} onClick={()=>onSpeak(singular||word)}>{L('Anhören','Dinle')}</button>}
  </header>}
  {compact?facts?.type&&<p className="micro">{kindLabel(lang,facts.type)}</p>:gender?<section className="word-result-gender"><h3>{L('Genus','Artikel türü')}</h3><p className={'word-result-gender-value noun-'+certainArticle} title={L('Grammatisches Geschlecht, nicht biologisches.','Dilbilgisel cinsiyet; biyolojik cinsiyet göstermez.')}>{gender}</p></section>:knownType&&<section className="word-result-type"><h3>{L('Wortart','Sözcük türü')}</h3><p>{knownType}</p></section>}
  {(singular||shownPlural)&&<dl className="word-result-noun">{singular&&<div><dt>{L('Singular','Tekil')}{audio('singular',L('Singular anhören','Tekili dinle'),singular)}</dt><dd lang="de" className={'noun-'+certainArticle}>{singular}</dd></div>}{shownPlural&&<div><dt>{L('Plural','Çoğul')}{audio('plural',L('Plural anhören','Çoğulu dinle'),'die '+shownPlural)}</dt><dd lang="de">die {shownPlural}</dd></div>}</dl>}
  {!!facts?.verb.length&&<dl className="word-result-noun">{facts.verb.map(([label,value])=><div key={label}><dt>{label}{label!=='Infinitiv'&&' · er/sie/es'}{audio('verb-'+label,label+L(' anhören',' biçimini dinle'),value)}</dt><dd lang="de">{value}</dd></div>)}</dl>}
  {!!facts?.patterns.length&&<section className="word-result-rection"><div className="word-result-audio-row"><h3>{kind==='adjective'&&facts.patterns.some(p=>/ \+ |\((Akkusativ|Dativ|Genitiv)\)/.test(p.de))?L('Präpositionen dazu','Birlikte kullanıldığı edatlar'):L('Wendungen','Kullanım kalıpları')}</h3>{audio('compact-patterns',L('Wendungen anhören','Kalıpları dinle'),facts.patterns.map(p=>p.de).join('. '),facts.patterns.map(p=>p.tr).filter(Boolean).join('. '))}</div><ul className="word-result-patterns">{facts.patterns.map(pattern=><li key={pattern.de}><span lang="de" className="pattern-de">{pattern.de}</span>{!de&&pattern.tr&&<span lang="tr" className="pattern-tr">{pattern.tr}</span>}{pattern.example&&<span className="pattern-example"><span lang="de">{pattern.example.de}</span>{!de&&<> <span lang="tr">{pattern.example.tr}</span></>}</span>}</li>)}</ul></section>}
  {facts?.synonym&&<section><div className="word-result-audio-row"><h3>{L('Ähnliche Bedeutung','Yakın anlam / açıklama')}</h3>{audio('synonym',L('Anhören','Yakın anlamı dinle'),facts.synonym.replace(/ \(.*\)$/,''))}</div><p>{facts.synonym}</p></section>}
  {media}
  {!!personal.length&&<section className="word-result-rection">
   <h3>{L('Eigene Wendungen','Kişisel kalıplar')}</h3>
   {personal.map(row=><article className="word-result-pattern" key={row.id}>
    <div className="word-result-audio-row"><h4 lang="de">{row.de}</h4>{audio(row.id,L('Wendung anhören','Kalıbı dinle'),row.phrase)}</div>
    {!de&&<p lang="tr">{row.tr}</p>}
   </article>)}
  </section>}
  {!compact&&patterns.length>0&&<section className="word-result-rection"><h3>{L('Ergänzungen und Fälle','Tamlayıcı hâlleri')}</h3>{patterns.map((pattern,index)=><article className="result-pattern word-result-pattern" key={index}><div className="word-result-audio-row"><h4 lang="de">{pattern.pattern}</h4>{audio('pattern-'+index,L('Wendung anhören','Kalıbı dinle'),[pattern.pattern,pattern.example.parts.map(p=>p.text).join('')].join('. '),[pattern.explanation,pattern.example.translation].filter(Boolean).join(' '))}</div><ul className="result-case-tags">{pattern.complements.map((c,i)=><li key={i}><b>{c.case}</b>{positive(c.preposition)&&<> · <span lang="de">{positive(c.preposition)}</span></>}{!de&&positive(c.role)&&<> · {positive(c.role)}</>}</li>)}</ul>{!de&&pattern.explanation&&<p>{pattern.explanation}</p>}{pattern.example.parts.length>0&&<p lang="de" className="word-result-pattern-example">{pattern.example.parts.map((part,i)=>part.case?<mark className={'word-result-case word-result-case-'+part.case.toLowerCase()} title={part.case} key={i}>{part.text}</mark>:<span key={i}>{part.text}</span>)}</p>}{!de&&pattern.example.translation&&<p className="word-result-translation">{pattern.example.translation}</p>}</article>)}</section>}
  {compact&&exampleBlock}
  {tables.length>0&&<TablesContainer className="word-result-inflections" onToggle={collapseTables?e=>{if(!(e.currentTarget as HTMLDetailsElement).open)onTablesClosed?.()}:undefined}>{collapseTables?<summary>{L('Formentabellen','Çekim tabloları')} <span className="micro">({tables.length})</span></summary>:<h3>{L('Formentabellen','Çekim tabloları')}</h3>}{tables.map((table,index)=><div className="word-result-table" key={index}><div className="word-result-audio-row">{table.title&&<h4>{tableTitle(lang,table.title)}</h4>}{sectionAudio?.('table-'+index,L('Tabelle anhören','Tabloyu dinle'),table.rows.flatMap(row=>row.cells.some(c=>c.length)?[{lang:'de-DE',text:[row.label,...row.cells.flatMap((c,i)=>c.length?[table.columns[i],...c]:[])].filter(Boolean).join('. ')}]:[]))}</div><div className="word-table-scroll word-result-table-scroll" role="region" aria-label={(tableTitle(lang,table.title)||L('Formen','Çekim biçimleri'))+L(' · seitlich scrollbar',' · yana kaydırılabilir')} tabIndex={0} style={{maxWidth:'100%',overflowX:'auto'}}><table>{table.title&&<caption className="sr-only">{tableTitle(lang,table.title)}</caption>}<thead><tr><th scope="col">{L('Fall / Person','Hâl / kişi')}</th>{table.columns.map((column,i)=><th scope="col" key={i}>{column}</th>)}</tr></thead><tbody>{table.rows.map((row,ri)=><tr key={ri}><th scope="row">{row.label}</th>{row.cells.map((cell,ci)=><td lang="de" key={ci}>{cell.join(' / ')}</td>)}</tr>)}</tbody></table></div></div>)}</TablesContainer>}
  {!compact&&cases.length>0&&<section className="word-result-cases"><h3>{L('Fälle','Hâl bilgisi')}</h3><p>{L('In den Formen vorkommende Fälle: ','Çekimde görülen hâller: ')}{CASES.filter(c=>cases.includes(c)).join(' · ')}</p></section>}
  {!compact&&exampleBlock}
  {sources.length>0&&<footer className="word-result-sources">{sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a>)}</footer>}
 </section>;
}
