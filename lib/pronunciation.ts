/**
 * Approximate Turkish reading of a German word, for learners who read Turkish letters faster than IPA.
 * Rule based left-to-right transliteration: a guide, not a dictionary (stress and some loanwords are not handled).
 */
const V='aeiouyäöü';
const isV=(c:string|undefined)=>!!c&&V.includes(c);
const PREFIXES=['zusammen','zurück','wieder','wider','unter','durch','über','miss','auf','aus','ein','ent','emp','ver','vor','zer','mit','nach','bei','ab','an','be','er','ge','um','zu'];
function isOnset(w:string,i:number):boolean{
 if(i===0)return true;
 const pre=w.slice(0,i);
 return PREFIXES.some(p=>pre===p||(pre.startsWith(p)&&PREFIXES.includes(pre.slice(p.length))));
}
function isSilentH(w:string,i:number):boolean{
 const prev=w[i-1],next=w[i+1];
 if(!isV(prev))return false;
 if((prev==='u'&&(w[i-2]==='a'||w[i-2]==='e'||w[i-2]==='ä'))||((prev==='i'||prev==='y')&&(w[i-2]==='e'||w[i-2]==='a')))return false;
 if(w.slice(i).startsWith('heit')||w.slice(i).startsWith('haft'))return false;
 if(isOnset(w,i)&&isV(next)&&w.slice(i+1).length>=3)return false;
 if(!next||!'aeiouyäöü'.includes(next))return true;
 return (next==='e'||next==='i')&&w.length-i<=3;
}
function word(raw:string):string{
 const w=raw.normalize('NFC').toLocaleLowerCase('de');
 let out='';
 for(let i=0;i<w.length;){
  const rest=w.slice(i),prev=w[i-1],next=w[i+1];
  const m=(s:string)=>rest.startsWith(s);
  const take=(s:string,to:string)=>{out+=to;i+=s.length;};
  if(m('tsch')&&prev==='r'){out+='t';i++;}
  else if(m('tsch'))take('tsch','ç');
  else if(m('sch'))take('sch','ş');
  else if(isOnset(w,i)&&m('sp'))take('s','ş');
  else if(isOnset(w,i)&&m('st'))take('s','ş');
  else if(m('chs'))take('chs','ks');
  else if(m('ch'))take('ch',(prev&&'aou'.includes(prev)&&!(prev==='u'&&(w[i-2]==='e'||w[i-2]==='ä')))?'h':'ş');
  else if(m('ph'))take('ph','f');
  else if(m('th'))take('th','t');
  else if(m('ck'))take('ck','k');
  else if(m('dt'))take('dt','t');
  else if(m('qu'))take('qu','kv');
  else if(m('tz'))take('tz','ts');
  else if(m('ss')||m('ß'))take(m('ß')?'ß':'ss','s');
  else if(m('eu')||m('äu'))take('eu','oy');
  else if(m('ei')||m('ai')||m('ey')||m('ay'))take('ei','ay');
  else if(m('au'))take('au','av');
  else if(m('ie'))take('ie','i');
  else if(w[i]==='h'&&i>0&&isSilentH(w,i))i++;
  else if(w[i]==='x')take('x','ks');
  else if(w[i]==='z')take('z','ts');
  else if(w[i]==='w')take('w','v');
  else if(w[i]==='j')take('j','y');
  else if(w[i]==='y')take('y','ü');
  else if(w[i]==='ä')take('ä','e');
  else if(w[i]==='s'&&isV(next))take('s','z');
  else if(w[i]==='v')take('v',i===0||!isV(prev)||!isV(next)?'f':'v');
  else if(w[i]==='c')take('c','k');
  else if(w[i]===prev&&!isV(w[i])&&/[a-z]/.test(w[i]))i++;// double consonant
  else{out+=w[i];i++;}
 }
 const reduceEnding=![/^hotel$/,/eh(er|el)$/,/(rr|nn|ll)$/,/^[^aeiouyäöü]*[aeiouyäöü]+h?(r|n|l)$/].some(rx=>rx.test(w));
 if(reduceEnding)out=out.replace(/er$/,'ır').replace(/en$/,'ın').replace(/el$/,'ıl');
 return out.replace(/ig$/,'iş').replace(/(?<![gn])g$/,'k').replace(/b$/,'p').replace(/d$/,'t').replace(/(?<=[a-zçşöü])(?<!^)ınn$/,'ın');
}
const ARTICLE:Record<string,string>={der:'der',die:'di',das:'das',den:'den',dem:'dem',ein:'ayn',eine:'ayne',sich:'ziş'};
/** Reading of a whole sentence: punctuation is dropped, every word is kept (up to 16). */
export function turkishReadingSentence(text:string):string{
 const tokens=text.replace(/[.,!?;:„“”"()«»…–—/]/g,' ').split(/\s+/).filter(Boolean);
 if(!tokens.length||tokens.length>16||tokens.some(t=>!/^[\p{L}'’-]+$/u.test(t)))return '';
 const out=tokens.map(t=>ARTICLE[t.toLocaleLowerCase('de')]??word(t)).join(' ');
 return out===tokens.join(' ').toLocaleLowerCase('de')?'':out;
}
/** Reading of a word or short phrase, e.g. "die Wirtschaft" → "di virtşaft". Returns '' when no useful reading exists. */
export function turkishReading(text:string):string{
 const clean=text.replace(/\([^)]*\)/g,' ').replace(/[·,;].*$/,'').replace(/\//g,' ').trim();
 if(!clean||/\d|…|\.\.\./.test(clean))return '';
 const tokens=clean.split(/\s+/).filter(Boolean);
 if(tokens.length>6||tokens.some(t=>!/^[\p{L}'’-]+$/u.test(t)))return '';
 const out=tokens.map(t=>ARTICLE[t.toLocaleLowerCase('de')]??word(t)).join(' ');
 return out===tokens.join(' ').toLocaleLowerCase('de')?'':out;
}
