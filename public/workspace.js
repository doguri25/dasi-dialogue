import {questionOptions} from './questions.js';

export const workspaceKey=s=>`${s.phase}:${s.target}`;

// Drafts stay in memory until the teacher explicitly saves the session.
export function rememberWorkspace(s,ui) {
 if(!s)return;
 const drafts={...s.workspace?.drafts};
 drafts[workspaceKey(s)]=String(ui.draft||'').slice(0,4000);
 s.workspace={drafts,inputMode:ui.inputMode==='write'?'write':'choices',selectedChoiceId:ui.selectedChoice?.id||null,choicePage:ui.choicePage===1?1:0};
}

export function restoreWorkspace(s,c) {
 const w=s.workspace||{},options=s.phase==='intake'?[]:questionOptions(s,c);
 const selectedChoice=options.find(q=>q.id===w.selectedChoiceId)||null;
 return {draft:typeof w.drafts?.[workspaceKey(s)]==='string'?w.drafts[workspaceKey(s)].slice(0,4000):'',inputMode:w.inputMode==='write'?'write':'choices',selectedChoice,choicePage:selectedChoice?Math.floor(options.indexOf(selectedChoice)/4):w.choicePage===1?1:0};
}

export function storedSession(s,review=null) {
 const copy=JSON.parse(JSON.stringify(s));
 if(review)copy.savedReview=review;
 copy.savedAt=new Date().toISOString();
 return copy;
}

export function sessionChanged(s,saved,review=null) {
 if(!s)return false;
 const prior=saved.find(x=>x.id===s.id);
 if(!prior)return true;
 const content=x=>JSON.stringify({...x,savedAt:undefined,savedReview:x.savedReview||undefined});
 return content({...s,...(review?{savedReview:review}:{})})!==content(prior);
}

export function phaseReadiness(s,c) {
 if(s.phase==='intake')return {title:'신청서를 읽고 바로 시작해요',detail:'신청 내용을 살펴본 뒤 사전모임 시작하기를 누르세요.',items:[]};
 if(s.phase==='pre'&&s.variant==='unsafe')return {title:'함께 만나는 일은 잠시 멈춰요',detail:'거절을 존중하며 개별로 필요한 지원을 확인하세요. 모임 마치기에서 보류·중단을 기록할 수 있어요.',items:[],paused:true};
 const items=s.phase==='pre'?[
  {label:`${c.victim.name}의 참여 의사 확인`,done:!!s.checks.v},
  {label:`${c.actor.name}의 참여 의사 확인`,done:!!s.checks.a},
  {label:'학생·보호자 동의 범위 확인',done:!!s.checks.g},
  {label:'현재 안전과 대면 준비 확인',done:!!s.checks.safe}
 ]:s.phase==='main'?[
  {label:'합의 또는 미합의 사항을 각자 확인',done:!!s.checks.main},
  {label:'합의·미합의 내용 기록',done:!!s.agreement.action.trim()},
  {label:'다음 점검 계획 기록',done:!!s.agreement.review.trim()}
 ]:[];
 const done=items.filter(i=>i.done).length,ready=items.length>0&&done===items.length;
 return {items,done,ready,title:s.phase==='post'?'실제 변화와 안전을 돌아봐요':ready?'다음 모임으로 이어갈 준비가 됐어요':`다음 모임 전 ${items.length-done}가지를 확인해요`,detail:s.phase==='post'?'실천한 일, 지켜지지 않은 일, 추가 지원을 듣고 모임을 마쳐 주세요.':ready?'현재 의사를 다시 살피며 다음 단계로 이동해 주세요.':'직접 확인한 내용만 표시하세요. 서류나 침묵을 동의로 대신하지 않아요.'};
}
