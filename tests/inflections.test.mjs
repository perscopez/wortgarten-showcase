import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const code = ts.transpileModule(fs.readFileSync(new URL('../lib/inflections.ts',import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports = {};
vm.runInNewContext(code,{exports,console,Map,Set,AbortSignal,fetch});
const {parseInflections,parseVerbFlexionHtml,fetchInflections}=exports;
const fixture=name=>fs.readFileSync(new URL('./fixtures/inflections/'+name,import.meta.url),'utf8');
const cell=(data,row,column=0)=>data.tables[0].rows.find(r=>r.label===row).cells[column].join(' / ');
test('live-source Haus: strong noun has sourced plural dative and correct articles',()=>{
 const d=parseInflections(fixture('Haus.txt'),'Haus');
 assert.equal(cell(d,'Nominativ'),'das Haus');assert.equal(cell(d,'Dativ',1),'den Häusern');
 assert.equal(cell(d,'Genitiv'),'des Hauses');assert.equal(cell(d,'Dativ'),'dem Haus / dem Hause');
 assert.equal(d.sources[0].url,'https://de.wiktionary.org/wiki/Haus');
});
test('live-source Junge: weak noun, no fabricated dativ plural',()=>{
 const d=parseInflections(fixture('Junge.txt'),'Junge');
 assert.equal(cell(d,'Akkusativ'),'den Jungen'); assert.equal(cell(d,'Dativ'),'dem Jungen');assert.equal(cell(d,'Genitiv'),'des Jungen');
 assert.equal(cell(d,'Dativ',1),'den Jungen / den Jungs / den Jungens');
});
test('raw verb does not guess missing persons or auxiliary conjugations',()=>{
 const d=parseInflections(fixture('gehen.txt'),'gehen');assert.equal(d.tables[0].rows[0].cells[0][0],'gehe');
 assert.equal(d.tables[0].rows[3].cells[0].length,0);assert.equal(d.tables[0].rows[0].cells[2].length,0);
 assert.equal(d.tables[1].rows[0].cells[0][0],'sein');
});
test('rendered source tables yield six verified persons across three tenses',()=>{
 const d=parseVerbFlexionHtml(fixture('gehen-flexion.html'));
 assert.equal(d['Präsens'][3][0],'gehen');assert.equal(d['Präteritum'][1][0],'gingst');
 assert.equal(d['Perfekt'][0][0],'bin gegangen'); assert.equal(d['Perfekt'][5][0],'sind gegangen');
 for(const tense of ['Präsens','Präteritum','Perfekt']) assert.equal(d[tense].filter(c=>c.length).length,6);
});
test('unrecognized layout cannot silently read passive or Konjunktiv column',()=>{
 const d=parseVerbFlexionHtml(fixture('gehen-flexion.html').replaceAll('>Aktiv<','>Passiv<'));
 assert.equal(Object.keys(d).length,0);
});
test('live-source adjective preserves sourced comparison, without invented case table',()=>{
 const d=parseInflections(fixture('gut.txt'),'gut');assert.equal(cell(d,'Komparativ'),'besser');assert.equal(cell(d,'Superlativ'),'besten');assert.equal(d.tables.length,1);
});
test('German boundary excludes foreign paradigms and unsupported templates stay empty',()=>{
 const d=parseInflections('== test ({{Sprache|Englisch}}) ==\n{{Deutsch Substantiv Übersicht\n|Genus=m\n|Nominativ Singular=test\n}}','test');assert.equal(d.tables.length,0);
 const missing=parseInflections('== Wort ({{Sprache|Deutsch}}) ==\n{{Deutsch Substantiv Übersicht\n|Genus=n\n|Nominativ Singular=Wort\n|Dativ Plural={{unknown|Wörtern}}\n}}','Wort');assert.equal(cell(missing,'Dativ',1),'');
});
test('fetch enriches source cells, offline leaves unknown cells visible',async()=>{
 const good=await fetchInflections('gehen',fixture('gehen.txt'),async()=>({ok:true,text:async()=>fixture('gehen-flexion.html')}));
 assert.equal(good.tables[0].rows[0].cells[2][0],'bin gegangen');assert.equal(good.sources.length,2);
 const offline=await fetchInflections('gehen',fixture('gehen.txt'),async()=>{throw Error('offline')});
 assert.equal(offline.tables[0].rows[3].cells[0].length,0);assert(offline.warnings.length);
});

test('multiple genders never produce an assumed gender/form cross product',()=>{
 const d=parseInflections('== Band ({{Sprache|Deutsch}}) ==\n{{Deutsch Substantiv Übersicht\n|Genus 1=m\n|Genus 2=n\n|Genitiv Singular 1=Bandes\n|Genitiv Singular 2=Bands\n}}','Band');
 assert.equal(cell(d,'Genitiv'),'Bandes / Bands');assert(d.warnings.length);
});

test('regular verb source layout yields all persons without confusing active/passive',()=>{
 const d=parseVerbFlexionHtml(fixture('machen-flexion.html'));
 assert.equal(d['Perfekt'][0][0],'habe gemacht');assert.equal(d['Präteritum'][3][0],'machten');
 assert(d['Präsens'][1][0].startsWith('machst'));
 for(const tense of ['Präsens','Präteritum','Perfekt']) assert.equal(d[tense].filter(c=>c.length).length,6);
});

test('saved offline table renders source attribution and explicit unknown cells',async()=>{
 const { createRequire }=await import('node:module');const require=createRequire(import.meta.url);
 const component={};const jsx=ts.transpileModule(fs.readFileSync(new URL('../components/inflection-table.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(jsx,{exports:component,require});
 const data=JSON.parse(JSON.stringify(parseInflections(fixture('gehen.txt'),'gehen')));
 const html=require('react-dom/server').renderToStaticMarkup(require('react').createElement(component.InflectionTable,{data,lang:'tr'}));
 assert(html.includes('bulunamadı'));assert(html.includes('CC BY-SA 4.0'));const german=require('react-dom/server').renderToStaticMarkup(require('react').createElement(component.InflectionTable,{data}));assert(german.includes('nicht belegt'));assert(german.includes('Fall / Person'));assert(!german.includes('bulunamadı'));assert(html.includes('gegangen'));assert(html.includes('https://de.wiktionary.org/wiki/gehen'));
});
