import {roleName,phases,variants} from './scenarios.js';
import {newApplication,applicationRecord} from './application.js';

import {preStepFor} from './premeeting.js';

export const prompts={
 pre:['무슨 일이 있었는지 네가 기억하는 대로 이야기해 줄래?','그 일이 시작되기 전부터 차근차근 들려줄래?','그때 어떤 생각이 들었고 어떤 마음이었니?'],
 main:['서로의 이야기를 듣는 동안 어떤 약속이 있으면 좋을까?','그 행동이 상대의 생활에 어떤 영향을 주었을까?','누가 언제부터 어떤 행동을 할 수 있을까?'],
 post:['약속 중 실제로 지켜진 것은 무엇이니?','다시 불편하거나 두려웠던 일이 있었니?','지금 어른이 더 도와줄 일은 무엇일까?']
};

export function newSession(scenario,variant='cooperative') {
 return {id:crypto.randomUUID(),scenarioId:scenario.id,variant,phase:'intake',application:newApplication(),preSteps:{v:'intro',a:'intro',g:'intro'},target:'v',startedAt:new Date().toISOString(),messages:[],checks:{v:false,a:false,g:false,safe:false,main:false},agreement:{action:'',owner:'',when:'',support:'',review:''},reflection:'',finished:false,outcome:'',coach:null};
}
export function completeApplication(s) {
 if(s.phase!=='intake')throw new Error('이미 사전모임을 시작했습니다.');
 return {...s,application:{...s.application,readAt:new Date().toISOString()},phase:'pre',target:'v',outcome:''};
}
export function canAdvance(s) {
 if(s.phase==='pre') return s.variant!=='unsafe'&&s.checks.v&&s.checks.a&&s.checks.g&&s.checks.safe;
 if(s.phase==='main') return Boolean(s.checks.main&&s.agreement.action.trim()&&s.agreement.review.trim());
 return false;
}
export function transition(s) {
 if(!canAdvance(s)) throw new Error(s.phase==='pre'?'각 학생·보호자의 의사와 안전을 확인해 주세요.':'합의·미합의 내용과 점검 계획을 기록해 주세요.');
 return {...s,phase:s.phase==='pre'?'main':'post',target:'all',coach:null};
}

export function opening(s,c) {
 if(s.target==='g')return '먼저 어떤 모임인지 설명해 주시겠어요?';
 return s.target==='a'?'선생님, 오늘은 어떤 이야기를 하나요?':'선생님, 대화모임은 어떻게 하는 거예요?';
}

