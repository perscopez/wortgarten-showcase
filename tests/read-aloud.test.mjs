import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {buildSync} from 'esbuild';
test('German and Turkish utterances run in order and Stop cancels further table rows',()=>{
 const spoken=[];let canceled=0,finished=0;const synth={speak:u=>spoken.push(u),cancel:()=>canceled++,getVoices:()=>[{lang:'de-DE'},{lang:'tr-TR'}]};
 class Utterance{constructor(text){this.text=text}}
 const module={exports:{}};vm.runInNewContext(buildSync({entryPoints:['lib/read-aloud.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,{module,exports:module.exports,window:{speechSynthesis:synth},SpeechSynthesisUtterance:Utterance});
 const lines=[{text:'Ich bin zu Hause.',lang:'de-DE'},{text:'Evdeyim.',lang:'tr-TR'},{text:'ich. Präsens. bin.',lang:'de-DE'}];
 const stop=module.exports.readAloud(lines,()=>finished++);
 assert.equal(spoken[0].lang,'de-DE');spoken[0].onend();assert.equal(spoken[1].voice.lang,'tr-TR');spoken[1].onend();assert.equal(spoken[2].text,lines[2].text);
 stop();spoken[2].onend();assert.equal(spoken.length,3);assert.equal(finished,0);assert.equal(canceled,2);
 module.exports.readAloud(lines.slice(0,1),()=>finished++);spoken[3].onend();assert.equal(finished,1);
});
