import test from 'node:test';
import assert from 'node:assert/strict';
import {questionOptions} from '../public/questions.js';
import {normalizeChoices} from '../public/followups.js';
import {prepareContext,rolePrompt,validateReply} from '../lib/prompts.mjs';
import {newSession,completeApplication,demoReply,classify} from '../public/engine.js';
import {scenarios} from '../public/scenarios.js';
const c=scenarios[0];
const choices=Array.from({length:4},(_,i)=>({label:`의도 ${i}`,text:`방금 말한 그림을 돌려받는 방법 ${i}에 대해 더 이야기해 줄래?`}));
function session(phase='pre',target='v'){
 const s={...completeApplication(newSession(c)),phase,target,preSteps:{v:'story',a:'story',g:'story'}};
 s.messages=[{kind:'teacher',phase,target,text:'어떤 일이 있었니?',preStep:'story'},{kind:'participant',phase,target,speaker:target==='all'?'v':target,text:'제 그림을 허락 없이 가져갔어요.'}];return s;
}
test('latest participant response drives choices across phases and targets; wording changes with the reply',()=>{
 for(const phase of ['pre','main','post'])for(const target of ['v','a','g',...(phase==='pre'?[]:['all'])]){
  const s=session(phase,target),q=questionOptions(s,c);assert.equal(q.length,8);assert.equal(q[0].source,'context');assert.match(q[0].text,/그림을 허락 없이/);
  s.messages.push({kind:'teacher',phase,target,text:'그 뒤에는?'},{kind:'participant',phase,target,speaker:target==='all'?'a':target,text:'그 뒤에 복도에서 기다렸어요.'});
  const next=questionOptions(s,c);assert.match(next[0].text,/복도에서/);assert.ok(!next[0].text.includes('제 그림'));assert.notEqual(next[0].id,q[0].id);
 }
});
test('AI choices are validated, saved with the response and not leaked into another private meeting',()=>{
 const s=session(),reply={messages:[{speaker:'v',text:'제 그림을 다시 받고 싶어요.'}],teacherChoices:choices};
 const valid=validateReply(reply,prepareContext(s));assert.deepEqual(valid.teacherChoices,choices);
 s.messages.at(-1).nextQuestions=valid.teacherChoices;assert.equal(questionOptions(s,c)[0].text,choices[0].text);assert.equal(questionOptions(s,c)[0].source,'ai');
 const reloaded=JSON.parse(JSON.stringify(s));assert.deepEqual(questionOptions(reloaded,c),questionOptions(s,c));
 s.target='a';s.messages.push({kind:'teacher',phase:'pre',target:'a',text:'네 이야기는?'},{kind:'participant',phase:'pre',speaker:'a',target:'a',text:'저도 설명하고 싶어요.'});
 assert.ok(!JSON.stringify(questionOptions(s,c)).includes('그림을 돌려받는'));assert.match(questionOptions(s,c)[0].text,/저도 설명/);
 const prompt=rolePrompt(prepareContext(s));assert.match(prompt.system,/teacherChoices/);assert.ok(!prompt.input.includes('그림을 돌려받는'));assert.ok(!prompt.input.includes('허락 없이'));
 s.phase='main';s.target='all';assert.ok(!JSON.stringify(questionOptions(s,c)).includes('저도 설명'));
});
test('invalid/missing/repeated AI options fall back without discarding the student response',()=>{
 for(const value of [null,[],[{label:'x',text:'x'}],Array(4).fill({label:'x',text:'same'}),[...choices.slice(0,3),{label:'long',text:'x'.repeat(501)}]]){
  assert.deepEqual(normalizeChoices(value),[]);const s=session();s.messages.at(-1).nextQuestions=value;assert.equal(questionOptions(s,c)[0].source,'context');
  assert.equal(validateReply({messages:[{speaker:'v',text:'유효한 학생 응답'}],teacherChoices:value},prepareContext(s)).messages[0].text,'유효한 학생 응답');
 }
});
test('intro remains first, then story; refusal leads to pause and support',()=>{
 const s=session();s.preSteps.v='intro';assert.ok(questionOptions(s,c).every(q=>q.id.startsWith('pre-intro')));
 s.preSteps.v='story';s.messages[0].preStep='intro';s.messages[1].text='설명을 들으니 조금 알겠어요.';
 assert.match(questionOptions(s,c)[0].text,/설명을 들으니.*무슨 일이 있었는지/);
 s.messages[1].risk='stop';assert.match(questionOptions(s,c)[0].text,/멈추고 따로/);assert.ok(!questionOptions(s,c)[0].text.includes('무슨 일이 있었는지'));
});
test('a quoted student question about breaks does not hijack the demo story question',()=>{
 const s=session();s.messages[0].preStep='intro';s.messages[1].text='모임이 어떤 자리인지 조금 알겠어요. 말하기 어려우면 잠깐 쉬어도 되는 거죠?';
 const question=questionOptions(s,c)[0].text;assert.equal(classify(question),'story');assert.equal(demoReply(s,c,question).messages[0].text,c.victim.opening);
 assert.equal(classify('“무조건 사과해.”라고 말해 주었구나. 그때 어떤 마음이 들었니?'),'feeling');
 assert.equal(classify('“쉬고 싶어요.”라고 말해 주었구나. 그래도 무조건 사과해.'),'pressure');
});
