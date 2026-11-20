import {roleName,phases,variants} from './scenarios.js';
import {newApplication,applicationRecord} from './application.js';

import {classify} from './dialogue.js';


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

// 체험(시나리오) 대화: 교사의 말 읽기와 답 만들기는 dialogue.js에 있습니다.
export {classify,demoReply} from './dialogue.js';

export function localReview(s,c) {
 const teacher=s.messages.filter(m=>m.kind==='teacher');
 const counts=teacher.reduce((a,m)=>{const k=classify(m.text);a[k]=(a[k]||0)+1;return a;},{});
 const groups=[['safety','consent','ground'],['story','feeling','impact','more','check','heard','ready'],['need'],['responsibility','plan','repair','agree'],['followup','hard']],sum=keys=>keys.reduce((n,k)=>n+(counts[k]||0),0);
 const evidence=[['선택과 안전',sum(groups[0])],['경험과 영향 듣기',sum(groups[1])],['필요 확인',sum(groups[2])],['책임과 실행',sum(groups[3])],['사후 점검',sum(groups[4])]];
 return {title:s.outcome||'연습 회고',summary:'대화의 결말과 진행자의 배움은 별개입니다. 아래 표시는 단어 기반의 질문 흔적이며 역량 점수나 전문가 판정이 아닙니다.',strengths:evidence.filter(x=>x[1]).map(x=>`${x[0]}에 관한 질문 흔적을 확인했습니다.`),improvements:[...(counts.pressure?['사과·화해·공동 책임을 압박하는 표현이 있었는지 문맥을 다시 살펴보세요.']:[]),...evidence.filter(x=>!x[1]).map(x=>`${x[0]}을 실제로 확인했는지 회고해 보세요.`)].slice(0,5),nextPractice:`같은 「${c.title}」 사례를 다른 조건으로 다시 연습해 보세요.`,evidence:evidence.map(([name,value],i)=>{const intents=groups[i];const turn=teacher.find(m=>intents.includes(classify(m.text)));return {name,status:value?'질문 흔적 있음':'회고에서 확인',quote:turn?.text||'',phase:turn?.phase||''};})};
}
// 방금 한 질문 다시 해 보기로 되돌린 질문과 그때 들은 답(되돌린 것이 없으면 빈 글).
function retriesText(s,c){
 const list=Array.isArray(s.retries)?s.retries:[];if(!list.length)return '';
 return `\n## 다시 해 본 질문\n되돌리고 다른 말로 다시 물어본 질문입니다.\n`+list.map(r=>`\n[${phases[r.phase]||r.phase}] 처음 건넨 말: ${r.text}`+(r.replies||[]).map(m=>`\n  ${roleName(c,m.speaker)}: ${m.text}`).join('')).join('\n')+'\n';
}
export function exportText(s,c,review=s.savedReview||localReview(s,c)) {
 const evidence=review.evidence||localReview(s,c).evidence;
 const labels={action:'합의·미합의 내용',owner:'누가',when:'언제부터',support:'어른의 지원',review:'점검 계획'};
 return `# 다시, 대화 연습 기록\n\n사례: ${c.title}\n조건: ${variants[s.variant].label}\n시작: ${s.startedAt}\n결과: ${s.outcome||'진행 중'}\n\n`+`## 신청서 열람 (가상 자료)\n${applicationRecord(s)}\n\n`+s.messages.map(m=>`[${phases[m.phase]}] ${m.kind==='teacher'?'진행자':m.kind==='system'?'안내':roleName(c,m.speaker)}: ${m.text}`).join('\n\n')+`\n\n## 합의 또는 미합의 내용\n${Object.entries(s.agreement).map(([k,v])=>`${labels[k]}: ${v}`).join('\n')}\n\n## 나의 회고\n${s.reflection||''}\n\n## ${review.evidence?'체험 회고':'AI 심층 회고'}\n${review.title}\n\n${review.summary}\n\n### 이어갈 점\n${review.strengths.map(x=>'- '+x).join('\n')}\n\n### 다시 살펴볼 점\n${review.improvements.map(x=>'- '+x).join('\n')}\n\n### 다음 연습\n${review.nextPractice}\n\n\n## 대화에서 찾아본 장면\n단어를 바탕으로 찾은 참고 장면입니다. 실제 맥락을 함께 읽어 주세요.\n${evidence.filter(x=>x.quote).map(x=>`\n${x.name} (${phases[x.phase]}): ${x.quote}`).join('')||''}\n`+retriesText(s,c);
}
