import {roleName} from './scenarios.js';
// Shared by the API validator and the browser. Old saved sessions remain usable.
export function normalizeChoices(value) {
 if(!Array.isArray(value))return [];
 const valid=value.filter(q=>q&&typeof q.label==='string'&&q.label.trim()&&typeof q.text==='string'&&q.text.trim()&&q.text.length<=500)
  .map(q=>({label:q.label.trim().slice(0,40),text:q.text.trim()}));
 const unique=valid.filter((q,i)=>valid.findIndex(x=>x.text===q.text)===i).slice(0,4);
 return unique.length===4?unique:[];
}

export function followupOptions(session,scenario) {
 const {phase,target,messages=[]}=session;
 const visible=messages.filter(m=>m.phase===phase&&(m.kind==='teacher'?m.target===target:m.kind==='participant'&&(target==='all'?m.target==='all':m.speaker===target)));
 const reply=visible.at(-1),turn=visible.findLast(m=>m.kind==='teacher');
 if(reply?.kind!=='participant'||!turn)return [];
 const anchor=messages.indexOf(reply),guardian=target==='g';
 let rows=reply.target===target?normalizeChoices(reply.nextQuestions):[];
 let source=rows.length?'ai':'context';
 if(!rows.length){
  const raw=reply.text.trim(),excerpt=raw.length>80?raw.slice(0,80)+'…':raw;
  const addressee=target==='all'?`${roleName(scenario,reply.speaker)}, `:'';
  const heard=guardian?`“${excerpt}”라고 말씀하셨군요. `:`${addressee}“${excerpt}”라고 말해 주었구나. `;
  const afterIntro=phase==='pre'&&turn.preStep==='intro';
  const paused=reply.risk==='stop'||session.variant==='unsafe';
  const rowsForContext=paused?[
   ['의사 존중',heard+(guardian?'대화를 더 이어가기보다 잠시 멈추고 학생의 의사를 확인해도 괜찮을까요?':'지금 대화를 멈추고 따로 도움을 받아도 괜찮아. 어떻게 하고 싶니?')],
   ['안전 확인',heard+(guardian?'지금 학생의 안전을 위해 먼저 필요한 것은 무엇인가요?':'지금 안전하게 지내기 위해 먼저 필요한 것은 무엇이니?')],
   ['개별 지원',guardian?'학생이 원하는 지원을 따로 확인하려 합니다. 어른이 도울 수 있는 일은 무엇인가요?':'함께 만나지 않고도 도움받을 수 있어. 어떤 어른과 따로 이야기하고 싶니?'],
   ['부담 확인',guardian?'지금 더 이야기하기 어려운 부분이 있다면 말씀해 주세요. 건너뛰어도 됩니다.':'지금 더 이야기하기 어려운 부분이 있니? 대답하지 않고 쉬어도 괜찮아.']
  ]:afterIntro?[
   ['이야기 시작',heard+(guardian?'무슨 일이 있었는지 학생에게 들으신 대로 이야기해 주시겠어요?':'무슨 일이 있었는지 네가 기억하는 대로 이야기해 줄래?')],
   ['안내 이해 확인',heard+(guardian?'모임 방식에서 더 확인하고 싶은 점이 있나요?':'모임 방식에서 더 궁금하거나 확인하고 싶은 점이 있니?')],
   ['준비 살피기',guardian?'학생이 겪은 이야기를 지금 이어가도 괜찮으실까요?':'이제 네가 겪은 일을 이야기해도 괜찮겠니? 준비가 안 됐다면 기다릴게.'],
   ['선택권 확인',guardian?'학생이 이야기할 범위는 스스로 선택할 수 있습니다. 먼저 듣고 싶은 질문이 있으신가요?':'네가 말하고 싶은 만큼만 이야기해도 돼. 먼저 선생님에게 묻고 싶은 것이 있니?']
  ]:[
   ['말뜻 더 듣기',heard+(guardian?'그 말씀에서 가장 전하고 싶은 부분을 조금 더 들려주시겠어요?':'그 말에서 가장 전하고 싶은 부분을 조금 더 들려줄래?')],
   [phase==='post'?'실제 변화 듣기':'구체적인 장면',heard+(guardian?'직접 보거나 학생에게 들은 장면을 하나 말씀해 주시겠어요?':'그와 관련해 실제 있었던 장면을 하나 이야기해 줄래?')],
   ['마음 살피기',heard+(guardian?'학생은 그 일에 대해 어떤 마음을 표현했나요?':'그 일을 이야기하는 지금은 어떤 마음이 드니?')],
   ['필요한 도움',heard+(guardian?'그 말씀과 관련해 지금 어른이 도울 일은 무엇일까요?':'그 말과 관련해서 지금 선생님이 도와주었으면 하는 것이 있니?')]
  ];
  rows=rowsForContext.map(([label,text])=>({label,text}));
 }
 return rows.map((q,i)=>({...q,id:`followup-${phase}-${target}-${anchor}-${i}`,source}));
}
