/** Checks a typed German answer (Turkish → German cards). Self-rating stays with the learner. */
export type TypedResult='correct'|'umlaut'|'article'|'close'|'wrong';

const ARTICLES=['der','die','das'];
const clean=(s:string)=>s.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
const ascii=(s:string)=>s.replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');

function distance(a:string,b:string){
 if(Math.abs(a.length-b.length)>1)return 2;
 if(a.length===b.length){for(let i=0;i<a.length-1;i++)if(a[i]!==b[i]){if(a[i]===b[i+1]&&a[i+1]===b[i]&&a.slice(i+2)===b.slice(i+2))return 1;break;}}
 let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(prev[j]+1,row[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=row;}
 return prev[b.length];
}

function split(text:string){const parts=clean(text).split(' ');return ARTICLES.includes(parts[0])&&parts.length>1?{article:parts[0],word:parts.slice(1).join(' ')}:{article:'',word:parts.join(' ')};}

export function checkTypedAnswer(input:string,expected:{word:string;article?:string}):TypedResult|null{
 if(!clean(input))return null;
 const art=ARTICLES.includes(clean(expected.article||''))?clean(expected.article||''):'';
 const rawWord=clean(expected.word);
 const want={article:art,word:art&&rawWord.startsWith(art+' ')?rawWord.slice(art.length+1):rawWord};
 const got=want.article?split(input):{article:'',word:clean(input)};
 const word=got.word===want.word?'exact':ascii(got.word)===ascii(want.word)?'umlaut':want.word.length>=5&&distance(got.word,want.word)<=1?'close':'wrong';
 if(word==='wrong'){
  if(!want.article){
   const s=split(input);
   if(s.article&&(s.word===want.word||ascii(s.word)===ascii(want.word)||(want.word.length>=5&&distance(s.word,want.word)<=1)))return 'article';
  }
  return 'wrong';
 }
 if(want.article&&got.article!==want.article)return 'article';
 return word==='exact'?'correct':word;
}

export const TYPED_FEEDBACK:Record<TypedResult,string>={
 correct:'Doğru yazdın.',
 umlaut:'Doğru; yalnızca ä/ö/ü/ß yerine ae/oe/ue/ss yazdın.',
 article:'Kelime doğru, artikeli kontrol et.',
 close:'Çok yakın; tek harf farkı var.',
 wrong:'Olmadı — doğrusu aşağıda.',
};
