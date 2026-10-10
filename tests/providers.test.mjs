import test from 'node:test';
import assert from 'node:assert/strict';
import {callAI,defaults} from '../lib/providers.mjs';
const args=provider=>({provider,apiKey:'dummy-secret-test',model:defaults[provider],system:'SYSTEM',input:'INPUT'});
const success=provider=>Response.json(provider==='anthropic'?{content:[{type:'text',text:'{"ok":true}'}]}:provider==='gemini'?{candidates:[{content:{parts:[{text:'{"ok":true}'}]}}]}:{output:[{content:[{type:'output_text',text:'{"ok":true}'}]}]});
test('temporary provider failures retry once, respect Retry-After and retain one overall deadline',async()=>{
 for(const [provider,status] of [['anthropic',529],['gemini',503],['openai',500]]){
  let count=0,signals=[],delays=[];
  const result=await callAI(args(provider),async(url,opts)=>{signals.push(opts.signal);return ++count===1?Response.json({error:{message:'private raw data'}},{status,headers:{'Retry-After':'2'}}):success(provider);},{wait:async ms=>delays.push(ms)});
  assert.deepEqual(result,{ok:true});assert.equal(count,2);assert.deepEqual(delays,[2000]);assert.equal(signals[0],signals[1]);
 }
});
test('persistent overload reports service and original status without revealing raw content',async()=>{
 let count=0;await assert.rejects(callAI(args('anthropic'),async()=>{count++;return Response.json({error:{type:'overloaded_error',message:'echoed dummy-secret-test INPUT'}},{status:529});},{wait:async()=>{}}),err=>{
  assert.equal(err.status,502);assert.match(err.message,/Claude · HTTP 529/);assert.match(err.message,/한 번 자동 재시도/);assert.ok(!/dummy-secret|INPUT|overloaded_error/.test(err.message));return true;
 });assert.equal(count,2);
});
test('auth, billing and quota errors do not retry and expose useful safe guidance',async()=>{
 for(const [provider,status,error,pattern] of [['anthropic',402,{type:'billing_error'},/잔액 또는 결제/],['anthropic',400,{message:'Your credit balance is too low'},/잔액 또는 결제/],['openai',429,{code:'insufficient_quota'},/잔액 또는 결제/],['gemini',429,{status:'RESOURCE_EXHAUSTED'},/요청 제한 또는 사용량/],['openai',401,{},/인증/],['gemini',404,{},/모델을 찾을/]]){
  let count=0;await assert.rejects(callAI(args(provider),async()=>{count++;return Response.json({error},{status});},{wait:async()=>assert.fail('Do not retry')}),err=>{assert.match(err.message,pattern);assert.match(err.message,new RegExp(`HTTP ${status}`));return true;});assert.equal(count,1);
 }
});
test('long Retry-After or exhausted time budget returns actionable error without another request',async()=>{
 for(const mode of ['delay','budget']){
  let count=0,clock=0;await assert.rejects(callAI(args('gemini'),async()=>{count++;return new Response('not JSON',{status:503,headers:mode==='delay'?{'Retry-After':'120'}:{}});},{wait:async()=>assert.fail('Do not wait'),now:()=>clock++===0?0:55000}),/Gemini · HTTP 503/);assert.equal(count,1);
 }
});
test('truncated AI output is identified; network errors do not leak their raw message',async()=>{
 await assert.rejects(callAI(args('anthropic'),async()=>Response.json({stop_reason:'max_tokens',content:[{type:'text',text:'{"messages":'}]})),/출력 길이 한도/);
 await assert.rejects(callAI(args('openai'),async()=>{throw new Error('dummy-secret-test');}),err=>/네트워크/.test(err.message)&&!err.message.includes('dummy-secret'));
});
