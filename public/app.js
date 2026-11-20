// 다시, 대화 v1.0: 상태와 동작. 화면 글은 views/*.js가 만들고, 여기서는 누르면 바로 일어나게 합니다(확인 대신 되돌리기).
import {scenarios,phases,roleName} from './scenarios.js';
import {questionOptions} from './questions.js';
import {preStepFor,markIntroductionSent} from './premeeting.js';
import {canAdvance,transition,opening,demoReply,localReview,exportText} from './engine.js';
import {rememberWorkspace,restoreWorkspace} from './workspace.js';
import {canRetry,retryLastTurn} from './retry.js';
import {sceneAt} from './replay.js';
import {createSounds} from './sounds.js';
import {startSession,defaultOutcome,worthKeeping,upsertRecord,remainingChecks} from './flow.js';
import {getStage,readStagePreference,writeStagePreference,stageMode,onStageNotice} from './stage/index.js';
import {VERSION} from './version.js';
import {e} from './views/ui.js';
import {homeView} from './views/home.js';
import {roomView,checksSection,visibleMessages} from './views/room.js';
import {reviewView} from './views/review.js';
import {appBar,historyView,helpView,applicationDialog,transcriptDialog,settingsSheet} from './views/pages.js';

const sounds=createSounds();
const $=s=>document.querySelector(s);
const defaults={anthropic:'claude-sonnet-4-6',gemini:'gemini-3.8-flash',openai:'gpt-5.4-mini'};
const providers={anthropic:'Claude',gemini:'Gemini',openai:'ChatGPT · OpenAI'};
const storageKey='dasi.sessions.v1';
// 기록은 저장할 때마다 새로 읽습니다(두 탭에서 열어도 서로의 기록을 지우지 않게).
function readRecords(){try{const v=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(v)?v.filter(x=>x&&scenarios.some(c=>c.id===x.scenarioId)&&Array.isArray(x.messages)&&x.checks&&x.agreement).slice(0,20):[];}catch{return null;}}
let saved=readRecords()||[];
const state={view:'home',query:'',grade:'전체',category:'전체',difficulty:'전체',session:null,draft:'',page:0,busy:false,error:'',review:null,mode:'demo',provider:'anthropic',model:defaults.anthropic,apiKey:'',tts:false,largeText:false,notesOpen:false,replay:null,replayState:'',replayText:''};
// 글자 크기: 고른 적이 있으면 그 값, 없으면 PC(넓은 화면·마우스)는 크게, 휴대전화·태블릿은 기본.
const pcDefault=()=>matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches;
try{const v=localStorage.getItem('dasi.large-text');state.largeText=v==null?pcDefault():v==='true';}catch{state.largeText=pcDefault();}
let saveState='ok',saveTimer=0,toastTimer=0,lastDeleted=null;
let recognition=null,recording=false,interim='',micBase='',micFinal='',speechInfo='';
let abortController=null,keyChecking=false,stage=null;
const scenario=()=>scenarios.find(c=>c.id===state.session?.scenarioId);
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const isWide=()=>matchMedia('(min-width: 1100px)').matches;
const isPhone=()=>matchMedia('(max-width: 719px)').matches;
const options=()=>questionOptions(state.session,scenario());
const inRoom=()=>state.view==='room'&&state.session&&!state.session.finished;
const connected=()=>state.mode==='ai'&&!!state.apiKey;

function notify(text,{undo=''}={}){
 const t=$('#toast');t.replaceChildren();const span=document.createElement('span');span.textContent=text;t.append(span);
 if(undo){const b=document.createElement('button');b.type='button';b.className='link';b.dataset.action=undo;b.textContent='되돌리기';t.append(b);}
 t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),undo?7000:3200);
}

