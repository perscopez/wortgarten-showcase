'use client';
import {useCardLanguage,writeCardLanguage,type CardLanguage} from '../lib/card-language';

const OPTIONS:[CardLanguage,string][]=[['de','Deutsch'],['tr','Türkçe']];
/** App language: German interface and explanations by default, Turkish on request. Stored on this device only. */
export default function CardLanguageSwitch({compact=false}:{compact?:boolean}){
 const lang=useCardLanguage();
 const label=lang==='de'?'Sprache':'Dil';
 if(compact)return <div className="card-language-toggle" data-no-translate role="group" aria-label={label}>{OPTIONS.map(([value])=><button type="button" key={value} aria-pressed={lang===value} title={value==='de'?'Alles auf Deutsch':'Her şeyi Türkçe göster'} onClick={()=>writeCardLanguage(value)}>{value.toUpperCase()}</button>)}</div>;
 return <div className="theme-switch card-language-switch" data-no-translate role="group" aria-label={label}><p className="rail-group" style={{padding:0}}>{label}</p><div className="swatches">
  {OPTIONS.map(([value,name])=><button type="button" key={value} aria-pressed={lang===value} onClick={()=>writeCardLanguage(value)}>{name}</button>)}
 </div></div>;
}
