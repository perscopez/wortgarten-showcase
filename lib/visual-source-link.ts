// Keep old backup and synced card metadata readable without contacting the retired host.
export const visualSourcesUrl='https://wortgarten-beta.vercel.app/visual-sources.html';
const legacy=new Set(['wortgarten-legacy-1.example.com','wortgarten-legacy-2.example.com']);
export function visualSourceLink(value:string){
 const trimmed=typeof value==='string'?value.trim():'';
 if(!trimmed||!/^https?:\/\/[^\s"'<>]+$/i.test(trimmed))return '';
 if(typeof URL==='undefined'){
  const m=trimmed.match(/^https?:\/\/([^/?#]+)(\/visual-sources\.html)(#.*)?$/i);
  if(m&&legacy.has(m[1].toLowerCase()))return visualSourcesUrl+(m[3]||'');
  return trimmed;
 }
 try{
  const u=new URL(trimmed);
  if(u.protocol!=='http:'&&u.protocol!=='https:')return '';
  if(legacy.has(u.host)&&!u.username&&!u.password&&u.pathname==='/visual-sources.html')return visualSourcesUrl+u.hash;
  return u.href;
 }catch{
  return '';
 }
}
