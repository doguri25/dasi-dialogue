// 개발용 무대 실험실: 캐릭터·감정·상태를 주소로 바꿔 봅니다. 앱에서 연결하지 않습니다.
import {createRenderer3D} from './stage/render3d.js';
import {speechTimeline} from './stage/hangul.js';
import {seatsFor} from './stage/acting.js';
const q=new URLSearchParams(location.search);
const look=q.get('look')||'elementary-a',mood=q.get('mood')||'calm',state=q.get('state')||'idle',castName=q.get('cast')||'pre';
window.__lab={ready:false};
if(q.has('director')){
 try{
  const {getStage}=await import('./stage/index.js');const {scenarios}=await import('./scenarios.js');
  const d=getStage({forceMode:q.get('mode')||'3d'}),scenario=scenarios[0];
  d.attach(document.getElementById('stage'));d.setCast({scenario,phase:'pre',target:'v',moods:{}});await d.ready();
  window.__lab={ready:true,director:d,scenario};
 }catch(err){window.__lab.error=String(err?.stack||err);}
}else try{
 const r=await createRenderer3D(document.getElementById('stage'),{preserveDrawingBuffer:q.has('preserve'),reducedMotion:q.has('still')});
 const looks={v:look,a:look==='middle-b'?'middle-a':'middle-b',g:'guardian'};
 const roles=castName==='pre'?['v']:seatsFor(castName,'all');
 r.setCast({phase:castName,seats:roles.map(role=>({role,lookKey:looks[role],mood,intensity:.8}))});
 for(const role of roles)r.setState(role,role==='v'?state:'listening',{mood,intensity:.8});
 if(state==='speaking'){
  const {cues,duration}=speechTimeline('제가 그린 건데 허락도 안 받았어요. 또 만질까 봐 싫어요.');
  const start=performance.now();
  (function tick(){const t=(performance.now()-start)%(duration+600),c=cues.find(c=>t>=c.start&&t<c.start+c.duration);r.setMouth('v',c?c.shape:'REST',c?c.open:0);requestAnimationFrame(tick);})();
 }
 window.__lab.renderer=r;
 let frames=0;await new Promise(res=>{(function wait(){if(r.frames&&++frames>20)return res();requestAnimationFrame(wait);})();});
 window.__lab.ready=true;
}catch(err){window.__lab.error=String(err?.stack||err);}
