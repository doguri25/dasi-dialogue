// 대화실의 질감을 캔버스에 직접 그립니다(내려받는 그림 파일 없음).
// 폭주 구구단(pokju-edu 1.2)이 아스팔트의 골재·균열, 외벽의 창틀을 캔버스로 그리던 방식을 방 안에 옮겼습니다.
// 같은 씨앗(seed)이면 늘 같은 그림이 나와 화면 사진을 비교할 수 있습니다.

export function seeded(seed=1){let s=(seed*2654435761)>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function board(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
const mixHex=(a,b,t)=>{const p=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16));const A=p(a),B=p(b);return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')})`;};

// 나무 바닥: 엇갈린 이음매, 판마다 다른 색, 결, 옹이, 모서리 홈. 결과 홈은 요철(bump) 그림에도 함께 그립니다.
export function oakFloor(seed=7,size=1024){
 const r=seeded(seed),[c,g]=board(size,size),[bc,bg]=board(size,size);
 const rows=16,h=size/rows,tones=['#d9b68e','#d2ad84','#ddbd98','#cfa87d','#d6b38a','#e0c29d'];
 bg.fillStyle='#b4b4b4';bg.fillRect(0,0,size,size);
 for(let i=0;i<rows;i++){
  const y=i*h;let x=-r()*size*.6;
  while(x<size){
   const len=size*(.38+r()*.5),tone=tones[Math.floor(r()*tones.length)];
   g.fillStyle=tone;g.fillRect(x,y,len,h);
   // 결: 판을 따라 흐르는 가는 물결선
   for(let k=0;k<11;k++){
    const yy=y+2+r()*(h-4),amp=.6+r()*1.8,f=.004+r()*.01,ph=r()*6.28,dark=r()<.5;
    g.strokeStyle=dark?`rgba(110,70,35,${.05+r()*.08})`:`rgba(255,240,215,${.05+r()*.06})`;g.lineWidth=.6+r()*1.1;
    bg.strokeStyle=`rgba(90,90,90,${.18+r()*.2})`;bg.lineWidth=g.lineWidth;
    for(const [ctx] of [[g],[bg]]){ctx.beginPath();for(let xx=x;xx<=x+len;xx+=8){const yv=yy+Math.sin(xx*f+ph)*amp;xx===x?ctx.moveTo(xx,yv):ctx.lineTo(xx,yv);}ctx.stroke();}
   }
   // 옹이: 가끔 한두 개
   if(r()<.35){const kx=x+len*(.2+r()*.6),ky=y+h*(.3+r()*.4);for(let q=5;q>0;q--){g.strokeStyle=`rgba(105,64,30,${.06+q*.025})`;g.lineWidth=1;g.beginPath();g.ellipse(kx,ky,q*3.2,q*1.3,0,0,6.283);g.stroke();}}
   // 판 끝 이음매
   g.fillStyle='rgba(95,60,30,.35)';g.fillRect(x+len-1,y,2,h);bg.fillStyle='#3a3a3a';bg.fillRect(x+len-1,y,2,h);
   x+=len;
  }
  // 판 사이 홈: 위는 어둡게, 아래는 살짝 밝게(모서리를 둥글게 깎은 느낌)
  g.fillStyle='rgba(90,55,25,.42)';g.fillRect(0,y,size,2);g.fillStyle='rgba(255,236,205,.25)';g.fillRect(0,y+2,size,1);
  bg.fillStyle='#2e2e2e';bg.fillRect(0,y,size,2);
 }
 return {color:c,bump:bc};
}

// 둥근 러그: 테두리 띠, 안쪽 무늬 원, 실을 엮은 작은 점무늬, 가장자리 술.
export function roundRug(seed=11,size=1024){
 const r=seeded(seed),[c,g]=board(size,size),m=size/2;
 g.clearRect(0,0,size,size);
 const TAU=Math.PI*2,band=(r0,r1,color)=>{g.beginPath();g.arc(m,m,r1*m,0,TAU);if(r0>0){g.moveTo(m+r0*m,m);g.arc(m,m,r0*m,0,TAU);}g.fillStyle=color;g.fill('evenodd');};
 band(0,.965,'#cfdcc4');band(.93,.965,'#9fb795');band(.86,.93,'#eae0cc');band(.83,.86,'#b9add8');band(.55,.6,'#dfe8d6');band(.6,.62,'#b8c9ad');
 band(0,.2,'#e3d9c3');band(.2,.215,'#b9add8');
 // 안쪽 꽃잎 무늬(조약돌 모양)
 for(let i=0;i<12;i++){const a=i/12*6.283,x=m+Math.cos(a)*m*.4,y=m+Math.sin(a)*m*.4;g.fillStyle=i%2?'rgba(184,175,217,.55)':'rgba(255,200,61,.32)';g.beginPath();g.ellipse(x,y,m*.06,m*.035,a,0,6.283);g.fill();}
 // 엮은 결: 촘촘한 점과 짧은 획
 for(let i=0;i<13000;i++){const a=r()*6.283,d=Math.sqrt(r())*.965*m,x=m+Math.cos(a)*d,y=m+Math.sin(a)*d,l=r()<.5;g.fillStyle=l?`rgba(255,255,255,${.04+r()*.08})`:`rgba(70,80,60,${.03+r()*.07})`;g.fillRect(x,y,1.8,1.8);}
 // 술: 가장자리 바깥으로 짧은 실
 g.strokeStyle='rgba(232,224,204,.9)';g.lineWidth=2;
 for(let i=0;i<360;i++){const a=i/360*6.283,d0=.962*m,d1=(.99+r()*.008)*m;g.beginPath();g.moveTo(m+Math.cos(a)*d0,m+Math.sin(a)*d0);g.lineTo(m+Math.cos(a+.004)*d1,m+Math.sin(a+.004)*d1);g.stroke();}
 return c;
}

// 회벽: 아주 옅은 얼룩과 모래알(크게 반복해도 무늬가 드러나지 않게 부드럽게).
export function plaster(seed=3,size=512,base='#efe6d6'){
 const r=seeded(seed),[c,g]=board(size,size);g.fillStyle=base;g.fillRect(0,0,size,size);
 for(let i=0;i<90;i++){const x=r()*size,y=r()*size,rad=20+r()*70,gr=g.createRadialGradient(x,y,0,x,y,rad);const v=r()<.5?'255,252,244':'214,200,178';gr.addColorStop(0,`rgba(${v},${.05+r()*.05})`);gr.addColorStop(1,`rgba(${v},0)`);g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2);}
 for(let i=0;i<9000;i++){g.fillStyle=r()<.5?'rgba(255,255,255,.12)':'rgba(150,130,100,.07)';g.fillRect(r()*size,r()*size,1,1);}
 return c;
}

