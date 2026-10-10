import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rememberWorkspace,restoreWorkspace,storedSession,sessionChanged,phaseReadiness} from '../public/workspace.js';
import {newSession,completeApplication,localReview,exportText} from '../public/engine.js';
import {questionOptions} from '../public/questions.js';
import {prepareContext,rolePrompt} from '../lib/prompts.mjs';
import {scenarios} from '../public/scenarios.js';
import {VERSION} from '../public/version.js';
const c=scenarios[0],session=()=>completeApplication(newSession(c));
test('manual save restores selected wording and input mode without storing an API key',()=>{
 const s=session(),choice=questionOptions(s,c)[5];
 rememberWorkspace(s,{draft:'아직 보내지 않은 문장',inputMode:'choices',selectedChoice:choice,choicePage:1,apiKey:'NEVER_STORE_THIS'});
 const record=storedSession(s),restored=restoreWorkspace(JSON.parse(JSON.stringify(record)),c);
 assert.equal(restored.draft,'아직 보내지 않은 문장');assert.equal(restored.selectedChoice.text,choice.text);assert.equal(restored.choicePage,1);assert.equal(restored.inputMode,'choices');assert.ok(!JSON.stringify(record).includes('NEVER_STORE_THIS'));
 assert.equal(sessionChanged(s,[record]),false);s.reflection='새로운 회고';assert.equal(sessionChanged(s,[record]),true);
});
test('drafts remain separate across participants and phases and never enter role context',()=>{
 const s=session();rememberWorkspace(s,{draft:'PRIVATE_VICTIM_DRAFT',inputMode:'write'});s.target='a';assert.equal(restoreWorkspace(s,c).draft,'');
 rememberWorkspace(s,{draft:'ACTOR_DRAFT',inputMode:'write'});s.target='v';assert.equal(restoreWorkspace(s,c).draft,'PRIVATE_VICTIM_DRAFT');
 s.phase='main';s.target='all';assert.equal(restoreWorkspace(s,c).draft,'');assert.ok(!rolePrompt(prepareContext(s)).input.includes('DRAFT'));
 s.phase='pre';s.target='a';assert.equal(restoreWorkspace(storedSession(s),c).draft,'ACTOR_DRAFT');
});
test('old records still resume with default input, and stale selected IDs are not sent',()=>{
 const s=session();assert.deepEqual(restoreWorkspace(s,c),{draft:'',inputMode:'choices',selectedChoice:null,choicePage:0});
 s.workspace={drafts:{'pre:v':'draft'},selectedChoiceId:'no-longer-valid',inputMode:'invalid',choicePage:90};assert.equal(restoreWorkspace(s,c).selectedChoice,null);assert.equal(restoreWorkspace(s,c).choicePage,0);
});
test('readiness explains unmet requirements and never treats an unsafe condition as ready',()=>{
 const s=session();let r=phaseReadiness(s,c);assert.equal(r.items.length,4);assert.equal(r.done,0);
 s.checks={v:true,a:true,g:true,safe:true,main:true};assert.equal(phaseReadiness(s,c).ready,true);
 s.variant='unsafe';assert.equal(phaseReadiness(s,c).paused,true);assert.ok(!phaseReadiness(s,c).ready);
 s.variant='cooperative';s.phase='main';r=phaseReadiness(s,c);assert.equal(r.done,1);assert.equal(r.ready,false);
 s.agreement.action='아직 합의하지 못한 부분';s.agreement.review='금요일 개별 점검';assert.equal(phaseReadiness(s,c).ready,true);
});
test('review evidence quotes actual dialogue and exported records include local and AI review',()=>{
 const s=session();s.messages=[{kind:'teacher',phase:'pre',target:'v',text:'무슨 일이 있었니?'},{kind:'teacher',phase:'pre',target:'v',text:'원하지 않으면 멈춰도 돼.'}];
 const review=localReview(s,c);assert.equal(review.evidence.find(x=>x.name==='경험과 영향 듣기').quote,'무슨 일이 있었니?');assert.equal(review.evidence.find(x=>x.name==='필요 확인').quote,'');
 const local=exportText(s,c);assert.match(local,/## 체험 회고/);assert.match(local,/경험과 영향 듣기 \(사전모임\): 무슨 일이 있었니/);
 const ai={title:'AI 회고 제목',summary:'실제 연습을 돌아봅니다.',strengths:['구체적 강점'],improvements:['확인할 부분'],nextPractice:'다음 연습'};
 const record=storedSession(s,ai);assert.match(exportText(record,c),/## AI 심층 회고/);assert.match(exportText(record,c),/구체적 강점/);assert.match(exportText(record,c),/경험과 영향 듣기 \(사전모임\): 무슨 일이 있었니/);assert.equal(sessionChanged(s,[record],ai),false);assert.equal(sessionChanged(s,[record],{...ai,summary:'새 회고'}),true);
});
test('app and package versions match',async()=>{assert.equal(VERSION,JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version);});
