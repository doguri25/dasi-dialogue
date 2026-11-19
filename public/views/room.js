// 연습실: 머리줄 · 무대(얼굴은 무대 위) · 대화 기록 · 질문 칸, 오른쪽 노트(넓은 화면은 늘 펼침, 좁으면 서랍·아래 판).
import {variants,phases,roleName} from '../scenarios.js';
import {canAdvance} from '../engine.js';
import {preStepFor} from '../premeeting.js';
import {phaseReadiness} from '../workspace.js';
import {applicationFor,applicationRecord} from '../application.js';
import {canRetry} from '../retry.js';
import {remainingChecks} from '../flow.js';
import {e,icon,btn,avatar} from './ui.js';

const ROLE_TAG={v:'피해 경험 학생',a:'행동한 학생',g:'보호자',all:'모두 함께'};
const STEPS=[['pre','사전'],['main','본'],['post','사후']];

// 사전모임에서는 지금 만나는 학생의 말만, 본·사후모임은 그 단계의 모든 말을 보여 줍니다.
export function visibleMessages(s){
 return s.messages.filter(m=>m.phase===s.phase&&(s.phase!=='pre'||m.kind==='system'||(m.kind==='teacher'?m.target===s.target:m.speaker===s.target)));
}
function roomBar(s,c,{saveState,connected},left){
 const at=STEPS.findIndex(([k])=>k===s.phase);
 return `<header class="room-bar">
  <button type="button" class="icon-btn back" data-action="go" data-view="home" aria-label="사례 목록으로">${icon('back')}<span class="wide-only">사례</span></button>
  <div class="room-title"><h1>${e(c.title)}</h1><p>${c.grade} · ${c.difficulty} · <span class="variant v-${s.variant}">${e(variants[s.variant].label)}</span></p></div>
  <ol class="phase-steps" aria-label="모임 단계">${STEPS.map(([k,label],i)=>`<li class="${i<at?'done':i===at?'now':''}" ${i===at?'aria-current="step"':''}><span>${i<at?icon('check'):i+1}</span>${label}모임</li>`).join('')}</ol>
  <span class="phase-short" aria-hidden="true">${STEPS[at]?.[1]||''} ${at+1}/3</span>
  <span class="save-state ${saveState==='failed'?'failed':''}" role="status">${saveState==='failed'?'저장 공간을 쓸 수 없어요':icon('check')+'자동 저장'}</span>
  <button type="button" class="icon-btn notes-toggle" data-action="notes" aria-controls="notes" aria-label="노트 열기 — 확인할 것 ${left}개">${icon('note')}<span class="wide-only">노트</span>${left?`<span class="badge">${left}</span>`:''}</button>
  <button type="button" class="icon-btn" data-action="settings" aria-label="설정${connected?' — AI 연결됨':''}">${icon('gear')}${connected?'<i class="dot" aria-hidden="true"></i>':''}</button>
  <button type="button" class="btn finish" data-action="finish">${icon('flag')}<span>마치기</span></button>
 </header>`;
}
function faces(s,c,locked){
 const roles=s.phase==='pre'?['v','a','g']:['all','v','a','g'];
 return `<fieldset class="faces" ${locked?'disabled':''}><legend class="sr-only">${s.phase==='pre'?'지금 만나는 사람':'말을 건넬 사람'}</legend>${roles.map(k=>`<input class="sr-only" type="radio" name="target" id="target-${k}" value="${k}" ${s.target===k?'checked':''}><label class="face ${s.target===k?'on':''}" for="target-${k}" title="${e(ROLE_TAG[k])}">${avatar(k,c)}<span>${e(k==='all'?'모두':roleName(c,k))}</span></label>`).join('')}</fieldset>`;
}
function stageTools(state,threeD){
 return `<div class="stage-tools">${btn('stage-skip',icon('skip'),'icon-btn ghost','aria-label="자막 한 번에 보기" title="자막 넘기기"')}${btn('tts-toggle',icon(state.tts?'volume':'mutedVolume'),'icon-btn ghost '+(state.tts?'on':''),`aria-pressed="${state.tts}" aria-label="목소리로 듣기" title="목소리 ${state.tts?'켜짐':'꺼짐'}"`)}${btn('stage-mode',icon(threeD?'image':'cube'),'icon-btn ghost',`aria-label="${threeD?'그림 무대로 보기':'3D로 보기'}" title="${threeD?'그림 무대로':'3D로 보기'}"`)}</div>`;
}
function docCard(s,c){
 const a=applicationFor(c,s.variant);
 return `<aside class="doc-card" aria-label="신청서">${icon('doc')}<div><strong>신청서 · ${e(a.reference)}</strong><p>${e(a.concern)}</p></div>${btn('view-application','전문 보기','link')}</aside>`;
}
function messageHtml(m,c,undo){
 if(m.kind==='system')return `<p class="msg system">${e(m.text)}</p>`;
 if(m.kind==='teacher')return `<article class="msg teacher"><div class="bubble">${e(m.text)}</div><div class="msg-meta">나 → ${e(roleName(c,m.target))}${undo?` · <button type="button" class="link undo" data-action="undo">${icon('undo')}되돌리기</button>`:''}</div></article>`;
 return `<article class="msg participant role-${m.speaker}">${avatar(m.speaker,c)}<div><div class="who">${e(roleName(c,m.speaker))}${m.source==='ai'?'<small>AI 역할</small>':''}</div><div class="bubble">${e(m.text)}</div></div></article>`;
}
// 이어지는 제안은 방금 들은 말을 되짚는 앞부분(“…”라고 말해 주었구나.)이 넷 모두 같으므로, 그 부분은 옅게 두고 이어지는 질문을 또렷하게 보여 줍니다(보내는 글은 전체).
const ECHO=/^([^“]{0,16}“[^”]*”라고 (?:말해 주었구나|말씀하셨군요)\.\s*)([\s\S]+)$/;
function sugText(text){const m=String(text).match(ECHO);return m?`<span class="echo">${e(m[1])}</span>${e(m[2])}`:e(text);}
function suggestionHead(s,c,options){
 const intro=s.phase==='pre'&&preStepFor(s)==='intro',source=options[0]?.source;
 const step=s.phase==='pre'?`<span class="pre-steps"><b class="${intro?'now':'done'}">1 모임 안내</b><b class="${intro?'':'now'}">2 이야기 듣기</b></span>`:`<span class="pre-steps"><b class="now">${phases[s.phase]} · ${s.target==='all'?'모두에게':e(roleName(c,s.target))+'에게'}</b></span>`;
 const from=source==='ai'?'<span class="source ai">AI 제안 · 방금 답에 이어서</span>':source==='context'?'<span class="source">방금 말에 이어서</span>':'';
 return `<div class="sug-head"><strong>${intro?'먼저 모임을 안내해요':'제안 문장'}</strong>${step}${from}<span class="keys-hint" aria-hidden="true"><kbd>1</kbd>–<kbd>4</kbd> 바로 보내기</span>${btn('more',icon('refresh')+'<span>다른 제안</span>','link more',`aria-label="다른 제안 보기" ${options.length<=4?'disabled':''}`)}</div>`;
}
function composer(s,c,state,options,ctx){
 const {recording,interim,speechInfo}=ctx;
 const shown=options.slice(state.page*4,state.page*4+4),dis=state.busy||recording?'disabled':'';
 const intro=s.phase==='pre'&&preStepFor(s)==='intro';
 return `<section class="composer" aria-label="질문하기">
  <div class="suggestions">${suggestionHead(s,c,options)}
   <div class="suggestions-track" id="sug-track" data-keep-scroll="${e(shown.map(q=>q.id).join('|'))}">${shown.map((q,i)=>`<div class="sug"><button type="button" class="sug-say" data-action="say" data-id="${e(q.id)}" aria-keyshortcuts="${i+1}" ${dis}><span class="sug-label"><kbd aria-hidden="true">${i+1}</kbd>${e(q.label)}</span><span class="sug-text">${sugText(q.text)}</span></button><button type="button" class="sug-edit" data-action="edit-suggestion" data-id="${e(q.id)}" aria-label="고쳐 쓰기: ${e(q.label)}" title="입력칸에 넣어 고쳐 쓰기" ${dis}>${icon('pencil')}</button></div>`).join('')}</div>
  </div>
  <form id="compose" class="compose">
   <textarea id="draft" rows="1" aria-label="직접 말하기" placeholder="${intro?'직접 안내하거나 고쳐 써도 좋아요':'직접 묻거나 반응해 보세요'}${ctx.phone?'':' · Enter 보내기'}" maxlength="4000" ${state.busy?'disabled':''} ${recording?'readonly':''}>${e(state.draft)}</textarea>
   <button type="button" class="icon-btn mic ${recording?'recording':''}" data-action="mic" aria-label="${recording?'말하기 마치기':'말해서 입력'}" aria-pressed="${recording}" ${state.busy?'disabled':''}>${icon(recording?'stop':'mic')}</button>
   <button type="submit" id="send" class="btn primary send" aria-label="보내기" ${state.busy||recording||!state.draft.trim()?'disabled':''}>${icon('send')}<span>보내기</span></button>
  </form>
  <p id="speech-status" class="speech-status" role="status">${e(recording?'듣고 있어요… '+interim:speechInfo)}</p>
 </section>`;
}
export function checksSection(s,c,state){
 const r=phaseReadiness(s,c);
 if(r.paused)return `<section class="note checks-note paused"><h3>${icon('pause')}함께 만나는 일은 잠시 멈춰요</h3><p>거절을 존중하며 개별로 필요한 보호와 지원을 확인하세요. 본모임으로 넘어가지 않아요.</p>${btn('finish','보류·중단으로 마치기','btn outline full')}</section>`;
 const boxes=s.phase==='pre'?[['v',`${c.victim.name}의 참여 의사`],['a',`${c.actor.name}의 참여 의사`],['g','학생·보호자 동의 범위'],['safe','현재 안전과 대면 준비']]:s.phase==='main'?[['main','합의 또는 미합의 사항을 각자 확인']]:[];
 const items=s.phase==='main'?r.items.slice(1):[];
 const next=s.phase==='pre'?'본모임으로':'사후모임으로';
 return `<section class="note checks-note ${r.ready?'ready':''}"><h3>이번 단계에서 확인할 것${r.items.length?`<span class="check-progress">${r.done} / ${r.items.length}</span>`:''}</h3>
  ${boxes.map(([k,label])=>`<label class="check"><input type="checkbox" data-check="${k}" ${s.checks[k]?'checked':''} ${state.busy?'disabled':''}><span>${e(label)}</span></label>`).join('')}
  ${items.map(i=>`<p class="check-item ${i.done?'done':''}">${i.done?icon('check'):'<i aria-hidden="true"></i>'}${e(i.label)}<small>아래 합의 기록</small></p>`).join('')}
  ${s.phase==='post'?'<p>약속이 지켜졌는지와 지금 안전한지를 따로 묻고, 추가 지원을 정해요.</p>'+btn('finish','마치고 회고하기','btn primary full'):btn('advance',next+icon('arrow'),'btn primary full',(!canAdvance(s)||state.busy)?'disabled':'')}
  <small class="fine">${s.phase==='pre'?'직접 확인한 것만 표시해요. 서류나 침묵을 동의로 대신하지 않아요.':s.phase==='main'?'합의가 없어도 미합의 내용과 지원 계획을 적으면 이어갈 수 있어요.':''}</small>
 </section>`;
}
function agreementSection(s,state){
 if(s.phase==='pre')return '';
 return `<section class="note agreement-note"><h3>합의 기록</h3>${[['action','합의·미합의 내용','행동 또는 아직 합의하지 못한 내용'],['owner','누가','행동할 사람과 지원자'],['when','언제부터','실천할 시점'],['support','어른의 지원','학교가 도울 일'],['review','점검 계획','누가 언제 어떻게 확인할지']].map(([k,label,ph])=>`<label class="field">${label}<textarea rows="2" maxlength="1500" data-agreement="${k}" id="agreement-${k}" placeholder="${ph}" ${state.busy?'disabled':''}>${e(s.agreement[k])}</textarea></label>`).join('')}</section>`;
}
function coachSection(s,state){
 const co=s.coach;
 return `<section class="note coach"><h3>${icon('spark')}코치 한마디<small>${state.mode==='ai'?'AI 제안':'체험 안내'}</small></h3>${co?`<p class="${co.risk==='stop'?'risk':''}">${e(co.observation)}</p>${co.coaching?.strength?`<p>${e(co.coaching.strength)}</p>`:''}${co.coaching?.nextQuestion?`<button type="button" class="next-q" data-action="coach-question">${icon('pencil')}${e(co.coaching.nextQuestion)}</button>`:''}`:'<p>말을 건네면 학생의 반응과 다음 질문에 대한 의견이 여기에 나와요.</p>'}</section>`;
}
function applicationSection(s,c){
 const a=applicationFor(c,s.variant);
 return `<section class="note app-note"><h3>${icon('doc')}신청서 요약</h3><p><strong>${e(a.concern)}</strong></p><p>${e(a.request)}</p><p class="fine">${e(applicationRecord(s).split('\n')[0])}</p><div class="note-links">${btn('view-application','신청서 전문','link')}${btn('view-transcript','전체 대화','link')}</div><p class="fine">살펴볼 것: ${e(c.goal)}</p></section>`;
}
export function notesView(s,c,state){
 return `<aside id="notes" class="notes ${state.notesOpen?'open':''} ${state.notesEnter?'enter':''}" aria-label="노트" tabindex="-1" data-keep-scroll>
  <div class="notes-head"><h2>노트</h2><button type="button" class="icon-btn notes-close" data-action="notes" aria-label="노트 닫기">${icon('close')}</button></div>
  ${checksSection(s,c,state)}${agreementSection(s,state)}${coachSection(s,state)}${applicationSection(s,c)}
 </aside>${state.notesOpen?'<button type="button" class="scrim" data-action="notes" aria-label="노트 닫기" tabindex="-1"></button>':''}`;
}
export function roomView(s,c,state,ctx){
 const {options,recording,threeD,saveState,connected}=ctx,locked=state.busy||recording;
 const list=visibleMessages(s),undoAt=!state.busy&&!recording&&canRetry(s)?list.findLastIndex(m=>m.kind==='teacher'):-1;
 const left=remainingChecks(s,c);
 return `<main id="main" class="room phase-${s.phase} ${state.notesOpen?'notes-open':''}" tabindex="-1">
  ${roomBar(s,c,{saveState,connected},left)}
  <section class="stage-area" aria-label="대화 장면">${faces(s,c,locked)}<div class="stage-frame"><div id="stage-slot" class="stage-slot"></div></div>${stageTools(state,threeD)}</section>
  <section class="talk" aria-label="대화 기록"><div id="transcript" class="transcript" role="log" aria-live="polite" tabindex="0">${docCard(s,c)}${list.map((m,i)=>messageHtml(m,c,i===undoAt)).join('')}${state.busy?'<div class="thinking" role="status"><span></span><span></span><span></span>이야기를 생각하고 있어요</div>':''}</div>${state.error?`<p id="reply-error" class="error" role="alert">${e(state.error)}</p>`:''}</section>
  ${composer(s,c,state,options,ctx)}
  ${notesView(s,c,state)}
 </main>`;
}
