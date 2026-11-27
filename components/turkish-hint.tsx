'use client';
import {useState} from 'react';

/**
 * On German cards: the saved Turkish meaning behind one tap, for when the German explanation is not enough.
 * Hidden again on the next card (state lives with the card). Renders nothing without a Turkish meaning.
 */
export default function TurkishHint({meaning}:{meaning:string}){
 const [open,setOpen]=useState(false);
 if(!meaning?.trim())return null;
 return <span className="turkish-hint" data-no-translate>
  <button type="button" className="text-button" aria-expanded={open} onClick={()=>setOpen(o=>!o)}>{open?'Türkçe ipucunu gizle':'Türkçe ipucu'}</button>
  {open&&<span lang="tr">{meaning}</span>}
 </span>;
}
