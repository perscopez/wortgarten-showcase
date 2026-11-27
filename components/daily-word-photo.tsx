'use client';
import {visualSourceLink} from '../lib/visual-source-link';
import {useState} from 'react';
import {libraryImageKind,libraryImageKindDE,type LibraryPhoto} from './library-images';
import {useCardLanguage} from '../lib/card-language';
/** Mounted only after recall. URL key isolates loading failures between cards. */
export default function DailyWordPhoto({photo,word}:{photo?:LibraryPhoto;word:string}){
 if(!photo?.url)return null;
 return <Photo key={photo.url} photo={photo} word={word}/>;
}
function Photo({photo,word}:{photo:LibraryPhoto;word:string}){
 const de=useCardLanguage()==='de',L=(g:string,t:string)=>de?g:t;
 const [failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0),[visible,setVisible]=useState(true);
 return <figure className="daily-word-photo"><button className="text-button" type="button" aria-expanded={visible} onClick={()=>setVisible(!visible)}>{visible?L('Bild ausblenden','Görseli gizle'):L('Bild zeigen','Görseli göster')}</button>{visible&&<>{failed?<div role="status"><p>{L('Bild konnte nicht geladen werden.','Görsel yüklenemedi.')}</p><button className="secondary" type="button" onClick={()=>{setAttempt(attempt+1);setFailed(false)}}>{L('Erneut versuchen','Yeniden dene')}</button></div>:<img key={attempt} src={photo.url} alt={photo.title||L('Bild zu '+word,word+' için seçilen görsel')} decoding="async" onError={()=>setFailed(true)}/>}<figcaption><small>{de?libraryImageKindDE(photo):libraryImageKind(photo)}</small><details><summary>{L('Bildquelle und Lizenz','Görsel kaynağı ve lisansı')}</summary><p>{photo.attribution||photo.author}</p>{!de&&photo.explanationTR&&<p>{photo.explanationTR}</p>}{photo.source&&<a href={visualSourceLink(photo.source)} target="_blank" rel="noopener noreferrer">{L('Quelle','Kaynak')}</a>}{photo.source&&photo.licenseUrl&&' · '}{photo.licenseUrl?<a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license||L('Lizenz','Lisans')}</a>:photo.license&&<span>{photo.license}</span>}</details></figcaption></>}</figure>;
}
