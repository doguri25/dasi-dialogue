// 체험(시나리오) 대화의 개연성: 같은 말을 되풀이하지 않고, 물은 것에 답하고, 이야기가 한 걸음씩 이어집니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios} from '../public/scenarios.js';
import {CASEBOOK,BEATS} from '../public/casebook.js';

test('every case has its own story beats for each person',()=>{
 assert.deepEqual(Object.keys(CASEBOOK).sort(),scenarios.map(c=>c.id).sort());
 for(const c of scenarios){
  const book=CASEBOOK[c.id],seen=new Set([c.victim.opening,c.actor.opening]);
  for(const [role,keys] of Object.entries(BEATS))for(const key of keys){
   const line=book[role]?.[key];
   assert.equal(typeof line,'string',`${c.id} ${role}.${key} is missing`);
   assert.ok(line.length>=12&&line.length<=150,`${c.id} ${role}.${key} length ${line.length}`);
   assert.match(line,/[.?!]$/,`${c.id} ${role}.${key} ends a sentence`);
   assert.doesNotMatch(line,/[{}]|undefined/,`${c.id} ${role}.${key} has no placeholder`);
   assert.ok(!seen.has(line),`${c.id} ${role}.${key} repeats another line`);seen.add(line);
  }
 }
});

import {newSession,completeApplication,transition,demoReply,classify,localReview} from '../public/engine.js';
import {questionOptions} from '../public/questions.js';
import {preStepFor,markIntroductionSent} from '../public/premeeting.js';
import {variants} from '../public/scenarios.js';
const byId=id=>scenarios.find(c=>c.id===id);
// 앱(app.js)과 같은 순서로 한 번 말을 건네고 답을 기록합니다.
function say(s,c,text){
 const preStep=s.phase==='pre'?preStepFor(s):undefined;if(preStep)s.preSteps={...s.preSteps,[s.target]:preStep};
 s.messages.push({preStep,kind:'teacher',phase:s.phase,target:s.target,text});
 const r=demoReply(s,c,text);
 for(const m of r.messages)s.messages.push({kind:'participant',phase:s.phase,target:s.target,...m,risk:r.risk,source:'scenario'});
 if(r.teacherChoices)s.messages.at(-1).nextQuestions=r.teacherChoices;
 if(preStep==='intro')markIntroductionSent(s);
 return r;
}
const start=(c,variant='cooperative')=>completeApplication(newSession(c,variant));
const text=(r,role)=>r.messages.find(m=>m.speaker===role)?.text||'';
const intro=(s,c)=>say(s,c,questionOptions(s,c)[0].text);

test('teacher questions are read by what they ask, not by a stray word',()=>{
 const table={
  '무슨 일이 있었는지 네가 기억하는 대로 이야기해 줄래?':'story','그다음에는 어떤 일이 이어졌니? 천천히 들어 볼게.':'story',
  '그 일이 있은 뒤 학교생활에서 무엇이 달라졌니?':'impact','그 일이 일어났을 때 어떤 생각이 들었고 어떤 마음이었니?':'feeling',
  '선생님이 아직 듣지 못한 이야기나 꼭 말하고 싶은 것이 있니?':'more','네 이야기를 선생님이 제대로 들었는지 확인하고 싶어. 빠뜨리거나 다르게 이해한 부분이 있니?':'check',
  '모임 방식에서 더 궁금하거나 확인하고 싶은 점이 있니?':'about','이제 네가 겪은 일을 이야기해도 괜찮겠니? 준비가 안 됐다면 기다릴게.':'ready',
  '서로의 이야기를 듣는 동안 어떤 약속이 있으면 좋을까?':'ground','다른 사람의 이야기를 듣고 새롭게 알게 된 점은 무엇이니?':'heard',
  '그 행동이 상대의 생활에 어떤 영향을 주었을까?':'responsibility','그 일이 너의 일상에 어떤 영향을 주었는지 말해 줄래?':'impact',
  '피해를 줄이고 회복을 돕기 위해 스스로 실천할 수 있는 행동은 무엇일까?':'repair','제안된 회복 방법 중 받아들일 수 있는 것과 원하지 않는 것은 무엇이니?':'repair',
  '각자가 동의한 행동을 누가 언제부터 어떻게 실천하면 좋을까?':'plan','이 제안에 동의하지 않는 부분이나 바꾸고 싶은 부분이 있니? 거절해도 괜찮아.':'agree',
  '약속이 지켜지는지 누가 언제 확인하고, 어려우면 누구에게 도움을 요청할까?':'plan','약속 중 실제로 지켜진 것은 무엇이니? 구체적인 장면을 말해 줄래?':'followup',
  '다시 불편하거나 두려웠던 일이 있었니? 지금도 안전하게 느끼는지 알고 싶어.':'safety','약속을 지키기 어려웠던 순간에는 어떤 일이 있었니?':'hard',
  '앞으로 함께 만나고 싶은지, 따로 도움받고 싶은지 네 생각을 들려줄래?':'consent','말하고 싶다면, 어떤 일이 불편했는지 들려줄래? 말하기 어려운 것은 넘어가도 돼.':'story',
  '지금 선생님이 도와주었으면 하는 것이 있니?':'need','싫어도 사과해.':'pressure','원하지 않으면 멈춰도 돼.':'safety'
 };
 for(const [q,want] of Object.entries(table))assert.equal(classify(q),want,q);
});