// 징두리 판벽: 세로 판과 홈. 색 그림과 요철 그림.
export function beadboard(seed=5,size=512,base='#c9d6bf'){
 const r=seeded(seed),[c,g]=board(size,size),[bc,bg]=board(size,size),n=8,w=size/n;
 g.fillStyle=base;g.fillRect(0,0,size,size);bg.fillStyle='#b0b0b0';bg.fillRect(0,0,size,size);
 for(let i=0;i<n;i++){const x=i*w;g.fillStyle=`rgba(255,255,255,${.04+r()*.05})`;g.fillRect(x+3,0,w*.4,size);g.fillStyle='rgba(70,90,65,.28)';g.fillRect(x,0,3,size);g.fillStyle='rgba(255,255,255,.3)';g.fillRect(x+3,0,1.5,size);bg.fillStyle='#404040';bg.fillRect(x,0,3,size);}
 for(let i=0;i<3000;i++){g.fillStyle='rgba(255,255,255,.06)';g.fillRect(r()*size,r()*size,1,2);}
 return {color:c,bump:bc};
}

// 나뭇결(탁자·책장·다리): 길게 흐르는 결과 물관 점. 흰색에 가까운 바탕이라 재질 색과 곱해집니다.
export function woodGrain(seed=9,size=512){
 const r=seeded(seed),[c,g]=board(size,size);g.fillStyle='#f4ede3';g.fillRect(0,0,size,size);
 for(let k=0;k<70;k++){const y0=r()*size,amp=2+r()*7,f=.006+r()*.012,ph=r()*6.28;g.strokeStyle=r()<.6?`rgba(150,105,60,${.08+r()*.12})`:`rgba(255,255,255,${.1+r()*.1})`;g.lineWidth=.6+r()*2.2;g.beginPath();for(let x=0;x<=size;x+=6){const y=y0+Math.sin(x*f+ph)*amp+Math.sin(x*.031+ph*2)*amp*.3;x===0?g.moveTo(x,y):g.lineTo(x,y);}g.stroke();}
 for(let i=0;i<2200;i++){g.fillStyle=`rgba(120,80,45,${.05+r()*.08})`;g.fillRect(r()*size,r()*size,2+r()*4,1);}
 return c;
}

