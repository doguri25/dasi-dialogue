import {portraitFor} from '../artwork.js';

// 기존 학생 그림 6장(docs/image-assets.json)의 머리 모양·옷을 3D 캐릭터로 옮긴 생김새입니다.
// 어느 생김새도 특정 역할(피해 경험/행동한 학생)에 고정하지 않습니다. 대응은 portraitFor 규칙을 그대로 따릅니다.
export const LOOKS={
 'elementary-a':{age:'elementary',hair:'bob',hairColor:'#2a211d',skin:'#f3cfb1',top:'#9db697',topKind:'sweatshirt',under:null,cheek:'#f0a99a'},
 'elementary-b':{age:'elementary',hair:'tousled',hairColor:'#2b231f',skin:'#efc6a4',top:'#d6a14f',topKind:'sweatshirt',under:null,cheek:'#eea08f'},
 'middle-a':{age:'middle',hair:'halfup',hairColor:'#231c19',skin:'#f1cbad',top:'#93ab8e',topKind:'cardigan',under:'#f3ead8',cheek:'#eba596'},
 'middle-b':{age:'middle',hair:'cropped',hairColor:'#2a221e',skin:'#ecc3a2',top:'#b7a8d8',topKind:'hoodie',under:null,cheek:'#e99d8d'},
 'high-a':{age:'high',hair:'chinbob',hairColor:'#211a17',skin:'#f0caab',top:'#8fa78b',topKind:'cardigan',under:'#fbf8f1',cheek:'#e8a293'},
 'high-b':{age:'high',hair:'sidepart',hairColor:'#261f1b',skin:'#eac09f',top:'#34466b',topKind:'jacket',under:'#f2e9d6',cheek:'#e59a8a'},
 guardian:{age:'adult',hair:'short',hairColor:'#3a302a',skin:'#e9c09f',top:'#d8c4a3',topKind:'knit',under:null,cheek:'#e29d8e'}
};

export function lookFor(scenario,role) {
 if(role==='g')return 'guardian';
 const src=portraitFor(scenario,role)||'';
 const match=src.match(/student-([a-z]+-[ab])\.webp$/);
 return match&&LOOKS[match[1]]?match[1]:'elementary-a';
}

// ---- 의자 천: 옷과 같은 색 의자에 앉지 않게 ----
// 역할 색(화면의 학생·보호자 색)은 의자 둘레 테(trim)에 늘 남기고, 앉는 천(seat)은 옷과 충분히 다른 색으로 고릅니다.
// 역할 색이 옷과 다르면 그대로 쓰고, 겹치면 차분한 다른 천(귀리·테라코타·머스터드·장밋빛·하늘) 가운데 가장 먼저 맞는 것을 씁니다.
export const ROLE_FABRIC={v:'#a9c4a2',a:'#b8afd9',g:'#a7c3d6'};
const SPARE_FABRICS=['#e6d4b8','#dda58a','#e3c06e','#e7b7b4','#a7c3d6'];
const MIN_DISTANCE=28;
function lab(hex){
 const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const x=(c[0]*.4124+c[1]*.3576+c[2]*.1805)/.95047,y=c[0]*.2126+c[1]*.7152+c[2]*.0722,z=(c[0]*.0193+c[1]*.1192+c[2]*.9505)/1.08883;
 const f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;
 return [116*f(y)-16,500*(f(x)-f(y)),200*(f(y)-f(z))];
}
// 두 색의 차이(CIE76 ΔE). 28 이상이면 한눈에 다른 색으로 보입니다.
export function colourDistance(a,b){const p=lab(a),q=lab(b);return Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);}
export function chairFabricFor(role,lookKey){
 const look=LOOKS[lookKey]||LOOKS['elementary-a'],trim=ROLE_FABRIC[role]||ROLE_FABRIC.v,worn=[look.top,look.under].filter(Boolean);
 const fits=c=>worn.every(w=>colourDistance(c,w)>=MIN_DISTANCE);
 const seat=[trim,...SPARE_FABRICS].find(fits)||[trim,...SPARE_FABRICS].reduce((best,c)=>Math.min(...worn.map(w=>colourDistance(c,w)))>Math.min(...worn.map(w=>colourDistance(best,w)))?c:best);
 return {seat,trim};
}
