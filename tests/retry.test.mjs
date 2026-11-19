import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios} from '../public/scenarios.js';
import {newSession,completeApplication,exportText} from '../public/engine.js';
import {canRetry,retryLastTurn} from '../public/retry.js';
const c=scenarios[0];
const teacher=(s,text,extra={})=>s.messages.push({kind:'teacher',phase:s.phase,target:s.target,text,inputMethod:'write',...extra});
const reply=(s,speaker,text,mood='calm')=>s.messages.push({kind:'participant',phase:s.phase,target:s.target,speaker,text,mood,source:'scenario'});
function preSession(){const s=completeApplication(newSession(c));s.messages.push({kind:'participant',phase:'pre',target:'v',speaker:'v',text:'안녕하세요.',source:'scenario'});return s;}

test('taking back the last question removes it and the answers, and keeps them as a retried question',()=>{
 const s=preSession();s.preSteps={...s.preSteps,v:'story'};
 teacher(s,'무슨 일이 있었니?');reply(s,'v','그림에 줄이 그어져 있었어요.','hurt');
 assert.equal(canRetry(s),true);
 const turn=retryLastTurn(s);
 assert.equal(turn.text,'무슨 일이 있었니?');
 assert.deepEqual(s.messages.map(m=>m.text),['안녕하세요.']);
 assert.equal(s.retries.length,1);
 assert.equal(s.retries[0].text,'무슨 일이 있었니?');
 assert.deepEqual(s.retries[0].replies,[{speaker:'v',text:'그림에 줄이 그어져 있었어요.',mood:'hurt'}]);
 assert.equal(s.retries[0].phase,'pre');
 assert.equal(canRetry(s),false,'nothing left to take back');
});

test('taking back the introduction returns that student to the introduction step',()=>{
 const s=preSession();
 teacher(s,'오늘은 대화모임을 안내할게.',{preStep:'intro'});s.preSteps={...s.preSteps,v:'story'};reply(s,'v','네, 알겠어요.');
 retryLastTurn(s);
 assert.equal(s.preSteps.v,'intro');
});

test('questions can be taken back one after another within the same step',()=>{
 const s=preSession();s.preSteps={...s.preSteps,v:'story'};
 teacher(s,'첫 질문');reply(s,'v','첫 답');teacher(s,'둘째 질문');reply(s,'v','둘째 답');
 assert.equal(retryLastTurn(s).text,'둘째 질문');
 assert.equal(retryLastTurn(s).text,'첫 질문');
 assert.deepEqual(s.retries.map(r=>r.text),['둘째 질문','첫 질문']);
});

test('a question from an earlier step or to another person cannot be taken back',()=>{
 const s=preSession();s.preSteps={...s.preSteps,v:'story'};
 teacher(s,'무슨 일이 있었니?');reply(s,'v','속상했어요.');
 s.target='a';
 assert.equal(canRetry(s),false,'after switching to another student');
 s.target='v';s.phase='main';
 assert.equal(canRetry(s),false,'after moving on to the main meeting');
 assert.equal(retryLastTurn(s),null);
 assert.equal(s.messages.length,3);
});

test('a finished practice cannot be changed',()=>{
 const s=preSession();teacher(s,'무슨 일이 있었니?');reply(s,'v','속상했어요.');s.finished=true;
 assert.equal(canRetry(s),false);
});

test('the download lists the questions that were tried again',()=>{
 const s=preSession();s.preSteps={...s.preSteps,v:'story'};
 teacher(s,'왜 그랬어?');reply(s,'v','저도 잘 모르겠어요.','defensive');retryLastTurn(s);
 const text=exportText(s,c);
 assert.match(text,/## 다시 해 본 질문/);
 assert.match(text,/왜 그랬어\?/);
 assert.match(text,/저도 잘 모르겠어요\./);
});
