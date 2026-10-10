import {phases,variants,roleName} from './scenarios.js';
import {phaseReadiness} from './workspace.js';

export function continuationView(s,c,current,{e,button,sceneHtml}) {
 if(!s||s.finished)return '';
 return `<section class="continue-practice" aria-label="이어서 할 연습">${sceneHtml(c,'continue-scene')}<div><span class="label">이야기를 이어갈까요?</span><h2>${e(c.title)}</h2><p>${phases[s.phase]} · ${e(variants[s.variant].label)}<br>${current?'지금까지 나눈 대화가 이 창에 남아 있어요.':'저장한 대화와 작성 중이던 문장을 이어가세요.'}</p></div>${button(current?'room':'resume','이어서 연습하기','button primary',current?'':`data-id="${s.id}"`)}</section>`;
}

export function readinessView(s,c,{e,button,icon},compact=false) {
 const r=phaseReadiness(s,c);
 return `<section class="readiness ${r.ready?'ready':''} ${r.paused?'paused':''} ${compact?'compact':''}" aria-label="다음 단계 준비"><div class="readiness-heading"><span class="readiness-icon">${icon(r.paused?'pause':r.ready?'check':'leaf')}</span><div><strong>${e(r.title)}</strong><p>${e(r.detail)}</p></div></div>${compact?button('show-notes','진행 확인 열기','text-button'):r.items.length?`<div class="readiness-track"><progress aria-label="직접 확인한 진행 항목" max="${r.items.length}" value="${r.done}">${r.done} / ${r.items.length}</progress><span>${r.done} / ${r.items.length} 확인</span></div><ul>${r.items.map(i=>`<li class="${i.done?'done':''}"><span aria-hidden="true">${i.done?'✓':'○'}</span>${e(i.label)}</li>`).join('')}</ul>`:''}</section>`;
}

export function transcriptView(s,c,{e,button,icon}) {
 const entries=s.messages.filter(m=>m.kind!=='system');
 return `<div class="dialog-heading"><span class="label">진행자가 다시 읽는 기록</span>${button('close',icon('close'),'icon-button','aria-label="닫기"')}</div><h2>지금까지 나눈 이야기</h2><p class="dialog-description">사전모임의 다른 학생 발언은 학생 역할 AI에게 공유되지 않습니다.</p><div class="dialog-transcript">${Object.entries(phases).filter(([phase])=>entries.some(m=>m.phase===phase)).map(([phase,label])=>`<section><h3>${label}</h3>${entries.filter(m=>m.phase===phase).map(m=>`<article class="archive-turn ${m.kind==='teacher'?'archive-teacher':''}"><strong>${m.kind==='teacher'?`진행자 → ${e(roleName(c,m.target))}`:e(roleName(c,m.speaker))}</strong><p>${e(m.text)}</p></article>`).join('')}</section>`).join('')||'<p class="archive-empty">아직 주고받은 대화가 없어요. 학생에게 모임을 안내하며 시작해 보세요.</p>'}</div>`;
}

export function evidenceView(review,{e}) {
 if(!review.evidence)return '';
 return `<section class="review-evidence"><h2>대화에서 찾아본 장면</h2><p>질문에 사용한 단어를 바탕으로 찾은 참고 장면이에요. 실제 맥락은 함께 읽어 주세요.</p><div>${review.evidence.map(item=>`<article><h3>${e(item.name)}</h3>${item.quote?`<blockquote>“${e(item.quote)}”</blockquote><span>${phases[item.phase]}에서 건넨 말</span>`:'<p>기록에서 질문 흔적을 찾지 못했어요. 실제로 어떻게 살폈는지 회고해 보세요.</p>'}</article>`).join('')}</div></section>`;
}
