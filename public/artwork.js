const scenes={
 '물건·경계':['boundaries','교실에서 그림과 물건의 경계를 돌아보는 가상 학생들'],
 '언어·놀림':['words','말로 생긴 불편함을 겪는 가상 학생들'],
 '소외·관계':['exclusion','모둠에 참여할 자리를 찾는 가상 학생'],
 '신체·놀이':['play','공놀이 중 접촉 이후 서로를 살피는 가상 학생들'],
 '디지털':['digital','휴대전화 공유로 생긴 걱정을 살피는 가상 학생들'],
 '협력·책임':['teamwork','함께 만들던 과제 앞에서 생각하는 가상 학생들'],
 '보호자·방관':['support','학생의 말을 기다리는 보호자와 교사의 가상 모임']
};
export const sceneFor=c=>({src:`assets/scene-${scenes[c.category][0]}.webp`,alt:scenes[c.category][1]});
export function portraitFor(c,role) {
 if(!['v','a'].includes(role))return null;
 const grade={'초등':'elementary','중등':'middle','고등':'high'}[c.grade];
 // 어느 한 외모를 특정 역할에 고정하지 않습니다.
 const swapped=Number(c.id.slice(-2))%2===0;
 return `assets/student-${grade}-${(role==='v')!==swapped?'a':'b'}.webp`;
}
