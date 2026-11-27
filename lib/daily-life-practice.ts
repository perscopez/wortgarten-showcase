import {DAILY_LIFE_CATALOG,type DailyLifeExercise,type DailyLifeCategory} from './daily-life-catalog';
import {shortSessionIds,type SessionSize} from './short-session';
export type DailyLifeTask=DailyLifeExercise&{dialogueId:string;dialogueTitle:string;category:DailyLifeCategory;level:string};
export const DAILY_LIFE_TASKS:DailyLifeTask[]=DAILY_LIFE_CATALOG.flatMap(dialogue=>dialogue.exercises.map(exercise=>({...exercise,dialogueId:dialogue.id,dialogueTitle:dialogue.title,category:dialogue.category,level:dialogue.level})));
function seedFor(id:string){let seed=2166136261;for(const c of id){seed^=c.charCodeAt(0);seed=Math.imul(seed,16777619);}return seed>>>0;}
export function orderPracticeOptions(task:DailyLifeExercise){const options=[...(task.options||[])];let seed=seedFor(task.id);for(let i=options.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[options[i],options[j]]=[options[j],options[i]];}return options;}
export function checkDailyLifeAnswer(task:DailyLifeExercise,value:string){const clean=(s:string)=>s.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');return !!value.trim()&&task.answers.some(answer=>clean(answer)===clean(value));}
export function dailyLifeSession(category:DailyLifeCategory|'all',size:SessionSize,seed:string){const tasks=DAILY_LIFE_TASKS.filter(task=>category==='all'||task.category===category).map((task,index)=>({task,rank:seedFor(seed+':'+task.id),index})).sort((a,b)=>a.rank-b.rank||a.index-b.index).map(x=>x.task);return shortSessionIds(tasks.map(t=>t.id),size);}
