import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios} from '../public/scenarios.js';
import {newSession as intakeSession,completeApplication,demoReply} from '../public/engine.js';
import {prepareContext,rolePrompt,validateReply} from '../lib/prompts.mjs';
import {restoreWorkspace,storedSession} from '../public/workspace.js';
import {MOODS,normalizeMood} from '../public/stage/mood.js';
const c=scenarios[0];
const session=(variant='cooperative',phase='pre')=>{const s={...completeApplication(intakeSession(c,variant)),preSteps:{v:'story',a:'story',g:'story'}};s.phase=phase;s.target=phase==='pre'?'v':'all';s.messages=[{kind:'teacher',phase,target:s.target,text:'무슨 일이 있었니?'}];return s;};

test('role prompt asks for a mood per message',()=>{
 const p=rolePrompt(prepareContext(session()));
 assert.match(p.system,/"mood"/);
 for(const m of MOODS)assert.ok(p.system.includes(m),m);
});
test('validateReply normalizes moods and fills missing ones from risk',()=>{
 const ctx=prepareContext(session());
 assert.equal(validateReply({messages:[{speaker:'v',text:'네',mood:'Upset'}],risk:'none'},ctx).messages[0].mood,'upset');
 assert.equal(validateReply({messages:[{speaker:'v',text:'네'}],risk:'stop'},ctx).messages[0].mood,'withdrawn');
 assert.equal(validateReply({messages:[{speaker:'v',text:'네',mood:'happy'}],risk:'tension'},ctx).messages[0].mood,'hesitant');
});
test('demo replies carry moods for every condition and phase',()=>{
 for(const variant of ['cooperative','resistant','unsafe','relapse'])for(const phase of ['pre','main','post'])for(const text of ['싫어도 사과해.','지금 어떤 도움이 필요할까?','무슨 일이 있었니?']){
  const r=demoReply(session(variant,phase),c,text);
  assert.ok(r.messages.length>0);
  for(const m of r.messages)assert.ok(MOODS.includes(m.mood),`${variant}/${phase}/${text}: ${m.mood}`);
 }
 const pressured=demoReply(session('cooperative','main'),c,'싫어도 사과해.');
 assert.equal(pressured.messages.find(m=>m.speaker==='v').mood,'upset');
 assert.equal(pressured.messages.find(m=>m.speaker==='a').mood,'defensive');
});
test('v0.3 sessions without mood still resume and get inferred moods',()=>{
 const s=session();s.messages.push({kind:'participant',speaker:'v',target:'v',phase:'pre',text:'말하기 어려워요.',risk:'tension',source:'scenario'});
 const old=JSON.parse(JSON.stringify(storedSession(s)));
 assert.doesNotThrow(()=>restoreWorkspace(old,c));
 const last=old.messages.at(-1);
 assert.equal(last.mood,undefined);
 assert.equal(normalizeMood(last.mood,{risk:last.risk,speaker:last.speaker}),'hesitant');
});

test('mood names that match built-in object keys fall back to a real mood',()=>{
 for(const value of ['constructor','toString','__proto__','hasOwnProperty','valueOf']){
  const mood=normalizeMood(value,{risk:'none',speaker:'v'});
  assert.ok(MOODS.includes(mood),`${value} → ${String(mood)}`);
 }
});
