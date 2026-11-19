// 화면 공통: 글자 이스케이프, 아이콘, 단추, 얼굴. 화면 글에는 style 속성을 쓰지 않습니다(보안 정책).
import {roleName} from '../scenarios.js';
import {portraitFor} from '../artwork.js';

export const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICONS={
 grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
 chat:'<path d="M21 11a8 8 0 0 1-8 8H8l-5 3V11a9 9 0 0 1 18 0Z"/><path d="M8 10h8M8 14h5"/>',
 book:'<path d="M12 5v16M3 3h4a5 5 0 0 1 5 2 5 5 0 0 1 5-2h4v16h-4a5 5 0 0 0-5 2 5 5 0 0 0-5-2H3Z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.4M12 17h.01"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
 arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
 back:'<path d="M19 12H5m5-5-5 5 5 5"/>',
 mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
 stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
 send:'<path d="m3 3 19 9-19 9 4-9-4-9Zm4 9h15"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 down:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 play:'<path d="M8 5.5v13l10.5-6.5z"/>',
 undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
 print:'<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v7H7z"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 pause:'<path d="M8 4v16M16 4v16"/>',
 spark:'<path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7L12 2Z"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 people:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 3a4 4 0 0 1 0 8m2 4a6 6 0 0 1 3 5"/>',
 volume:'<path d="M3 9h4l5-5v16l-5-5H3V9Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/>',
 mutedVolume:'<path d="M3 9h4l5-5v16l-5-5H3V9Zm13 0 5 6m0-6-5 6"/>',
 leaf:'<path d="M20 3C3 0 0 17 9 20c8 3 13-8 11-17ZM5 22 16 9"/>',
 textSize:'<path d="M3 19 8.5 5 14 19M5.2 14h6.6M15 19l3-7.5 3 7.5m-5-2.4h4"/>',
 pencil:'<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/><path d="m14.5 5.5 3 3"/>',
 refresh:'<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
 note:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
 flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
 cube:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
 skip:'<path d="m5 5 8 7-8 7ZM15 5v14"/>',
 doc:'<path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'
};
export const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||''}</svg>`;
export const btn=(action,label,cls='btn',extra='')=>`<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
export function avatar(role,c,cls=''){
 if(role==='all')return `<span class="avatar all ${cls}" aria-hidden="true">${icon('people')}</span>`;
 const src=portraitFor(c,role);
 return `<span class="avatar ${role} ${cls}" aria-hidden="true">${src?`<img src="${src}" alt="" width="96" height="96" loading="lazy" decoding="async">`:role==='g'?'보':e(roleName(c,role).slice(0,1))}</span>`;
}
export const SHORT_VARIANT={cooperative:'협력',resistant:'교착',unsafe:'중단',relapse:'미이행'};
export const LEVELS=['입문','중급','심화'];
export const dateText=iso=>{try{return new Date(iso).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});}catch{return '';}};
