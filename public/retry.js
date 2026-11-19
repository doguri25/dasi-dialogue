// 방금 한 질문 다시 해 보기: 지금 단계에서 지금 상대에게 건넨 마지막 말과 그 뒤의 답을 대화에서 떼어 냅니다.
// 떼어 낸 대화는 버리지 않고 retries에 남겨 회고와 내려받은 기록에서 볼 수 있게 합니다.
const MAX_RETRIES=50;

function lastTurnIndex(s){
 if(!s||s.finished||s.phase==='intake'||!Array.isArray(s.messages))return -1;
 for(let i=s.messages.length-1;i>=0;i--){
  const m=s.messages[i];
  if(m.phase!==s.phase)return -1;               // 단계를 넘긴 뒤에는 되돌리지 않습니다.
  if(m.kind==='teacher')return m.target===s.target?i:-1;   // 다른 사람에게 옮겨 간 뒤에는 되돌리지 않습니다.
 }
 return -1;
}

export function canRetry(s){return lastTurnIndex(s)>=0;}

// 되돌린 교사 발언을 돌려줍니다. 되돌릴 것이 없으면 null.
export function retryLastTurn(s){
 const i=lastTurnIndex(s);if(i<0)return null;
 const removed=s.messages.splice(i),turn=removed[0];
 // 사전모임에서 안내를 되돌리면 그 학생은 다시 안내 단계로 돌아갑니다.
 if(s.phase==='pre'&&turn.preStep)s.preSteps={...s.preSteps,[turn.target]:turn.preStep};
 const replies=removed.slice(1).filter(m=>m.kind==='participant'&&m.target===turn.target).map(({speaker,text,mood})=>({speaker,text,mood}));
 s.retries=[...(Array.isArray(s.retries)?s.retries:[]),{phase:turn.phase,target:turn.target,text:turn.text,inputMethod:turn.inputMethod,replies,at:new Date().toISOString()}].slice(-MAX_RETRIES);
 return turn;
}
