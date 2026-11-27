/** Conservative deterministic scheduler. Only observed events are used, never invented history. */
export type Rating=0|1|2|3;
export type ReviewEvent={at:number;rating:Rating;phase:'scheduled'|'practice'|'relearn'};
export type ReviewState={version:1;ease:number;lapses:number;successDays:number;lastAdvancedDay:string|null;lastReviewedAt:number;scheduledDue:number;events:ReviewEvent[]};
export type ScheduledCard={id:string;due:number;interval:number;reviews:number;created?:number;reviewState?:ReviewState};
const DAY=86400000,MAX_DAYS=365,MAX_EVENTS=40;
export function reviewDay(at:number){const d=new Date(at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function safeDay(x:unknown){if(x===null)return true;if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;const d=new Date(x+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===x;}
const count=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
export function validReviewState(value:unknown):value is ReviewState{const v=value as ReviewState;return !!v&&v.version===1&&Number.isFinite(v.ease)&&v.ease>=1.3&&v.ease<=3&&count(v.lapses)&&count(v.successDays)&&safeDay(v.lastAdvancedDay)&&Number.isFinite(v.lastReviewedAt)&&v.lastReviewedAt>=0&&Number.isFinite(v.scheduledDue)&&v.scheduledDue>=0&&Array.isArray(v.events)&&v.events.length<=MAX_EVENTS&&v.events.every((e,i)=>e&&Number.isFinite(e.at)&&e.at>=0&&[0,1,2,3].includes(e.rating)&&['scheduled','practice','relearn'].includes(e.phase)&&(i===0||e.at>=v.events[i-1].at))&&(!v.events.length||v.events[v.events.length-1].at===v.lastReviewedAt);}
/** Cross-card activity counts distinct local calendar days, never clicks. */
export function studyCadence(cards:ScheduledCard[],now=Date.now()){
 const days=new Set<string>();for(const c of cards){if(!validReviewState(c.reviewState))continue;for(const e of c.reviewState.events)if(e.at<=now&&e.at>=now-28*DAY&&e.phase!=='practice')days.add(reviewDay(e.at));}
 const sorted=[...days].sort(),gaps=sorted.slice(1).map((day,i)=>(Date.parse(day+'T12:00:00Z')-Date.parse(sorted[i]+'T12:00:00Z'))/DAY).filter(x=>x>0).sort((a,b)=>a-b);
 return{activeDays:days.size,gapDays:gaps.length?Math.max(1,Math.min(7,gaps[Math.floor(gaps.length/2)])):1};
}
export function scheduleReview<T extends ScheduledCard>(card:T,rating:Rating,cards:ScheduledCard[]=[],now=Date.now()):T{
 if(![0,1,2,3].includes(rating)||!Number.isFinite(now)||now<0)throw Error('Geçersiz tekrar değerlendirmesi.');
 const previous=validReviewState(card.reviewState)?card.reviewState:undefined;
 // Another client may have changed legacy due/interval without understanding reviewState. Honor its due.
 const aligned=previous?.scheduledDue===card.due,old=aligned?previous:undefined;
 const day=reviewDay(now),last=old?.events.at(-1),sameDay=last&&reviewDay(last.at)===day;
 const relearning=!!sameDay&&last.rating===0;
 const early=card.due>now+60000&&card.reviews>0;
 const phase:ReviewEvent['phase']=relearning?'relearn':early&&rating>0?'practice':'scheduled';
 const state:ReviewState={version:1,ease:old?.ease??2.3,lapses:old?.lapses??0,successDays:old?.successDays??0,lastAdvancedDay:old?.lastAdvancedDay??null,lastReviewedAt:now,scheduledDue:card.due,events:[...(previous?.events||[]).filter(e=>e.at<=now),{at:now,rating,phase}].slice(-MAX_EVENTS)};
 let interval=Number.isFinite(card.interval)?Math.max(0,Math.min(MAX_DAYS,card.interval)):0,due=card.due;
 if(rating===0){state.ease=Math.max(1.3,state.ease-.2);state.lapses++;state.successDays=0;interval=0;due=now+10*60000;}
 else if(phase==='practice'){
  // If round 0 scheduled the card today with rating 2, let the paired production round (rating 3 or 1) refine today's scheduled interval.
  if(sameDay&&old?.lastAdvancedDay===day&&last?.phase==='scheduled'){
   if(rating===3&&last.rating===2){
    interval=Math.min(MAX_DAYS,interval<=2?4:Math.max(interval+1,Math.round(interval*(state.ease+.35)/state.ease)));
    state.ease=Math.min(3,state.ease+.1);due=now+interval*DAY;
   }else if(rating===1&&last.rating>=2){
    interval=Math.max(1,Math.round(interval*.5));state.ease=Math.max(1.3,state.ease-(last.rating===3?.2:.1));state.successDays=Math.max(0,state.successDays-1);due=now+interval*DAY;
   }
  }
 }else if(relearning||old?.lastAdvancedDay===day){interval=Math.min(1,Math.max(1,interval));due=now+DAY;}
 else{
  const cadence=studyCadence(cards,now),base=interval;
  if(rating===1){interval=Math.max(1,Math.round(base*.65));state.ease=Math.max(1.3,state.ease-.1);state.successDays=0;}
  else{
   const overdue=base>0?Math.max(0,Math.min(base*.25,(now-card.due)/DAY)):0;
   const streak=Math.min(.15,state.successDays*.025),factor=state.ease+streak+(rating===3?.35:0);
   interval=base>0?Math.max(base+1,Math.round(base*factor+overdue)):rating===3?4:2;
   // With enough real activity, align mature intervals to the observed study rhythm, without delaying weak/new cards.
   if(cadence.activeDays>=4&&base>=4&&state.successDays>=2&&cadence.gapDays>1)interval=Math.max(1,Math.round(interval/cadence.gapDays)*cadence.gapDays);
   state.successDays++;if(rating===3)state.ease=Math.min(3,state.ease+.1);
  }
  interval=Math.min(MAX_DAYS,interval);due=now+interval*DAY;state.lastAdvancedDay=day;
 }
 state.scheduledDue=due;
 return{...card,interval,due,reviews:card.reviews+1,reviewState:state};
}
export type ReviewSize=10|20|40|'all';
export function reviewSize(value:unknown):ReviewSize{return value==='all'?'all':value===10?10:value===40?40:20;}
export function reviewIds(cards:ScheduledCard[],{size=20,all=false,exclude=[],now=Date.now()}:{size?:ReviewSize;all?:boolean;exclude?:string[];now?:number}={}){
 const omitted=new Set(exclude);const unique=new Map(cards.filter(c=>!omitted.has(c.id)&&(all||c.due<=now)).map(c=>[c.id,c]));
 return [...unique.values()].sort((a,b)=>{const aDue=a.due<=now,bDue=b.due<=now;if(aDue!==bDue)return aDue?-1:1;if(a.reviews===0&&b.reviews>0)return 1;if(b.reviews===0&&a.reviews>0)return-1;const risk=(c:ScheduledCard)=>Math.max(0,(now-c.due)/DAY)/Math.max(1,c.interval)+(validReviewState(c.reviewState)?Math.min(3,c.reviewState.lapses)*.15:0);return risk(b)-risk(a)||a.due-b.due||a.id.localeCompare(b.id);}).slice(0,size==='all'?unique.size:size).map(c=>c.id);
}
/** One recovery pass, after up to three other cards; repeats never manufacture new unique cards. */
export function reviewAfterAnswer(queue:string[],rating:Rating,recovered:string[]){const[id,...rest]=queue;if(!id)return[];if(rating<=1&&!recovered.includes(id))rest.splice(Math.min(3,rest.length),0,id);return rest;}