test('a student tells the story one step at a time instead of repeating the first line',()=>{
 const c=byId('case-01'),book=CASEBOOK[c.id],s=start(c);intro(s,c);
 assert.equal(text(say(s,c,'무슨 일이 있었는지 네가 기억하는 대로 이야기해 줄래?'),'v'),c.victim.opening);
 assert.equal(text(say(s,c,'그다음에는 어떤 일이 이어졌니?'),'v'),book.v.scene);
 assert.equal(text(say(s,c,'그때 어떤 마음이었니?'),'v'),book.v.feel);
 assert.equal(text(say(s,c,'그 일이 있은 뒤 학교생활에서 무엇이 달라졌니?'),'v'),book.v.change);
 assert.equal(text(say(s,c,'앞으로 무엇이 달라지면 좋겠니?'),'v'),book.v.want);
 const again=text(say(s,c,'무슨 일이 있었는지 다시 이야기해 줄래?'),'v');assert.notEqual(again,c.victim.opening);assert.notEqual(again,book.v.scene);
});

test('the first suggestion answers what the student just asked',()=>{
 const c=byId('case-02'),s=start(c);const r=intro(s,c);
 assert.match(text(r,'v'),/\?$/);
 const first=questionOptions(s,c)[0];assert.equal(first.source,'context');assert.match(first.text,/쉬/);assert.equal(classify(first.text),'story');
 s.target='a';const ra=intro(s,c);assert.match(text(ra,'a'),/\?$/);assert.match(questionOptions(s,c)[0].text,/너하고만|오늘은 너/);
});

test('in the private pre-meeting the other student does not know what the first one said',()=>{
 for(const c of scenarios){
  const s=start(c),book=CASEBOOK[c.id];intro(s,c);for(let i=0;i<5;i++)say(s,c,questionOptions(s,c)[0].text);
  s.target='a';intro(s,c);const said=[];for(let i=0;i<6;i++)said.push(...say(s,c,questionOptions(s,c)[i%4].text).messages.map(m=>m.text));
  for(const t of said){
   assert.doesNotMatch(t,/이야기를 듣고|얘기를 듣고|말을 들으니/,`${c.id}: ${t}`);
   for(const k of ['scene','feel','change','want'])assert.ok(!t.includes(book.v[k]),`${c.id} actor repeats the victim's private ${k}`);
   assert.ok(!t.includes(book.a.heard),`${c.id} actor already knows what he only hears in the joint meeting`);
  }
 }
});

