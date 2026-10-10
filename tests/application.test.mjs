import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios,variants} from '../public/scenarios.js';
import {newSession,completeApplication,canAdvance,exportText} from '../public/engine.js';
import {applicationFor} from '../public/application.js';
import {portraitFor,sceneFor} from '../public/artwork.js';
import {prepareContext,rolePrompt} from '../lib/prompts.mjs';
import {preStepFor,markIntroductionSent} from '../public/premeeting.js';
import {questionOptions} from '../public/questions.js';
import {demoReply,opening} from '../public/engine.js';
const c=scenarios[0];
test('all 120 training applications match their case, school grade and consent condition',()=>{
 for(const c of scenarios)for(const variant of Object.keys(variants)){
  const a=applicationFor(c,variant),s=newSession(c,variant);
  assert.equal(s.phase,'intake');assert.equal(s.messages.length,0);assert.ok(a.background.includes(c.summary));assert.equal(a.positions[0].name,c.victim.name);
  assert.equal(a.canPrepare,variant!=='unsafe'&&!(variant==='resistant'&&Number(c.id.slice(-2))%3===1));
  assert.match(portraitFor(c,'v'),/^assets\/student-/);assert.notEqual(portraitFor(c,'v'),portraitFor(c,'a'));assert.match(sceneFor(c).src,/scene-/);
 }
});
test('every application goes straight to a pre-meeting without review input or a decision',()=>{
 for(const variant of Object.keys(variants)){
  const intake=newSession(c,variant);assert.throws(()=>prepareContext(intake));
  const s=completeApplication(intake);assert.equal(s.phase,'pre');assert.ok(s.application.readAt);assert.equal(s.application.decision,undefined);
  assert.equal(canAdvance(s),false);assert.deepEqual(s.checks,{v:false,a:false,g:false,safe:false,main:false});assert.equal(preStepFor(s),'intro');assert.throws(()=>completeApplication(s));
 }
});
test('pre-meeting starts with an introduction and then listens to what happened for each student',()=>{
 const s=completeApplication(newSession(c));
 assert.notEqual(opening(s,c),c.victim.opening);
 for(const target of ['v','a','g']){
  s.target=target;assert.equal(preStepFor(s),'intro');const choices=questionOptions(s,c);assert.equal(choices.length,8);
  for(const q of choices)assert.notEqual(demoReply(s,c,q.text).risk,'stop');
  assert.match(choices[0].text,/모임/);assert.match(rolePrompt(prepareContext(s)).system,/대화모임 안내/);
  const reply=demoReply(s,c,choices[0].text);assert.notEqual(reply.messages[0].text,c.victim.opening);
  s.messages.push({kind:'teacher',phase:'pre',target,text:choices[0].text});markIntroductionSent(s);
  assert.equal(preStepFor(s),'story');const story=questionOptions(s,c);assert.match(story[0].text,/무슨 일이|어떤 일이/);assert.equal(story.length,8);
  assert.match(rolePrompt(prepareContext(s)).system,/안내 이후 무슨 일이/);
 }
 s.target='v';assert.equal(preStepFor(s),'story');assert.equal(preStepFor(JSON.parse(JSON.stringify(s))),'story');
});
test('prior review data is preserved without blocking entry; refusal still blocks the joint meeting',()=>{
 const intake=newSession(c);intake.application={checks:{context:true},decision:'hold',notes:'이전 검토 메모',question:'이전 질문',completedAt:'2026-10-10'};
 const s=completeApplication(intake);assert.equal(s.phase,'pre');assert.match(exportText(s,c),/이전 검토 메모/);assert.match(exportText(s,c),/신청서 열람/);
 const unsafe=completeApplication(newSession(c,'unsafe'));unsafe.checks={v:true,a:true,g:true,safe:true};assert.equal(canAdvance(unsafe),false);
 assert.match(demoReply(unsafe,c,questionOptions(unsafe,c)[0].text).messages[0].text,/오늘은 만나지/);
 delete s.application;delete s.preSteps;s.messages=[{kind:'teacher',target:'v',phase:'pre',text:'이전 대화'}];assert.equal(preStepFor(s),'story');assert.equal(preStepFor(s,'a'),'intro');assert.match(exportText(s,c),/이전 버전/);
});
