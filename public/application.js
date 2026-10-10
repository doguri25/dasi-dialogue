// 창작 신청서: 공식 양식의 복제나 실제 접수 자료가 아닙니다.
export const reviewChecks = {
 context:'신청 배경과 학생별 어려움을 읽었어요',
 consent:'학생·보호자의 서류 상태와 현재 의사를 구분했어요',
 safety:'접촉 우려와 먼저 필요한 보호를 살폈어요',
 scope:'신청이 대면·사과·합의를 뜻하지 않음을 확인했어요'
};
export const decisions = {
 prepare:{label:'개별 사전모임 준비',description:'각자 만나 현재의 마음과 참여 의사를 다시 확인해요.'},
 support:{label:'참여 의사·안전 확인만 연습',description:'정식 모임은 보류하고, 개별 확인과 지원 연결을 연습해요.'},
 hold:{label:'보완 요청·보류 기록',description:'추가 확인할 내용을 남기고 여기에서 멈춰요.'}
};
export const newApplication=()=>({readAt:null});
const safetyByCategory={
 '물건·경계':'개인 물건에 다시 접근하거나 사적인 내용을 전달할 우려를 확인해야 합니다.',
 '언어·놀림':'놀림·소문이 이어지는 시간과 장소, 주변 학생의 반응을 따로 확인해야 합니다.',
 '소외·관계':'참여 배제나 관계 통제가 반복되는지, 도움을 요청할 어른이 있는지 확인해야 합니다.',
 '신체·놀이':'원치 않는 접촉이 계속되는지, 이동·놀이 시간의 보호와 필요한 신체 상태 확인이 우선입니다.',
 '디지털':'추가 공유·확산 여부와 온라인 접촉 우려를 확인해야 합니다. 자료를 연습 앱에 올리지 않습니다.',
 '협력·책임':'수업·평가 참여에서 불이익이 이어지는지, 작업 복구와 지원이 필요한지 확인해야 합니다.',
 '보호자·방관':'어른이나 주변 학생의 압박 없이 학생이 자신의 의사를 말할 수 있는지 확인해야 합니다.'
};
export function applicationFor(c,variant) {
 // 방어적이라는 이유만으로 동의가 없다고 판단하지 않습니다.
 // 일부 사례에만 별도의 서류 보완 조건을 부여합니다.
 const missing=variant==='resistant'&&Number(c.id.slice(-2))%3===1,withdrawn=variant==='unsafe';
 return {
  reference:`연습-${c.id.slice(-2)}`,school:`가상 ${c.grade==='초등'?'초등학교':c.grade==='중등'?'중학교':'고등학교'}`,
  requester:'학교 담당교사 → 관계회복지원단',background:c.summary,
  request:`사건 이후의 어려움을 각자 듣고, 「${c.victim.need}」를 위해 필요한 지원을 함께 검토해 주세요.`,
  documents:[
   {label:`${c.victim.name} 학생 신청·동의서`,status:withdrawn?'신청 당시 서명본 접수 · 현재 의사 변경':'서명본 접수로 가정',attention:withdrawn},
   {label:`${c.actor.name} 학생 신청·동의서`,status:missing?'동의 서명 확인 불가 · 보완 필요':'서명본 접수로 가정',attention:missing},
   {label:'관련 보호자 동의서',status:'각 보호자 서명본 접수로 가정',attention:false},
   {label:'학교 내부결재·신청 전달',status:missing?'서류 보완 전 · 접수 확정하지 않음':'학교 신청 전달 완료로 가정',attention:missing}
  ],
  positions:[
   {role:'v',name:c.victim.name,text:withdrawn?'신청 이후 함께 만나고 싶지 않다는 의사를 학교에 전달했습니다.':`학교가 전한 어려움: ${c.victim.need}. 현재 참여 의사와 공유 가능한 내용은 직접 확인해야 합니다.`},
   {role:'a',name:c.actor.name,text:missing?'보호자는 참여를 희망하지만 학생 자신의 서명과 의사는 확인되지 않았습니다.':'학교에서 모임 안내를 들었습니다. 본인의 설명과 현재 참여 의사는 개별 확인 전입니다.'}
  ],
  safety:withdrawn?'접촉이 반복될까 두렵다는 의견이 추가로 전달됐습니다. 공동 대면을 보류하고 보호와 개별 지원부터 확인합니다.':safetyByCategory[c.category],
  prior:variant==='relapse'?'이전 약속의 일부 미이행이 보고됐습니다. 약속 문구와 실제 행동을 구분해 확인할 필요가 있습니다.':'학교가 학생들을 따로 만나 간단한 상황을 들었습니다. 사실관계·책임 판정이나 충분한 개별 사전대화가 끝난 것으로 보지 않습니다.',
  logistics:'개별 공간과 서로 마주치지 않는 대기·이동 방법을 학교와 협의해야 합니다. 일정과 지원자는 아직 정하지 않았습니다.',
  canPrepare:!missing&&!withdrawn,
  concern:withdrawn?'참여 의사 변경과 안전 우려가 있습니다.':missing?'학생 본인의 동의 확인이 빠져 있습니다.':'서류는 접수됐지만, 지금의 참여 의사와 대면 준비는 아직 확인 전입니다.'
 };
}
export function applicationRecord(s) {
 const r=s.application;
 if(!r)return '이전 버전에서 시작한 연습입니다. 신청서 열람 기록이 없습니다.';
 const current=r.readAt?`신청서 열람: ${r.readAt}\n신청서를 읽고 사전모임으로 이동했습니다.`:'신청서 열람 중';
 if(!r.checks)return current;
 return current+`\n\n이전 버전의 검토 기록\n검토 시각: ${r.completedAt||'완료 전'}\n당시 선택: ${decisions[r.decision]?.label||'선택 전'}\n먼저 확인할 것: ${r.question||'기록 없음'}\n확인 항목: ${Object.entries(reviewChecks).map(([k,v])=>`${v} (${r.checks?.[k]?'확인':'미확인'})`).join(' / ')}\n진행자 메모: ${r.notes||'없음'}`;
}