// 체험용으로만 쓰는 단순 분기. 자연어 의미 판정이나 교사의 역량 점수가 아닙니다.
export function classify(text) {
 // A reflected student's words are context, not the teacher's new question.
 text=text.replace(/^(?:[^“\n]{1,40}, )?“[\s\S]*?”라고 (?:말해 주었구나|말씀하셨군요)\.\s*/,'');
 if(/(싫어도|억지로|무조건|당장).{0,12}(사과|화해|참여|용서)|사과해[.!\s]|너도.{0,8}(잘못|책임)|둘 다.{0,8}잘못|용서해 줘/.test(text)) return 'pressure';
 if(/(강요하지|강요 안|사과.{0,8}(않아|안 해)|용서.{0,8}(않아|안 해)|원하지 않|멈춰도|그만해도|중단|쉬어|쉴래|통과|참여해도|괜찮니|안전|보복|두렵)/.test(text)) return 'safety';
 if(/(지켜|지킨|실천 결과|이행|반복|다시.{0,7}(생|불편)|달라졌)/.test(text)) return 'followup';
 if(/(누가|언제|기한|다음.{0,4}(주|날)|도울|도와|구체|실천|약속|어떻게 할)/.test(text)) return 'plan';
 if(/(영향|바꿔|멈추|책임|네가 한|너의 행동)/.test(text)) return 'responsibility';
 if(/(필요|바라|원하|원하는|달라져|도움)/.test(text)) return 'need';
 if(/(마음|느꼈|감정|힘들|속상|불편|걱정|들었어|이해했)/.test(text)) return 'feeling';
 if(/(무슨|어떤 일|겪은|있었|기억|말해|들려)/.test(text)) return 'story';
 return 'open';
}
export function demoReply(s,c,text) {
 const intent=classify(text), n=s.messages.filter(m=>m.kind==='participant'&&m.phase===s.phase).length;
 const targets=s.phase==='pre'?[s.target]:s.target==='all'?['v','a']:[s.target];
 if(s.phase==='pre'&&preStepFor(s)==='intro'&&intent!=='pressure') {
  const answer=s.variant==='unsafe'?(s.target==='v'?'설명은 들었어요. 하지만 오늘은 만나지 않을래요. 따로 이야기하면서 도움받고 싶어요.':s.target==='g'?'설명해 주셔서 감사합니다. 아이가 만나고 싶지 않다고 해서, 그 뜻을 먼저 들어 주세요.':'따로 이야기하는 거군요. 상대가 원하지 않으면 함께 만나지 않을게요.'):
   s.variant==='resistant'?'설명은 들었어요. 아직 이야기하기는 망설여져요. 제 말도 끝까지 들어 주실 건가요?':s.target==='g'?'먼저 설명해 주셔서 감사합니다. 학생의 뜻을 따로 확인하며 이야기를 들어 주세요.':'모임이 어떤 자리인지 조금 알겠어요. 말하기 어려우면 잠깐 쉬어도 되는 거죠?';
  return {messages:[{speaker:s.target,text:answer}],observation:s.variant==='unsafe'?'참여 거절이 표현됐습니다. 원하지 않는 대면을 진행하지 않고 학생의 선택을 들어 주세요.':'안내에 대한 반응입니다. 다음에는 무슨 일이 있었는지 그 사람의 말로 들어 보세요.',risk:s.variant==='unsafe'?'stop':s.variant==='resistant'?'tension':'none',coaching:{strength:'설명에 대한 반응을 확인하고 궁금한 점을 더 물어봐 주세요.',nextQuestion:s.target==='g'?'어떤 일이 있었다고 학생에게 들으셨나요?':s.variant==='unsafe'?'말하고 싶다면, 어떤 일이 불편했는지 들려줄래? 원하지 않으면 멈춰도 돼.':'무슨 일이 있었는지 네가 기억하는 대로 이야기해 줄래?'}};
 }

 const messages=targets.map(role=>{
  let answer='';
  if(role==='g') answer=intent==='safety'?'아이도 멈출 수 있다는 설명을 들으니 안심돼요. 아이 뜻을 따로 확인해 주세요.':intent==='plan'?`어른이 도울 일과 점검일을 정해 주세요. ${c.victim.need}가 지켜지는지 알고 싶어요.`:'빨리 끝내고 싶었는데, 아이가 어떻게 느끼는지 먼저 들을 필요가 있겠네요.';
  else if(intent==='pressure') answer=role==='v'?'제가 싫어도 사과를 받아야 하나요? 지금은 더 이야기하고 싶지 않아요.':'선생님이 시켜서 말하는 거라면, 뭐라고 해야 끝나나요?';
  else if(s.variant==='unsafe') answer=role==='v'?(intent==='safety'?'멈출 수 있다면 오늘은 만나지 않을래요. 혼자 이야기하고 쉬는 시간에도 도움받고 싶어요.':'같이 만나고 싶지 않아요. 또 다가올까 봐 무서워요. 제 말을 들어 주세요.'):'만나고 싶지만 상대가 원하지 않는다면 따로 이야기할게요. 다가가지 말라는 뜻도 알겠어요.';
  else if(s.phase==='post') {
   if(s.variant==='relapse') answer=role==='v'?`약속이 다시 지켜지지 않았어요. ${c.victim.need}가 아직 어렵고, 저보고 계속 확인하라고 하지 않았으면 좋겠어요.`:'한 번은 지켰는데 친구들이 있으면 다시 같은 행동을 했어요. 말로만 약속한 것 같아요. 도움이 필요해요.';
   else answer=role==='v'?(intent==='safety'?'다시 그런 일은 없었어요. 아직 바로 친해지고 싶은 건 아니고, 거리를 두고 지내면 좋겠어요.':`정한 행동은 지켜졌어요. ${c.victim.need}도 전보다 나아졌어요. 조금 더 지켜보고 싶어요.`):'정한 행동을 지키려고 했어요. 어려울 때는 선생님에게 도움을 요청했어요. 다음에도 확인해 주세요.';
  } else if(s.variant==='resistant'&&n<4&&intent!=='safety') answer=role==='v'?'말해도 달라질까요? 제가 또 설명해야 하는 게 힘들어요.':`${c.actor.opening} 저만 잘못한 것처럼 이야기하는 것 같아요.`;
  else {
   const lines={
    safety:role==='v'?'말하기 싫은 건 지나가도 된다면 조금 이야기해 볼게요. 함께 만나는 건 제 말을 듣고 나서 다시 물어봐 주세요.':'원하지 않으면 멈출 수 있다는 건 알겠어요. 제 이야기도 끝까지 들어주셨으면 좋겠어요.',
    story:role==='v'?c.victim.opening:c.actor.opening,
    feeling:role==='v'?`제 마음을 물어봐 주니 조금 편해요. ${c.victim.opening}`:'처음에는 억울했는데, 상대가 힘들었다는 이야기를 듣고 나니 생각이 많아져요.',
    need:role==='v'?`${c.victim.need}가 필요해요. 억지로 친해지기보다 이게 먼저 달라졌으면 좋겠어요.`:'무엇을 바꾸면 되는지 구체적으로 알고 싶어요. 혼자 어려우면 도움을 청해도 되나요?',
    responsibility:role==='v'?'제가 고쳐야 할 점보다 먼저, 힘들었던 일이 멈추었으면 좋겠어요.':`제 의도와 다르게 영향을 줄 수 있다는 걸 알겠어요. ${c.repair}부터 해 볼 수 있을 것 같아요.`,
    plan:role==='v'?`${c.repair}라는 제안은 제 뜻을 먼저 확인해 주면 좋겠어요. 선생님이 따로 점검해 주세요.`:`${c.repair}를 해 볼게요. 언제 확인할지와 어른이 도울 일을 같이 정하고 싶어요.`,
    followup:role==='v'?'먼저 어떤 약속을 확인하는 건지 하나씩 이야기해 주실래요?':'제가 실제로 한 행동을 하나씩 말씀드릴게요. 확인할 약속부터 정하면 좋겠어요.',
    open:role==='v'?['조금 더 구체적으로 물어봐 주실래요? 지금은 무슨 말을 해야 할지 모르겠어요.',c.victim.opening][n%2]:['제 생각을 어디서부터 말하면 될까요?',c.actor.opening][n%2]
   }; answer=lines[intent];
  }
  return {speaker:role,text:answer};
 });
 const next=intent==='pressure'?'원하지 않으면 멈출 수 있어. 지금 무엇이 필요할까?':intent==='story'?'그 뒤 일상에서 가장 힘들어진 것은 무엇이니?':intent==='feeling'?'내일 무엇이 달라져 있으면 좋겠니?':intent==='need'?'그 변화를 위해 누가 언제 어떤 행동을 할 수 있을까?':prompts[s.phase][n%3];
 return {messages,observation:intent==='pressure'?'압박으로 받아들일 수 있는 표현이 감지되었습니다. 체험 모드는 단어를 바탕으로 분기하므로 문맥을 직접 확인하세요.':s.variant==='unsafe'?'참여 거부와 안전 우려가 표현되었습니다. 대면을 보류하고 개별 지원을 확인할 수 있습니다.':'응답은 준비된 시나리오 분기입니다. 자유로운 대화를 연습하려면 AI를 연결하세요.',risk:intent==='pressure'||s.variant==='unsafe'?'stop':s.variant==='resistant'?'tension':'none',coaching:{strength:'학생의 실제 반응을 읽고 다음 질문을 조절해 보세요.',nextQuestion:next}};
}