test('the guardian says what the child told them, what they saw at home and what they ask of the school',()=>{
 const c=byId('case-07'),book=CASEBOOK[c.id],s=start(c);s.target='g';intro(s,c);
 assert.equal(text(say(s,c,'어떤 일이 있었다고 학생에게 들으셨나요? 기억하시는 대로 말씀해 주세요.'),'g'),book.g.heard);
 assert.equal(text(say(s,c,'그 일이 있은 뒤 학생의 일상에서 무엇이 달라졌나요?'),'g'),book.g.saw);
 assert.equal(text(say(s,c,'지금 어른이 도울 수 있는 일은 무엇일까요?'),'g'),book.g.ask);
});

test('a resistant student holds back at first and opens up when the teacher listens',()=>{
 const c=byId('case-04'),s=start(c,'resistant');intro(s,c);
 const first=text(say(s,c,'무슨 일이 있었는지 이야기해 줄래?'),'v'),second=text(say(s,c,'무슨 일이 있었니?'),'v');
 assert.notEqual(first,c.victim.opening);assert.notEqual(first,second);
 say(s,c,'말하기 싫은 건 넘어가도 돼. 쉬어도 괜찮아.');
 assert.ok(text(say(s,c,'무슨 일이 있었는지 들려줄래?'),'v').includes(c.victim.opening));
});

function toMain(s){s.checks={...s.checks,v:true,a:true,g:true,safe:true};return transition(s);}
test('in the joint meeting, what someone learned comes after both have spoken',()=>{
 const c=byId('case-10'),book=CASEBOOK[c.id];let s=toMain(start(c));
 assert.ok(!text(say(s,c,'다른 사람의 이야기를 듣고 새롭게 알게 된 점은 무엇이니?'),'a').includes(book.a.heard));
 const told=say(s,c,`${c.victim.name}부터 그 일이 어땠는지 이야기해 줄래?`);
 assert.ok(text(told,'v').includes(c.victim.opening));assert.ok(text(told,'a').includes(c.actor.opening));
 assert.equal(text(say(s,c,'다른 사람의 이야기를 듣고 새롭게 알게 된 점은 무엇이니?'),'a'),book.a.heard);
 assert.ok(text(say(s,c,'피해를 줄이고 회복을 돕기 위해 스스로 실천할 수 있는 행동은 무엇일까?'),'a').includes(book.a.do));
});

test('after a week, kept and broken promises sound different',()=>{
 for(const variant of ['cooperative','relapse']){
  const c=byId('case-19'),book=CASEBOOK[c.id];let s=toMain(start(c,variant));s.checks.main=true;s.agreement.action='x';s.agreement.review='y';s=transition(s);
  const r=say(s,c,'약속 중 실제로 지켜진 것은 무엇이니? 구체적인 장면을 말해 줄래?');
  if(variant==='relapse'){assert.ok(text(r,'v').includes(book.v.still));assert.ok(text(r,'a').includes(book.a.slip));}
  else{assert.ok(text(r,'v').includes(book.v.after));assert.ok(text(r,'a').includes(book.a.kept));}
 }
});

