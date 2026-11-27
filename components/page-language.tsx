'use client';
import {useEffect} from 'react';
import {useCardLanguage} from '../lib/card-language';
import {createTranslator,germanArtSrc} from '../lib/dom-translate';
import dictionary from '../lib/i18n-de.json';

const ATTRS=['aria-label','title','placeholder','alt'] as const;
// Never entered: code, styles and elements that opt out.
const SKIP_TREE='script,style,[data-no-translate]';
// Text inside German learning content (the nearest lang="de" below <body>) and in fields the learner
// types into stays as it is. Labels and placeholders are still translated there.
type Swap={orig:string;out:string};

/**
 * Keeps the whole interface in the chosen language. German is the default: Turkish interface text is
 * swapped for German in place (text, labels, illustrations) and swapped back when Turkish is chosen.
 * German learning content is marked lang="de" and never touched.
 */
export default function PageLanguage(){
 const lang=useCardLanguage();
 useEffect(()=>{
  const root=document.documentElement;
  root.lang=lang;
  const translate=createTranslator(dictionary as Record<string,string>);
  const texts=new WeakMap<Node,Swap>();
  const attrs=new WeakMap<Element,Map<string,Swap>>();
  const touched=new Set<WeakRef<Node>>();
  const german=lang==='de';
  // Interface controls inside German content (e.g. a listen button in a German heading) carry data-ui.
  const textSkipped=(el:Element|null)=>{if(!el||el.closest('textarea,[data-no-translate]'))return true;const near=el.closest('body [lang],[data-ui]');return !!near&&!near.hasAttribute('data-ui')&&near.getAttribute('lang')==='de';};

  function text(node:Text){
   const value=node.nodeValue??'';const seen=texts.get(node);
   if(seen&&value===seen.out)return;
   if(!german)return;
   if(textSkipped(node.parentElement))return;
   const out=translate(value);
   if(out===null||out===value){texts.delete(node);return;}
   texts.set(node,{orig:value,out});touched.add(new WeakRef(node));node.nodeValue=out;
  }
  function attribute(el:Element,name:string){
   const value=el.getAttribute(name);if(value===null)return;
   let map=attrs.get(el);const seen=map?.get(name);
   if(seen&&value===seen.out)return;
   if(!german||el.closest('[data-no-translate]'))return;
   const out=name==='src'?germanArtSrc(value):translate(value);
   if(out===null||out===value){map?.delete(name);return;}
   if(!map){map=new Map();attrs.set(el,map);}
   map.set(name,{orig:value,out});touched.add(new WeakRef(el));el.setAttribute(name,out);
  }
  function element(el:Element){
   for(const name of ATTRS)if(el.hasAttribute(name))attribute(el,name);
   if(el.tagName==='IMG')attribute(el,'src');
  }
  function walk(node:Node){
   if(node.nodeType===Node.TEXT_NODE){text(node as Text);return;}
   if(node.nodeType!==Node.ELEMENT_NODE)return;
   const el=node as Element;if(el.closest(SKIP_TREE))return;
   element(el);
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeType===Node.ELEMENT_NODE&&(n as Element).matches(SKIP_TREE)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
   for(let n=walker.nextNode();n;n=walker.nextNode()){if(n.nodeType===Node.TEXT_NODE)text(n as Text);else element(n as Element);}
  }
  function restore(){
   for(const ref of touched){const node=ref.deref();if(!node)continue;
    const swap=texts.get(node);if(swap&&node.nodeValue===swap.out)node.nodeValue=swap.orig;
    const map=attrs.get(node as Element);if(map)for(const [name,s] of map)if((node as Element).getAttribute(name)===s.out)(node as Element).setAttribute(name,s.orig);}
   touched.clear();
  }
  const title=document.title;
  if(german){walk(document.body);const t=translate(title);if(t)document.title=t;}
  root.classList.remove('i18n-pending');
  if(!german)return;
  const observer=new MutationObserver(records=>{
   for(const r of records){
    if(r.type==='characterData')text(r.target as Text);
    else if(r.type==='attributes')attribute(r.target as Element,r.attributeName!);
    else r.addedNodes.forEach(walk);
   }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...ATTRS,'src']});
  return()=>{observer.disconnect();restore();document.title=title;};
 },[lang]);
 return null;
}
