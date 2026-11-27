import {reviewDay,validReviewState,type ScheduledCard} from './review-scheduler';

/** A card counts as settled once its interval reaches three weeks. */
export const SETTLED_DAYS=21;
const DAY=86400000;

export type Progress={recall:number|null;total:number;settled:number;learning:number;fresh:number;due:number;streak:number;activeDays:number;week:{day:string;count:number}[]};

/** `due` counts reviewed cards whose next review has arrived; unseen cards are reported as `fresh`.
 * Built only from recorded reviews; nothing is estimated. Starter cards are counted like any other card. */
export function learningProgress(cards:ScheduledCard[],now=Date.now()):Progress{
 const perDay=new Map<string,number>();
 for(const c of cards){if(!validReviewState(c.reviewState))continue;for(const e of c.reviewState.events)if(e.at<=now){const d=reviewDay(e.at);perDay.set(d,(perDay.get(d)||0)+1);}}
 const base=new Date(now),dayAt=(offset:number)=>reviewDay(new Date(base.getFullYear(),base.getMonth(),base.getDate()-offset,12,0,0).getTime());
 // A streak survives until the end of today: missing today only breaks it tomorrow.
 let streak=0;for(let d=perDay.has(dayAt(0))?0:1;perDay.has(dayAt(d));d++)streak++;
 let activeDays=0;for(let i=0;i<28;i++)if(perDay.has(dayAt(i)))activeDays++;
 const week=Array.from({length:7},(_,i)=>{const day=dayAt(6-i);return{day,count:perDay.get(day)||0};});
 // Learning KPI, not engagement: of the reviews that were due (not first meetings, not early practice)
 // in the last 30 days, how many were remembered (rating ≥ 2).
 let dueReviews=0,remembered=0;
 for(const c of cards){if(!validReviewState(c.reviewState))continue;const hasFirst=(c.reviews||0)<=c.reviewState.events.length;c.reviewState.events.forEach((e,i)=>{if((hasFirst&&i===0)||e.phase!=='scheduled'||e.at>now||e.at<now-30*DAY)return;dueReviews++;if(e.rating>=2)remembered++;});}
 const recall=dueReviews>=5?Math.round(remembered/dueReviews*100):null;
 const settled=cards.filter(c=>c.reviews>0&&c.interval>=SETTLED_DAYS).length,fresh=cards.filter(c=>!c.reviews).length;
 return{recall,total:cards.length,settled,fresh,learning:cards.length-settled-fresh,due:cards.filter(c=>c.reviews>0&&c.due<=now).length,streak,activeDays,week};
}
