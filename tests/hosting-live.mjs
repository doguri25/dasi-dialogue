// No AI credentials or paid provider calls: all POST requests fail local validation.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {VERSION} from '../public/version.js';
const base=process.env.TEST_URL;
assert.ok(base?.startsWith('https://'),'Set TEST_URL to the public HTTPS origin.');
const checks=[];
async function check(path,status,init){const res=await fetch(base+path,{...init,redirect:'manual'});assert.equal(res.status,status,`${path}: ${res.status}`);checks.push({path,status});return res;}
const index=await check('/',200);assert.match(await index.text(),/다시, 대화/);assert.match(index.headers.get('content-security-policy'),/connect-src 'self'/);assert.match(index.headers.get('permissions-policy'),/microphone=\(self\)/);
assert.ok((await (await check('/version.js',200)).text()).includes(VERSION));
assert.equal((await check('/assets/scene-support.webp',200)).headers.get('content-type'),'image/webp');
for(const path of ['/server.mjs','/lib/providers.mjs','/docs/image-assets.local.json','/.env','/package.json'])await check(path,404);
const post=(data,origin=base)=>({method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});
for(const path of ['/api/check','/api/reply','/api/review']){
 const res=await check(path,400,post({}));assert.match(await res.text(),/API 키/);assert.match(res.headers.get('cache-control'),/no-store/);
}
await check('/api/check',403,post({},'https://other.example'));
await check('/api/check',405);
const invalid=await check('/api/check',400,post({provider:'not-a-service',apiKey:'dummy-test-only',model:'test'}));assert.match(await invalid.text(),/지원하지 않는/);
await check('/api/check',400,{...post({}),body:'{invalid json'});
await check('/api/check',413,post({apiKey:'dummy-test-only',padding:'가'.repeat(100000)}));
const result={passed:true,url:base,version:VERSION,checkedAt:new Date().toISOString(),checks,limits:'No real AI provider request or physical microphone used.'};
await mkdir('.test-artifacts',{recursive:true});await writeFile('.test-artifacts/hosting-live.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
