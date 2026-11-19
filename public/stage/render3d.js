// 3D 무대. 폭주 구구단 엔진과 같은 구성: sRGB 출력, ACES 톤 매핑, 그림자, PMREM 환경광, 후처리, 셰이더 미리 컴파일.
import * as T from '../vendor/three-stage.js';
import {buildRoom,TABLE_Y,SEAT_Y,SEAT_R,TABLE_R} from './room.js';
import {createCharacter} from './character.js';
import {createPost} from './post.js';
import {LOOKS} from './looks.js';
import {poseFor} from './acting.js';
import {QUALITY_LEVELS,nextQualityLevel,isTooSlow} from './support.js';

const TENSION={calm:0,open:-.2,hesitant:.25,anxious:.6,defensive:.55,upset:.5,withdrawn:.7,relieved:-.6};
const HEAD_Y={elementary:1.08,middle:1.13,high:1.17,adult:1.2,undefined:1.12};

export async function createRenderer3D(container,{reducedMotion=false,preserveDrawingBuffer=false,onSlow}={}) {
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

 const cast=new Map();let phase='pre',focus=null,level=0,disposed=false,paused=false,lost=false;
 const lostFns=[];
 const camPos=new T.Vector3(0,1.12,1.05),camLook=new T.Vector3(0,1,-.8),wantPos=camPos.clone(),wantLook=camLook.clone();let hFov=46,wantFov=46,seed=1;
 const teacherHead=new T.Vector3(0,1.15,SEAT_R+.15);

 function headOf(role){const c=cast.get(role);if(!c)return null;const v=new T.Vector3();c.char.head.getWorldPosition(v);return v;}
 function shot(){
  const roles=[...cast.keys()];
  if(phase==='lobby'){wantPos.set(.0,1.42,2.15);wantLook.set(0,.95,-.45);wantFov=58;return;}
  if(roles.length<=1){
   const c=cast.get(roles[0]),y=HEAD_Y[c?.look.age]??1.12;
   wantPos.set(0,1.13,SEAT_R+.2);wantLook.set(0,y-.1,-SEAT_R);wantFov=40;return;
  }
  if(focus&&cast.has(focus)){
   const h=headOf(focus)||new T.Vector3();
   wantPos.set(h.x*.18,1.2,SEAT_R+.42);wantLook.set(h.x*.92,h.y-.1,h.z*.92);wantFov=46;return;
  }
  wantPos.set(0,1.32,SEAT_R+.62);wantLook.set(-.12,.92,-.5);wantFov=72;
 }
 function applyFov(){const aspect=camera.aspect||1.6,f=2*Math.atan(Math.tan(hFov*Math.PI/360)/aspect)*180/Math.PI;camera.fov=Math.max(24,Math.min(64,f));camera.updateProjectionMatrix();}

 function resize(){
  const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight),max=(matchMedia('(max-width: 900px)').matches?1.25:1.5);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,max)*QUALITY_LEVELS[level].scale);
  renderer.setSize(w,h,false);post.setSize(w,h);camera.aspect=w/h;applyFov();
 }
 const ro=new ResizeObserver(()=>resize());ro.observe(container);

 function applyQuality(){const q=QUALITY_LEVELS[level];room.setShadows(q.shadows);renderer.shadowMap.enabled=q.shadows;post.setBloom(q.bloom);resize();}

 function setCast({seats=[],phase:ph='pre'}={}){
  phase=ph;const roles=seats.map(s=>s.role);
  for(const [role,c] of cast){const seat=seats.find(s=>s.role===role);if(!seat||seat.lookKey!==c.lookKey){c.char.dispose();cast.delete(role);}}
  const anchors=room.arrange(ph==='pre'?'pre':ph==='lobby'?'lobby':'main',roles);
  for(const s of seats){
   let c=cast.get(s.role);
   if(!c){const look=LOOKS[s.lookKey]||LOOKS['elementary-a'];c={char:createCharacter(T,look,{tableY:TABLE_Y+.025-SEAT_Y,tableZ:SEAT_R-TABLE_R+.06,seed:seed++}),look,lookKey:s.lookKey,state:'idle',mood:s.mood||'calm',intensity:s.intensity??.55};scene.add(c.char.group);cast.set(s.role,c);}
   const a=anchors[s.role];c.char.group.position.copy(a.position);c.char.group.rotation.y=a.facing;
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

 // 그리기 반복: 아무도 말하지 않으면 초당 30프레임, 프레임 시간 중앙값으로 화질을 조절합니다.
 let raf=0,last=0,lastDraw=0,started=false,time=0,samples=[],evalT=0,slowT=0;
 const debug={fps:0,level:0,paused:false};
 function frame(now){
  raf=requestAnimationFrame(frame);
  if(paused||lost)return;
  const speaking=[...cast.values()].some(c=>c.state==='speaking'),target=speaking?1000/60:1000/30;
  if(lastDraw&&now-lastDraw<target-4)return;
  const interval=lastDraw?now-lastDraw:target;lastDraw=now;
  const dt=Math.min(.1,interval/1000);time+=dt;
  if(interval<1000)samples.push(interval-(target-1000/60));
  if((evalT+=dt)>=2&&samples.length>8){
   const sorted=samples.slice().sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];samples=[];evalT=0;
   debug.fps=Math.round(1000/Math.max(1,median));
   const next=nextQualityLevel(median,level);if(next!==level){level=next;debug.level=level;applyQuality();}
   if(isTooSlow(median,level)){slowT+=2;if(slowT>=3)onSlow?.();}else slowT=0;
  }
  const kc=reducedMotion?1:1-Math.exp(-dt*2.4);
  camPos.lerp(wantPos,kc);camLook.lerp(wantLook,kc);hFov+=(wantFov-hFov)*kc;
  camera.position.copy(camPos);
  if(!reducedMotion)camera.position.add(new T.Vector3(Math.sin(time*.37)*.006,Math.sin(time*.53)*.004,0));
  camera.lookAt(camLook);applyFov();
  const speaker=[...cast.entries()].find(([,c])=>c.state==='speaking')?.[0];
  for(const [role,c] of cast){
   const t=speaker&&speaker!==role?headOf(speaker):teacherHead;
   c.char.lookAt(t);c.char.update(dt,time);
  }
  post.render(dt,time);started=true;
 }
 resize();setCast({seats:[],phase:'pre'});raf=requestAnimationFrame(frame);

 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;lostFns.forEach(fn=>{try{fn();}catch{}});});

 return {
  kind:'3d',canvas,debug,
  setCast,setState,setMouth,setFocus,resize,
  get frames(){return started;},
  pause(){paused=true;debug.paused=true;},
  resume(){paused=false;debug.paused=false;lastDraw=0;},
  onLost(fn){lostFns.push(fn);},
  dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);ro.disconnect();for(const c of cast.values())c.char.dispose();cast.clear();room.dispose();post.dispose();env.texture.dispose();pmrem.dispose();renderer.dispose();canvas.remove();}
 };
}
