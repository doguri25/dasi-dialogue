import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios,variants} from '../public/scenarios.js';
import {newSession as intakeSession,completeApplication,canAdvance,transition,demoReply,localReview,exportText} from '../public/engine.js';
import {prepareContext,rolePrompt,validateReply,validateReview} from '../lib/prompts.mjs';
import {defaults,requestFor,callAI,parseJSON,AppError} from '../lib/providers.mjs';
function newSession(c,variant='cooperative'){return {...completeApplication(intakeSession(c,variant)),preSteps:{v:'story',a:'story',g:'story'}};}
const c=scenarios[0];

test('30 distinct cases each support four conditions and three phases',()=>{
 assert.equal(scenarios.length,30);assert.equal(new Set(scenarios.map(c=>c.id)).size,30);
 assert.equal(new Set(scenarios.map(c=>c.title)).size,30);
 for(const c of scenarios)for(const variant of Object.keys(variants))for(const phase of ['pre','main','post']){
  const s={...newSession(c,variant),phase};
  for(const target of ['v','a','g',...(phase==='pre'?[]:['all'])]){
   s.target=target;const reply=demoReply(s,c,'지금 어떤 도움이 필요할까?');
   assert.ok(reply.messages.every(m=>m.text.length>10));
   validateReply(reply,prepareContext(s));
  }
 }
});
test('a meeting cannot advance until consent/safety and later a review plan are recorded',()=>{
 let s=newSession(c);assert.equal(canAdvance(s),false);assert.throws(()=>transition(s));
 s.checks={v:true,a:true,g:true,safe:false,main:false};assert.equal(canAdvance(s),false);
 s.checks.safe=true;s=transition(s);assert.equal(s.phase,'main');assert.equal(s.target,'all');
 s.checks.main=true;s.agreement.action='아직 합의하지 못함';assert.equal(canAdvance(s),false);
 s.agreement.review='다음 주 담임이 학생별로 안전 확인';s=transition(s);assert.equal(s.phase,'post');
 assert.equal(canAdvance(s),false);
});
test('refusal stays refusal, pressure is not rewarded, and relapse differs from progress',()=>{
 const safe=newSession(c,'unsafe');assert.match(demoReply(safe,c,'원하지 않으면 멈춰도 돼.').messages[0].text,/오늘은 만나지/);
 assert.equal(demoReply(newSession(c),c,'무조건 사과해.').risk,'stop');
 assert.equal(demoReply(newSession(c),c,'사과는 안 해도 돼.').risk,'none');
 const relapse={...newSession(c,'relapse'),phase:'post'};
 assert.match(demoReply(relapse,c,'약속을 지켰니?').messages[0].text,/다시 지켜지지/);
 assert.match(demoReply({...relapse,variant:'cooperative'},c,'약속을 지켰니?').messages[0].text,/지켜졌/);
 safe.outcome='안전을 위한 보류·중단';assert.equal(localReview(safe,c).title,safe.outcome);
});
test('private pre-meeting turns are isolated from another student and the joint meeting',()=>{
 const s=newSession(c);s.messages=[{kind:'teacher',target:'v',phase:'pre',text:'PRIVATE_QUESTION'},{kind:'participant',speaker:'v',phase:'pre',text:'PRIVATE_VICTIM'},{kind:'teacher',target:'a',phase:'pre',text:'ACTOR_QUESTION'},{kind:'participant',speaker:'a',phase:'pre',text:'ACTOR_REPLY'},{kind:'teacher',target:'all',phase:'main',text:'SHARED_TURN'}];
 s.target='a';let p=rolePrompt(prepareContext(s));assert.ok(!p.input.includes('PRIVATE_'));assert.ok(p.input.includes('ACTOR_REPLY'));assert.ok(!p.input.includes('SHARED_TURN'));
 s.phase='main';s.target='all';p=rolePrompt(prepareContext(s));assert.ok(!p.input.includes('PRIVATE_'));assert.ok(!p.input.includes('ACTOR_REPLY'));assert.ok(p.input.includes('SHARED_TURN'));
});
test('untrusted session and AI output do not admit wrong roles or invalid shapes',()=>{
 assert.throws(()=>prepareContext({...newSession(c),target:'all'}),AppError);
 assert.throws(()=>prepareContext({...newSession(c),messages:Array(161).fill({})}),AppError);
 const ctx=prepareContext(newSession(c));
 assert.throws(()=>validateReply({messages:[{speaker:'a',text:'wrong role'}]},ctx),AppError);
 assert.throws(()=>validateReply({messages:[{speaker:'v',text:''}]},ctx),AppError);
 assert.throws(()=>validateReview({summary:'only'}),AppError);
 assert.throws(()=>parseJSON('plain non-JSON'),AppError);
});
test('all provider adapters use fixed origins, correct auth, and parse their response format',async()=>{
 const fixtures={openai:{output:[{type:'reasoning',content:[]},{content:[{type:'output_text',text:'{"ok":true}'}]}]},anthropic:{content:[{type:'thinking',thinking:'hidden'},{type:'text',text:'```json\n{"ok":true}\n```'}]},gemini:{candidates:[{content:{parts:[{thought:true,text:'hidden'},{text:'{"ok":true}'}]}}]}};
 for(const provider of Object.keys(defaults)){
  const r=requestFor(provider,'dummy-secret-test',defaults[provider],'SYSTEM','INPUT');
  assert.ok(r.url.startsWith('https://'));assert.ok(!r.url.includes('dummy-secret'));
  assert.ok(!JSON.stringify(r.body).includes('dummy-secret'));
  const result=await callAI({provider,apiKey:'dummy-secret-test',model:defaults[provider],system:'SYSTEM',input:'INPUT'},async(url,opts)=>{
   assert.equal(url,r.url);assert.equal(opts.method,'POST');assert.equal(opts.redirect,'error');
   assert.deepEqual(JSON.parse(opts.body),r.body);return Response.json(fixtures[provider]);
  });assert.deepEqual(result,{ok:true});
 }
 assert.equal(requestFor('openai','dummy-secret-test',defaults.openai,'','').body.store,false);
 assert.throws(()=>requestFor('unknown','dummy-secret-test','abc','',''),AppError);
 assert.throws(()=>requestFor('gemini','dummy-secret-test','https://evil.test','',''),AppError);
});
test('auth/limit errors are useful without leaking provider error bodies or keys',async()=>{
 for(const status of [400,401,403,404,429,500])await assert.rejects(callAI({provider:'openai',apiKey:'dummy-secret-test',model:defaults.openai,system:'',input:''},async()=>new Response('echoed dummy-secret-test',{status})),err=>err instanceof AppError&&!err.message.includes('dummy-secret')&&err.status===(status===500?502:status));
 await assert.rejects(callAI({provider:'openai',model:'x'},async()=>{}),AppError);
});
test('export uses Korean labels and includes transcript, agreement and reflection',()=>{
 const s=newSession(c);s.messages=[{kind:'teacher',phase:'pre',target:'v',text:'네 선택을 존중해.'}];s.agreement.review='금요일 개별 점검';s.reflection='더 천천히 듣기';
 const text=exportText(s,c);assert.match(text,/점검 계획: 금요일/);assert.match(text,/더 천천히 듣기/);assert.match(text,/네 선택을 존중해/);assert.ok(!text.includes('apiKey'));
});
