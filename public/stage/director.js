// 무대 감독: 늘 유지되는 무대 요소, 자막, 말하기 시간표, 목소리, 3D↔2D 전환을 맡습니다.
// 앱은 render() 뒤마다 attach(slot)로 같은 요소를 새 자리에 옮겨 붙입니다. 옮겨도 WebGL 문맥은 유지됩니다.
import {speechTimeline} from './hangul.js';
import {poseFor,seatsFor} from './acting.js';
import {normalizeMood,moodIntensity} from './mood.js';
import {lookFor} from './looks.js';
import {roleName} from '../scenarios.js';

// 무대의 어떤 오류도 앱으로 번지지 않게 합니다(설계 5.6): 렌더러 호출과 공개 함수를 감쌉니다.
const warn=err=>{try{console.warn('다시, 대화 무대:',err);}catch{}};
const guard=r=>new Proxy(r,{get(t,k){const v=t[k];return typeof v==='function'?(...a)=>{try{return v.apply(t,a);}catch(err){warn(err);}}:v;}});
const wait=(ms,alive)=>new Promise(res=>{const end=performance.now()+ms;(function tick(){if(!alive()||performance.now()>=end)return res();setTimeout(tick,Math.min(50,end-performance.now()));})();});

export function createDirector({mode='3d',reducedMotion=false,load3D,createFlat,onNotice,slowFallback=true}={}) {
 const element=document.createElement('div');
 element.className='stage-host';element.setAttribute('aria-hidden','true');
 element.dataset.stageMode=mode;element.dataset.stageState='idle';
 const view=document.createElement('div');view.className='stage-view';
 const caption=document.createElement('div');caption.className='stage-caption';caption.hidden=true;
 const capName=document.createElement('strong');capName.className='stage-caption-name';
 const capText=document.createElement('p');capText.className='stage-caption-text';
 caption.append(capName,capText);element.append(view,caption);
 // 마우스를 따라 캐릭터가 바라봅니다(말하는 중에는 말하는 사람을 봅니다).
 // 고르기를 켜 두면(본·사후모임) 캐릭터를 눌러 질문을 건넬 사람을 바꿀 수 있습니다. 키보드는 얼굴 버튼을 씁니다.
 let pickFn=null,pickOn=false,hoverRole=null,hoverRaf=0,lastMove=null,down=null;
 const toStage=(cx,cy)=>{const r=element.getBoundingClientRect();if(!r.width||!r.height)return null;return {x:((cx-r.left)/r.width)*2-1,y:1-((cy-r.top)/r.height)*2,cx,cy};};
 function setHover(role){
  if(role&&!cast.seats.includes(role))role=null;
  if(role===hoverRole)return;hoverRole=role;
  if(role){element.dataset.hover=role;element.title=`${roleName(cast.scenario,role)}에게 질문하기`;}else{delete element.dataset.hover;element.removeAttribute('title');}
  renderer?.setHover?.(role);
 }
 function hoverNow(){hoverRaf=0;if(!lastMove||!pickOn||!pickFn)return setHover(null);try{setHover(renderer?.pick?.(lastMove.x,lastMove.y,lastMove.cx,lastMove.cy)||null);}catch(err){warn(err);}}
 element.addEventListener('pointermove',e=>{const p=toStage(e.clientX,e.clientY);if(!p)return;renderer?.setPointer(p.x,p.y);lastMove=e.target.closest?.('.stage-caption')?null:p;if(pickOn&&!hoverRaf)hoverRaf=requestAnimationFrame(hoverNow);});
 element.addEventListener('pointerleave',()=>{renderer?.setPointer(null);lastMove=null;setHover(null);});
 element.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
 element.addEventListener('click',e=>{
  if(!pickOn||!pickFn||e.target.closest?.('.stage-caption'))return;
  if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)return;
  const p=toStage(e.clientX,e.clientY);if(!p)return;
  let role=null;try{role=renderer?.pick?.(p.x,p.y,p.cx,p.cy)||null;}catch(err){warn(err);}
  if(role&&cast.seats.includes(role)){try{pickFn(role);}catch(err){warn(err);}}
 });
 const pointerAt=(x,y)=>{if(x==null)return renderer?.setPointer(null);const r=element.getBoundingClientRect();if(!r.width||!r.height)return;renderer?.setPointer(((x-r.left)/r.width)*2-1,1-((y-r.top)/r.height)*2);};

 let renderer=null,loading=null,state='idle',token=0,skipLine=false,voice=null,detached=true,swapping=false,lastTeacherAt=-1e9,thinkTimer=0,attendTimer=0;
 let cast={scenario:null,phase:'pre',target:'v',seats:[],key:''};
 const roleState=new Map();   // role → {state, mood, intensity}

 function setHost(){element.dataset.stageState=state;}
 function setSpeaker(role,mood){if(role){element.dataset.speaker=role;element.dataset.mood=mood;}else{delete element.dataset.speaker;delete element.dataset.mood;}}
 function hideCaption(){caption.hidden=true;capText.textContent='';capName.textContent='';}
 function show(name,text){caption.hidden=false;capName.textContent=name;capText.textContent=text;capText.scrollTop=capText.scrollHeight;}
 function apply(role){const r=roleState.get(role);if(r&&renderer)renderer.setState(role,r.state,{mood:r.mood,intensity:r.intensity});}
 function setRole(role,st,extra={}){const r={...(roleState.get(role)||{mood:'calm',intensity:.55}),...extra,state:st};roleState.set(role,r);apply(role);}
 function applyAll(){
  if(!renderer)return;
  renderer.setCast({phase:cast.phase,seats:cast.seats.map(role=>{const r=roleState.get(role)||{};return {role,lookKey:lookFor(cast.scenario,role),mood:r.mood||'calm',intensity:r.intensity??.55};})});
  for(const role of cast.seats)apply(role);
 }

 let generation=0;
 async function useRenderer(kind){
  // 나중에 요청한 무대가 이깁니다. 3D를 불러오는 사이 그림 무대로 바꾸면 늦게 끝난 3D는 버립니다.
  const gen=++generation;
  const container=document.createElement('div');container.className='stage-render';
  let next;
  if(kind==='3d'){
   try{const create=await load3D();if(gen!==generation)return renderer;next=await create(container,{reducedMotion,onSlow:()=>{if(slowFallback)fallback('slow');}});}
   catch{next=null;}
   if(gen!==generation){next?.dispose();return renderer;}
   if(!next){onNotice?.('이 기기에서는 3D 장면을 열 수 없어 그림 무대로 보여 드려요.');kind='2d';}
  }
  if(kind==='2d')next=createFlat(container);
  const old=renderer;renderer=guard(next);
  view.replaceChildren(container);element.dataset.stageMode=kind;
  old?.dispose();hoverRole=null;delete element.dataset.hover;element.removeAttribute('title');
  if(next.onLost)next.onLost(()=>fallback('lost'));
  applyAll();
  if(detached)renderer.pause();
  return renderer;
 }
 function fallback(reason){
  if(swapping||element.dataset.stageMode==='2d')return;
  swapping=true;
  if(reason==='slow'){try{localStorage.setItem('dasi.stage.slow','1');}catch{}onNotice?.('화면이 느려 그림 무대로 바꿨어요. 설정에서 3D를 다시 켤 수 있어요.');}
  else onNotice?.('그래픽 장치가 멈춰 그림 무대로 바꿨어요.');
  queueMicrotask(()=>{useRenderer('2d').finally(()=>{swapping=false;});});
 }
 loading=useRenderer(mode);

 function stopVoice(){if(voice&&'speechSynthesis' in window){try{speechSynthesis.cancel();}catch{}}voice=null;}
 function interrupt(){token++;skipLine=false;stopVoice();for(const role of cast.seats)renderer?.setMouth(role,'REST',0);}

 // 한 사람의 한 줄을 말합니다. 끝나거나 끼어들기·넘기기가 오면 끝냅니다.
 async function sayLine(m,{tts,risk},my){
  const alive=()=>my===token;
  const speaker=m.speaker,mood=normalizeMood(m.mood,{risk,speaker}),intensity=moodIntensity(risk);
  const pose=poseFor(mood,{state:'speaking',intensity});
  for(const role of cast.seats)if(role!==speaker)setRole(role,'listening');
  setRole(speaker,'speaking',{mood,intensity});renderer?.setFocus(cast.seats.length>1?speaker:null);
  state='speaking';setHost();setSpeaker(speaker,mood);
  const name=roleName(cast.scenario,speaker),chars=Array.from(m.text);
  show(name,reducedMotion?m.text:'');skipLine=false;
  await wait(reducedMotion?0:pose.prePause,()=>alive()&&!skipLine);if(!alive())return;
  const {cues,duration}=speechTimeline(m.text,{rate:pose.speechRate});
  let offset=0,ended=false;
  if(tts&&'speechSynthesis' in window&&typeof SpeechSynthesisUtterance==='function'){
   try{
    const u=new SpeechSynthesisUtterance(m.text);u.lang='ko-KR';u.rate=pose.speechRate*.95;u.pitch=speaker==='g'?.9:1.15;
    const startAt=performance.now();
    u.onboundary=e=>{const ci=Array.from(m.text.slice(0,e.charIndex)).length,c=cues.find(c=>c.charIndex>=ci);if(c)offset=c.start-(performance.now()-startAt);};
    u.onend=u.onerror=()=>{ended=true;};
    voice=u;speechSynthesis.cancel();speechSynthesis.speak(u);
   }catch{voice=null;}
  }
  const start=performance.now(),limit=voice?duration*1.8+1500:duration;
  await new Promise(res=>{
   let i=0;
   (function tick(){
    if(!alive())return res();
    const t=performance.now()-start+offset;
    if(skipLine||t>=limit||(voice&&ended&&t>=Math.min(duration,limit))||(!voice&&t>=duration)){return res();}
    while(i<cues.length-1&&cues[i].start+cues[i].duration<=t)i++;
    const c=cues[i];
    if(c&&t>=c.start&&t<c.start+c.duration){renderer?.setMouth(speaker,c.shape,c.open);if(!reducedMotion)capText.textContent=chars.slice(0,c.charIndex+1).join('');}
    else renderer?.setMouth(speaker,'REST',0);
    capText.scrollTop=capText.scrollHeight;
    if(document.hidden)setTimeout(tick,50);else requestAnimationFrame(tick);
   })();
  });
  if(skipLine&&voice)stopVoice();
  renderer?.setMouth(speaker,'REST',0);
  if(alive()){capText.textContent=m.text;capText.scrollTop=capText.scrollHeight;}
  voice=null;skipLine=false;
  setRole(speaker,'idle',{mood,intensity});
  await wait(reducedMotion?0:350,alive);
 }

 // 첫 화면 미리보기: 두 학생이 소리 없이 번갈아 이야기하고 서로를 봅니다(자막 없음).
 const LOBBY=['그때 정말 속상했어.','응, 나도 그 얘기 듣고 싶었어.','다음엔 먼저 물어볼게.','천천히 말해도 괜찮아.'];
 async function lobby(my){
  const alive=()=>my===token&&!detached;let turn=0;
  await wait(1200,alive);
  while(alive()){
   const speaker=cast.seats[turn%cast.seats.length],other=cast.seats[(turn+1)%cast.seats.length];
   setRole(other,'listening');setRole(speaker,'speaking',{mood:turn%3?'open':'calm',intensity:.6});
   const {cues,duration}=speechTimeline(LOBBY[turn%LOBBY.length]);const start=performance.now();
   await new Promise(res=>{(function tick(){if(!alive())return res();const t=performance.now()-start;if(t>=duration)return res();const c=cues.find(c=>t>=c.start&&t<c.start+c.duration);renderer?.setMouth(speaker,c?c.shape:'REST',c?c.open*.8:0);setTimeout(tick,40);})();});
   renderer?.setMouth(speaker,'REST',0);setRole(speaker,'idle');
   await wait(2200+Math.random()*1800,alive);turn++;
  }
 }
 const api={
  element,
  get mode(){return element.dataset.stageMode;},
  get state(){return state;},
  get renderer(){return renderer;},
  ready(){return loading;},
  attach(slot){
   if(!slot)return;
   if(element.parentNode!==slot)slot.appendChild(element);
   detached=false;renderer?.resume();renderer?.resize?.();
  },
  detach(){interrupt();clearTimeout(thinkTimer);state='idle';setHost();setSpeaker(null);hideCaption();detached=true;renderer?.pause();element.remove();},
  setCast({scenario,phase='pre',target='v',moods={},sessionId=''}={}){
   // 같은 사례라도 다른 연습(새 연습·재개)이면 출연진을 새로 앉힙니다.
   const key=[sessionId,scenario?.id,phase,target].join('|');
   if(key===cast.key)return;
   interrupt();
   const seats=seatsFor(phase,target);
   cast={scenario,phase,target,seats,key};
   roleState.clear();for(const role of seats){const m=moods[role]||{};roleState.set(role,{state:'idle',mood:normalizeMood(m.mood,{risk:m.risk,speaker:role}),intensity:moodIntensity(m.risk)});}
   state='idle';setHost();setSpeaker(null);caption.hidden=true;capText.textContent='';capName.textContent='';
   applyAll();
   if(phase==='lobby')lobby(token);
  },
  teacherSaid(text){
   interrupt();clearTimeout(thinkTimer);lastTeacherAt=performance.now();state='listening';setHost();setSpeaker(null);
   for(const role of cast.seats)setRole(role,'listening');
   renderer?.setFocus(null);show('나',String(text||''));
  },
  think(){
   // 교사의 말을 잠깐 들은 뒤(0.7초) 생각하는 자세로 바뀝니다.
   const delay=Math.max(0,(reducedMotion?150:700)-(performance.now()-lastTeacherAt));
   if(delay>0){clearTimeout(thinkTimer);const my=token;thinkTimer=setTimeout(()=>{if(my===token&&state==='listening')api.think();},delay);return;}
   state='thinking';setHost();
   const responders=cast.phase==='pre'||cast.target==='all'?cast.seats.filter(r=>cast.target!=='all'||r!=='g'):[cast.target];
   for(const role of cast.seats)setRole(role,responders.includes(role)?'thinking':'listening');
  },
  listen(on){
   if(on){interrupt();state='listening';for(const role of cast.seats)setRole(role,'listening');}
   else if(state==='listening'){state='idle';for(const role of cast.seats)setRole(role,'idle');}
   setHost();
  },
  async speak(messages=[],{tts=false,risk='none'}={}){
   interrupt();clearTimeout(thinkTimer);const my=token;
   // 답이 곧바로 와도(시나리오 체험) 듣고 생각하는 짧은 틈을 둡니다.
   const beat=(reducedMotion?400:1300)-(performance.now()-lastTeacherAt);
   if(beat>0){if(state==='listening'){state='thinking';setHost();for(const role of cast.seats)setRole(role,'thinking');}await wait(beat,()=>my===token);if(my!==token)return;}
   for(const m of messages){
    if(my!==token)return;
    if(!m||!cast.seats.includes(m.speaker)||typeof m.text!=='string')continue;
    await sayLine(m,{tts,risk},my);
   }
   if(my===token){state='idle';setHost();setSpeaker(null);renderer?.setFocus(null);}
  },
  pointerAt(x,y){pointerAt(x,y);},
  onPick(fn){pickFn=typeof fn==='function'?fn:null;},
  setPickable(on){pickOn=!!on;if(!pickOn)setHover(null);element.dataset.pickable=pickOn?'true':'false';},
  // 검사용: 캐릭터 머리가 화면의 어디에 있는지
  screenOf(role){return renderer?.screenOf?.(role)||null;},
  skip(){if(state==='speaking')skipLine=true;},
  // 선생님이 글을 쓰거나 질문을 고르는 동안: 학생이 몸을 기울여 듣다가, 2.5초 조용하면 원래대로 돌아옵니다.
  attend(){
   if(state==='speaking'||state==='thinking')return;
   if(state!=='listening'){state='listening';setHost();for(const role of cast.seats)setRole(role,'listening');}
   clearTimeout(attendTimer);const my=token;
   attendTimer=setTimeout(()=>{if(my===token&&state==='listening'){state='idle';setHost();for(const role of cast.seats)setRole(role,'idle');}},2500);
  },
  // 응답 실패 등으로 방금 일을 없던 것으로 할 때: 멈추고, 대기 자세로, 자막을 비웁니다.
  reset(){interrupt();clearTimeout(thinkTimer);state='idle';setHost();setSpeaker(null);for(const role of cast.seats)setRole(role,'idle');hideCaption();},
  interrupt(){interrupt();if(state!=='idle'){state='idle';setHost();setSpeaker(null);for(const role of cast.seats)setRole(role,'idle');}},
  setMode(kind){if(kind!==element.dataset.stageMode){loading=useRenderer(kind);}return loading;},
  setReducedMotion(b){reducedMotion=!!b;},
  setSlowFallback(b){slowFallback=!!b;}
 };
 for(const [name,desc] of Object.entries(Object.getOwnPropertyDescriptors(api))){
  const fn=desc.value;if(typeof fn!=='function')continue;
  api[name]=fn.constructor.name==='AsyncFunction'?async(...a)=>{try{return await fn(...a);}catch(err){warn(err);}}:(...a)=>{try{return fn(...a);}catch(err){warn(err);}};
 }
 return api;
}
