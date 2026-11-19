// 회고에서 장면 다시 보기: 교사 발언 하나와 그 뒤에 이어진 답을 무대가 다시 말할 수 있는 모양으로 꺼냅니다.
export function sceneAt(s,index){
 const list=Array.isArray(s?.messages)?s.messages:[],t=list[index];
 if(!t||t.kind!=='teacher')return null;
 const replies=[];
 for(let i=index+1;i<list.length;i++){
  const m=list[i];
  if(m.kind==='teacher'||m.phase!==t.phase)break;
  // 사전모임에서 다른 학생에게 옮겨 가며 나온 첫인사는 이 장면이 아닙니다.
  if(m.kind==='participant'&&(t.phase!=='pre'||m.speaker===t.target))replies.push({speaker:m.speaker,text:m.text,mood:m.mood,risk:m.risk});
 }
 // 장면이 시작될 때의 표정: 같은 단계에서 바로 앞까지 각자 마지막으로 보인 감정.
 const moods={};
 for(let i=0;i<index;i++){const m=list[i];if(m.kind==='participant'&&m.phase===t.phase)moods[m.speaker]={mood:m.mood,risk:m.risk};}
 return {index,phase:t.phase,target:t.target,teacher:t.text,replies,moods};
}

// 회고에 인용된 질문이 대화의 몇 번째 말인지 찾습니다(없으면 -1).
export function sceneIndexFor(s,{phase,quote}){
 return (s?.messages||[]).findIndex(m=>m.kind==='teacher'&&m.phase===phase&&m.text===quote);
}
