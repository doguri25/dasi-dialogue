// 앱 막대, 기록, 도움말, 그리고 "읽으러 여는" 창(신청서 전문 · 전체 대화 · 설정 판).
import {scenarios,variants,phases,roleName} from '../scenarios.js';
import {applicationFor} from '../application.js';
import {e,icon,btn,avatar,dateText} from './ui.js';
import {doodle} from './doodles.js';

export function appBar(view,{records,connected}){
 const nav=(v,ic,label,extra='')=>`<button type="button" class="nav ${view===v?'on':''}" data-action="go" data-view="${v}" ${view===v?'aria-current="page"':''}>${icon(ic)}<span>${label}</span>${extra}</button>`;
 return `<header class="appbar"><a class="brand" href="#" data-action="go" data-view="home" aria-label="다시, 대화 첫 화면"><img src="mark.svg" alt="" width="28" height="28"><span>다시, 대화</span></a>
  <nav aria-label="주 메뉴">${nav('home','grid','사례')}${nav('history','clock','기록',records?`<span class="count">${records}</span>`:'')}${nav('help','help','도움말')}</nav>
  <button type="button" class="nav settings" data-action="settings" aria-label="설정${connected?' — AI 연결됨':''}">${icon('gear')}<span>설정</span>${connected?'<i class="dot" aria-hidden="true"></i>':''}</button></header>`;
}

export function historyView(saved){
 return `<main id="main" class="history" tabindex="-1"><div class="page"><header class="page-head"><span class="kicker">쌓이는 연습</span><h1>내 연습 기록</h1><p>연습은 이 브라우저에 자동으로 저장돼요(최근 20개). API 키는 저장하지 않아요.</p></header>
 ${saved.length?`<ul class="records">${saved.map(s=>{const c=scenarios.find(x=>x.id===s.scenarioId),n=s.messages.filter(m=>m.kind==='teacher').length;return `<li class="record ${s.finished?'finished':''}" data-id="${e(s.id)}"><button type="button" class="record-open" data-action="open-record" data-id="${e(s.id)}"><span class="record-icon">${icon(s.finished?'book':'chat')}</span><span><strong>${e(c.title)}</strong><small>${e(dateText(s.startedAt))} · ${e(variants[s.variant]?.label||'')} · ${s.finished?e(s.outcome||'마침'):phases[s.phase]+' 진행 중'} · 나눈 말 ${n}개</small></span><span class="record-go">${s.finished?'회고 보기':'이어서 하기'}${icon('arrow')}</span></button>${btn('delete-record',icon('trash'),'icon-btn ghost',`data-id="${e(s.id)}" aria-label="${e(c.title)} 기록 삭제"`)}</li>`;}).join('')}</ul>`:`<div class="empty">${doodle('notebook','lg')}<strong>아직 기록이 없어요</strong><p>사례를 누르면 바로 연습이 시작되고, 말을 건네면 자동으로 저장돼요.</p>${btn('go','사례 고르기','btn primary','data-view="home"')}</div>`}
 </div></main>`;
}

