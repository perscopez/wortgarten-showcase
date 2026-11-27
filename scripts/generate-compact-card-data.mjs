import {readFileSync,writeFileSync} from 'node:fs';
const read=(name)=>Object.fromEntries(readFileSync(new URL('../data/compact-'+name+'.tsv',import.meta.url),'utf8').trim().split('\n').map(line=>{
 const [word,...items]=line.split('\t');return [word,items];
}));
// Pattern columns are "Deutsch = Türkçe"; split into [de,tr] pairs for the cards.
const pairs=(record)=>Object.fromEntries(Object.entries(record).map(([word,items])=>[word,items.map(item=>{const [de,tr='']=item.split(' = ');return [de.trim(),tr.trim()];})]));
writeFileSync(new URL('../data/compact-card-data.json',import.meta.url),JSON.stringify({nouns:pairs(read('nouns')),adverbs:read('adverbs'),verbs:read('verb-forms'),verbPatterns:pairs(read('verb-patterns')),adjectives:pairs(read('adjective-patterns')),more:pairs(read('more-patterns'))},null,2)+'\n');
