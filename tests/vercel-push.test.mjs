import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function bundle(path){
 const {outputFiles:[file]}=buildSync({entryPoints:[path],bundle:true,platform:'node',format:'cjs',packages:'external',write:false});
 const module={exports:{}};
 new Function('module','exports','require',file.text)(module,module.exports,require);
 return module.exports;
}
const {readBody,validSubscription}=bundle('lib/push.ts');
const {cronAuthorized}=bundle('lib/vercel-push-store.ts');
const site='https://wortgarten-beta.vercel.app';
function request(origin,body='{}'){return new Request(site+'/api/push/settings',{method:'POST',headers:{origin,'content-type':'application/json'},body});}
test('notification API requires same-origin JSON within the actual body cap',async()=>{
 assert.deepEqual(await readBody(request(site)),{});
 await assert.rejects(readBody(request('https://example.org')));
 await assert.rejects(readBody(request(site,'x'.repeat(10001))));
});
test('scheduled dispatch fails closed for empty, malformed or incorrect credentials',()=>{
 assert.equal(cronAuthorized(null,'test'),false);
 assert.equal(cronAuthorized('Bearer test',undefined),false);
 assert.equal(cronAuthorized('Basic test','test'),false);
 assert.equal(cronAuthorized('Bearer TEST','test'),false);
 assert.equal(cronAuthorized('Bearer test','test'),true);
});
test('push subscription requires an approved HTTPS push service and valid public key shapes',()=>{
 const keys={auth:'a'.repeat(22),p256dh:'p'.repeat(87)};
 assert.equal(validSubscription({endpoint:'https://web.push.apple.com/synthetic',keys}),true);
 assert.equal(validSubscription({endpoint:'https://web.push.apple.com.attacker.example/synthetic',keys}),false);
 assert.equal(validSubscription({endpoint:'https://fcm.googleapis.com/fcm/send/abc',keys:{...keys,auth:'short'}}),false);
});
test('old internal attribution links go to the new host, external sources stay intact',()=>{
 const {visualSourceLink}=bundle('lib/visual-source-link.ts');
 assert.equal(visualSourceLink('https://wortgarten-legacy-1.example.com/visual-sources.html#icons'),site+'/visual-sources.html#icons');
 assert.equal(visualSourceLink('https://commons.wikimedia.org/wiki/File:Test.jpg'),'https://commons.wikimedia.org/wiki/File:Test.jpg');
});
test('a subscription with a stale server key is distinguished from missing browser metadata',()=>{
 const {matchesPushKey}=bundle('lib/push-subscription-key.ts');
 const current=new Uint8Array([1,2,3]);
 assert.equal(matchesPushKey(current.buffer,current),true);
 assert.equal(matchesPushKey(new Uint8Array([1,2,4]).buffer,current),false);
 assert.equal(matchesPushKey(null,current),null);
});