export function helpView(version=''){
 const phasesHelp=[['사전모임','학생마다 따로 만나 모임의 목적·선택권·멈출 수 있음을 먼저 안내하고, 무슨 일이 있었는지 그 학생의 입장에서 들어요. 다른 학생의 말은 공유되지 않아요.'],['본모임','선택권과 멈추는 방법을 다시 알리고, 영향과 필요한 회복을 들으며 책임질 행동을 구체적으로 정해요. 용서나 같은 잘못을 요구하지 않아요.'],['사후모임','약속이 지켜졌는지와 지금 안전한지를 따로 물어요. 미이행을 숨기지 않고 지원과 점검 계획을 고쳐요.']];
 return `<main id="main" class="help" tabindex="-1"><div class="page"><header class="page-head"><span class="kicker">도움말</span><h1>이렇게 연습해요</h1><p>모든 사례와 인물은 창작입니다. 공식 연수 인증이나 실제 사안 판정 도구가 아니에요. <span class="version-label">다시, 대화 ${e(version)}</span></p></header>
 <ol class="help-steps"><li>${doodle('tap')}<div><strong>사례를 누르면 바로 시작</strong><p>카드는 협력적 대화로, 조건 칩(교착·중단·미이행)은 그 상황으로 곧바로 사전모임에 들어가요. 신청서는 대화 맨 위와 노트에서 늘 볼 수 있어요.</p></div></li><li>${doodle('say')}<div><strong>제안 문장을 누르면 바로 말해요</strong><p>잘못 보냈다면 내 말 아래 <em>되돌리기</em>로 지우고 다시 말해요. 연필은 고쳐 쓰기, 입력칸은 직접 말하기(Enter 보내기, Shift+Enter 줄바꿈)예요. PC에서는 1–4 키로도 보내요.</p></div></li><li>${doodle('checklist')}<div><strong>노트에서 확인하고 다음 단계로</strong><p>직접 확인한 것만 체크해요. 다 되면 다음 단계로 넘어가요. 준비가 안 됐다면 마치기에서 보류·중단을 남겨요.</p></div></li><li>${doodle('reflect')}<div><strong>마치면 곧바로 회고</strong><p>결과는 회고 맨 위에서 고쳐요. 장면을 다시 보고, 나의 회고를 적고, 내려받거나 인쇄해요.</p></div></li></ol>
 <div class="help-cols"><section><h2>모임별 핵심</h2>${phasesHelp.map(([h,p],i)=>`<h3>${doodle(['pre','main','post'][i],'sm2')}${h}</h3><p>${p}</p>`).join('')}</section>
 <section><h2>마이크와 AI</h2><p>음성 입력은 브라우저의 음성 인식을 써요. Chrome의 HTTPS 주소나 localhost에서 잘 동작하고, 인식된 말은 입력칸에만 들어가요(저절로 보내지 않음). 음성 파일은 저장하지 않아요.</p><p>설정에서 AI 역할 대화를 고르면 사례와 대화 기록이 고른 제공사(Claude·Gemini·ChatGPT)로 전송돼요. API 키는 이 창의 메모리에만 두고, 새로고침하면 다시 넣어야 해요. 웹 구독과 API 과금은 별개일 수 있어요.</p>
 <h2>자료</h2><p class="links"><a href="https://talkcne.or.kr/bbs/board.php?bo_table=notice&wr_id=102" target="_blank" rel="noreferrer">충남 2026 신청서식${icon('arrow')}</a><a href="https://talkcne.or.kr/bbs/board.php?bo_table=notice&wr_id=81" target="_blank" rel="noreferrer">관계회복지원단 안내${icon('arrow')}</a><a href="https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition" target="_blank" rel="noreferrer">브라우저 음성 인식${icon('arrow')}</a></p></section></div>
 </div></main>`;
}

