import {FEEDBACK_INSTRUCTIONS,feedbackInput,parseFeedback,type Feedback} from './siwc';

/**
 * AI sentence check with the learner's own OpenAI API key, called straight from the browser.
 * The key is kept only in this browser (localStorage); nothing goes through this site's server.
 */
export const AI_KEY_STORAGE='wortgarten-ai-key-v1';
export type AiKeySettings={key:string;model:string};
const API='https://api.openai.com/v1';
const NOT_CHAT=/embedding|whisper|tts|dall-e|image|audio|realtime|moderation|transcribe|search|computer|codex|davinci|babbage|sora|video|deep-research|instruct|^ft:/i;

export function parseSettings(raw:string|null):AiKeySettings|null{
 try{const v=JSON.parse(raw||'null');return v&&typeof v.key==='string'&&/^sk-[\w-]{16,}$/.test(v.key.trim())&&typeof v.model==='string'&&v.model.trim().length>0?{key:v.key.trim(),model:v.model.trim().slice(0,80)}:null;}catch{return null;}
}
export const validKey=(key:string)=>/^sk-[\w-]{16,}$/.test(key.trim());
export function chatModels(ids:string[]){return [...new Set(ids)].filter(id=>!NOT_CHAT.test(id)).sort();}
export async function listModels(key:string,f:typeof fetch=fetch):Promise<string[]>{
 const res=await f(API+'/models',{headers:{Authorization:'Bearer '+key.trim()},signal:AbortSignal.timeout(10000)});
 if(!res.ok)throw new AiDirectError(res.status===401?'invalid_key':'models_failed',res.status);
 const data=await res.json() as {data?:{id?:string}[]};
 return chatModels((data.data||[]).map(m=>m.id||'').filter(Boolean));
}
export class AiDirectError extends Error{constructor(public code:string,public status=0){super(code);}}
export const DIRECT_ERRORS:Record<string,string>={
 invalid_key:'API anahtarı geçersiz görünüyor. Anahtarı kontrol et.',
 insufficient_quota:'API hesabında kredi/kota yok. OpenAI hesabındaki ödeme ve limit ayarlarına bak.',
 rate_limit_exceeded:'Çok sık istek gönderildi. Biraz bekleyip tekrar dene.',
 model_not_found:'Seçili model bu anahtarla kullanılamıyor. Başka bir model seç.',
 network:'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.',
 unreadable:'Yapay zekâ cevabı okunamadı. Tekrar dene.',
};
export function outputText(json:unknown):string{
 const v=json as {output_text?:unknown;output?:{type?:string;content?:{type?:string;text?:string}[]}[]};
 if(typeof v?.output_text==='string')return v.output_text;
 return (v?.output||[]).flatMap(o=>o.type==='message'||!o.type?(o.content||[]):[]).filter(c=>c.type==='output_text'&&typeof c.text==='string').map(c=>c.text).join('');
}
export async function checkWithKey(s:AiKeySettings,sentence:string,phrase:string,tr:string,f:typeof fetch=fetch):Promise<Feedback>{
 if(!s.model)throw new AiDirectError('model_not_found');
 let res:Response;
 try{
  res=await f(API+'/responses',{method:'POST',headers:{Authorization:'Bearer '+s.key,'Content-Type':'application/json'},body:JSON.stringify({model:s.model,instructions:FEEDBACK_INSTRUCTIONS,input:feedbackInput(sentence.slice(0,300),phrase.slice(0,160),tr.slice(0,160)),store:false}),signal:AbortSignal.timeout(45000)});
 }catch{throw new AiDirectError('network');}
 if(!res.ok){const err=await res.json().catch(()=>({})) as {error?:{code?:string;type?:string}};throw new AiDirectError(res.status===401?'invalid_key':err.error?.code||err.error?.type||'http_'+res.status,res.status);}
 const fb=parseFeedback(outputText(await res.json()),sentence);
 if(!fb)throw new AiDirectError('unreadable');
 return fb;
}
