// 무대 감독: 늘 유지되는 무대 요소, 자막, 말하기 시간표, 목소리, 3D↔2D 전환을 맡습니다.
// 앱은 render() 뒤마다 attach(slot)로 같은 요소를 새 자리에 옮겨 붙입니다. 옮겨도 WebGL 문맥은 유지됩니다.
import {speechTimeline} from './hangul.js';
import {poseFor,seatsFor} from './acting.js';
import {normalizeMood,moodIntensity} from './mood.js';
import {lookFor} from './looks.js';
import {roleName} from '../scenarios.js';

const wait=(ms,alive)=>new Promise(res=>{const end=performance.now()+ms;(function tick(){if(!alive()||performance.now()>=end)return res();setTimeout(tick,Math.min(50,end-performance.now()));})();});

export function createDirector({mode='3d',reducedMotion=false,load3D,createFlat,onNotice}={}) {
 const element=document.createElement('div');
 element.className='stage-host';element.setAttribute('aria-hidden','true');
 element.dataset.stageMode=mode;element.dataset.stageState='idle';
 const view=document.createElement('div');view.className='stage-view';
 const caption=document.createElement('div');caption.className='stage-caption';caption.hidden=true;
 const capName=document.createElement('strong');capName.className='stage-caption-name';
 const capText=document.createElement('p');capText.className='stage-caption-text';
 caption.append(capName,capText);element.append(view,caption);

 let renderer=null,loading=null,state='idle',token=0,skipLine=false,voice=null,detached=true,swapping=false;
 let cast={scenario:null,phase:'pre',target:'v',seats:[],key:''};
 const roleState=new Map();   // role → {state, mood, intensity}

 function setHost(){element.dataset.stageState=state;}
 function setSpeaker(role,mood){if(role){element.dataset.speaker=role;element.dataset.mood=mood;}else{delete element.dataset.speaker;delete element.dataset.mood;}}
 function show(name,text){caption.hidden=false;capName.textContent=name;capText.textContent=text;capText.scrollTop=capText.scrollHeight;}
 function apply(role){const r=roleState.get(role);if(r&&renderer)renderer.setState(role,r.state,{mood:r.mood,intensity:r.intensity});}
 function setRole(role,st,extra={}){const r={...(roleState.get(role)||{mood:'calm',intensity:.55}),...extra,state:st};roleState.set(role,r);apply(role);}
 function applyAll(){
  if(!renderer)return;
  renderer.setCast({phase:cast.phase,seats:cast.seats.map(role=>{const r=roleState.get(role)||{};return {role,lookKey:lookFor(cast.scenario,role),mood:r.mood||'calm',intensity:r.intensity??.55};})});
  for(const role of cast.seats)apply(role);
 }

 async function useRenderer(kind){
  const container=document.createElement('div');container.className='stage-render';
  let next;
  if(kind==='3d'){
   try{const create=await load3D();next=await create(container,{reducedMotion,onSlow:()=>fallback('slow')});}
   catch{next=null;}
   if(!next){onNotice?.('이 기기에서는 3D 장면을 열 수 없어 그림 무대로 보여 드려요.');kind='2d';}
  }
  if(kind==='2d')next=createFlat(container);
  const old=renderer;renderer=next;
  view.replaceChildren(container);element.dataset.stageMode=kind;
  old?.dispose();
  if(next.onLost)next.onLost(()=>fallback('lost'));
  applyAll();
  if(detached)next.pause();
  return next;
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
  detach(){interrupt();state='idle';setHost();setSpeaker(null);detached=true;renderer?.pause();element.remove();},
  setCast({scenario,phase='pre',target='v',moods={}}={}){
   const key=[scenario?.id,phase,target].join('|');
   if(key===cast.key)return;
   interrupt();
   const seats=seatsFor(phase,target);
   cast={scenario,phase,target,seats,key};
   roleState.clear();for(const role of seats){const m=moods[role]||{};roleState.set(role,{state:'idle',mood:normalizeMood(m.mood,{risk:m.risk,speaker:role}),intensity:moodIntensity(m.risk)});}
   state='idle';setHost();setSpeaker(null);caption.hidden=true;capText.textContent='';capName.textContent='';
   applyAll();
  },
  teacherSaid(text){
   interrupt();state='listening';setHost();setSpeaker(null);
   for(const role of cast.seats)setRole(role,'listening');
   renderer?.setFocus(null);show('나',String(text||''));
  },
  think(){
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
   interrupt();const my=token;
   for(const m of messages){
    if(my!==token)return;
    if(!m||!cast.seats.includes(m.speaker)||typeof m.text!=='string')continue;
    await sayLine(m,{tts,risk},my);
   }
   if(my===token){state='idle';setHost();setSpeaker(null);renderer?.setFocus(null);}
  },
  skip(){if(state==='speaking')skipLine=true;},
  interrupt(){interrupt();if(state!=='idle'){state='idle';setHost();setSpeaker(null);for(const role of cast.seats)setRole(role,'idle');}},
  setMode(kind){if(kind!==element.dataset.stageMode){loading=useRenderer(kind);}return loading;},
  setReducedMotion(b){reducedMotion=!!b;}
 };
 return api;
}
