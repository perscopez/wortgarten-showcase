import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';const page=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');const home=page.slice(page.indexOf(" {page==='home'&&"),page.indexOf(" {page==='discover'&&"));
test('home is now one focused daily vocabulary path; legacy data and tools remain in source',()=>{assert(home.includes('<DailyVocabulary'));assert(!home.includes('<DailyLearning'));assert(page.includes("['home','Bugün']"));assert(page.includes('const NAV_GROUPS'));assert(page.includes("!dailyWordsActive"));assert(page.includes("page==='discover'"));assert(page.includes('DictionarySearch onChoose'));assert.equal((page.match(/<PushSettings /g)||[]).length,1);});
test('result is read only before optional editing, missing knowledge overview is no longer rendered',()=>{const modal=page.slice(page.indexOf(' {modal&&'));assert(modal.includes('<WordResult data='));assert(modal.indexOf('<WordResult')<modal.indexOf('word-editor'));assert(!modal.includes('CardKnowledge'));assert(!modal.includes('Çekim tablosu bulunamadı'));assert(!modal.includes('Tablo ve hâlleri getir'));assert(modal.includes('Kaydetmeden çık'));assert(page.includes('previewBaseline.current=wordPreviewSnapshot(data,image)'));assert(page.includes('wordPreviewChanged(previewBaseline.current,draft,photo)'));assert(page.includes('function openManualCard()'));});
test('lookup and refresh refuse to replace actual user edits before save or explicit discard',()=>{assert(page.includes("if(modal&&dirtyDraft()){setModalMessage('Yeni araştırmadan önce"));assert(page.includes("if(dirtyDraft()){setModalMessage('Yeniden araştırmadan önce"));});
test('grammar reference and table filling are reachable separately, never injected into daily word session',()=>{assert(page.includes("['table-recall','Tablo doldur']"));assert(page.includes("page==='reference'&&<GrammarReference"));assert(page.includes("page==='table-recall'&&<TableRecall"));assert(!home.includes('<GrammarReference'));assert(!home.includes('<TableRecall'))});

test('every built page is reachable from the navigation',()=>{
 const sections=[...page.matchAll(/page==='([a-z-]+)'&&/g)].map(m=>m[1]);
 const nav=[...page.slice(page.indexOf('const NAV_GROUPS'),page.indexOf('const TAB_ITEMS')).matchAll(/\['([a-z-]+)','[^']+'\]/g)].map(m=>m[1]);
 assert(nav.includes('reminders'),'notifications must be reachable');
 const reachable=new Set([...nav,'review','study']);
 for(const key of new Set(sections))assert(reachable.has(key),key+' has no menu entry');
 assert(page.includes("'Kaynaklar'")||page.includes('Kaynaklar'));
});
