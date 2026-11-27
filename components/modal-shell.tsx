'use client';
import {useEffect,useRef,type ReactNode} from 'react';

type Props={children:ReactNode;onClose:()=>void;closeDisabled?:boolean;labelledBy:string};
const modalStacks=new WeakMap<Document,HTMLElement[]>();
const backgroundLocks=new WeakMap<Element,{count:number;inert:string|null;ariaHidden:string|null}>();
const scrollLocks=new WeakMap<Document,{count:number;restore:()=>void}>();
const FOCUSABLE='a[href],area[href],button,input:not([type="hidden"]),select,textarea,summary,[tabindex],[contenteditable="true"]';
/** Positive tabindex follows native ordering; hidden/disabled/inert controls are excluded. */
export function modalFocusableElements(section:HTMLElement):HTMLElement[]{
 const view=section.ownerDocument.defaultView;
 return Array.from(section.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element=>{
  if(element.tabIndex<0||element.matches(':disabled')||element.closest('[inert],[hidden],[aria-hidden="true"]'))return false;
  const style=view?.getComputedStyle(element);if(style?.display==='none'||style?.visibility==='hidden'||style?.visibility==='collapse'||element.getClientRects().length===0)return false;
  let ancestor:Element|null=element.parentElement;
  while(ancestor&&ancestor!==section){if(ancestor.tagName==='DETAILS'&&!ancestor.hasAttribute('open')){const summary=ancestor.querySelector('summary');if(!summary||summary.parentElement!==ancestor||!summary.contains(element))return false;}ancestor=ancestor.parentElement;}
  return true;
 }).map((element,index)=>({element,index})).sort((a,b)=>{
  const ai=a.element.tabIndex,bi=b.element.tabIndex;return ai>0&&bi>0?ai-bi||a.index-b.index:ai>0?-1:bi>0?1:a.index-b.index;
 }).map(item=>item.element);
}
export function modalNextFocusIndex(currentIndex:number,count:number,backward:boolean):number{
 if(count<=0)return-1;if(currentIndex<0)return backward?count-1:0;return(currentIndex+(backward?-1:1)+count)%count;
}
/** Handler also works when focus has escaped, or busy rendering removed all controls. */
export function handleModalKey(event:KeyboardEvent,section:HTMLElement,onClose:()=>void,closeDisabled:boolean):void{
 if(event.isComposing)return;
 if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!closeDisabled)onClose();return;}
 if(event.key!=='Tab'||event.altKey||event.ctrlKey||event.metaKey)return;
 const controls=modalFocusableElements(section);const index=controls.findIndex(el=>el===section.ownerDocument.activeElement);const next=modalNextFocusIndex(index,controls.length,event.shiftKey);
 event.preventDefault();if(next<0)section.focus({preventScroll:true});else controls[next].focus();
}
function restoreAttribute(element:Element,name:string,value:string|null){if(value===null)element.removeAttribute(name);else element.setAttribute(name,value);}
/** Isolate siblings at every ancestor level, never the ancestor containing this dialog. */
export function isolateModalBackground(overlay:HTMLElement):()=>void{
 const locked:Element[]=[];let branch:Element=overlay;const body=overlay.ownerDocument.body;
 while(branch.parentElement){const parent=branch.parentElement;for(const sibling of Array.from(parent.children)){
  if(sibling===branch||['SCRIPT','STYLE','LINK','META','TEMPLATE'].includes(sibling.tagName))continue;
  let state=backgroundLocks.get(sibling);if(!state){state={count:0,inert:sibling.getAttribute('inert'),ariaHidden:sibling.getAttribute('aria-hidden')};backgroundLocks.set(sibling,state);sibling.setAttribute('inert','');sibling.setAttribute('aria-hidden','true');}
  state.count++;locked.push(sibling);
 }if(parent===body)break;branch=parent;}
 let active=true;return()=>{if(!active)return;active=false;for(const element of locked){const state=backgroundLocks.get(element);if(!state)continue;if(--state.count===0){restoreAttribute(element,'inert',state.inert);restoreAttribute(element,'aria-hidden',state.ariaHidden);backgroundLocks.delete(element);}}};
}
/** Reference-counted fixed-body lock; all touched inline values/priorities are restored. */
export function lockModalScroll(doc:Document):()=>void{
 let state=scrollLocks.get(doc);
 if(!state){const view=doc.defaultView,body=doc.body,html=doc.documentElement;const x=view?.scrollX||0,y=view?.scrollY||0;
  const changes:[CSSStyleDeclaration,string,string][]=[[body.style,'overflow','hidden'],[body.style,'position','fixed'],[body.style,'top',`${-y}px`],[body.style,'left',`${-x}px`],[body.style,'width','100%'],[html.style,'overflow','hidden']];
  const snapshot:[CSSStyleDeclaration,string][]=[...changes.map(([style,key])=>[style,key] as [CSSStyleDeclaration,string]),[body.style,'overflow-x'],[body.style,'overflow-y'],[html.style,'overflow-x'],[html.style,'overflow-y']];
  const previous=snapshot.map(([style,key])=>({style,key,value:style.getPropertyValue(key),priority:style.getPropertyPriority(key)}));
  changes.forEach(([style,key,value])=>style.setProperty(key,value));
  state={count:0,restore:()=>{for(const item of previous){if(item.value)item.style.setProperty(item.key,item.value,item.priority);else item.style.removeProperty(item.key);}if(view&&(view.scrollX!==x||view.scrollY!==y))view.scrollTo({left:x,top:y,behavior:'instant'});}};scrollLocks.set(doc,state);
 }
 state.count++;let active=true;return()=>{if(!active)return;active=false;const held=scrollLocks.get(doc);if(held&&--held.count===0){held.restore();scrollLocks.delete(doc);}};
}
export default function ModalShell({children,onClose,closeDisabled=false,labelledBy}:Props){
 const sectionRef=useRef<HTMLElement>(null),overlayRef=useRef<HTMLDivElement>(null),closeRef=useRef(onClose),disabledRef=useRef(closeDisabled),startedOnOverlay=useRef(false);
 closeRef.current=onClose;disabledRef.current=closeDisabled;
 useEffect(()=>{const section=sectionRef.current,overlay=overlayRef.current;if(!section||!overlay)return;
  const doc=section.ownerDocument,previous=doc.activeElement as HTMLElement|null;const stack=modalStacks.get(doc)||[];stack.push(section);modalStacks.set(doc,stack);
  // Focus a non-input first: no automatic mobile keyboard or scroll jump.
  section.focus({preventScroll:true});const releaseBackground=isolateModalBackground(overlay),releaseScroll=lockModalScroll(doc);
  const isTop=()=>modalStacks.get(doc)?.at(-1)===section;
  const key=(event:KeyboardEvent)=>{if(isTop())handleModalKey(event,section,()=>closeRef.current(),disabledRef.current);};
  const focus=(event:FocusEvent)=>{if(isTop()&&!section.contains(event.target as Node))section.focus({preventScroll:true});};
  doc.addEventListener('keydown',key,true);doc.addEventListener('focusin',focus,true);
  const view=doc.defaultView;let viewportFrame=0;
  const syncViewport=()=>{if(!view)return;const viewport=view.visualViewport;overlay.style.setProperty('--modal-viewport-height',`${viewport?.height||view.innerHeight}px`);overlay.style.setProperty('--modal-viewport-top',`${viewport?.offsetTop||0}px`);const active=doc.activeElement as HTMLElement|null;if(active&&section.contains(active)&&active.matches('input,textarea,select,button'))active.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});};
  const resize=()=>{if(!view?.requestAnimationFrame)return;view.cancelAnimationFrame(viewportFrame);viewportFrame=view.requestAnimationFrame(syncViewport);};
  if(view?.addEventListener){view.addEventListener('resize',resize);view.visualViewport?.addEventListener('resize',resize);view.visualViewport?.addEventListener('scroll',resize);resize();}

  return()=>{if(view?.removeEventListener){view.removeEventListener('resize',resize);view.visualViewport?.removeEventListener('resize',resize);view.visualViewport?.removeEventListener('scroll',resize);if(viewportFrame)view.cancelAnimationFrame(viewportFrame)}doc.removeEventListener('keydown',key,true);doc.removeEventListener('focusin',focus,true);const wasTop=isTop();const current=modalStacks.get(doc)||[];const index=current.indexOf(section);if(index>=0)current.splice(index,1);if(!current.length)modalStacks.delete(doc);releaseBackground();releaseScroll();
   if(wasTop){if(previous?.isConnected&&!previous.closest('[inert],[hidden]')&&!previous.matches(':disabled'))previous.focus({preventScroll:true});else if(current.length>0)current.at(-1)?.focus({preventScroll:true});}
  };
 },[]);
 return <div className="modal-overlay" ref={overlayRef} onPointerDown={event=>{startedOnOverlay.current=event.target===event.currentTarget;}} onPointerCancel={()=>{startedOnOverlay.current=false;}} onClick={event=>{const shouldClose=startedOnOverlay.current&&event.target===event.currentTarget;startedOnOverlay.current=false;if(shouldClose&&!disabledRef.current)closeRef.current();}}><section className="modal" ref={sectionRef} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-busy={closeDisabled||undefined} tabIndex={-1}>{children}</section></div>;
}
