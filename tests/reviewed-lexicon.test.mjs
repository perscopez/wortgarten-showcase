import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const module={exports:{}};vm.runInNewContext(buildSync({entryPoints:['lib/dictionary.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,{module,exports:module.exports,require:createRequire(import.meta.url)});
const {localEntry,reviewedEntry}=module.exports;
test('reviewed high-impact errors are fixed before raw dictionary fallback',()=>{assert.match(localEntry('dürfen').meaning,/izin/);assert.doesNotMatch(localEntry('dürfen').meaning,/mayıs/);assert.equal(localEntry('dauern').article,'');assert.match(localEntry('Massenmedium').meaning,/kitle iletişim/);assert.equal(localEntry('kurtzlich').word,'kürzlich');assert.equal(localEntry('sinvoll').word,'sinnvoll');assert.equal(localEntry('erkundingen').word,'sich erkundigen');});
test('reviewed examples agree with their teaching sense; preserve multiple valid meanings',()=>{assert.match(reviewedEntry('beschweren').meaning,/ağırlık/);assert.match(reviewedEntry('beschweren').example,/beschwere mich/);assert.match(reviewedEntry('unterhalten').meaning,/eğlendirmek/);assert.match(reviewedEntry('erinnern').meaning,/hatırlatmak/);assert.equal(reviewedEntry('Verwandter').word,'Verwandte');assert.equal(reviewedEntry('Verwandter').article,'der');assert.equal(reviewedEntry('Spinnen'),undefined);assert.equal(reviewedEntry('lauft herum'),undefined);});
