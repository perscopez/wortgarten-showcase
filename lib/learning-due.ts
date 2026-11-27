import {minKnownDue} from './daily-route';
import {readLearningValue} from './learning-records';
import {RULE_PROGRESS_KEY,parseRuleProgress,ruleNextDue} from './rule-practice';
import {TABLE_RECALL_KEY,parseTableRecallValue,nextTableRecallDue} from './table-recall';
import {buildFamilyQueue} from './article-patterns';
import {parseGrammarProgress} from './grammar-practice';
import {INFLECTION_PROGRESS_KEY,parseInflectionProgress,buildInflectionQuestions,type InflectionPracticeCard} from './inflection-practice';
import {PATTERN_KEY,parsePatternProgress} from './pattern-practice';
export function localDueDay(day:string):number|null{if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return null;const[y,m,d]=day.split('-').map(Number),n=new Date(y,m-1,d).getTime();return Number.isFinite(n)?n:null;}
function parse(store:Pick<Storage,'getItem'>,key:string){const text=store.getItem(key);return text?JSON.parse(text):{};}
export async function earliestLearningDue(cards:(InflectionPracticeCard&{due:number;reviews?:number})[],store:Pick<Storage,'getItem'>):Promise<number|null>{const due:(number|null|undefined)[]=cards.filter(c=>(c.reviews??1)>0&&c.due>0).map(c=>c.due);const ids=new Set(cards.map(c=>c.id));try{for(const[id,p]of Object.entries(parse(store,'wortgarten-article-progress-v1'))){const x=p as any;if(ids.has(id)&&x?.attempts>0)due.push(x.due);}}catch{}try{const p=parse(store,'wortgarten-article-families-v1');for(const q of buildFamilyQueue(p)){const v=p[q.id];if(v?.attempts>0)due.push(v.due);}}catch{}try{const p=parseGrammarProgress(parse(store,'wortgarten-grammar-progress-v1'));for(const v of Object.values(p))if(v.attempts>0)due.push(v.due);}catch{}try{const p=parseInflectionProgress(store.getItem(INFLECTION_PROGRESS_KEY));if(p.valid){for(const q of buildInflectionQuestions(cards,'advanced')){const v=p.progress[q.id];if(v?.signature===q.signature&&v.attempts>0)due.push(localDueDay(v.dueDay));}}}catch{}
 // Each new record is independent: a bad optional record never fabricates a due or clears cards.
 try{due.push(ruleNextDue(parseRuleProgress(await readLearningValue(RULE_PROGRESS_KEY))));}catch{}
 try{const p=parseTableRecallValue(await readLearningValue(TABLE_RECALL_KEY));if(p.valid)due.push(nextTableRecallDue(p.progress));}catch{}
 try{const p=parsePatternProgress(await readLearningValue(PATTERN_KEY));for(const v of Object.values(p.items))if(v.attempts>0&&v.due>0)due.push(v.due);}catch{}
 return minKnownDue(...due);}