const dialogHead=(kicker,title)=>`<div class="dialog-head"><div><span class="kicker">${kicker}</span><h2>${title}</h2></div>${btn('close',icon('close'),'icon-btn','aria-label="닫기"')}</div>`;
export function applicationDialog(s,c){
 const a=applicationFor(c,s.variant);
 return `${dialogHead(`${e(a.reference)} · 연습용 가상 신청서`,'관계회복 지원 신청 내용')}<div class="application-paper"><p class="fine">공식 서식을 옮긴 문서가 아니에요. 실제 접수·발송은 이루어지지 않아요.</p>
 <dl class="app-meta"><div><dt>신청 학교</dt><dd>${a.school}</dd></div><div><dt>신청 경로</dt><dd>${a.requester}</dd></div><div><dt>관련 학생</dt><dd>${e(c.victim.name)} · ${e(c.actor.name)} (모두 가명)</dd></div><div><dt>접수 상태</dt><dd>${a.canPrepare?'서류 접수 가정 · 현재 의사 재확인 필요':'보완·현재 의사 확인 필요'}</dd></div></dl>
 <h3>1. 어떤 일로 신청했나요?</h3><p>${e(a.background)}</p><p class="callout"><strong>학교가 요청한 도움</strong> ${e(a.request)}</p>
 <h3>2. 학생의 상황</h3><p class="fine">학교에서 전달한 내용이에요. 지금의 생각은 개별로 직접 확인해요.</p>${a.positions.map(p=>`<div class="app-student">${avatar(p.role,c)}<div><strong>${e(p.name)}</strong><p>${e(p.text)}</p></div></div>`).join('')}
 <h3>3. 신청·동의 서류</h3><ul class="docs">${a.documents.map(d=>`<li class="${d.attention?'attention':''}"><strong>${e(d.label)}</strong><span>${d.attention?'확인 필요 · ':''}${e(d.status)}</span></li>`).join('')}</ul><p class="fine">서류 접수는 지금의 대면 동의를 뜻하지 않아요. 학생은 의사를 바꾸거나 멈출 수 있어요.</p>
 <h3>4. 안전과 준비할 지원</h3><p class="callout warn"><strong>${e(a.concern)}</strong> ${e(a.safety)}</p><h4>학교가 지금까지 한 일</h4><p>${e(a.prior)}</p><h4>일정·공간·지원자</h4><p>${e(a.logistics)}</p></div>`;
}
export function transcriptDialog(s,c){
 const entries=s.messages.filter(m=>m.kind!=='system');
 return `${dialogHead('진행자가 다시 읽는 기록','지금까지 나눈 이야기')}<p class="fine">사전모임의 다른 학생 발언은 학생 역할 AI에게 공유되지 않아요.</p><div class="archive">${Object.entries(phases).filter(([p])=>entries.some(m=>m.phase===p)).map(([p,label])=>`<section><h3>${label}</h3>${entries.filter(m=>m.phase===p).map(m=>`<article class="${m.kind==='teacher'?'mine':''}"><strong>${m.kind==='teacher'?`나 → ${e(roleName(c,m.target))}`:e(roleName(c,m.speaker))}</strong><p>${e(m.text)}</p></article>`).join('')}</section>`).join('')||'<p>아직 주고받은 대화가 없어요. 학생에게 모임을 안내하며 시작해 보세요.</p>'}</div>`;
}
const toggle=(action,on,label,desc)=>`<button type="button" class="toggle" data-action="${action}" aria-pressed="${on}"><span><strong>${label}</strong><small>${desc}</small></span><i aria-hidden="true"></i></button>`;
export function settingsSheet(state,{providers,stagePref,soundsOn,version=''}){
 return `${dialogHead('바꾸면 바로 적용돼요','설정')}
 <section class="set"><h3>대화 방식</h3><div class="radio-cards">${[['demo','시나리오 체험','API 없이 준비된 반응'],['ai','AI 역할 대화','내 API 키 · 사용량 발생']].map(([v,l,d])=>`<label><input type="radio" name="mode" value="${v}" ${state.mode===v?'checked':''}><span><strong>${l}</strong><small>${d}</small></span></label>`).join('')}</div>
  <div class="ai-fields ${state.mode==='ai'?'':'muted'}"><label class="field">AI 서비스<select id="provider">${Object.entries(providers).map(([k,v])=>`<option value="${k}" ${state.provider===k?'selected':''}>${v}</option>`).join('')}</select></label><label class="field">모델 이름<input id="model" value="${e(state.model)}" maxlength="100" autocomplete="off" spellcheck="false"></label><label class="field">API 키<input id="api-key" type="password" value="${e(state.apiKey)}" placeholder="선택한 서비스의 API 키" autocomplete="off" spellcheck="false" maxlength="1024"></label><div class="row">${btn('check-key','연결 확인','btn outline')}${btn('forget-key','키 지우기','link')}</div><p id="connection-status" class="fine" role="status"></p><p class="fine">키는 이 창의 메모리에만 두고 저장하지 않아요. 새로고침하면 다시 넣어 주세요.</p></div></section>
 <section class="set"><h3>3D 대화 장면</h3><div class="radio-cards three">${[['auto','자동','기기에 맞춰요'],['on','켜기','늘 3D'],['off','끄기','그림 무대']].map(([v,l,d])=>`<label><input type="radio" name="stage-pref" value="${v}" ${stagePref===v?'checked':''}><span><strong>${l}</strong><small>${d}</small></span></label>`).join('')}</div></section>
 <section class="set"><h3>소리와 글자</h3>${toggle('tts-toggle',state.tts,'답을 목소리로 듣기','학생·보호자의 말을 읽어 줘요')}${toggle('sound-toggle',soundsOn,'효과음','보낼 때와 답이 올 때 짧은 소리')}${toggle('text-size',state.largeText,'글자 크게','모든 화면의 글자를 키워요')}</section><p class="fine version-label">다시, 대화 ${e(version)} · 가상 사례로 연습하는 관계회복 대화 · 공식 연수 인증이나 실제 사안 판정 도구가 아니에요.</p>`;
}