// 대본 전체: 제안 문장만 골라 끝까지 대화해도 같은 말을 되풀이하지 않고, 사례 문구를 조사 없이 이어 붙이지 않습니다.
test('every case and condition can be played through with suggestions without repeating itself',()=>{
 const echo=/라고 (?:말해 주었구나|말씀하셨군요)/;
 for(const c of scenarios)for(const variant of Object.keys(variants)){
  let s=start(c,variant);const where=`${c.id}/${variant}`;
  const turn=i=>{
   const opts=questionOptions(s,c),q=opts[i%opts.length];const r=say(s,c,q.text);
   assert.ok(r.messages.length>0&&r.messages.every(m=>m.text.length>=8),`${where}: empty reply to ${q.text}`);
   const scripted=r.teacherChoices||[];assert.equal(scripted.length,4,`${where}: four follow-up suggestions`);
   assert.ok(scripted.filter(x=>echo.test(x.text)).length<=1,`${where}: at most one echo`);
   const asked=new Set(s.messages.filter(m=>m.kind==='teacher'&&m.phase===s.phase&&m.target===s.target).map(m=>m.text));
   for(const x of scripted)assert.ok(!asked.has(x.text),`${where}: suggests a question already asked: ${x.text}`);
  };
  for(const t of ['v','a','g']){s.target=t;intro(s,c);for(const i of [0,1,0,2,0,3,0])turn(i);s.checks[t]=true;}
  if(variant!=='unsafe'){s.checks.safe=true;s=transition(s);for(const i of [0,0,1,0,2,0,0,3,0])turn(i);
   s.checks.main=true;s.agreement.action='x';s.agreement.review='y';s=transition(s);for(const i of [0,1,0,2,0,3])turn(i);}
  const lines=new Map();
  for(const m of s.messages.filter(m=>m.kind==='participant')){
   const key=`${m.phase}:${m.speaker}`;const list=lines.get(key)||[];
   assert.ok(!list.includes(m.text),`${where} ${key} repeats: ${m.text}`);list.push(m.text);lines.set(key,list);
   assert.ok(!m.text.includes(c.repair),`${where}: the case's repair note is read out as speech`);
   assert.doesNotMatch(m.text,new RegExp(c.victim.need.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(가|를|라는|도) '),`${where}: need phrase glued with a particle`);
  }
 }
});

test('case notes read naturally around the need phrase',()=>{
 for(const c of scenarios){
  assert.doesNotMatch(c.goal,/기를 중심|기가 실제로/,c.goal);assert.doesNotMatch(c.followup,/기가 실제로|기를 중심/,c.followup);
 }
});

test('review evidence counts the new kinds of questions',()=>{
 const c=byId('case-01'),s=start(c);intro(s,c);say(s,c,'그 일이 있은 뒤 학교생활에서 무엇이 달라졌니?');
 const ev=localReview(s,c).evidence.find(x=>x.name==='경험과 영향 듣기');assert.equal(ev.status,'질문 흔적 있음');
});

import {prepareContext,rolePrompt} from '../lib/prompts.mjs';
// AI 연결에서도 같은 사례 이야기를 쓰되, 사전모임에서는 그 사람의 이야기만 건넵니다.
test('the AI gets the same case story, only for the people who are speaking',()=>{
 const c=byId('case-05'),book=CASEBOOK[c.id];
 const s=start(c);s.target='a';s.preSteps={v:'story',a:'story',g:'story'};
 let p=rolePrompt(prepareContext(s));
 assert.ok(p.input.includes(book.a.scene));assert.ok(!p.input.includes(book.v.scene),'the actor prompt carries the victim story');assert.ok(!p.input.includes(book.a.heard));
 assert.match(p.system,/되풀이|반복/);assert.match(p.system,/한두 가지/);
 s.phase='main';s.target='all';p=rolePrompt(prepareContext(s));
 assert.ok(p.input.includes(book.v.scene)&&p.input.includes(book.a.scene));
 const post={...s,phase:'post',variant:'relapse'};p=rolePrompt(prepareContext(post));
 assert.ok(p.input.includes(book.v.still));assert.ok(!p.input.includes(book.v.after));
});

// 학년에 맞는 말투: 초등 사례에서는 학생도 교사도 쉬운 말을 씁니다. 중등·고등은 원래 문장을 씁니다.
const KID_SAYS=/(부담|허탈|과장|영향|인정받|책임|휩쓸|거리를 두|변명|의도|정정|명예|해명|사생활|무심|판단|증명|공정|기준|권한|협의|확산|완성도|껄끄|조정|통제|위축|악의|무례|당사자)/;
const KID_HEARS=/(강요|회복|실천|동의|점검|영향|존중|대면|보류|접촉|책임|구체적|방식)/;
test('elementary students speak like elementary students',()=>{
 for(const c of scenarios.filter(c=>c.grade==='초등')){
  const b=CASEBOOK[c.id];
  for(const [role,lines] of [['v',{opening:c.victim.opening,...b.v}],['a',{opening:c.actor.opening,...b.a}]])
   for(const [k,t] of Object.entries(lines))assert.doesNotMatch(t,KID_SAYS,`${c.id} ${role}.${k}: ${t}`);
 }
});
test('teachers talk to elementary students in plain words, older students keep the full wording',()=>{
 const offered=c=>{
  const seen=[],replies=[];
  for(const variant of Object.keys(variants)){
   let s=start(c,variant);
   const look=()=>{if(s.target!=='g')seen.push(...questionOptions(s,c).map(q=>q.text));};
   const turn=i=>{look();const o=questionOptions(s,c);replies.push(...say(s,c,o[i%o.length].text).messages.filter(m=>m.speaker!=='g').map(m=>m.text));};
   for(const t of ['v','a']){s.target=t;for(const i of [0,0,1,2,3,4,5,6,7,0])turn(i);s.checks[t]=true;}s.checks.g=true;
   if(variant!=='unsafe'){s.checks.safe=true;s=transition(s);for(const t of ['all','v','a'])for(const i of [0,1,2,3,4,5,6,7,0,0,0]){s.target=t;turn(i);}
    s.checks.main=true;s.agreement.action='x';s.agreement.review='y';s=transition(s);for(const t of ['all','v','a'])for(const i of [0,1,2,3,4,5,6,7,0]){s.target=t;turn(i);}}
  }
  return {seen,replies};
 };
 for(const c of scenarios.filter(c=>c.grade==='초등')){
  const {seen,replies}=offered(c);
  for(const t of seen)assert.doesNotMatch(t,KID_HEARS,`${c.id} teacher: ${t}`);
  for(const t of replies)assert.doesNotMatch(t,KID_SAYS,`${c.id} student: ${t}`);
 }
 const older=offered(byId('case-20')).seen.join('\n');assert.match(older,/회복을 돕/);assert.match(older,/동의하지 않/);
});
test('plain-word questions are read the same way as the full ones',()=>{
 const c=byId('case-03'),V=c.victim.name,A=c.actor.name;
 const table={'모임에 대해 더 궁금한 게 있니?':'about','그 일 때문에 학교에서 지내는 게 어떻게 달라졌는지 말해 줄래?':'impact',
  [`${A}, 친구 마음이 조금이라도 나아지도록 네가 할 수 있는 건 뭘까?`]:'repair',[`${V}, 방금 나온 방법 중에 괜찮은 것과 싫은 것을 말해 줄래?`]:'repair',
  '이 약속에서 싫거나 바꾸고 싶은 게 있니? 싫다고 해도 괜찮아.':'agree','정한 일을 누가 언제부터 어떻게 할지 정해 볼까?':'plan',
  '네가 한 일 때문에 친구는 학교에서 어떤 점이 힘들었을까?':'responsibility','약속 중에 지켜진 건 뭐니? 어떤 일이 있었는지 말해 줄래?':'followup',
  '다시 그런 일이 있었다면, 지금 선생님이 어떻게 도와주면 좋겠니?':'need','약속을 못 지킨 게 있다면, 이제 네가 할 수 있는 건 뭘까?':'repair',
  '상대가 싫어하는 행동을 멈추려면 어떻게 하면 될까?':'safety','상대가 만나기를 원하지 않으면 너는 어떻게 하면 좋을까?':'safety',
  '속상한 마음이 들 때 누구한테 도움을 받으면 좋을까?':'need','아직 바뀌지 않아서 힘든 점은 뭐니? 네가 혼자 지켜보지 않아도 돼.':'hard'};
 for(const [q,want] of Object.entries(table))assert.equal(classify(q),want,q);
});
test('the AI is told the school level and how students of that age talk',()=>{
 const s=start(byId('case-01'));s.preSteps={v:'story',a:'story',g:'story'};
 const p=rolePrompt(prepareContext(s));assert.match(p.input,/"학교급":"초등"/);assert.match(p.system,/초등.*쉬운 낱말/);assert.match(p.system,/고등/);
});
test('a reassurance that nobody will be forced to apologise is not pressure',()=>{
 assert.equal(classify('누구를 혼내거나 억지로 사과하게 하는 자리가 아니야. 먼저 궁금한 게 있니?'),'about');
 assert.equal(classify('억지로 화해하게 하지 않아. 괜찮다면 궁금한 것부터 말해 줄래?'),'about');
 assert.equal(classify('싫어도 사과해.'),'pressure');assert.equal(classify('억지로라도 사과해야 해.'),'pressure');
});
