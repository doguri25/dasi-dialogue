// 손그림 아이콘 만들기: 간단한 도형(선·곡선·타원)을 살짝 흔들리는 한 획의 펜 선으로 바꾸고, 뒤에 옅은 물감 얼룩을 깝니다.
// 같은 씨앗이면 늘 같은 그림이 나옵니다. 실행: node tools/draw-doodles.mjs → public/views/doodles.js
import {writeFile} from 'node:fs/promises';

function rng(seed){let s=(seed*2654435761)>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
const f=n=>Number(n.toFixed(1));
// 점들을 지나는 매끈한 곡선(캣멀롬 → 3차 베지어)
function smooth(pts,closed=false){
 const P=closed?[pts.at(-1),...pts,pts[0],pts[1]]:[pts[0],...pts,pts.at(-1)];
 let d=`M${f(P[1][0])} ${f(P[1][1])}`;
 for(let i=1;i<P.length-2;i++){const [p0,p1,p2,p3]=[P[i-1],P[i],P[i+1],P[i+2]];
  d+=`C${f(p1[0]+(p2[0]-p0[0])/6)} ${f(p1[1]+(p2[1]-p0[1])/6)} ${f(p2[0]-(p3[0]-p1[0])/6)} ${f(p2[1]-(p3[1]-p1[1])/6)} ${f(p2[0])} ${f(p2[1])}`;}
 return closed?d+'Z':d;
}
// 손이 떨리는 정도: 낮은 주파수 두 개를 섞은 흔들림
function wobble(r,amp){const a=1+r()*.8,b=2.4+r()*1.4,pa=r()*6.28,pb=r()*6.28;return t=>amp*(.62*Math.sin(6.283*a*t+pa)+.38*Math.sin(6.283*b*t+pb));}
function drawIcon(seed,shapes){
 const r=rng(seed),ink=[],fill=[];
 const along=(pts,amp)=>{   // 꺾은선을 따라 촘촘히 점을 찍고 법선 방향으로 흔듭니다
  const seg=[];let total=0;for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(l);total+=l;}
  const w=wobble(r,amp),out=[];let acc=0;
  for(let i=1;i<pts.length;i++){const [a,b]=[pts[i-1],pts[i]],l=seg[i-1],n=Math.max(2,Math.round(l/3.2)),nx=-(b[1]-a[1])/(l||1),ny=(b[0]-a[0])/(l||1);
   for(let k=(i===1?0:1);k<=n;k++){const t=k/n,g=(acc+l*t)/total,o=w(g);out.push([a[0]+(b[0]-a[0])*t+nx*o,a[1]+(b[1]-a[1])*t+ny*o]);}acc+=l;}
  return out;
 };
 for(const s of shapes){
  if(s[0]==='line'||s[0]==='poly'){   // ['line',[x,y],[x,y],...]  끝을 조금 넘겨 그은 느낌
   const pts=s.slice(1).map(p=>[...p]),over=.5+r()*.7,[a,b]=[pts[0],pts[1]],[c,d]=[pts.at(-2),pts.at(-1)];
   const la=Math.hypot(b[0]-a[0],b[1]-a[1])||1,lb=Math.hypot(d[0]-c[0],d[1]-c[1])||1;
   pts[0]=[a[0]-(b[0]-a[0])/la*over*.6,a[1]-(b[1]-a[1])/la*over*.6];pts[pts.length-1]=[d[0]+(d[0]-c[0])/lb*over,d[1]+(d[1]-c[1])/lb*over];
   ink.push(smooth(along(pts,.42)));
  }else if(s[0]==='shape'){   // ['shape',[x,y],...] 닫힌 꺾은선(시작점에서 조금 지나쳐 닫음)
   const pts=s.slice(1),loop=[...pts,pts[0],[pts[0][0]+(pts[1][0]-pts[0][0])*.12,pts[0][1]+(pts[1][1]-pts[0][1])*.12]];
   ink.push(smooth(along(loop,.42)));
  }else if(s[0]==='curve'){   // ['curve',[x,y],...] 점들을 지나는 곡선
   const w=wobble(r,.32),pts=s.slice(1).map((p,i,a)=>{const o=w(i/(a.length-1||1));return [p[0]+o*.6,p[1]+o];});ink.push(smooth(pts));
  }else if(s[0]==='ring'||s[0]==='blob'){   // ['ring',cx,cy,rx,ry,{from,sweep}] 손으로 그린 원: 한 바퀴를 조금 넘겨 겹치고 반지름이 살짝 변함
   const [,cx,cy,rx,ry,o={}]=s,from=(o.from??(r()*360))*Math.PI/180,sweep=(o.sweep??(s[0]==='blob'?360:376))*Math.PI/180;
   const n=Math.max(10,Math.round((rx+ry)*sweep/3.4)),amp=s[0]==='blob'?Math.min(rx,ry)*.09:Math.min(.38,Math.min(rx,ry)*.08),w=wobble(r,amp),drift=s[0]==='blob'?0:.05*(r()-.3),pts=[];
   for(let k=0;k<=(s[0]==='blob'?n-1:n);k++){const t=k/n,a=from+sweep*t,g=1+drift*t;pts.push([cx+Math.cos(a)*(rx*g+w(t)),cy+Math.sin(a)*(ry*g+w(t))]);}
   (s[0]==='blob'?fill:ink).push(smooth(pts,s[0]==='blob'));
  }else if(s[0]==='dot'){ink.push(smooth([[s[1]-.3,s[2]],[s[1]+.3,s[2]+.1]]));}
 }
 return `<path class="dd-fill" d="${fill.join('')}"/><path class="dd-ink" d="${ink.join('')}"/>`;
}

