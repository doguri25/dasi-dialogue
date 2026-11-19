// 첫 화면: 이어서 하기·바로 시작(한 번), 사례 카드나 조건 칩을 누르면 바로 연습실(시작 창 없음).
import {scenarios,variants,phases} from '../scenarios.js';
import {e,icon,btn,SHORT_VARIANT,LEVELS} from './ui.js';

export const CATEGORIES=[...new Set(scenarios.map(c=>c.category))];
export function filterCases({query='',grade='전체',category='전체',difficulty='전체'}){
 const q=query.trim();
 return scenarios.filter(c=>(grade==='전체'||c.grade===grade)&&(category==='전체'||c.category===category)&&(difficulty==='전체'||c.difficulty===difficulty)&&(!q||`${c.title} ${c.summary} ${c.category} ${c.grade}`.includes(q)));
}
const chip=(state,key,value,label=value,cls='')=>`<button type="button" class="chip ${cls} ${state[key]===value?'on':''}" data-action="filter" data-key="${key}" data-value="${e(value)}" aria-pressed="${state[key]===value}">${e(label)}</button>`;
function caseCard(c){
 const cat=CATEGORIES.indexOf(c.category);
 return `<article class="case cat-${cat}" data-id="${c.id}">
  <button type="button" class="case-main" data-action="start" data-id="${c.id}" data-variant="cooperative" aria-label="${e(c.title)} — 협력적 대화로 바로 시작">
   <span class="case-meta"><i class="cat-dot" aria-hidden="true"></i>${e(c.category)} · ${c.grade} · <b class="level level-${LEVELS.indexOf(c.difficulty)+1}">${c.difficulty}</b></span>
   <strong class="case-title">${e(c.title)}</strong>
   <span class="case-summary">${e(c.summary)}</span>
  </button>
  <div class="case-variants" role="group" aria-label="${e(c.title)} — 조건을 골라 바로 시작">${Object.entries(variants).map(([k,v])=>`<button type="button" class="vchip v-${k}" data-action="start" data-id="${c.id}" data-variant="${k}" title="${e(v.label)}: ${e(v.description)}" aria-label="${e(v.label)}으로 시작">${SHORT_VARIANT[k]}</button>`).join('')}</div>
 </article>`;
}
export function homeView(state,{continuing,continuingCase,continuingLive}){
 const list=filterCases(state),filtered=state.query||state.grade!=='전체'||state.category!=='전체'||state.difficulty!=='전체';
 const resume=continuing&&continuingCase?`<article class="resume-card"><span class="kicker">이어서 하기</span><strong>${e(continuingCase.title)}</strong><span>${phases[continuing.phase]} · ${e(variants[continuing.variant].label)} · 나눈 말 ${continuing.messages.filter(m=>m.kind==='teacher').length}개</span>${btn('resume',`${continuingLive?'연습실로 돌아가기':'이어서 하기'}${icon('arrow')}`,'btn primary',`data-id="${e(continuing.id)}"`)}</article>`:'';
 return `<main id="main" class="home" tabindex="-1">
  <section class="home-side" aria-label="시작하기">
   <div class="home-intro"><span class="kicker">관계회복 대화 연습실</span><h1>다음 만남을 위한<br>한 번의 연습</h1><p>가상 학생의 이야기를 듣고 사전·본·사후모임 질문을 연습해요. 마이크나 AI 없이도 바로 시작할 수 있어요.</p></div>
   ${resume}
   <button type="button" class="btn ${resume?'outline':'primary'} quick" data-action="quick">${icon('chat')}<span>바로 시작<small>${e(scenarios[0].title)} · 입문 · 협력적 대화</small></span></button>
   <ol class="how" aria-label="연습 순서"><li><b>1</b><span>사례를 누르면 바로 사전모임이에요<small>조건 칩(협력·교착·중단·미이행)으로 상황을 고를 수 있어요</small></span></li><li><b>2</b><span>제안 문장을 누르면 바로 말해요<small>고쳐 쓰거나 직접 입력·마이크도 돼요. 되돌리기도 있어요</small></span></li><li><b>3</b><span>마치면 곧바로 회고해요<small>모든 연습은 이 브라우저에 자동 저장돼요</small></span></li></ol>
  </section>
  <section class="home-cases" aria-label="사례 고르기">
   <div class="case-tools">
    <label class="search">${icon('search')}<input id="search" type="search" aria-label="사례 검색" placeholder="사례나 갈등 주제 검색" value="${e(state.query)}" autocomplete="off"></label>
    <div class="filter-line" role="group" aria-label="학교급과 난도">${['전체','초등','중등','고등'].map(v=>chip(state,'grade',v,v==='전체'?'모든 학교급':v)).join('')}<span class="sep" aria-hidden="true"></span>${['전체',...LEVELS].map(v=>chip(state,'difficulty',v,v==='전체'?'모든 난도':v)).join('')}</div>
    <div class="filter-line topics" role="group" aria-label="갈등 주제">${chip(state,'category','전체','모든 주제')}${CATEGORIES.map((c,i)=>chip(state,'category',c,c,'cat-'+i)).join('')}</div>
    <div class="result-line"><span class="result-count" role="status">${list.length}개 사례</span>${filtered?btn('clear-filters','조건 지우기','link'):''}</div>
   </div>
   <div class="case-grid" id="case-grid" data-keep-scroll>${list.length?list.map(caseCard).join(''):`<div class="empty"><strong>조건에 맞는 사례가 없어요</strong><p>검색어를 지우거나 다른 조건을 골라 보세요.</p>${btn('clear-filters','모든 사례 보기','btn primary')}</div>`}</div>
  </section>
 </main>`;
}
