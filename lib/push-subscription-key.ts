/** null means an older browser did not expose its stored application key. */
export function matchesPushKey(key:ArrayBuffer|null|undefined,expected:Uint8Array):boolean|null{
 if(!key)return null;
 const bytes=new Uint8Array(key);
 return bytes.length===expected.length&&bytes.every((b,i)=>b===expected[i]);
}