// 천의 짜임(의자 천·옷): 날실과 씨실이 엇갈리는 작은 요철. 회색 그림이라 요철에만 씁니다.
export function weave(seed=13,size=256,step=8){
 const r=seeded(seed),[c,g]=board(size,size);g.fillStyle='#8a8a8a';g.fillRect(0,0,size,size);
 for(let y=0;y<size;y+=step)for(let x=0;x<size;x+=step){const over=((x+y)/step)%2===0,v=over?150+r()*40:95+r()*30;g.fillStyle=`rgb(${v},${v},${v})`;over?g.fillRect(x+1,y+2,step-2,step-4):g.fillRect(x+2,y+1,step-4,step-2);}
 return c;
}

// 뜨개(니트) 결: 세로로 이어진 작은 V자 고리. 옷의 요철에 씁니다.
export function knit(seed=17,size=256){
 const r=seeded(seed),[c,g]=board(size,size);g.fillStyle='#7c7c7c';g.fillRect(0,0,size,size);const w=16,h=12;
 for(let y=0;y<size;y+=h)for(let x=0;x<size;x+=w){const v=150+r()*45;g.fillStyle=`rgb(${v},${v},${v})`;g.beginPath();g.ellipse(x+w*.3,y+h/2,w*.22,h*.55,-.5,0,6.283);g.fill();g.beginPath();g.ellipse(x+w*.7,y+h/2,w*.22,h*.55,.5,0,6.283);g.fill();}
 return c;
}

// 창밖: 맑은 하늘, 옅은 구름, 먼 산과 학교 건물, 가까운 나무. 밝게 그려 빛 번짐이 창가에 생깁니다.
export function windowView(seed=19,w=1024,h=896){
 const r=seeded(seed),[c,g]=board(w,h);
 const sky=g.createLinearGradient(0,0,0,h*.75);sky.addColorStop(0,'#8fc1e6');sky.addColorStop(.6,'#c9e3f3');sky.addColorStop(1,'#eef5f2');g.fillStyle=sky;g.fillRect(0,0,w,h);
 for(let i=0;i<7;i++){const x=r()*w,y=h*(.08+r()*.3),s=40+r()*70;g.fillStyle='rgba(255,255,255,.55)';for(let k=0;k<6;k++){g.beginPath();g.ellipse(x+(k-2.5)*s*.5,y+Math.sin(k)*s*.12,s*(.45+r()*.3),s*(.22+r()*.12),0,0,6.283);g.fill();}}
 // 먼 산
 g.fillStyle='#b8d0c6';g.beginPath();g.moveTo(0,h*.6);for(let x=0;x<=w;x+=16)g.lineTo(x,h*(.52+Math.sin(x*.006+1)*.04+Math.sin(x*.017)*.015));g.lineTo(w,h);g.lineTo(0,h);g.fill();
 // 학교 건물(창 줄)
 g.fillStyle='#f1e6d6';g.fillRect(w*.08,h*.5,w*.46,h*.2);g.fillStyle='#e2cdb6';g.fillRect(w*.08,h*.5,w*.46,h*.02);
 for(let row=0;row<3;row++)for(let i=0;i<9;i++){g.fillStyle='#a9c6d8';g.fillRect(w*(.1+i*.048),h*(.535+row*.05),w*.03,h*.03);}
 // 운동장과 가까운 나무
 g.fillStyle='#d9e7c9';g.fillRect(0,h*.68,w,h*.32);
 for(let i=0;i<9;i++){const x=w*(i/8)+(r()-.5)*60,y=h*(.62+r()*.12),s=70+r()*60;g.fillStyle='#7d9a66';g.fillRect(x-4,y,9,h*.2);
  for(let k=0;k<7;k++){g.fillStyle=k<3?'#86ab70':k<5?'#9cc283':'#b7d79b';g.beginPath();g.arc(x+(r()-.5)*s*.9,y-s*.25+(r()-.5)*s*.5,s*(.32+r()*.2),0,6.283);g.fill();}}
 // 아주 옅은 안개(멀수록 흐리게)
 const haze=g.createLinearGradient(0,h*.4,0,h);haze.addColorStop(0,'rgba(255,255,255,0)');haze.addColorStop(1,'rgba(255,255,255,.18)');g.fillStyle=haze;g.fillRect(0,0,w,h);
 return c;
}