// ── 그리기 ───────────────────────────────────────────────
let shownKey='',shownMessages=0;
function render(){
 const s=state.session;
 if(s)rememberWorkspace(s,{draft:state.draft,inputMode:'write',selectedChoice:null,choicePage:state.page});
 const focused=document.activeElement?.id,sel=document.activeElement?.selectionStart;
 const keep={};document.querySelectorAll('[data-keep-scroll]').forEach(el=>{if(el.id)keep[el.id]={top:el.scrollTop,left:el.scrollLeft,key:el.dataset.keepScroll};});
 const oldTop=$('#transcript')?.scrollTop||0;
 const root=document.documentElement;
 root.dataset.textSize=state.largeText?'large':'normal';
 root.dataset.view=inRoom()?'room':state.view==='room'&&s?'review':state.view;
 const key=[root.dataset.view,s?.id,s?.phase,s?.target].join(':');
 let html;
 if(inRoom()){const c=scenario();html=roomView(s,c,state,{options:options(),recording,interim,speechInfo,threeD:(stage?.mode||stageMode())==='3d',saveState,connected:connected(),phone:isPhone()});}
 else{
  const bar=appBar(state.view==='room'?'':state.view,{records:saved.length,connected:connected()});
  if(state.view==='room'&&s){const c=scenario();html=bar+reviewView(s,c,state,{replayScene:state.replay?sceneAt(s,state.replay.index):null});}
  else if(state.view==='history')html=bar+historyView(saved);
  else if(state.view==='help')html=bar+helpView(VERSION);
  else{const live=s&&!s.finished?s:null,cont=live||saved.find(x=>!x.finished);html=bar+homeView(state,{continuing:cont,continuingCase:scenarios.find(c=>c.id===cont?.scenarioId),continuingLive:!!live});}
 }
 $('#app').innerHTML=`<div class="frame">${html}</div>`;
 if(focused){const el=document.getElementById(focused);if(el&&!el.disabled){el.focus({preventScroll:true});if(typeof sel==='number'&&el.setSelectionRange)try{el.setSelectionRange(sel,sel);}catch{}}}
 const sameScreen=key===shownKey;
 if(sameScreen)for(const [id,v] of Object.entries(keep)){const el=document.getElementById(id);if(el&&el.dataset.keepScroll===v.key){el.scrollTop=v.top;el.scrollLeft=v.left;}}
 const t=$('#transcript');if(t){const count=t.querySelectorAll('.msg').length;t.scrollTop=!sameScreen||count!==shownMessages||state.busy||state.error?t.scrollHeight:oldTop;if(!reduced()&&sameScreen&&count>shownMessages)t.querySelectorAll('.msg').forEach((el,i)=>{if(i>=shownMessages)el.animate([{opacity:0,transform:`translateY(8px)`},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.2,.7,.2,1)'});});shownMessages=count;}
 if(!sameScreen&&!reduced())$('#main')?.animate([{opacity:0},{opacity:1}],{duration:200,easing:'ease-out'});
 shownKey=key;
 sizeDraft();syncStage();
}
function sizeDraft(){const d=$('#draft');if(!d)return;d.style.height='auto';d.style.height=Math.min(d.scrollHeight+2,isPhone()?96:132)+'px';}

// ── 무대 ───────────────────────────────────────────────
onStageNotice(text=>notify(text));
function castMoods(){const out={};for(const m of state.session?.messages||[])if(m.kind==='participant'&&m.phase===state.session.phase)out[m.speaker]={mood:m.mood,risk:m.risk};return out;}
function syncStage(){
 const s=state.session,slot=$('#stage-slot');
 if(slot&&inRoom()){stage=getStage();stage.attach(slot);stage.setCast({scenario:scenario(),phase:s.phase,target:s.target,moods:castMoods(),sessionId:s.id+':'+(s.retries?.length||0)});stage.onPick(pickTarget);stage.setPickable(['main','post'].includes(s.phase)&&!state.busy&&!recording);return;}
 stage?.setPickable(false);
 const rs=$('#replay-slot');if(rs&&state.replay){stage=getStage();stage.attach(rs);return;}
 if(stage?.element.isConnected)stage.detach();
}
// 단계가 바뀌면 무대 위에 단계 이름이 잠깐 떴다 사라집니다.
function chapter(index){
 const frame=$('.stage-frame');if(!frame||reduced())return;
 const el=document.createElement('div');el.className='phase-chapter';el.setAttribute('aria-hidden','true');
 const num=document.createElement('span');num.textContent=String(index);const name=document.createElement('strong');name.textContent=Object.values(phases)[index];
 el.append(num,name);frame.append(el);setTimeout(()=>el.remove(),2400);
}

// ── 저장(자동) ───────────────────────────────────────────
function persist(){
 clearTimeout(saveTimer);saveTimer=0;const s=state.session;if(!s)return;
 rememberWorkspace(s,{draft:state.draft,inputMode:'write',selectedChoice:null,choicePage:state.page});
 if(!worthKeeping(s)&&!saved.some(x=>x.id===s.id))return;
 const next=upsertRecord(readRecords()??saved,s,state.review);
 try{localStorage.setItem(storageKey,JSON.stringify(next));saved=next;setSaveState('ok');}catch{saved=next;setSaveState('failed');}
}
function persistSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(persist,450);}
function setSaveState(v){if(v===saveState)return;saveState=v;const el=$('.save-state');if(el){el.classList.toggle('failed',v==='failed');el.textContent=v==='failed'?'저장 공간을 쓸 수 없어요':'자동 저장';}if(v==='failed')notify('이 브라우저에 저장할 수 없어요. 회고에서 내려받기를 이용해 주세요.');}
function writeRecords(next){try{localStorage.setItem(storageKey,JSON.stringify(next));saved=next;return true;}catch{notify('기록을 바꾸지 못했어요. 브라우저 저장소를 확인해 주세요.');return false;}}

// ── 이동 ───────────────────────────────────────────────
function go(view){
 if(state.busy)return;persist();stopSpeech();endReplay();state.view=view;state.error='';state.notesOpen=false;render();$('#main')?.focus({preventScroll:true});
}
function start(id,variant='cooperative'){
 const c=scenarios.find(x=>x.id===id);if(!c||state.busy)return;
 persist();stopSpeech();endReplay();
 state.session=startSession(c,variant);state.draft='';state.page=0;state.error='';speechInfo='';state.review=null;state.notesOpen=false;state.view='room';
 greetTarget();render();$('#main')?.focus({preventScroll:true});
}
function open(record){
 if(!record||state.busy)return;persist();stopSpeech();endReplay();
 state.session=JSON.parse(JSON.stringify(record));state.review=state.session.savedReview||null;
 const w=restoreWorkspace(state.session,scenario());state.draft=w.draft;state.page=w.choicePage;state.error='';speechInfo='';state.notesOpen=false;state.view='room';
 if(state.session.phase==='intake'){state.session.phase='pre';state.session.application={...state.session.application,readAt:state.session.application?.readAt||new Date().toISOString()};greetTarget();}
 render();$('#main')?.focus({preventScroll:true});
}
function greetTarget(){const s=state.session,c=scenario();if(s.phase!=='pre'||s.messages.some(m=>m.phase==='pre'&&m.speaker===s.target))return;s.messages.push({kind:'participant',speaker:s.target,target:s.target,phase:s.phase,text:opening(s,c),source:'scenario'});}
function chooseTarget(value){
 const s=state.session;if(!s||s.target===value)return;
 stopSpeech();rememberWorkspace(s,{draft:state.draft,inputMode:'write',selectedChoice:null,choicePage:state.page});
 s.target=value;speechInfo='';state.draft=s.workspace?.drafts?.[`${s.phase}:${value}`]||'';state.page=0;s.coach=null;state.error='';greetTarget();render();
}
function pickTarget(role){
 const s=state.session;if(!inRoom()||state.busy||recording||keyChecking||$('#modal').open||s.target===role)return;
 const input=document.getElementById('target-'+role);if(!input||input.disabled||input.closest('fieldset:disabled'))return;
 sounds.play('select');chooseTarget(role);notify(`${roleName(scenario(),role)}에게 말을 건네요.`);
}

// ── 말하기 ───────────────────────────────────────────────
function primeVoice(){if(!('speechSynthesis'in window)||typeof SpeechSynthesisUtterance!=='function')return;try{const u=new SpeechSynthesisUtterance(' ');u.volume=0;u.lang='ko-KR';speechSynthesis.speak(u);}catch{}}
async function api(path,body){
 if(!/^[a-zA-Z0-9._:-]{1,100}$/.test(body.model||''))throw new Error('설정에서 모델 이름을 확인해 주세요.');
 abortController=new AbortController();const timeout=setTimeout(()=>abortController?.abort(),65000);
 try{const res=await fetch('api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:abortController.signal});const d=await res.json().catch(()=>{throw new Error('이 주소에서는 AI 연결을 사용할 수 없어요. 시나리오 체험을 이용하거나 https://dasi-dialogue.vercel.app 에서 AI를 연결해 주세요.');});if(!res.ok)throw new Error(d.error||'요청에 실패했어요.');return d;}
 catch(err){if(err.name==='AbortError')throw new Error('응답을 기다리는 시간이 길어졌어요. 다시 시도해 주세요.');if(err instanceof TypeError)throw new Error('앱 서버에 연결할 수 없어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');throw err;}
 finally{clearTimeout(timeout);abortController=null;}
}
function sessionForAI(s){
 const {scenarioId,phase,variant,target,preSteps,agreement,outcome}=s;
 // 제안 문장과 코치 의견은 화면의 것이지 대화가 아니므로 다시 보내지 않습니다.
 const messages=s.messages.map(({kind,speaker,target,phase,text,preStep,inputMethod})=>({kind,speaker,target,phase,text,preStep,inputMethod}));
 return {scenarioId,phase,variant,target,preSteps,agreement,outcome,messages};
}
async function sendMessage(raw,method){
 const s=state.session,text=String(raw||'').trim();
 if(state.busy||recording||!inRoom()||!text)return;
 if(state.mode==='ai'&&!state.apiKey){openSettings();notify('AI 역할 대화에는 API 키가 필요해요. 키를 넣거나 시나리오 체험으로 바꿔 주세요.');$('#api-key')?.focus();return;}
 if(s.messages.length>154){state.error='이 연습의 대화 한도에 가까워졌어요. 마치기를 눌러 회고해 주세요.';render();return;}
 if(state.tts)primeVoice();sounds.play('send');state.error='';speechInfo='';
 const preStep=s.phase==='pre'?preStepFor(s):undefined;if(preStep)s.preSteps={...s.preSteps,[s.target]:preStep};
 const turn={preStep,kind:'teacher',phase:s.phase,target:s.target,text,inputMethod:method};
 s.messages.push(turn);if(method==='write')state.draft='';state.busy=true;render();stage?.teacherSaid(text);stage?.think();
 try{
  const result=state.mode==='demo'?demoReply(s,scenario(),text):await api('reply',{provider:state.provider,model:state.model,apiKey:state.apiKey,session:sessionForAI(s)});
  for(const m of result.messages)s.messages.push({kind:'participant',phase:s.phase,target:s.target,...m,risk:result.risk,source:state.mode==='ai'?'ai':'scenario'});
  if(state.mode==='ai')s.messages.at(-1).nextQuestions=result.teacherChoices;
  if(!state.tts)sounds.play('reply');s.coach=result;state.page=0;if(preStep==='intro')markIntroductionSent(s);
  stage?.speak(result.messages,{tts:state.tts,risk:result.risk});
 }catch(err){stage?.reset();s.messages.splice(s.messages.indexOf(turn),1);if(preStep)s.preSteps={...s.preSteps,[s.target]:preStep};if(method==='write'||!state.draft.trim())state.draft=text;state.error=err.message;}
 finally{
  state.busy=false;persist();render();
  // 직접 쓴 말이나 오류 뒤에는 입력칸으로, 제안을 누른 뒤에는 제안으로 초점을 둡니다(숫자 키를 이어서 쓰고, 태블릿 자판이 저절로 뜨지 않게).
  if(isPhone())return;
  if(method==='write'||state.error)$('#draft')?.focus({preventScroll:true});else document.querySelector('.sug-say')?.focus({preventScroll:true});
 }
}
function say(id){const q=options().find(q=>q.id===id);if(q){stage?.attend?.();sendMessage(q.text,'choice');}}
function undoTurn(){
 const s=state.session;if(!s||state.busy||recording||!canRetry(s))return;
 stopSpeech();stage?.reset();const turn=retryLastTurn(s);if(!turn)return;
 const keep=!!state.draft.trim();s.coach=null;state.page=0;state.error='';if(!keep)state.draft=turn.text;persist();render();
 notify(keep?'방금 말과 답을 지웠어요. 쓰던 글은 그대로 두었어요.':'방금 말과 답을 지웠어요. 고쳐서 다시 보내 보세요.');$('#draft')?.focus({preventScroll:true});
}
function advance(){
 const s=state.session;if(!s||state.busy||!canAdvance(s))return;
 stopSpeech();rememberWorkspace(s,{draft:state.draft,inputMode:'write',selectedChoice:null,choicePage:state.page});
 try{state.session=transition(s);}catch(err){notify(err.message);return;}
 const n=state.session;sounds.play('phase');n.messages.push({kind:'system',phase:n.phase,text:n.phase==='main'?'본모임이에요. 목적과 참여 선택을 다시 확인하고 대화를 시작해 주세요.':scenario().followup});
 state.draft='';state.page=0;state.error='';state.notesOpen=false;persist();render();
 const at=['pre','main','post'].indexOf(n.phase)+1;requestAnimationFrame(()=>requestAnimationFrame(()=>chapter(at)));
}
function finish(){
 const s=state.session;if(!s||state.busy)return;
 stopSpeech();rememberWorkspace(s,{draft:state.draft,inputMode:'write',selectedChoice:null,choicePage:state.page});
 s.finished=true;s.outcome=defaultOutcome(s);state.review=null;state.notesOpen=false;state.error='';persist();render();$('#main')?.focus({preventScroll:true});
 notify('연습을 마치고 회고로 왔어요.',{undo:'unfinish'});
}
// 마치기 되돌리기: 확인 창 대신, 마친 연습을 그 자리에서 다시 이어 갑니다.
function reopen(){
 const s=state.session;if(!s||!s.finished||state.busy)return;
 stopSpeech();endReplay();s.finished=false;s.outcome='';state.review=null;state.error='';state.view='room';$('#toast').classList.remove('show');
 persist();render();$('#main')?.focus({preventScroll:true});
}

// ── 음성 입력 ───────────────────────────────────────────────
function stopSpeech(){stage?.interrupt();if(recognition){recognition.onend=null;recognition.abort();recognition=null;}recording=false;interim='';if('speechSynthesis'in window)speechSynthesis.cancel();}
function microphone(){
 sounds.stop();
 if(recording){recognition?.stop();return;}
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition){speechInfo='이 브라우저는 음성 인식을 지원하지 않아요. Chrome에서 열거나 글로 입력해 주세요.';render();return;}
 if(!window.isSecureContext){speechInfo='음성 입력은 localhost 또는 HTTPS 주소에서 사용해 주세요.';render();return;}
 if('speechSynthesis'in window)speechSynthesis.cancel();
 recognition=new Recognition();recognition.lang='ko-KR';recognition.continuous=true;recognition.interimResults=true;micBase=state.draft;micFinal='';interim='';speechInfo='';
 recognition.onresult=event=>{let partial='';for(let i=event.resultIndex;i<event.results.length;i++){if(event.results[i].isFinal)micFinal+=event.results[i][0].transcript+' ';else partial+=event.results[i][0].transcript;}interim=partial;state.draft=(micBase+(micBase&&!/\s$/.test(micBase)?' ':'')+micFinal).slice(0,4000);const d=$('#draft');if(d){d.value=state.draft;sizeDraft();}const st=$('#speech-status');if(st)st.textContent='듣고 있어요… '+partial;};
 recognition.onerror=event=>{const errors={'not-allowed':'마이크 사용이 거부되었어요. 주소창의 사이트 설정에서 마이크를 허용해 주세요.','service-not-allowed':'브라우저의 음성 인식 서비스가 허용되지 않았어요. 글로 입력해 주세요.','audio-capture':'사용할 수 있는 마이크를 찾지 못했어요. 입력 장치를 확인해 주세요.','network':'음성 인식 서비스에 연결하지 못했어요. 네트워크를 확인하거나 글로 입력해 주세요.','no-speech':'목소리를 듣지 못했어요. 마이크를 다시 눌러 말해 주세요.','language-not-supported':'이 브라우저는 한국어 음성 인식을 지원하지 않아요.'};speechInfo=errors[event.error]||'음성 인식이 멈췄어요. 들어온 문장을 확인해 주세요.';};
 recognition.onend=()=>{recording=false;recognition=null;interim='';stage?.listen(false);if(!speechInfo)speechInfo='다 들었어요. 문장을 확인·수정한 뒤 보내 주세요.';persistSoon();render();$('#draft')?.focus();};
 try{recognition.start();recording=true;render();stage?.listen(true);}catch{recording=false;recognition=null;speechInfo='음성 인식을 시작하지 못했어요. 마이크 권한을 확인해 주세요.';render();}
}

// ── 창: 읽기 창과 설정 판 ───────────────────────────────────
function showDialog(html,cls=''){const d=$('#modal');if(recording){stopSpeech();render();}d.className=cls;d.innerHTML=html;const h=d.querySelector('h2');if(h){h.id='dialog-title';d.setAttribute('aria-labelledby','dialog-title');}if(!d.open)d.showModal();}
function closeDialog(){const d=$('#modal');if(d.open)d.close();}
function openSettings(){showDialog(settingsSheet(state,{providers,stagePref:readStagePreference(),soundsOn:sounds.enabled,version:VERSION}),'sheet');}
function setToggle(action,on){const b=$(`#modal [data-action="${action}"]`);if(b)b.setAttribute('aria-pressed',String(on));}

// ── 회고: 장면 다시 보기(그 자리의 작은 무대), 인쇄 ───────────
let replayToken=0;
const pause=(ms,alive)=>new Promise(res=>{const end=performance.now()+ms;(function tick(){if(!alive()||performance.now()>=end)return res();setTimeout(tick,Math.min(80,end-performance.now()));})();});
function setReplay(st,text){state.replayState=st;state.replayText=text;const el=$('[data-replay-state]');if(el){el.dataset.replayState=st;el.textContent=text;}}
async function playReplay(index){
 const s=state.session,scene=sceneAt(s,index);if(!scene)return;
 stopSpeech();const my=++replayToken,alive=()=>my===replayToken&&state.replay?.index===index;
 state.replay={index};state.replayState='playing';state.replayText='장면을 다시 보고 있어요.';render();
 const slot=$('#replay-slot');if(!slot)return;
 slot.closest('.mini-stage')?.scrollIntoView({block:'nearest'});
 stage=getStage();stage.attach(slot);stage.setPickable(false);
 stage.setCast({scenario:scenario(),phase:scene.phase,target:scene.target,moods:scene.moods,sessionId:`replay:${s.id}:${index}:${my}`});
 stage.teacherSaid(scene.teacher);
 await pause(Math.min(6500,Math.max(1600,900+Array.from(scene.teacher).length*55)),alive);if(!alive())return;
 stage.think();await pause(700,alive);if(!alive())return;
 if(scene.replies.length)await stage.speak(scene.replies,{tts:state.tts,risk:scene.replies.find(m=>m.risk&&m.risk!=='none')?.risk||'none'});
 if(alive())setReplay('done',scene.replies.length?'다 봤어요. ▶를 다시 누르면 처음부터 봐요.':'이 말 뒤에는 답이 없었어요.');
}
function endReplay(){if(!state.replay)return;replayToken++;state.replay=null;state.replayState='';stopSpeech();if(stage?.element.isConnected&&!$('#stage-slot'))stage.detach();}
function preparePrint(){
 const text=$('#reflection')?.value??state.session?.reflection??'';
 document.querySelectorAll('.print-reflection').forEach(el=>{el.textContent=text.trim()?text:'(적지 않았어요)';});
 for(const a of document.getAnimations()){try{if(a.effect?.getComputedTiming().iterations!==Infinity)a.finish();}catch{}}
}
addEventListener('beforeprint',preparePrint);

// ── 이벤트 ───────────────────────────────────────────────
const actions={
 go:b=>go(b.dataset.view),
 quick:()=>start(scenarios[0].id,'cooperative'),
 start:b=>start(b.dataset.id,b.dataset.variant),
 resume:b=>{if(state.session?.id===b.dataset.id&&!state.session.finished){go('room');}else open(saved.find(x=>x.id===b.dataset.id));},
 'open-record':b=>open(saved.find(x=>x.id===b.dataset.id)),
 'delete-record':b=>{saved=readRecords()??saved;const i=saved.findIndex(x=>x.id===b.dataset.id);if(i<0)return;const record=saved[i];if(writeRecords(saved.filter(x=>x.id!==record.id))){lastDeleted={record,i};if(state.session?.id===record.id&&!state.busy)state.session=null;render();notify('기록을 삭제했어요.',{undo:'undo-delete'});}},
 'undo-delete':()=>{if(!lastDeleted)return;const next=[...(readRecords()??saved)];next.splice(Math.min(lastDeleted.i,next.length),0,lastDeleted.record);if(writeRecords(next.slice(0,20))){lastDeleted=null;$('#toast').classList.remove('show');render();}},
 filter:b=>{state[b.dataset.key]=b.dataset.value;render();},
 'clear-filters':()=>{state.query='';state.grade=state.category=state.difficulty='전체';render();$('#search')?.focus({preventScroll:true});},
 say:b=>say(b.dataset.id),
 'edit-suggestion':b=>{const q=options().find(q=>q.id===b.dataset.id);if(!q)return;state.draft=q.text;render();const d=$('#draft');d?.focus();d?.setSelectionRange(d.value.length,d.value.length);persistSoon();},
 more:()=>{const n=Math.ceil(options().length/4);state.page=(state.page+1)%Math.max(1,n);render();},
 undo:undoTurn,
 mic:microphone,
 notes:()=>{state.notesOpen=!state.notesOpen;state.notesEnter=state.notesOpen;render();state.notesEnter=false;if(state.notesOpen)$('#notes')?.focus({preventScroll:true});},
 advance,
 finish,
 'coach-question':()=>{state.draft=state.session.coach?.coaching?.nextQuestion||'';state.notesOpen=false;render();$('#draft')?.focus();persistSoon();},
 'view-application':()=>showDialog(applicationDialog(state.session,scenario()),'reader'),
 'view-transcript':()=>showDialog(transcriptDialog(state.session,scenario()),'reader'),
 settings:openSettings,
 close:closeDialog,
 'stage-skip':()=>stage?.skip(),
 'stage-mode':()=>{const next=(stage?.mode||stageMode())==='3d'?'off':'on';writeStagePreference(next);render();notify(next==='off'?'그림 무대로 바꿨어요. 설정에서 언제든 3D를 켤 수 있어요.':'3D 장면을 켰어요.');},
 'tts-toggle':()=>{state.tts=!state.tts;if(state.tts)primeVoice();else if('speechSynthesis'in window)speechSynthesis.cancel();setToggle('tts-toggle',state.tts);render();notify(state.tts?'답을 목소리로 들려 드려요.':'목소리를 껐어요. 자막으로 보여 드려요.');},
 'sound-toggle':()=>{sounds.setEnabled(!sounds.enabled);setToggle('sound-toggle',sounds.enabled);if(sounds.enabled)sounds.play('select');},
 'text-size':()=>{state.largeText=!state.largeText;try{localStorage.setItem('dasi.large-text',String(state.largeText));}catch{}setToggle('text-size',state.largeText);render();},
 'forget-key':()=>{state.apiKey='';const k=$('#api-key');if(k)k.value='';$('#connection-status').textContent='메모리의 API 키를 지웠어요.';render();},
 'check-key':async b=>{const status=$('#connection-status'),apiKey=$('#api-key').value.trim();if(!apiKey){status.textContent='API 키를 먼저 넣어 주세요.';return;}keyChecking=true;b.disabled=true;status.textContent='짧은 요청으로 연결을 확인하는 중…';try{await api('check',{provider:state.provider,model:state.model,apiKey});status.textContent='연결을 확인했어요. 바로 쓸 수 있어요.';}catch(err){status.textContent=err.message;}finally{keyChecking=false;b.disabled=false;}},
 outcome:b=>{state.session.outcome=b.dataset.value;persist();render();},
 again:()=>start(state.session.scenarioId,state.session.variant),
 unfinish:reopen,
 reopen,
 print:()=>{preparePrint();window.print();},
 export:()=>{const s=state.session,c=scenario(),blob=new Blob([exportText(s,c,state.review||s.savedReview||localReview(s,c))],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`다시대화-${s.scenarioId}-${new Date().toISOString().slice(0,10)}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
 'ai-review':async()=>{if(state.mode!=='ai'||!state.apiKey){openSettings();notify('AI를 연결한 뒤 심층 회고를 요청해 주세요.');return;}state.busy=true;state.error='';render();try{state.review=await api('review',{provider:state.provider,model:state.model,apiKey:state.apiKey,session:sessionForAI(state.session)});}catch(err){state.error=err.message;}finally{state.busy=false;persist();render();}},
 replay:b=>playReplay(Number(b.dataset.index))
};
const ALWAYS=new Set(['close','sound-toggle','tts-toggle','text-size','settings','stage-skip','notes','check-key','forget-key']);
// 두 번 누르기(더블클릭)의 두 번째 누름은 무시합니다. 첫 누름으로 화면이 바뀐 뒤 새 단추를 잘못 누르지 않게.
const ONCE=new Set(['say','start','quick','resume','open-record','delete-record','undo-delete','finish','advance','undo','again','unfinish','reopen','more','edit-suggestion','go']);
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
 const a=b.dataset.action,fn=actions[a];if(!fn)return;
 event.preventDefault();
 if(event.detail>1&&ONCE.has(a))return;
 if((state.busy||keyChecking)&&!ALWAYS.has(a))return;
 fn(b);
});
document.addEventListener('submit',event=>{event.preventDefault();if(event.target.id==='compose')sendMessage(state.draft,'write');});
document.addEventListener('input',event=>{
 const t=event.target;
 if(t.id==='search'){state.query=t.value;render();return;}
 if(t.id==='draft'){state.draft=t.value;const send=$('#send');if(send)send.disabled=state.busy||recording||!t.value.trim();sizeDraft();stage?.attend?.();persistSoon();return;}
 if(t.dataset.agreement){state.session.agreement[t.dataset.agreement]=t.value;refreshChecks();persistSoon();return;}
 if(t.id==='reflection'){state.session.reflection=t.value;persistSoon();return;}
 if(t.id==='model'){const v=t.value.trim();if(/^[a-zA-Z0-9._:-]{1,100}$/.test(v)){state.model=v;$('#connection-status').textContent='';}else $('#connection-status').textContent='모델 이름을 확인해 주세요(영문·숫자·.-_:).';return;}
 if(t.id==='api-key'){state.apiKey=t.value.trim();render();return;}
});
document.addEventListener('change',event=>{
 const t=event.target;
 if(t.name==='target'){chooseTarget(t.value);return;}
 if(t.dataset.check){state.session.checks[t.dataset.check]=t.checked;persist();render();return;}
 if(t.name==='mode'){state.mode=t.value;$('#modal .ai-fields')?.classList.toggle('muted',t.value!=='ai');render();return;}
 if(t.id==='provider'){state.provider=t.value;state.model=defaults[t.value];state.apiKey='';$('#model').value=state.model;$('#api-key').value='';$('#connection-status').textContent='';render();return;}
 if(t.name==='stage-pref'){writeStagePreference(t.value);render();}
});
// 본모임의 합의 기록을 적는 동안 확인 줄과 다음 단계 단추만 바꿉니다(쓰던 칸은 그대로).
function refreshChecks(){
 const s=state.session,c=scenario(),el=$('#notes .checks-note');if(el)el.outerHTML=checksSection(s,c,state);
 const toggle=$('.notes-toggle');if(!toggle)return;const left=remainingChecks(s,c);let badge=toggle.querySelector('.badge');
 if(left&&!badge){badge=document.createElement('span');badge.className='badge';toggle.append(badge);}
 if(badge){if(left)badge.textContent=String(left);else badge.remove();}
 toggle.setAttribute('aria-label',`노트 열기 — 확인할 것 ${left}개`);
}
// 키보드: 입력칸에서 Enter는 보내기, Shift+Enter는 줄바꿈. 입력칸 밖에서 1–4는 그 제안을 바로 보냅니다.
const writing=t=>t?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),dialog');
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&state.notesOpen&&!$('#modal').open){state.notesOpen=false;render();$('.notes-toggle')?.focus({preventScroll:true});return;}
 if(event.target.id==='draft'&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();sendMessage(state.draft,'write');return;}
 if(event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
 if(!inRoom()||state.busy||recording||$('#modal').open||writing(event.target))return;
 if(/^[1-4]$/.test(event.key)){const b=document.querySelectorAll('.sug-say')[Number(event.key)-1];if(b&&!b.disabled){event.preventDefault();say(b.dataset.id);}}
});
$('#modal').addEventListener('close',()=>{const d=$('#modal');d.innerHTML='';d.className='';});
const outsideDialog=event=>{const d=event.currentTarget,r=d.getBoundingClientRect();return event.target===d&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom);};
let backdropPress=false;
$('#modal').addEventListener('pointerdown',event=>{backdropPress=outsideDialog(event);});
$('#modal').addEventListener('click',event=>{if(backdropPress&&outsideDialog(event))closeDialog();backdropPress=false;});
addEventListener('resize',()=>{if(state.notesOpen&&isWide()){state.notesOpen=false;render();}});
matchMedia('(max-width: 719px)').addEventListener('change',()=>{if(inRoom())render();});
addEventListener('storage',event=>{if(event.key!==storageKey)return;const fresh=readRecords();if(!fresh)return;saved=fresh;if(['home','history'].includes(state.view))render();});
addEventListener('pagehide',()=>{persist();sounds.stop();stopSpeech();state.apiKey='';abortController?.abort();});
render();
