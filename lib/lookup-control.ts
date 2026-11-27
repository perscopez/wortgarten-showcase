/** MyMemory's q limit is bytes, not JS string length. Never split a Unicode point. */
export function clipUtf8(text:string,maxBytes=500):string{let out='',bytes=0;const encoder=new TextEncoder();for(const point of text){const length=encoder.encode(point).length;if(bytes+length>maxBytes)break;out+=point;bytes+=length;}return out;}
export function lookupFetch(signal:AbortSignal,request:typeof fetch=fetch):typeof fetch{return ((input:RequestInfo|URL,init?:RequestInit)=>request(input,{...init,signal:init?.signal?AbortSignal.any([signal,init.signal]):signal})) as typeof fetch;}
/** No obsolete request may commit, including its finally/error path. */
export function createRequestGate(){let sequence=0,controller:AbortController|undefined;return{begin(){controller?.abort();controller=new AbortController();const id=++sequence;return{id,signal:controller.signal};},current(id:number){return id===sequence&&!controller?.signal.aborted;},cancel(){sequence++;controller?.abort();}};}
