import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../components/modal-shell.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require});
const {modalNextFocusIndex:next,modalFocusableElements:focusable,handleModalKey:handle,isolateModalBackground:isolate,lockModalScroll:lock}=exports;
class Style{values=new Map();getPropertyValue(k){return this.values.get(k)?.[0]||'';}getPropertyPriority(k){return this.values.get(k)?.[1]||'';}setProperty(k,v,p=''){this.values.set(k,[v,p]);}removeProperty(k){const old=this.getPropertyValue(k);this.values.delete(k);return old;}}
class Element{constructor(tag='DIV',attrs={}){this.tagName=tag;this.attrs=new Map(Object.entries(attrs));this.children=[];this.parentElement=null;this.style=new Style();this.tabIndex=0;this.rects=[{}];this.disabled=false;this.computed={display:'block',visibility:'visible'};this.hiddenAncestor=false;this.closedDetails=null;this.focusCalls=0;this.isConnected=true;}
 append(...children){for(const c of children){c.parentElement=this;c.ownerDocument=this.ownerDocument;this.children.push(c);}return this;}
 getAttribute(k){return this.attrs.has(k)?this.attrs.get(k):null;}hasAttribute(k){return this.attrs.has(k);}setAttribute(k,v){this.attrs.set(k,v);}removeAttribute(k){this.attrs.delete(k);}
 matches(s){return s===':disabled'&&this.disabled;}
 closest(){return this.hiddenAncestor?this:null;}
 getClientRects(){return this.rects;}
 contains(e){return e===this||this.children.some(c=>c.contains(e));}
 focus(options){this.focusCalls++;this.focusOptions=options;this.ownerDocument.activeElement=this;}
 querySelector(){return this.children.find(c=>c.tagName==='SUMMARY')||null;}
 querySelectorAll(){return this.focusControls||[];}
}
function doc(){const view={scrollX:12,scrollY:345,getComputedStyle:e=>e.computed,scrollTo(value){this.lastScroll=value;this.scrollX=value.left;this.scrollY=value.top;}};const d={defaultView:view,body:new Element('BODY'),documentElement:new Element('HTML'),activeElement:null};d.body.ownerDocument=d;d.documentElement.ownerDocument=d;d.documentElement.append(d.body);return d;}
function control(d,tag='BUTTON'){const e=new Element(tag);e.ownerDocument=d;return e;}
function key(key,extras={}){return{key,shiftKey:false,altKey:false,ctrlKey:false,metaKey:false,isComposing:false,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extras};}
test('SSR exposes labelled modal semantics and keyboard-focusable non-input container',()=>{
 const React=require('react'),render=require('react-dom/server').renderToStaticMarkup;
 const html=render(React.createElement(exports.default,{onClose:()=>{},labelledBy:'modal-title',closeDisabled:true},React.createElement('h2',{id:'modal-title'},'Kartı düzenle')));
 assert(html.includes('class="modal-overlay"'));assert(html.includes('class="modal"'));assert(html.includes('role="dialog"'));assert(html.includes('aria-modal="true"'));assert(html.includes('aria-labelledby="modal-title"'));assert(html.includes('tabindex="-1"'));assert(html.includes('aria-busy="true"'));assert(html.includes('Kartı düzenle'));
});
test('tab order wraps both directions including focus outside and zero controls',()=>{
 assert.equal(next(2,3,false),0);assert.equal(next(0,3,true),2);assert.equal(next(-1,3,false),0);assert.equal(next(-1,3,true),2);assert.equal(next(0,0,false),-1);
 const d=doc(),section=control(d,'SECTION'),a=control(d),b=control(d);section.focusControls=[a,b];d.activeElement=b;const forward=key('Tab');handle(forward,section,()=>{},false);assert.equal(d.activeElement,a);assert(forward.prevented);
 const backward=key('Tab',{shiftKey:true});handle(backward,section,()=>{},false);assert.equal(d.activeElement,b);
 d.activeElement=control(d);handle(key('Tab'),section,()=>{},false);assert.equal(d.activeElement,a);
 section.focusControls=[];handle(key('Tab'),section,()=>{},false);assert.equal(d.activeElement,section);assert.equal(section.focusOptions.preventScroll,true);
});
test('Escape respects busy close lock and composition, without losing focus trap',()=>{
 const d=doc(),section=control(d,'SECTION');let closed=0;const escape=key('Escape');handle(escape,section,()=>closed++,true);assert.equal(closed,0);assert(escape.prevented);assert(escape.stopped);
 handle(key('Escape'),section,()=>closed++,false);assert.equal(closed,1);handle(key('Escape',{isComposing:true}),section,()=>closed++,false);assert.equal(closed,1);
 section.focusControls=[];handle(key('Tab'),section,()=>closed++,true);assert.equal(d.activeElement,section);
 const shortcut=key('Tab',{ctrlKey:true});handle(shortcut,section,()=>closed++,false);assert.equal(shortcut.prevented,false);
});
test('focus list excludes disabled/hidden/offscreen/inert/negative and respects positive tabindex',()=>{
 const d=doc(),section=control(d,'SECTION'),normal=control(d),first=control(d),second=control(d),disabled=control(d),hidden=control(d),negative=control(d),inert=control(d),noRects=control(d);first.tabIndex=1;second.tabIndex=2;disabled.disabled=true;hidden.computed.display='none';negative.tabIndex=-1;inert.hiddenAncestor=true;noRects.rects=[];
 section.focusControls=[normal,second,disabled,hidden,first,negative,inert,noRects];assert.equal(focusable(section).map(e=>e===first?'first':e===second?'second':'normal').join(','),'first,second,normal');
});
test('closed details content is excluded but its own summary remains reachable',()=>{
 const d=doc(),section=control(d,'SECTION'),details=control(d,'DETAILS'),summary=control(d,'SUMMARY'),input=control(d,'INPUT');section.append(details);details.append(summary,input);section.focusControls=[summary,input];assert.equal(focusable(section).length,1);assert.equal(focusable(section)[0],summary);details.setAttribute('open','');assert.equal(focusable(section).length,2);
});
test('ancestor-path inert isolation never hides the dialog branch, restores original attributes',()=>{
 const d=doc(),app=control(d),sidebar=control(d),main=control(d,'MAIN'),content=control(d),overlay=control(d),script=control(d,'SCRIPT'),external=control(d);sidebar.setAttribute('inert','preexisting');sidebar.setAttribute('aria-hidden','false');d.body.append(app,external,script);app.append(sidebar,main);main.append(content,overlay);
 const release=isolate(overlay);assert.equal(sidebar.getAttribute('inert'),'');assert.equal(sidebar.getAttribute('aria-hidden'),'true');assert(content.hasAttribute('inert'));assert(external.hasAttribute('inert'));assert(!main.hasAttribute('inert'));assert(!app.hasAttribute('inert'));assert(!overlay.hasAttribute('inert'));assert(!script.hasAttribute('inert'));
 release();assert.equal(sidebar.getAttribute('inert'),'preexisting');assert.equal(sidebar.getAttribute('aria-hidden'),'false');assert(!content.hasAttribute('inert'));assert(!external.hasAttribute('aria-hidden'));release();assert.equal(sidebar.getAttribute('inert'),'preexisting');
});
test('nested background locks restore only after all owners release',()=>{
 const d=doc(),app=control(d),content=control(d),overlay=control(d);d.body.append(app);app.append(content,overlay);const a=isolate(overlay),b=isolate(overlay);a();assert(content.hasAttribute('inert'));b();assert(!content.hasAttribute('inert'));
});
test('scroll lock preserves exact touched styles/priorities and restores scroll position',()=>{
 const d=doc();d.body.style.setProperty('position','relative','important');d.body.style.setProperty('top','8px');d.body.style.setProperty('overflow-x','clip','important');d.body.style.setProperty('color','red');d.documentElement.style.setProperty('overflow','visible');
 const release=lock(d);assert.equal(d.body.style.getPropertyValue('position'),'fixed');assert.equal(d.body.style.getPropertyValue('top'),'-345px');assert.equal(d.body.style.getPropertyValue('left'),'-12px');assert.equal(d.documentElement.style.getPropertyValue('overflow'),'hidden');d.defaultView.scrollY=0;
 release();assert.equal(d.body.style.getPropertyValue('position'),'relative');assert.equal(d.body.style.getPropertyPriority('position'),'important');assert.equal(d.body.style.getPropertyValue('top'),'8px');assert.equal(d.body.style.getPropertyValue('left'),'');assert.equal(d.body.style.getPropertyValue('width'),'');assert.equal(d.body.style.getPropertyValue('overflow-x'),'clip');assert.equal(d.body.style.getPropertyPriority('overflow-x'),'important');assert.equal(d.body.style.getPropertyValue('color'),'red');assert.equal(d.documentElement.style.getPropertyValue('overflow'),'visible');assert.equal(d.defaultView.lastScroll.left,12);assert.equal(d.defaultView.lastScroll.top,345);assert.equal(d.defaultView.lastScroll.behavior,'instant');
});
test('nested scroll locks and repeated cleanup are reference-counted',()=>{
 const d=doc(),a=lock(d),b=lock(d);a();a();assert.equal(d.body.style.getPropertyValue('position'),'fixed');b();assert.equal(d.body.style.getPropertyValue('position'),'');b();assert.equal(d.body.style.getPropertyValue('position'),'');
});

