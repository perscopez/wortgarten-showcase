import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const css=fs.readFileSync('app/academic.css','utf8');
const phone=css.slice(css.indexOf('@media(max-width:900px){'));
const z=(sel)=>{const m=phone.match(new RegExp(sel.replace(/[.]/g,'\\.')+'\\{[^}]*?z-index:(\\d+)'));return m?Number(m[1]):NaN;};
test('on phones the menu sheet (inside .rail) stacks above the dimming backdrop, so its links can be tapped',()=>{
 assert.ok(z('.rail')>z('.sheet-backdrop'),`rail ${z('.rail')} must be above backdrop ${z('.sheet-backdrop')}`);
 assert.ok(z('.tabbar')>=z('.rail'),'the tab bar stays reachable');
 assert.ok(z('.rail-nav')>0);
});
test('the home date is filled in after hydration, never during server rendering',()=>{
 const src=fs.readFileSync('components/daily-vocabulary.tsx','utf8');
 assert.ok(!/const dateLabel=new Date\(\)/.test(src));
 assert.ok(/setDateLabel\(new Date\(\)\.toLocaleDateString/.test(src));
});
