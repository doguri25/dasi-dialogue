// 3D를 켤지, 어느 화질로 그릴지 정합니다. 브라우저에서 읽은 값을 넘겨받는 순수 함수입니다.
export function resolveStageMode({setting='auto',webgl2=false,saveData=false,deviceMemory,cores,slow=false}={}) {
 if(!webgl2||setting==='off')return '2d';
 if(setting==='on')return '3d';
 if(saveData||slow)return '2d';
 if(typeof deviceMemory==='number'&&deviceMemory<4)return '2d';
 if(typeof cores==='number'&&cores<4)return '2d';
 return '3d';
}

// 해상도 배율을 먼저 낮추고, 그다음 그림자, 마지막으로 빛 번짐을 끕니다.
export const QUALITY_LEVELS=Object.freeze([
 {scale:1,shadows:true,bloom:true},
 {scale:.85,shadows:true,bloom:true},
 {scale:.7,shadows:true,bloom:true},
 {scale:.7,shadows:false,bloom:true},
 {scale:.7,shadows:false,bloom:false}
]);

// best: 올라갈 수 있는 가장 좋은 화질 단계. 그래픽 문맥을 잃었다 돌아온 뒤에는 한 단계 낮춘 화질이 상한입니다.
export function nextQualityLevel(medianMs,level,best=0) {
 if(level<best)return best;
 if(medianMs>34&&level<QUALITY_LEVELS.length-1)return level+1;
 if(medianMs<20&&level>best)return level-1;
 return level;
}

export function isTooSlow(medianMs,level) {
 return level>=QUALITY_LEVELS.length-1&&medianMs>50;
}
