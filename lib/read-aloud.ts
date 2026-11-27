export type SpokenLine={text:string;lang:'de-DE'|'tr-TR'};
let activeStop:(()=>void)|null=null;
let activeUtterance:SpeechSynthesisUtterance|null=null;
/** Read one short utterance at a time; never queue work after Stop or unmount. */
export function readAloud(lines:SpokenLine[],finish:()=>void):()=>void{
 if(typeof window==='undefined'||!window.speechSynthesis||typeof SpeechSynthesisUtterance==='undefined')throw Error('Bu tarayıcı sesli okumayı desteklemiyor.');
 const synth=window.speechSynthesis;let stopped=false,index=0;
 if(activeStop){const prev=activeStop;activeStop=null;prev();}
 synth.cancel();
 const done=()=>{stopped=true;activeUtterance=null;if(activeStop===interrupt)activeStop=null;finish();};
 const interrupt=()=>{if(!stopped)done();};
 activeStop=interrupt;
 const next=()=>{
  if(stopped)return;const line=lines[index++];if(!line){done();return;}
  const u=new SpeechSynthesisUtterance(line.text);u.lang=line.lang;u.rate=.86;activeUtterance=u;
  const voice=synth.getVoices().find(v=>v.lang.toLowerCase().startsWith(line.lang.slice(0,2)));if(voice)u.voice=voice;
  u.onend=next;u.onerror=()=>{if(!stopped)done();};synth.speak(u);
 };
 next();return()=>{stopped=true;activeUtterance=null;if(activeStop===interrupt)activeStop=null;synth.cancel()};
}
