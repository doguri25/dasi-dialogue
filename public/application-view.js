import {applicationFor,applicationRecord} from './application.js';

export function applicationDocument(s,c,{e,avatar}) {
 const a=applicationFor(c,s.variant);
 return `<div class="application-paper"><header><span class="label">${a.reference} · 연습용 가상 신청서</span><h2>관계회복 지원 신청 내용</h2><p>공식 서식을 그대로 옮긴 문서가 아닙니다. 실제 접수·발송은 이루어지지 않습니다.</p></header>
 <dl class="application-meta"><div><dt>신청 학교</dt><dd>${a.school}</dd></div><div><dt>신청 경로</dt><dd>${a.requester}</dd></div><div><dt>관련 학생</dt><dd>${e(c.victim.name)} · ${e(c.actor.name)} (모두 가명)</dd></div><div><dt>접수 상태</dt><dd>${a.canPrepare?'서류 접수 가정 · 현재 의사 재확인 필요':'보완·현재 의사 확인 필요'}</dd></div></dl>
 <section class="application-section"><h3><span>1</span>어떤 일로 신청했나요?</h3><p>${e(a.background)}</p><div class="application-request"><strong>학교가 요청한 도움</strong><p>${e(a.request)}</p></div></section>
 <section class="application-section"><h3><span>2</span>학생의 상황을 살펴요</h3><p class="muted">학교에서 전달한 내용입니다. 학생의 현재 생각은 개별로 직접 확인합니다.</p>${a.positions.map(p=>`<div class="application-student">${avatar(p.role,c)}<div><strong>${e(p.name)}</strong><p>${e(p.text)}</p></div></div>`).join('')}</section>
 <section class="application-section"><h3><span>3</span>신청·동의 서류가 있나요?</h3><ul class="document-list">${a.documents.map(d=>`<li class="${d.attention?'needs-attention':''}"><strong>${e(d.label)}</strong><span>${d.attention?'확인 필요 · ':''}${e(d.status)}</span></li>`).join('')}</ul><p class="application-caption">서류 접수는 현재의 대면 동의를 뜻하지 않습니다. 학생은 의사를 바꾸거나 중단할 수 있습니다.</p></section>
 <section class="application-section"><h3><span>4</span>안전과 준비할 지원</h3><div class="application-caution"><strong>${e(a.concern)}</strong><p>${e(a.safety)}</p></div><h4>학교가 지금까지 한 일</h4><p>${e(a.prior)}</p><h4>일정·공간·지원자</h4><p>${e(a.logistics)}</p></section></div>`;
}
export function applicationView(s,c,ui) {
 const {e,button,icon,sceneHtml,stepper,saveIndicator}=ui;
 return `<div class="room-head"><div>${button('library',icon('back')+'사례 목록','text-button')}<h1>신청서를 살펴보세요</h1><p>${e(c.title)} · 읽은 뒤 바로 사전모임을 시작해요.</p></div><div class="room-actions">${saveIndicator()}${button('save',icon('save')+'기록 저장','button outline')}${button('begin-pre','사전모임 시작하기 '+icon('arrow'),'button primary')}</div></div>${stepper(s)}
 <section class="intake-intro"><div><span class="label">만나기 전에</span><h2>신청서를 읽고,<br>학생의 이야기를 만나요.</h2><p>사전모임에서는 대화모임을 먼저 안내하고<br>학생이 겪은 일을 듣습니다.</p><span class="art-disclaimer">인물과 신청서는 창작입니다. 삽화는 갈등 주제를 표현합니다.</span></div>${sceneHtml(c,'intake-scene')}</section>
 <section id="application-document" class="application-reading" aria-label="가상 신청서">${applicationDocument(s,c,ui)}<div class="application-reading-next"><p>신청서의 내용을 살펴보셨나요?<br>이제 학생에게 모임을 안내해 주세요.</p>${button('begin-pre','사전모임 시작하기 '+icon('arrow'),'button primary full','id="application-continue"')}</div></section>`;
}
export function applicationSummary(s,{e}) {
 return `<div class="application-record"><h3>신청서 열람 기록</h3><p>${e(applicationRecord(s))}</p></div>`;
}