export function localReview(s,c) {
 const teacher=s.messages.filter(m=>m.kind==='teacher');
 const counts=teacher.reduce((a,m)=>{const k=classify(m.text);a[k]=(a[k]||0)+1;return a;},{});
 const evidence=[['선택과 안전',counts.safety],['경험과 영향 듣기',(counts.story||0)+(counts.feeling||0)],['필요 확인',counts.need],['책임과 실행',(counts.responsibility||0)+(counts.plan||0)],['사후 점검',counts.followup]];
 return {title:s.outcome||'연습 회고',summary:'대화의 결말과 진행자의 배움은 별개입니다. 아래 표시는 단어 기반의 질문 흔적이며 역량 점수나 전문가 판정이 아닙니다.',strengths:evidence.filter(x=>x[1]).map(x=>`${x[0]}에 관한 질문 흔적을 확인했습니다.`),improvements:[...(counts.pressure?['사과·화해·공동 책임을 압박하는 표현이 있었는지 문맥을 다시 살펴보세요.']:[]),...evidence.filter(x=>!x[1]).map(x=>`${x[0]}을 실제로 확인했는지 회고해 보세요.`)].slice(0,5),nextPractice:`같은 「${c.title}」 사례를 다른 조건으로 다시 연습해 보세요.`,evidence:evidence.map(([name,value],i)=>{const intents=[['safety'],['story','feeling'],['need'],['responsibility','plan'],['followup']][i];const turn=teacher.find(m=>intents.includes(classify(m.text)));return {name,status:value?'질문 흔적 있음':'회고에서 확인',quote:turn?.text||'',phase:turn?.phase||''};})};
}
export function exportText(s,c,review=s.savedReview||localReview(s,c)) {
 const evidence=review.evidence||localReview(s,c).evidence;
 const labels={action:'합의·미합의 내용',owner:'누가',when:'언제부터',support:'어른의 지원',review:'점검 계획'};
 return `# 다시, 대화 연습 기록\n\n사례: ${c.title}\n조건: ${variants[s.variant].label}\n시작: ${s.startedAt}\n결과: ${s.outcome||'진행 중'}\n\n`+`## 신청서 열람 (가상 자료)\n${applicationRecord(s)}\n\n`+s.messages.map(m=>`[${phases[m.phase]}] ${m.kind==='teacher'?'진행자':m.kind==='system'?'안내':roleName(c,m.speaker)}: ${m.text}`).join('\n\n')+`\n\n## 합의 또는 미합의 내용\n${Object.entries(s.agreement).map(([k,v])=>`${labels[k]}: ${v}`).join('\n')}\n\n## 나의 회고\n${s.reflection||''}\n\n## ${review.evidence?'체험 회고':'AI 심층 회고'}\n${review.title}\n\n${review.summary}\n\n### 이어갈 점\n${review.strengths.map(x=>'- '+x).join('\n')}\n\n### 다시 살펴볼 점\n${review.improvements.map(x=>'- '+x).join('\n')}\n\n### 다음 연습\n${review.nextPractice}\n\n\n## 대화에서 찾아본 장면\n단어를 바탕으로 찾은 참고 장면입니다. 실제 맥락을 함께 읽어 주세요.\n${evidence.filter(x=>x.quote).map(x=>`\n${x.name} (${phases[x.phase]}): ${x.quote}`).join('')||''}\n`;
}