// 48×48 칸에 그립니다. 첫 줄의 blob은 뒤에 까는 물감 얼룩입니다.
const ICONS={
 // 갈등 주제 7가지
 boundaries:[['blob',23,25,17,15],['shape',[9,10],[32,8.5],[33.5,38],[10.5,39.5]],['ring',17,17,3.2,3.2],['poly',[13,33],[18,26],[21.5,29.5],[26,23.5],[30.5,32]],['curve',[12,22],[19,30],[25,19],[33,27]],['shape',[30,37],[39.5,13.5],[43.5,15.5],[34,39]],['poly',[30,37],[31,42.5],[34,39]]],
 words:[['blob',24,22,18,14],['curve',[13.5,30.5],[7.5,23],[10,12.5],[24,8.5],[38.5,12],[41,22.5],[34,31],[22,32.5],[16,31.5]],['curve',[16,31.5],[11.5,39.5],[21.5,33]],['poly',[14.5,21.5],[18.5,16.5],[22.5,24],[26.5,16.5],[30.5,23.5],[34,18.5]]],
 exclusion:[['blob',17,29,15,12],['ring',11,17,3.8,3.8],['ring',20,14.5,3.8,3.8],['ring',16,24,3.8,3.8],['curve',[6,36],[11,30],[18,29.5],[26,34]],['ring',37,22,3.8,3.8],['curve',[31,36],[37,29],[43,36]],['line',[27,15],[30,15]],['line',[27,22],[30,22]],['line',[27,29],[30,29]]],
 play:[['blob',26,27,15,14],['ring',26,26,12,12],['curve',[14.5,22],[25,19.5],[37.5,24]],['curve',[22,14.5],[24.5,26],[21,37.5]],['curve',[30,15],[31.5,27],[35,34]],['line',[3.5,17],[9,17]],['line',[2.5,24],[8.5,24]],['line',[4.5,31],[10,31]]],
 digital:[['blob',23,26,14,17],['shape',[15,8],[31,7.5],[32.5,40.5],[16,41]],['line',[21.5,36.5],[26.5,36.5]],['poly',[18.5,28],[22.5,22.5],[25.5,26],[28.5,21.5],[30,25]],['ring',21,16.5,2.2,2.2],['curve',[33,15],[37.5,11],[42,8.5]],['poly',[37.5,7.5],[42.5,8],[41,13]]],
 teamwork:[['blob',22,26,17,15],['curve',[11,15],[16,15],[16.5,11],[21,9.5],[24,12],[23.5,15],[29,15],[29,21],[33,21],[34.5,25],[32,28],[29,28],[29,34],[11,34],[11,15]],['curve',[33,32],[39,31.5],[42,35],[40,41],[33.5,41.5],[31.5,37]],['line',[37,22],[40.5,19]],['line',[39.5,26],[44,25.5]]],
 guardian:[['blob',24,29,18,13],['ring',18,14.5,5.5,5.5],['curve',[6.5,41],[9,29],[18,24],[27,29],[29.5,41]],['ring',35,23.5,4,4],['curve',[28,41],[30,33],[35,30],[40,33],[42,41]]],
 // 연습 순서·도움말
 tap:[['blob',21,20,15,13],['shape',[7,8],[32,7],[33,29],[8,30]],['line',[12,14],[27,13.5]],['line',[12,20],[23,19.5]],['shape',[29,27],[29.5,43],[33.5,39.5],[36.5,45.5],[39.5,44],[36.5,38],[41.5,37.5]]],
 say:[['blob',23,23,18,15],['curve',[13,31],[7,23],[9.5,12.5],[24,8.5],[38.5,12],[41,22.5],[34,31],[22,32.5],[16,31.5]],['curve',[16,31.5],[11.5,39.5],[21.5,33]],['ring',17,20.5,1.4,1.4],['ring',24,20.5,1.4,1.4],['ring',31,20.5,1.4,1.4]],
 checklist:[['blob',24,26,15,17],['shape',[11,10],[36,9.5],[36.5,42],[11.5,42.5]],['shape',[18,7],[29,7],[29,12.5],[18,12.5]],['poly',[15.5,21],[18,23.5],[22,17.5]],['line',[25,20.5],[32,20.5]],['poly',[15.5,30],[18,32.5],[22,26.5]],['line',[25,29.5],[32,29.5]],['line',[16,37],[21,37]],['line',[25,37],[30,37]]],
 reflect:[['blob',24,27,19,13],['shape',[5,12],[23,15],[23,40],[5,37]],['shape',[25,15],[43,12],[43,37],[25,40]],['line',[9,20],[19,21.5]],['line',[9,26],[19,27.5]],['line',[29,21.5],[39,20]],['line',[29,27.5],[36,26.5]],['line',[38,3],[38,9]],['line',[35,6],[41,6]]],
 // 모임 단계
 pre:[['blob',24,25,18,13],['ring',14,17,5,5],['curve',[4.5,40],[7,29],[14,25.5],[21,29],[23,40]],['ring',34,17,5,5],['curve',[25,40],[27,29],[34,25.5],[41,29],[43.5,40]],['ring',24,9,1.1,1.1]],
 main:[['blob',24,29,19,12],['ring',24,31,14,6],['ring',25,30.5,2.4,1.3,{sweep:390}],['ring',10.5,17.5,3.8,3.8],['ring',24,11,3.8,3.8],['ring',37.5,17.5,3.8,3.8]],
 post:[['blob',24,30,15,14],['shape',[15,29],[33,29],[30,43],[18,43]],['curve',[24,29],[23.5,22],[24.5,14]],['curve',[24,23],[18,20.5],[13.5,15],[19.5,15],[24,23]],['curve',[24.5,17.5],[29,11],[35,9.5],[33,16],[24.5,17.5]]],
 // 빈 화면
 search:[['blob',21,21,15,14],['ring',20,20,11,11],['line',[28.5,28.5],[40,40]],['line',[31,27.5],[41.5,38]],['curve',[16.5,16.5],[18.5,13.5],[22.5,14],[23,18],[20,20.5],[20,23.5]],['dot',20,27]],
 notebook:[['blob',22,25,16,17],['shape',[11,7],[32,6],[33,40],[12,41]],['ring',11,12,1.6,1.6],['ring',11,19,1.6,1.6],['ring',11,26,1.6,1.6],['ring',11,33,1.6,1.6],['line',[17,15],[27,14.5]],['line',[17,21],[25,20.5]],['shape',[33,38],[41,16],[44.5,17.5],[36.5,39.5]],['poly',[33,38],[33.5,43],[36.5,39.5]]]
};

let i=0;const out={};for(const [name,shapes] of Object.entries(ICONS))out[name]=drawIcon(1009+(i++)*97,shapes);
const src=`// 손그림 아이콘(tools/draw-doodles.mjs가 만듦 — 직접 고치지 말고 그 파일을 고친 뒤 다시 실행하세요).
// 펜 선(.dd-ink)은 글자 색, 뒤의 물감 얼룩(.dd-fill)은 --dd 색을 따릅니다. 꾸밈 그림이라 화면 읽기 프로그램에는 숨깁니다.
export const DOODLES=${JSON.stringify(out,null,1)};
export const TOPIC_DOODLE={'물건·경계':'boundaries','언어·놀림':'words','소외·관계':'exclusion','신체·놀이':'play','디지털':'digital','협력·책임':'teamwork','보호자·방관':'guardian'};
export const doodle=(name,cls='')=>DOODLES[name]?\`<svg class="doodle \${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">\${DOODLES[name]}</svg>\`:'';
`;
await writeFile(new URL('../public/views/doodles.js',import.meta.url),src);
console.log(Object.keys(out).length+' doodles →',new URL('../public/views/doodles.js',import.meta.url).pathname);
