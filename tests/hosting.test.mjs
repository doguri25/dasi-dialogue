import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
import {createAPIHandler,securityHeaders} from '../lib/http-api.mjs';
import deployedHandler from '../api/[action].js';
import {newSession} from '../public/engine.js';
import {scenarios} from '../public/scenarios.js';

const payload={provider:'anthropic',model:'claude-sonnet-4-6',apiKey:'dummy-hosting-test'};
function request(data=payload,options={}){
 return {method:'POST',url:'/api/check',headers:{host:'dasi-dialogue.example',origin:'https://dasi-dialogue.example','content-type':'application/json'},body:data,...options};
}
async function invoke(handler,req){
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(status,headers){this.status=status;Object.assign(this.headers,headers);},end(body){this.data=JSON.parse(body);}};
 await handler(req,res);return res;
}

test('hosted HTTPS handler accepts parsed and streamed JSON, isolates premeeting context, and never echoes keys',async()=>{
 const calls=[];
 const handler=createAPIHandler(async data=>{calls.push(data);return data.input==='Connection test.'?{ok:true}:{messages:[{speaker:'v',text:'조용한 곳에서 제 이야기를 하고 싶어요.'}],observation:'이야기를 시작합니다.',risk:'none',coaching:{strength:'기다리기',nextQuestion:'어떤 일이 있었니?'}};});
 const check=await invoke(handler,request());assert.equal(check.status,200);assert.deepEqual(check.data,{ok:true});assert.equal(check.headers['Cache-Control'],'no-store');
 const stream=Readable.from([Buffer.from(JSON.stringify(payload))]);Object.assign(stream,{method:'POST',url:'/api/check',headers:request().headers});assert.equal((await invoke(handler,stream)).status,200);
 const session={...newSession(scenarios[0]),phase:'pre',target:'v',messages:[{kind:'participant',speaker:'a',phase:'pre',target:'a',text:'다른 학생의 비공개 이야기'},{kind:'teacher',phase:'pre',target:'v',text:'무슨 일이 있었는지 말해 줄래?'}]};
 const reply=await invoke(handler,request({...payload,session},{url:'/api/reply'}));assert.equal(reply.status,200);assert.match(calls.at(-1).input,/무슨 일이/);assert.ok(!calls.at(-1).input.includes('다른 학생의 비공개 이야기'));assert.ok(!JSON.stringify(reply).includes(payload.apiKey));
 const before=calls.length;
 for(const origin of ['http://dasi-dialogue.example','https://other.example','null'])assert.equal((await invoke(handler,request(payload,{headers:{...request().headers,origin}}))).status,403);
 assert.equal((await invoke(handler,request(payload,{url:'/api/unknown'}))).status,404);assert.equal(calls.length,before);
});

test('hosted handler rejects missing keys, invalid JSON and oversized bodies before provider calls',async()=>{
 const handler=createAPIHandler(()=>{assert.fail('must not call a provider');});
 assert.equal((await invoke(deployedHandler,request({}))).status,400);
 const broken=request();Object.defineProperty(broken,'body',{get(){throw new SyntaxError('bad JSON');}});assert.equal((await invoke(handler,broken)).status,400);
 assert.equal((await invoke(handler,request({...payload,padding:'가'.repeat(100000)}))).status,413);
 assert.equal((await invoke(handler,request(payload,{headers:{...request().headers,'content-length':'250001'}}))).status,413);
 assert.equal((await invoke(handler,request(payload,{method:'GET'}))).status,405);
});

test('deployment publishes only public assets and keeps the same security headers',async()=>{
 const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(config.outputDirectory,'public');assert.ok(config.functions['api/*.js'].maxDuration>60);
 assert.deepEqual(Object.fromEntries(config.headers[0].headers.map(({key,value})=>[key,value])),securityHeaders);
});
