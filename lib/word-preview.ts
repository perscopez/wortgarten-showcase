/** Compare only saved card content. Fetches establish a baseline; rendering is not editing. */
export function wordPreviewSnapshot(draft:Record<string,any>,photo?:{url?:string}|null):string{
 const text=(key:string)=>typeof draft[key]==='string'?draft[key]:'';
 return JSON.stringify({word:text('word'),article:text('article'),plural:text('plural'),meaning:text('meaning'),example:text('example'),translation:text('translation'),note:text('note'),partOfSpeech:text('partOfSpeech'),articleAmbiguous:!!draft.articleAmbiguous,inflections:draft.inflections||null,rection:draft.rection||null,photo:photo?.url||''});
}
export function wordPreviewChanged(baseline:string|null,draft:Record<string,any>,photo?:{url?:string}|null){return baseline!==null&&baseline!==wordPreviewSnapshot(draft,photo);}
