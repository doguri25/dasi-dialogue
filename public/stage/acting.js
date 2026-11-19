// 감정·상태 → 몸짓. 설계 문서 5.2의 표를 숫자로 옮겼습니다.
// lean: -1 뒤로 기댐 … 1 앞으로 기욺 / turn·headYaw: 교사에게서 돌아간 정도(라디안) / headPitch: + 아래를 봄
// gazeContact: 교사(또는 말하는 사람)를 보는 시간의 비율 / gazeDown: 시선을 피할 때 아래로 피하는 비율
const P=(o)=>Object.freeze(o);
export const POSES=Object.freeze({
 calm:      P({lean:.05, turn:0,   shoulders:.1, slump:.1, headPitch:.02, headYaw:0,   headTilt:0,   arms:'table',  browRaise:0,   browInner:0,   browFurrow:0,   smile:.12, lipPress:.1, gazeContact:.7,  gazeDown:.4,  blinkMin:2.2,blinkMax:5.5,speechRate:1,   prePause:250, mouthScale:1,   nod:.5}),
 open:      P({lean:.35, turn:0,   shoulders:.05,slump:0,  headPitch:-.02,headYaw:0,   headTilt:.06, arms:'table',  browRaise:.15, browInner:0,   browFurrow:0,   smile:.55, lipPress:0,  gazeContact:.85, gazeDown:.3,  blinkMin:2.5,blinkMax:6,  speechRate:1.02,prePause:200, mouthScale:1.05,nod:.8}),
 hesitant:  P({lean:-.05,turn:.08, shoulders:.3, slump:.3, headPitch:.14, headYaw:.06, headTilt:.12, arms:'fidget', browRaise:.1,  browInner:.4,  browFurrow:.1,  smile:-.05,lipPress:.35,gazeContact:.45, gazeDown:.75, blinkMin:1.8,blinkMax:4.5,speechRate:.85, prePause:800, mouthScale:.85, nod:.3}),
 anxious:   P({lean:-.1, turn:.12, shoulders:.75,slump:.2, headPitch:.1,  headYaw:.1,  headTilt:.04, arms:'clasp',  browRaise:.55, browInner:.55, browFurrow:.2,  smile:-.15,lipPress:.45,gazeContact:.28, gazeDown:.5,  blinkMin:.7, blinkMax:2.2,speechRate:1.08,prePause:350, mouthScale:.9,  nod:.3}),
 defensive: P({lean:-.45,turn:.22, shoulders:.35,slump:.05,headPitch:-.06,headYaw:.25, headTilt:-.04,arms:'crossed',browRaise:-.45,browInner:0,   browFurrow:.75, smile:-.3, lipPress:.7, gazeContact:.25, gazeDown:.1,  blinkMin:2.5,blinkMax:6,  speechRate:1.06,prePause:300, mouthScale:.8,  nod:.05}),
 upset:     P({lean:-.05,turn:.1,  shoulders:.1, slump:.7, headPitch:.3,  headYaw:.08, headTilt:.08, arms:'lap',    browRaise:.05, browInner:.85, browFurrow:.1,  smile:-.5, lipPress:.3, gazeContact:.2,  gazeDown:.9,  blinkMin:2,  blinkMax:5,  speechRate:.88, prePause:600, mouthScale:.8,  nod:.15}),
 withdrawn: P({lean:-.25,turn:.45, shoulders:.55,slump:.65,headPitch:.34, headYaw:.35, headTilt:.1,  arms:'lap',    browRaise:-.1, browInner:.45, browFurrow:.2,  smile:-.2, lipPress:.5, gazeContact:.08, gazeDown:.85, blinkMin:2.4,blinkMax:6,  speechRate:.76, prePause:1100,mouthScale:.55, nod:.05}),
 relieved:  P({lean:.1,  turn:0,   shoulders:0,  slump:.2, headPitch:0,   headYaw:0,   headTilt:.08, arms:'table',  browRaise:.2,  browInner:.1,  browFurrow:0,   smile:.45, lipPress:0,  gazeContact:.75, gazeDown:.4,  blinkMin:2.4,blinkMax:6,  speechRate:.98, prePause:250, mouthScale:1,   nod:.6})
});

const RANGES={lean:[-1,1],turn:[-.2,.8],shoulders:[0,1],slump:[0,1],headPitch:[-.3,.5],headYaw:[-.6,.6],headTilt:[-.3,.3],browRaise:[-1,1],browInner:[0,1],browFurrow:[0,1],smile:[-1,1],lipPress:[0,1],gazeContact:[0,1],gazeDown:[0,1],blinkMin:[.4,8],blinkMax:[.8,10],speechRate:[.5,1.5],prePause:[0,2000],mouthScale:[.3,1.3],nod:[0,1]};
const clamp=(v,[lo,hi])=>Math.min(hi,Math.max(lo,v));
const DISCRETE=['arms'];

export function poseFor(mood,{state='idle',intensity=.55}={}) {
 const calm=POSES.calm,target=POSES[mood]||calm,f=Math.min(1.25,Math.max(0,intensity/.8)),pose={};
 for(const k of Object.keys(calm)){
  if(DISCRETE.includes(k))pose[k]=f>=.5?target[k]:calm[k];
  else pose[k]=clamp(calm[k]+(target[k]-calm[k])*f,RANGES[k]);
 }
 if(state==='listening'){pose.gazeContact=Math.min(1,pose.gazeContact+.3);pose.headTilt=clamp(pose.headTilt+.04,RANGES.headTilt);}
 else if(state==='thinking'){pose.gazeContact=.1;pose.gazeDown=.2;pose.lipPress=Math.min(1,pose.lipPress+.2);pose.headTilt=clamp(pose.headTilt+.05,RANGES.headTilt);pose.nod=0;}
 else if(state==='speaking'){pose.gazeContact*=.9;pose.nod=0;if(['open','calm','relieved'].includes(mood)&&f>=.5)pose.arms='gesture';}
 return pose;
}

export function blendPose(a,b,t) {
 const k=Math.min(1,Math.max(0,t)),out={};
 for(const key of Object.keys(b)){
  if(typeof b[key]==='number'&&typeof a[key]==='number')out[key]=a[key]+(b[key]-a[key])*k;
  else out[key]=k>=.5?b[key]:a[key]??b[key];
 }
 return out;
}

export function seatsFor(phase,target) {
 if(phase==='pre')return [target];
 if(phase==='lobby')return ['v','a'];
 return ['v','a','g'];
}