test('mount focuses the container, never an input; cleanup restores invoking focus and listeners',()=>{
 const d=doc(),app=control(d),trigger=control(d),overlay=control(d),section=control(d,'SECTION'),input=control(d,'INPUT');d.body.append(app);app.append(trigger,overlay);overlay.append(section);section.append(input);section.focusControls=[input];d.activeElement=trigger;
 const listeners=new Map();d.addEventListener=(type,fn)=>listeners.set(type,fn);d.removeEventListener=(type,fn)=>{if(listeners.get(type)===fn)listeners.delete(type);};
 let cleanup;let refIndex=0;const fakeReact={useRef(initial){return{current:refIndex++===0?section:refIndex===2?overlay:initial};},useEffect(effect){cleanup=effect();}};
 const lifecycle={};const customRequire=name=>name==='react'?fakeReact:require(name);vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../components/modal-shell.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:lifecycle,require:customRequire});
 let closed=0;lifecycle.default({children:null,onClose:()=>closed++,labelledBy:'modal-title',closeDisabled:true});
 assert.equal(d.activeElement,section);assert.equal(input.focusCalls,0);assert.equal(section.focusOptions.preventScroll,true);assert(trigger.hasAttribute('inert'));assert(listeners.has('keydown'));assert(listeners.has('focusin'));
 listeners.get('keydown')(key('Escape'));assert.equal(closed,0);d.activeElement=trigger;listeners.get('focusin')({target:trigger});assert.equal(d.activeElement,section);
 cleanup();assert.equal(d.activeElement,trigger);assert.equal(trigger.focusOptions.preventScroll,true);assert(!trigger.hasAttribute('inert'));assert.equal(listeners.size,0);assert.equal(d.body.style.getPropertyValue('position'),'');
});
test('keyboard viewport listener keeps focused controls within a bounded visual viewport',()=>{const text=fs.readFileSync(new URL('../components/modal-shell.tsx',import.meta.url),'utf8');assert(text.includes('visualViewport'));assert(text.includes("'--modal-viewport-height'"));assert(text.includes("scrollIntoView({block:'nearest'"));assert(text.includes("removeEventListener('resize',resize)"))});
