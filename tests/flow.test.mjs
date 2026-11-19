import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios} from '../public/scenarios.js';
import {newSession} from '../public/engine.js';
import {OUTCOMES,defaultOutcome,startSession,worthKeeping,upsertRecord,remainingChecks} from '../public/flow.js';
const c=scenarios[0];

test('starting a practice skips the intake gate and records the reading time',()=>{
 const s=startSession(c,'resistant');
 assert.equal(s.phase,'pre');assert.equal(s.variant,'resistant');assert.equal(s.target,'v');
 assert.ok(!Number.isNaN(Date.parse(s.application.readAt)),'the application counts as read at the start');
 assert.equal(s.messages.length,0);
});

test('finishing picks an outcome without asking',()=>{
 assert.deepEqual(OUTCOMES,['관계회복 진전·실천 확인','부분 진전·추가 모임 필요','교착·합의에 이르지 못함','안전을 위한 보류·중단','약속 미이행·지원 재설계']);
 assert.equal(defaultOutcome(startSession(c,'unsafe')),'안전을 위한 보류·중단');
 assert.equal(defaultOutcome(startSession(c,'cooperative')),'부분 진전·추가 모임 필요');
 assert.equal(defaultOutcome({...startSession(c,'cooperative'),phase:'main'}),'부분 진전·추가 모임 필요');
 assert.equal(defaultOutcome({...startSession(c,'cooperative'),phase:'post'}),'관계회복 진전·실천 확인');
 assert.equal(defaultOutcome({...startSession(c,'relapse'),phase:'post'}),'관계회복 진전·실천 확인');
});

test('only practices with something in them are kept',()=>{
 const s=startSession(c);
 s.messages.push({kind:'participant',speaker:'v',target:'v',phase:'pre',text:'선생님, 대화모임은 어떻게 하는 거예요?'});
 assert.equal(worthKeeping(s),false,'the student greeting alone is not worth a record');
 assert.equal(worthKeeping({...s,checks:{...s.checks,v:true}}),true);
 assert.equal(worthKeeping({...s,workspace:{drafts:{'pre:v':'쓰던 글'}}}),true);
 assert.equal(worthKeeping({...s,workspace:{drafts:{'pre:v':'   '}}}),false);
 assert.equal(worthKeeping({...s,agreement:{...s.agreement,action:'약속'}}),true);
 assert.equal(worthKeeping({...s,reflection:'배운 점'}),true);
 assert.equal(worthKeeping({...s,finished:true}),true);
 assert.equal(worthKeeping({...s,messages:[...s.messages,{kind:'teacher',phase:'pre',target:'v',text:'안녕'}]}),true);
 assert.equal(worthKeeping(null),false);
});

test('records keep the newest twenty, newest first, with the review',()=>{
 let list=[];
 const first=startSession(c);
 for(let i=0;i<25;i++)list=upsertRecord(list,{...startSession(c),id:'s'+i});
 assert.equal(list.length,20);assert.equal(list[0].id,'s24');
 list=upsertRecord(list,{...first,reflection:'한 번'});list=upsertRecord(list,{...first,reflection:'두 번'},{title:'회고'});
 assert.equal(list.length,20);assert.equal(list[0].id,first.id);assert.equal(list[0].reflection,'두 번');assert.equal(list[0].savedReview.title,'회고');
 assert.equal(list.filter(x=>x.id===first.id).length,1);
 const live={...first,reflection:'원본'};const kept=upsertRecord([],live);kept[0].reflection='바뀜';assert.equal(live.reflection,'원본','the record is a copy');
});

test('the notes badge counts what is still to confirm in this phase',()=>{
 const s=startSession(c);
 assert.equal(remainingChecks(s,c),4);
 assert.equal(remainingChecks({...s,checks:{...s.checks,v:true,safe:true}},c),2);
 assert.equal(remainingChecks(startSession(c,'unsafe'),c),0,'a paused practice has nothing to tick');
 const main={...s,phase:'main'};
 assert.equal(remainingChecks(main,c),3);
 assert.equal(remainingChecks({...main,checks:{...s.checks,main:true},agreement:{...s.agreement,action:'약속',review:'금요일'}},c),0);
 assert.equal(remainingChecks({...s,phase:'post'},c),0);
 assert.equal(remainingChecks(newSession(c),c),0,'an old intake record has no checks');
});
