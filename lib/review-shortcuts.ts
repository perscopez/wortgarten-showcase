export function reviewShortcut(event:{key:string;repeat?:boolean;isComposing?:boolean;ctrlKey?:boolean;metaKey?:boolean;altKey?:boolean},revealed:boolean,editing=false):'reveal'|0|1|2|3|null{
 if(editing||event.repeat||event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return null;
 if(event.key===' '&&!revealed)return'reveal';
 if(revealed&&['1','2','3','4'].includes(event.key))return(Number(event.key)-1) as 0|1|2|3;
 return null;
}
