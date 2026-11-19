// v1.0 흐름 규칙: 확인 창 없이 시작하고 마치며, 담을 것이 있는 연습만 자동으로 기록합니다.
import {newSession,completeApplication} from './engine.js';
import {storedSession,phaseReadiness} from './workspace.js';

export const OUTCOMES=['관계회복 진전·실천 확인','부분 진전·추가 모임 필요','교착·합의에 이르지 못함','안전을 위한 보류·중단','약속 미이행·지원 재설계'];
const MAX_RECORDS=20;

// 신청서 관문 없이 곧바로 사전모임에서 시작합니다. 신청서는 시작한 순간 읽은 것으로 남깁니다.
export function startSession(scenario,variant='cooperative'){return completeApplication(newSession(scenario,variant));}

// 마치기를 누르면 결과를 묻지 않고 가장 그럴듯한 결과로 시작합니다(회고 맨 위에서 바꿀 수 있음).
export function defaultOutcome(s){
 if(s.variant==='unsafe')return OUTCOMES[3];
 if(s.phase==='post')return OUTCOMES[0];
 return OUTCOMES[1];
}

// 학생의 첫인사만 있는 연습은 기록하지 않습니다.
export function worthKeeping(s){
 if(!s)return false;
 if(s.finished||s.reflection?.trim())return true;
 if((s.messages||[]).some(m=>m.kind==='teacher'))return true;
 if(Object.values(s.checks||{}).some(Boolean))return true;
 if(Object.values(s.agreement||{}).some(v=>String(v||'').trim()))return true;
 return Object.values(s.workspace?.drafts||{}).some(v=>String(v||'').trim());
}

export function upsertRecord(list,s,review=null){
 const clean=storedSession(s,review);
 return [clean,...(list||[]).filter(x=>x.id!==clean.id)].slice(0,MAX_RECORDS);
}

export function remainingChecks(s,c){
 if(s.phase==='intake')return 0;
 const r=phaseReadiness(s,c);
 return r.items.length-(r.done||0);
}
