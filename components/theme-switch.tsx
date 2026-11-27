'use client';
import {useEffect,useState} from 'react';

const KEY='wortgarten-palette';
const apply=(p:string)=>{if(p==='rose')document.documentElement.dataset.palette='rose';else delete document.documentElement.dataset.palette;};
/** Two palettes: the academic blue (default) and a soft rose. Stored on this device only. */
export default function ThemeSwitch(){
 const [palette,setPalette]=useState('academic');
 useEffect(()=>{try{setPalette(localStorage.getItem(KEY)==='rose'?'rose':'academic');}catch{/* private mode */}},[]);
 function choose(p:string){setPalette(p);apply(p);try{localStorage.setItem(KEY,p);}catch{/* private mode */}}
 return <div className="theme-switch" role="group" aria-label="Tema"><p className="rail-group" style={{padding:0}}>Tema</p><div className="swatches">
  <button type="button" aria-pressed={palette==='academic'} onClick={()=>choose('academic')}><i style={{background:'#1f3a5f'}}/>Akademik</button>
  <button type="button" aria-pressed={palette==='rose'} onClick={()=>choose('rose')}><i style={{background:'#a8345f'}}/>Pembe</button>
 </div></div>;
}
