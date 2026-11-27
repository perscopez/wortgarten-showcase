import {RULE_CATALOG,findRule,ruleSignature,type RuleRecord} from './rule-catalog';
export const RULE_SESSION_KEY='wortgarten-rule-session-v1';
export const RULE_PROGRESS_KEY='wortgarten-rules-v1';
export type RuleAttemptMode='written'|'choice'|'hint'|'reveal'|'self';
export type RuleItemProgress={signature:string;revision:number;attempts:number;correct:number;streak:number;intervalDays:number;due:number;lastAnswered:number;lastSuccessfulDay:string|null;written:number;choice:number;hint:number;reveal:number;self:number;transferCorrect:number;lastError:string|null;lastSupportedDay?:string;lastAttemptToken?:string;archived?:unknown[]};
export type RuleProgressState={version:1;items:Record<string,RuleItemProgress>;introducedByDay:Record<string,string[]>;exposures?:Record<string,string>};
export type RuleAttempt={ruleId:string;revision:number;mode:RuleAttemptMode;answer?:string;now?:number;transfer?:boolean;supported?:boolean;attemptToken?:string};
export const emptyRuleProgress=():RuleProgressState=>({version:1,items:{},introducedByDay:{}});
export function ruleLocalDay(now=Date.now()){const d=new Date(now);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function normalizeRuleAnswer(answer:string){return answer.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');}
export function isRuleAnswerCorrect(rule:RuleRecord,answer:string){return rule.exercise.accepted.some(a=>normalizeRuleAnswer(a)===normalizeRuleAnswer(answer));}
function activeItem(state:RuleProgressState,rule:RuleRecord){const p=state.items[rule.ruleId];return p?.signature===ruleSignature(rule)?p:undefined;}
function blank(rule:RuleRecord,old?:RuleItemProgress):RuleItemProgress{return{signature:ruleSignature(rule),revision:rule.revision,attempts:0,correct:0,streak:0,intervalDays:0,due:0,lastAnswered:0,lastSuccessfulDay:null,written:0,choice:0,hint:0,reveal:0,self:0,transferCorrect:0,lastError:null,...(old?{archived:[...(old.archived||[]),old]}:{})};}
export function recordRuleAttempt(state:RuleProgressState,attempt:RuleAttempt):RuleProgressState{
 const rule=findRule(attempt.ruleId);if(!rule||rule.revision!==attempt.revision)return state;
 const now=attempt.now??Date.now();const old=activeItem(state,rule)||blank(rule,state.items[rule.ruleId]);if(attempt.attemptToken&&old.lastAttemptToken===attempt.attemptToken)return state;const p={...old,...(attempt.attemptToken?{lastAttemptToken:attempt.attemptToken}:{}),[attempt.mode]:old[attempt.mode]+1,lastAnswered:now};
 if(attempt.mode==='self')return{...state,items:{...state.items,[rule.ruleId]:p}};
 p.attempts++;
 if(attempt.mode==='hint'||attempt.mode==='reveal'){p.lastSupportedDay=ruleLocalDay(now);p.due=old.due&&old.due<=now?old.due:Math.min(old.due||Infinity,now+86400000);return{...state,items:{...state.items,[rule.ruleId]:p}};}
 const right=isRuleAnswerCorrect(rule,attempt.answer||'');
 const unsupported=attempt.mode==='written'&&!attempt.supported&&old.lastSupportedDay!==ruleLocalDay(now)&&state.exposures?.[rule.ruleId]!==ruleLocalDay(now);
 if(!unsupported)p.lastSupportedDay=ruleLocalDay(now);
 if(right&&unsupported){p.correct++;if(attempt.transfer)p.transferCorrect++;const today=ruleLocalDay(now);if((old.due===0||now>=old.due)&&old.lastSuccessfulDay!==today){p.streak++;p.intervalDays=[1,3,7,14,30][Math.min(p.streak-1,4)];p.due=now+p.intervalDays*86400000;p.lastSuccessfulDay=today;}p.lastError=null;}
 else if(!right){p.streak=0;p.intervalDays=0;p.due=now+86400000;p.lastError=rule.exercise.errorType;}
 else {p.due=old.due||now+86400000;p.lastError=null;}
 return{...state,items:{...state.items,[rule.ruleId]:p}};
}
export function introduceRules(state:RuleProgressState,ids:string[],now=Date.now(),maxNewFamilies=3):RuleProgressState{
 const day=ruleLocalDay(now);const today=[...(state.introducedByDay[day]||[])];const introduced=new Set(Object.values(state.introducedByDay).flat());
 for(const id of ids){if(!findRule(id)||introduced.has(id)||state.items[id])continue;if(today.length>=Math.max(0,Math.min(3,maxNewFamilies)))break;today.push(id);introduced.add(id);}
 return {...state,introducedByDay:{...state.introducedByDay,[day]:today}};
}
export function createRuleSession(state:RuleProgressState,now=Date.now(),options:{maxNewFamilies?:number;limit?:number;allowedNewIds?:string[]}={}){
 const limit=Math.max(0,Math.min(30,options.limit??12));const introduced=new Set(Object.values(state.introducedByDay).flat());const today=state.introducedByDay[ruleLocalDay(now)]||[];const remaining=Math.max(0,Math.min(3,options.maxNewFamilies??3)-today.length);
 const reviews=RULE_CATALOG.filter(r=>{const p=activeItem(state,r);return p&&p.attempts>0&&p.due<=now;}).sort((a,b)=>(activeItem(state,a)!.due-activeItem(state,b)!.due));
 const started=RULE_CATALOG.filter(r=>!reviews.includes(r)&&introduced.has(r.ruleId)&&(!activeItem(state,r)||activeItem(state,r)!.attempts===0));
 const fresh=RULE_CATALOG.filter(r=>!introduced.has(r.ruleId)&&(!activeItem(state,r)||activeItem(state,r)!.attempts===0)&&(!options.allowedNewIds||options.allowedNewIds.includes(r.ruleId))).slice(0,remaining);
 return [...reviews,...started,...fresh].slice(0,limit).map(r=>r.ruleId);
}
export function ruleNextDue(state:RuleProgressState):number|null{const values=RULE_CATALOG.map(r=>activeItem(state,r)).filter((p):p is RuleItemProgress=>!!p&&p.attempts>0&&p.due>0).map(p=>p.due);return values.length?Math.min(...values):null;}
export function advanceRuleQueue(queue:string[],success:boolean){const [id,...rest]=queue;if(!id||success)return rest;const next=rest.filter(x=>x!==id);next.splice(Math.min(2,next.length),0,id);return next;}
export function parseRuleProgress(value:unknown):RuleProgressState{
 if(value==null)return emptyRuleProgress();if(typeof value!=='object'||Array.isArray(value))throw new Error('Kural kaydı okunamadı; mevcut kayıt değiştirilmedi.');
 const v=value as RuleProgressState;if(v.version!==1||!v.items||typeof v.items!=='object'||Array.isArray(v.items)||!v.introducedByDay||typeof v.introducedByDay!=='object'||Array.isArray(v.introducedByDay))throw new Error('Kural kaydı sürümü veya yapısı desteklenmiyor.');
 for(const p of Object.values(v.items)){if(!p||typeof p!=='object'||typeof p.signature!=='string'||!Number.isInteger(p.revision)||p.revision<1||!['attempts','correct','streak','intervalDays','due','lastAnswered','written','choice','hint','reveal','self','transferCorrect'].every(k=>typeof p[k as keyof RuleItemProgress]==='number'&&Number.isFinite(p[k as keyof RuleItemProgress])&&(p[k as keyof RuleItemProgress] as number)>=0)||!['attempts','correct','streak','written','choice','hint','reveal','self','transferCorrect'].every(k=>Number.isInteger(p[k as keyof RuleItemProgress]))||p.correct>p.attempts||p.streak>p.correct||!(p.lastSuccessfulDay===null||typeof p.lastSuccessfulDay==='string'))throw new Error('Kural geçmişi bozuk; eski veri korunuyor.');}
 if(v.exposures&&(!Object.values(v.exposures).every(day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day))))throw Error('Kural öğrenme görünümü kaydı okunamadı.');
 for(const [day,ids] of Object.entries(v.introducedByDay))if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Array.isArray(ids)||ids.some(x=>typeof x!=='string'))throw new Error('Günlük kural kotası okunamadı.');
 return v;
}

