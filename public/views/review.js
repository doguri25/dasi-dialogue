// 회고: 한 화면 세 칸(돌아보기 · 장면 · 나의 회고). 결과는 맨 위 칩으로 바로 바꾸고, 장면은 그 자리의 작은 무대에서 다시 봅니다.
import {variants,phases,roleName} from '../scenarios.js';
import {localReview} from '../engine.js';
import {sceneIndexFor} from '../replay.js';
import {sceneFor} from '../artwork.js';
import {applicationRecord} from '../application.js';
import {OUTCOMES} from '../flow.js';
import {e,icon,btn,dateText} from './ui.js';
import {doodle} from './doodles.js';

function evidence(s,local){
 if(!local.evidence?.length)return '';
 return `<div class="evidence">${local.evidence.map(item=>{const at=item.quote?sceneIndexFor(s,item):-1;return `<article><h3>${e(item.name)}</h3>${item.quote?`<blockquote>“${e(item.quote)}”</blockquote><span class="fine">${phases[item.phase]}에서 건넨 말</span>${at>=0?btn('replay',icon('play')+'이 장면 보기','link replay-btn',`data-index="${at}"`):''}`:'<p class="fine">기록에서 이 질문의 흔적을 찾지 못했어요. 실제로 어떻게 살폈는지 적어 보세요.</p>'}</article>`;}).join('')}</div>`;
}
function retries(s,c){
 const list=Array.isArray(s.retries)?s.retries:[];if(!list.length)return '';
 return `<section class="review-retries"><h3>다시 해 본 질문 <small>${list.length}</small></h3>${list.map(r=>`<article><span class="fine">${e(phases[r.phase]||'')} · 처음 건넨 말</span><blockquote>“${e(r.text)}”</blockquote>${(r.replies||[]).map(m=>`<p><strong>${e(roleName(c,m.speaker))}</strong> ${e(m.text)}</p>`).join('')}</article>`).join('')}</section>`;
}
function transcript(s,c){
 return `<section class="review-transcript"><h3>전체 대화 <small>${s.messages.length}</small></h3>${s.messages.map((m,i)=>`<div class="line ${m.kind}"><span>${phases[m.phase]} · ${m.kind==='teacher'?'나 → '+e(roleName(c,m.target)):m.kind==='system'?'안내':e(roleName(c,m.speaker))}</span><p>${e(m.text)}</p>${m.kind==='teacher'?btn('replay',icon('play'),'icon-btn ghost replay-btn',`data-index="${i}" aria-label="이 장면 다시 보기"`):''}</div>`).join('')}</section>`;
}
export function reviewView(s,c,state,{replayScene}){
 const r=state.review||s.savedReview||localReview(s,c),local=localReview(s,c),art=sceneFor(c);
 return `<main id="main" class="review" tabindex="-1">
  <div class="print-head" aria-hidden="true"><img src="mark.svg" alt="" width="28" height="28"><strong>다시, 대화 · 연습 회고</strong><span>${e(c.title)} · ${e(variants[s.variant].label)} · ${e(dateText(s.startedAt))}</span></div>
  <header class="review-head">
   <div class="review-title"><span class="kicker">연습 돌아보기</span><h1>${e(c.title)}</h1><p>${e(variants[s.variant].label)} · ${phases[s.phase]}까지 · ${e(dateText(s.startedAt))}</p></div>
   <div class="outcomes" role="group" aria-label="오늘 모임의 결과">${OUTCOMES.map((o,i)=>`<button type="button" id="outcome-${i}" class="chip ${s.outcome===o?'on':''}" data-action="outcome" data-value="${e(o)}" aria-pressed="${s.outcome===o}">${e(o)}</button>`).join('')}</div>
   <div class="review-actions">${btn('reopen',icon('undo')+'<span>이어서 연습</span>','btn outline','title="마친 연습을 그 자리에서 이어 가요"')}${btn('again',icon('refresh')+'<span>처음부터 다시</span>','btn outline')}${btn('print',icon('print')+'<span>인쇄</span>','btn outline')}${btn('export',icon('down')+'<span>내려받기</span>','btn outline')}${btn('ai-review',icon('spark')+`<span>${state.busy?'회고 만드는 중…':'AI 심층 회고'}</span>`,'btn outline',state.busy?'disabled':'')}</div>
   <p class="outcome-print">결과: ${e(s.outcome)}</p>
  </header>
  ${state.error?`<p class="error" role="alert">${e(state.error)}</p>`:''}
  <div class="review-cols">
   <section class="review-col reflect-col" data-keep-scroll id="col-reflect" aria-label="돌아보기">
    <h2>${e(r.title)}</h2><p>${e(r.summary)}</p>
    <div class="pair"><div><h3>${icon('leaf')}이어갈 점</h3><ul>${(r.strengths?.length?r.strengths:['기록을 읽으며 학생의 말을 기다렸던 순간을 찾아보세요.']).map(x=>`<li>${e(x)}</li>`).join('')}</ul></div><div><h3>${icon('spark')}다시 살펴볼 점</h3><ul>${(r.improvements||[]).map(x=>`<li>${e(x)}</li>`).join('')}</ul></div></div>
    <div class="next-practice">${doodle('post')}<p><strong>다음 연습</strong>${e(r.nextPractice)}</p></div>
    <p class="fine">결말과 배움은 달라요. 안전한 중단도 좋은 진행일 수 있고, 합의했더라도 강요가 없었는지 다시 살펴보세요.</p>
    <p class="fine record-line">${e(applicationRecord(s).split('\n')[0])}</p>
   </section>
   <section class="review-col scenes-col" data-keep-scroll id="col-scenes" aria-label="장면">
    <h2>장면 다시 보기</h2>
    <div class="mini-stage">${replayScene?'<div class="stage-frame"><div id="replay-slot" class="stage-slot"></div></div>':`<img src="${art.src}" alt="" width="1536" height="1024" loading="lazy" decoding="async"><p>${icon('play')}아래 장면이나 전체 대화의 ▶를 누르면 여기서 다시 봐요.</p>`}</div>
    <p class="replay-status fine" role="status" data-replay-state="${replayScene?state.replayState||'playing':'idle'}">${replayScene?e(state.replayText||'장면을 다시 보고 있어요.'):'대화에서 찾은 장면이에요.'}</p>
    ${replayScene?`<ol class="replay-lines"><li><strong>나</strong>${e(replayScene.teacher)}</li>${replayScene.replies.map(m=>`<li><strong>${e(roleName(c,m.speaker))}</strong>${e(m.text)}</li>`).join('')}</ol>`:''}
    ${evidence(s,local)}
   </section>
   <section class="review-col mine-col" data-keep-scroll id="col-mine" aria-label="나의 회고">
    <label class="field reflection"><span>나의 회고 <small>적으면 바로 저장돼요</small></span><textarea id="reflection" rows="4" placeholder="다시 질문한다면 어떻게 말하고 싶나요? 학생의 거절을 어떻게 받아들였나요?">${e(s.reflection)}</textarea></label>
    <div class="print-reflection" aria-hidden="true"></div>
    ${retries(s,c)}${transcript(s,c)}
   </section>
  </div>
 </main>`;
}
