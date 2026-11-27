'use client';
import {turkishReading,turkishReadingSentence} from '../lib/pronunciation';
import {useCardLanguage} from '../lib/card-language';

/** "okunuşu: şule" under a German word; renders nothing when no reading is available. On word cards (card) it follows the card language: German cards leave out this Turkish aid. */
export default function Reading({text,className='reading',sentence=false,card=false}:{text:string;className?:string;sentence?:boolean;card?:boolean}){
 const lang=useCardLanguage();
 if(card&&lang==='de')return null;
 const r=sentence?turkishReadingSentence(text):turkishReading(text);
 return r?<span className={className} lang="tr" title="Türkçe harflerle yaklaşık okunuş">okunuşu: <b>{r}</b></span>:null;
}