export type RuleSessionState={version:1;attemptToken?:string;mode:'recall'|'transfer';queue:string[];stage:'recall'|'study'|'target'|'feedback';freeText:string;answer:string;hint:boolean;choice:boolean;exposed:boolean;correct:boolean|null;signatures:Record<string,string>;retryIds?:string[]};
export function parseRuleSession(value:unknown):RuleSessionState|null{if(value==null)return null;if(typeof value!=='object')throw new Error('Kural oturum kaydı bozuk.');const s=value as RuleSessionState;if(s.version!==1||!['recall','transfer'].includes(s.mode)||!['recall','study','target','feedback'].includes(s.stage)||!Array.isArray(s.queue)||s.queue.length>60||!s.signatures||typeof s.signatures!=='object'||Array.isArray(s.signatures)||typeof s.freeText!=='string'||typeof s.answer!=='string'||s.freeText.length>20000||s.answer.length>2000||typeof s.hint!=='boolean'||typeof s.choice!=='boolean'||typeof s.exposed!=='boolean'||!(s.correct===null||typeof s.correct==='boolean'))throw new Error('Kural oturum yapısı bozuk.');if(s.retryIds&&(!Array.isArray(s.retryIds)||s.retryIds.some(id=>typeof id!=='string')))throw new Error('Kural tekrar sırası bozuk.');for(const id of s.queue){const rule=findRule(id);if(!rule||s.signatures[id]!==ruleSignature(rule))throw new Error('Kural oturum içeriği değişti; eski taslak korunuyor.');}return s;}

export function markRuleStudied(state:RuleProgressState,id:string,now=Date.now()):RuleProgressState{return findRule(id)?{...state,exposures:{...state.exposures,[id]:ruleLocalDay(now)}}:state;}