// 액자 그림: 부드러운 풍경(해, 언덕, 길). 글자는 없습니다.
export function painting(seed=23,w=512,h=384){
 const r=seeded(seed),[c,g]=board(w,h);
 const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#f7e7cf');sky.addColorStop(1,'#f3d9c4');g.fillStyle=sky;g.fillRect(0,0,w,h);
 g.fillStyle='#f2b787';g.beginPath();g.arc(w*.7,h*.32,h*.12,0,6.283);g.fill();
 const hill=(y,col,amp,ph)=>{g.fillStyle=col;g.beginPath();g.moveTo(0,h);for(let x=0;x<=w;x+=8)g.lineTo(x,y+Math.sin(x*.012+ph)*amp);g.lineTo(w,h);g.fill();};
 hill(h*.62,'#b9cfae',14,1);hill(h*.72,'#9db697',18,3);hill(h*.84,'#c9b6e0',10,5);
 g.strokeStyle='rgba(255,250,240,.8)';g.lineWidth=10;g.beginPath();g.moveTo(w*.2,h);g.quadraticCurveTo(w*.45,h*.8,w*.6,h*.68);g.stroke();
 for(let i=0;i<1800;i++){g.fillStyle=`rgba(255,255,255,${r()*.06})`;g.fillRect(r()*w,r()*h,3,3);}
 return c;
}

// 책등: 위아래 띠와 가운데 제목 자리(글자 없음). 흰 바탕이라 책마다 다른 색과 곱해집니다.
export function bookSpine(w=64,h=256){
 const [c,g]=board(w,h);g.fillStyle='#ffffff';g.fillRect(0,0,w,h);
 g.fillStyle='rgba(0,0,0,.16)';g.fillRect(0,h*.08,w,h*.035);g.fillRect(0,h*.86,w,h*.035);
 g.fillStyle='rgba(255,255,255,.2)';g.fillRect(w*.22,h*.32,w*.56,h*.26);g.fillStyle='rgba(0,0,0,.07)';g.fillRect(w*.22,h*.6,w*.56,h*.012);
 const sh=g.createLinearGradient(0,0,w,0);sh.addColorStop(0,'rgba(0,0,0,.14)');sh.addColorStop(.25,'rgba(255,255,255,.12)');sh.addColorStop(1,'rgba(0,0,0,.12)');g.fillStyle=sh;g.fillRect(0,0,w,h);
 return c;
}

// 커튼 주름: 세로로 밝고 어두운 띠가 부드럽게 번갈아 옵니다.
export function folds(w=128,h=8){
 const [c,g]=board(w,h),gr=g.createLinearGradient(0,0,w,0);
 for(let i=0;i<=8;i++)gr.addColorStop(i/8,i%2?'rgb(226,214,204)':'rgb(255,250,244)');
 g.fillStyle=gr;g.fillRect(0,0,w,h);return c;
}

// 접지 그림자: 가운데가 짙고 가장자리로 갈수록 사라지는 둥근 그늘(투명 바탕).
// 흑백 밝기가 곧 그늘의 짙기입니다(투명도 지도로 씁니다: 흰색=짙음, 검정=없음).
export function softShadow(size=256){
 const [c,g]=board(size,size),m=size/2,gr=g.createRadialGradient(m,m,0,m,m,m);
 g.fillStyle='#000';g.fillRect(0,0,size,size);
 gr.addColorStop(0,'rgb(230,230,230)');gr.addColorStop(.5,'rgb(150,150,150)');gr.addColorStop(.78,'rgb(60,60,60)');gr.addColorStop(1,'rgb(0,0,0)');
 g.fillStyle=gr;g.fillRect(0,0,size,size);return c;
}

// 먼지 한 톨: 부드러운 빛 점.
export function speck(size=64){
 const [c,g]=board(size,size),m=size/2,gr=g.createRadialGradient(m,m,0,m,m,m);
 gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,248,230,.55)');gr.addColorStop(1,'rgba(255,240,210,0)');
 g.fillStyle=gr;g.fillRect(0,0,size,size);return c;
}

// 빛줄기: 창 쪽(위)이 밝고 바닥 쪽으로 사라지며, 양옆이 부드럽게 흐려집니다.
export function beam(w=128,h=512){
 const [c,g]=board(w,h);
 for(let y=0;y<h;y++){const t=y/h,a=Math.pow(1-t,1.4)*(t<.06?t/.06:1);const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.5,`rgba(255,255,255,${a})`);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,y,w,1);}
 return c;
}

// 바닥에 비친 창 모양 햇빛: 네 칸 유리와 창살 그림자, 가장자리는 흐리게.
export function windowLight(w=256,h=256){
 const [c,g]=board(w,h);g.clearRect(0,0,w,h);g.filter='blur(6px)';
 g.fillStyle='rgba(255,255,255,.95)';const p=18,bar=10;
 for(const [x,y] of [[0,0],[1,0],[0,1],[1,1]])g.fillRect(p+x*((w-2*p)/2+bar/2),p+y*((h-2*p)/2+bar/2),(w-2*p)/2-bar/2,(h-2*p)/2-bar/2);
 g.filter='none';return c;
}

export {mixHex};
