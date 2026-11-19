// 3D 무대. 폭주 구구단 엔진과 같은 구성: sRGB 출력, ACES 톤 매핑, 그림자, PMREM 환경광, 후처리, 셰이더 미리 컴파일.
import * as T from '../vendor/three-stage.js';
import {buildRoom,TABLE_Y,SEAT_Y,SEAT_R,TABLE_R} from './room.js';
import {createCharacter} from './character.js';
import {createPost} from './post.js';
import {LOOKS} from './looks.js';
import {poseFor} from './acting.js';
import {QUALITY_LEVELS,nextQualityLevel,isTooSlow} from './support.js';

const TENSION={calm:0,open:-.2,hesitant:.25,anxious:.6,defensive:.55,upset:.5,withdrawn:.7,relieved:-.6};
// 앉은 2등신 캐릭터의 머리 가운데 높이(바닥 기준)
const HEAD_Y={elementary:.68,middle:.7,high:.72,adult:.74,undefined:.7};

export async function createRenderer3D(container,{reducedMotion=false,preserveDrawingBuffer=false,onSlow,bestLevel=0}={}) {
 const canvas=document.createElement('canvas');canvas.className='stage-canvas-3d';container.appendChild(canvas);
 let renderer;
 try{renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer});}
 catch(err){canvas.remove();throw err;}
 if(!renderer.capabilities.isWebGL2){renderer.dispose();canvas.remove();throw new Error('WebGL2가 필요합니다.');}
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;

 const scene=new T.Scene();scene.background=new T.Color('#efe6d6');
 const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(new T.RoomEnvironment(),.04);scene.environment=env.texture;scene.environmentIntensity=.28;
 const room=buildRoom(T);scene.add(room.group);
 const camera=new T.PerspectiveCamera(40,16/10,.05,30);
 const post=createPost(T,renderer,scene,camera);

 const best=Math.max(0,Math.min(QUALITY_LEVELS.length-1,bestLevel|0));
 const cast=new Map();let phase='pre',focus=null,level=best,disposed=false,paused=false,lost=false;
 const lostFns=[];
 const camPos=new T.Vector3(0,.8,1.05),camLook=new T.Vector3(0,.6,-.8),wantPos=camPos.clone(),wantLook=camLook.clone();let hFov=46,wantFov=46,minV=30,seed=1;
 const teacherHead=new T.Vector3(0,.78,SEAT_R+.15);

 function headOf(role){const c=cast.get(role);if(!c)return null;const v=new T.Vector3();c.char.head.getWorldPosition(v);return v;}
 function shot(){
  const roles=[...cast.keys()];
  // 첫 화면: 왼쪽에 문구가 떠 있으므로 두 학생이 화면 오른쪽에 오도록 옆으로 옮겨 봅니다.
  if(phase==='lobby'){const shift=(camera.aspect||1.6)>1.8?-.62:0;wantPos.set(shift,1.0,1.8);wantLook.set(shift,.5,-.3);wantFov=58;minV=36;return;}
  if(roles.length<=1){
   const c=cast.get(roles[0]),y=HEAD_Y[c?.look.age]??1.12;
   wantPos.set(0,.78,SEAT_R+.12);wantLook.set(0,y-.09,-SEAT_R);wantFov=36;minV=31;return;
  }
  if(focus&&cast.has(focus)){
   const h=headOf(focus)||new T.Vector3();
   wantPos.set(h.x*.2,.9,SEAT_R+.55);wantLook.set(h.x*.85,h.y-.1,h.z*.9);wantFov=50;minV=38;return;
  }
  wantPos.set(0,1.0,SEAT_R+.7);wantLook.set(-.1,.5,-.4);wantFov=72;minV=42;
 }
 // 가로 화각을 맞추되, 아주 넓고 낮은 무대에서도 얼굴이 잘리지 않도록 세로 화각의 하한을 둡니다.
 function applyFov(){if(phase==='lobby'){const shift=(camera.aspect||1.6)>1.8?-.62:0;if(Math.abs(wantPos.x-shift)>.01){wantPos.x=shift;wantLook.x=shift;}}const aspect=camera.aspect||1.6,f=2*Math.atan(Math.tan(hFov*Math.PI/360)/aspect)*180/Math.PI;camera.fov=Math.max(minV,Math.min(64,f));camera.updateProjectionMatrix();}

 // 무대가 문서에 붙어 있지 않거나 크기가 없으면 그리지 않습니다(크기 0 버퍼는 그래픽 오류를 쏟아냅니다).
 const hasSize=()=>container.isConnected&&container.clientWidth>1&&container.clientHeight>1;
 function resize(){
  if(!hasSize())return;
  const w=container.clientWidth,h=container.clientHeight,max=(matchMedia('(max-width: 900px)').matches?1.25:1.5);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,max)*QUALITY_LEVELS[level].scale);
  renderer.setSize(w,h,false);post.setSize(w,h);camera.aspect=w/h;applyFov();sized=w+'x'+h;
 }
 const ro=new ResizeObserver(()=>resize());ro.observe(container);
 // 화면 밖으로 스크롤되면 그리기를 멈춥니다.
 let visible=true;const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;debug.visible=visible;if(visible&&!paused&&!lost&&!disposed&&!raf){lastDraw=0;raf=requestAnimationFrame(frame);}});io.observe(container);

 function applyQuality(){const q=QUALITY_LEVELS[level];room.setShadows(q.shadows);renderer.shadowMap.enabled=q.shadows;post.setBloom(q.bloom);resize();}

 function setCast({seats=[],phase:ph='pre'}={}){
  phase=ph;const roles=seats.map(s=>s.role);
  for(const [role,c] of cast){const seat=seats.find(s=>s.role===role);if(!seat||seat.lookKey!==c.lookKey){c.char.dispose();cast.delete(role);}}
  const anchors=room.arrange(ph==='pre'?'pre':ph==='lobby'?'lobby':'main',roles);
  for(const s of seats){
   let c=cast.get(s.role);
   if(!c){const look=LOOKS[s.lookKey]||LOOKS['elementary-a'];c={char:createCharacter(T,look,{seed:seed++,still:reducedMotion}),look,lookKey:s.lookKey,state:'idle',mood:s.mood||'calm',intensity:s.intensity??.55};scene.add(c.char.group);cast.set(s.role,c);}
   const a=anchors[s.role];c.char.group.position.copy(a.position);c.baseY=a.position.y;c.char.group.rotation.y=a.facing;
   c.mood=s.mood||c.mood;c.intensity=s.intensity??c.intensity;c.state='idle';c.char.setPose(poseFor(c.mood,{state:'idle',intensity:c.intensity}),'idle');
  }
  if(focus&&!cast.has(focus))focus=null;
  shot();if(reducedMotion||!started){camPos.copy(wantPos);camLook.copy(wantLook);hFov=wantFov;}
  updateTension();
  try{renderer.compile(scene,camera);}catch{}
 }
 function updateTension(){let t=0,n=0;for(const c of cast.values()){t+=(TENSION[c.mood]??0)*c.intensity;n++;}post.setMood(n?t/n:0);}
 function setState(role,state,{mood,intensity}={}){
  const c=cast.get(role);if(!c)return;
  if(mood)c.mood=mood;if(typeof intensity==='number')c.intensity=intensity;c.state=state;
  c.char.setPose(poseFor(c.mood,{state,intensity:c.intensity}),state);updateTension();
 }
 function setMouth(role,shape,open){cast.get(role)?.char.setMouth(shape,open);}
 function setFocus(role){focus=role&&cast.has(role)?role:null;shot();if(reducedMotion){camPos.copy(wantPos);camLook.copy(wantLook);hFov=wantFov;}}

 // 무대의 캐릭터 고르기: 화면 좌표(-1~1)에서 광선을 쏘아 가장 가까운 캐릭터를 찾습니다.
 const ray=new T.Raycaster(),ndc=new T.Vector2();let hover=null;
 function pick(x,y){
  if(!hasSize()||!Number.isFinite(x)||!Number.isFinite(y))return null;
  camera.updateMatrixWorld();ndc.set(x,y);ray.setFromCamera(ndc,camera);
  let best=null;
  for(const [role,c] of cast){const hit=ray.intersectObject(c.char.group,true)[0];if(hit&&(!best||hit.distance<best.d))best={role,d:hit.distance};}
  return best?best.role:null;
 }
 // 검사·도움말용: 캐릭터 머리가 화면의 어디에 있는지(-1~1)
 function screenOf(role){const h=headOf(role);if(!h)return null;h.project(camera);return {x:+h.x.toFixed(3),y:+h.y.toFixed(3)};}
 // 그리기 반복: 아무도 말하지 않으면 초당 30프레임, 프레임 시간 중앙값으로 화질을 조절합니다.
 let raf=0,last=0,lastDraw=0,started=false,time=0,samples=[],evalT=0,slowT=0,sized='',slowSent=false;
 const debug={fps:0,level,paused:false,visible:true,attention:null,draws:0};
 // 마우스(선생님의 손짓)를 따라 보기: 무대 위 좌표(-1~1)를 교사 자리 앞의 한 점으로 바꿉니다.
 let pointer=null;const pointerWorld=new T.Vector3(),drift=new T.Vector3();
 // 그리기가 잇달아 실패하면(셰이더·드라이버 오류 등) 매 프레임 오류를 내며 멈추지 않고, 문맥을 잃었을 때처럼 그림 무대로 넘깁니다.
 let frameErrors=0;
 function onFrameError(err){
  if(++frameErrors===1){try{console.warn('다시, 대화 3D 그리기 오류:',err);}catch{}}
  if(frameErrors>=3&&!lost){lost=true;if(raf){cancelAnimationFrame(raf);raf=0;}lostFns.forEach(fn=>{try{fn('errors');}catch{}});}
 }
 function frame(now){
  if(paused||lost||disposed){raf=0;return;}
  raf=requestAnimationFrame(frame);
  try{if(drawFrame(now))frameErrors=0;}catch(err){onFrameError(err);}   /* 실제로 그린 프레임만 성공으로 셉니다 */
 }
 function drawFrame(now){
  if(!visible){raf&&cancelAnimationFrame(raf);raf=0;lastDraw=0;return;}
  const open=document.querySelector('dialog[open]');
  if(!hasSize()||(open&&!open.contains(container))){lastDraw=0;return;}   /* 대화창이 열려 있으면 그리지 않습니다(무대가 그 창 안에 있을 때는 그립니다) */
  if(sized!==container.clientWidth+'x'+container.clientHeight)resize();
  const speaking=[...cast.values()].some(c=>c.state==='speaking'),target=speaking?1000/60:1000/30;
  if(lastDraw&&now-lastDraw<target-4)return;
  const interval=lastDraw?now-lastDraw:target;lastDraw=now;
  const dt=Math.min(.1,interval/1000);time+=dt;
  if(interval<4000)samples.push(interval-(target-1000/60));   /* 아주 느린 기기도 셉니다. 탭을 숨겼다 돌아온 간격은 visibilitychange에서 지웁니다. */
  // 1초마다 중앙값을 보고 화질을 조절합니다. 아주 느리면(90ms 넘음) 두 단계씩 낮춥니다.
  if((evalT+=interval/1000)>=1&&samples.length>=4){
   const sorted=samples.slice().sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)],span=evalT;samples=[];evalT=0;
   debug.fps=Math.round(1000/Math.max(1,median));
   let next=nextQualityLevel(median,level,best);if(median>90)next=nextQualityLevel(median,next,best);
   if(next!==level){level=next;debug.level=level;applyQuality();}
   if(isTooSlow(median,level)){slowT+=span;if(slowT>=3&&!slowSent){slowSent=true;onSlow?.();}}else slowT=0;
  }
  const kc=reducedMotion?1:1-Math.exp(-dt*2.4);
  camPos.lerp(wantPos,kc);camLook.lerp(wantLook,kc);hFov+=(wantFov-hFov)*kc;
  camera.position.copy(camPos);
  if(!reducedMotion)camera.position.add(drift.set(Math.sin(time*.37)*.006,Math.sin(time*.53)*.004,0));
  camera.lookAt(camLook);applyFov();
  const speaker=[...cast.entries()].find(([,c])=>c.state==='speaking')?.[0];
  let follow=null;
  if(pointer&&!speaker){pointerWorld.set(pointer.x,pointer.y,.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(1.4).add(camera.position);follow=pointerWorld;}
  debug.attention=follow?{x:+pointer.x.toFixed(2),y:+pointer.y.toFixed(2)}:null;
  for(const [role,c] of cast){
   const t=speaker&&speaker!==role?headOf(speaker):follow||teacherHead;
   c.char.lookAt(t);c.char.update(dt,time);
   const lift=hover===role?1:0;c.lift=reducedMotion?lift:(c.lift||0)+(lift-(c.lift||0))*(1-Math.exp(-dt*12));
   if(typeof c.baseY==='number'){c.char.group.position.y=c.baseY+c.lift*.02;c.char.group.scale.setScalar(1+c.lift*.025);}
  }
  post.render(dt,time);started=true;debug.draws++;
  return true;
 }
 if(best>0)applyQuality();else resize();
 setCast({seats:[],phase:'pre'});raf=requestAnimationFrame(frame);

 const onVisibility=()=>{lastDraw=0;samples=[];evalT=0;};document.addEventListener('visibilitychange',onVisibility);
 // 문맥이 끊기면 그리기를 멈추고 알립니다. 다 쓴 무대(dispose)는 더 알리지 않고, 되살리지도 않습니다.
 canvas.addEventListener('webglcontextlost',e=>{if(disposed)return;e.preventDefault();lost=true;if(raf){cancelAnimationFrame(raf);raf=0;}lostFns.forEach(fn=>{try{fn('context');}catch{}});});

 return {
  kind:'3d',canvas,debug,
  setCast,setState,setMouth,setFocus,resize,
  pick,screenOf,
  setHover(role){hover=role&&cast.has(role)?role:null;},
  setPointer(x,y){pointer=x==null?null:{x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y))};if(!pointer)debug.attention=null;},
  get frames(){return started;},
  pause(){paused=true;debug.paused=true;if(raf){cancelAnimationFrame(raf);raf=0;}},
  resume(){paused=false;debug.paused=false;lastDraw=0;resize();if(!raf&&!lost&&!disposed)raf=requestAnimationFrame(frame);},
  onLost(fn){lostFns.push(fn);},
  // 끊긴 문맥이 돌아오면 한 번 알립니다. 이 무대를 정리(dispose)한 뒤에도 기다리며, 돌려받은 옛 문맥은 쓰지 않으니 바로 놓아 줍니다.
  watchRestore(fn){
   const on=()=>{canvas.removeEventListener('webglcontextrestored',on);try{canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();}catch{}fn();};
   canvas.addEventListener('webglcontextrestored',on);
   return ()=>canvas.removeEventListener('webglcontextrestored',on);
  },
  dispose(){if(disposed)return;disposed=true;lostFns.length=0;cancelAnimationFrame(raf);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',onVisibility);for(const c of cast.values())c.char.dispose();cast.clear();room.dispose();post.dispose();env.texture.dispose();pmrem.dispose();renderer.dispose();canvas.remove();}
 };
}
