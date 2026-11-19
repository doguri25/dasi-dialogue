// 점토 인형 캐릭터(2등신). 머리 하나에 몸 하나 정도의 귀여운 비율, 짧고 부드러운 팔다리.
// 팔은 팔꿈치 마디 없이 한 덩어리로 어깨에서 움직이고, 몸통은 콩 모양으로 목 없이 머리와 이어집니다.
// 좌표: 원점은 의자 앉는 면 가운데, +z가 앞, +y가 위. 단위는 미터에 가깝게 맞췄습니다.
const AGE={
 elementary:{R:.205,H:.19,W:.135,arm:.175,thigh:.09,shin:.1},
 middle:{R:.2,H:.205,W:.14,arm:.18,thigh:.095,shin:.105},
 high:{R:.195,H:.215,W:.145,arm:.185,thigh:.1,shin:.11},
 adult:{R:.19,H:.23,W:.155,arm:.19,thigh:.105,shin:.115}
};
const BOTTOM={elementary:'#58627a',middle:'#4b5265',high:'#3f4656',adult:'#5b5348'};
const MOUTH={A:{h:1,w:.92},E:{h:.7,w:1.05},I:{h:.4,w:1.16},O:{h:.85,w:.64},U:{h:.5,w:.54},EU:{h:.32,w:1.05},M:{h:0,w:.94},REST:{h:0,w:1}};
const deg=Math.PI/180;

// still: 동작 줄이기. 자세는 곧바로 바뀌고, 숨쉬기·시선 옮기기·끄덕임·깜빡임·손 꼼지락을 하지 않습니다.
export function createCharacter(T,look,{seed=1,still=false}={}) {
 const A=AGE[look.age]||AGE.middle,R=A.R,k=R/.16;
 const ek=look.age==='adult'?.86:1;   // 어른은 눈을 조금 작게
 const root=new T.Group(),torso=new T.Group(),head=new T.Group(),face=new T.Group();
 root.add(torso);torso.add(head);head.add(face);
 const geoms=[],mats=new Map();
 let rnd=seed*9301+49297;const rand=()=>((rnd=(rnd*9301+49297)%233280)/233280);
 const clay=(color,{rough=.8,sheen=.45,side}={})=>{
  const key=color+rough+sheen+(side||'');if(mats.has(key))return mats.get(key);
  const c=new T.Color(color),m=new T.MeshPhysicalMaterial({color:c,roughness:rough,metalness:0,sheen,sheenRoughness:.7,sheenColor:c.clone().lerp(new T.Color('#ffffff'),.5),side:side||T.FrontSide});
  mats.set(key,m);return m;
 };
 const plain=(color,opts={})=>{const key='p'+color+JSON.stringify(opts);if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,roughness:.35,...opts}));return mats.get(key);};
 // 그래픽(v0.8): 브라우저에서는 옷에 뜨개 결 요철, 눈동자에 위아래 그라데이션, 피부 가장자리에 따뜻한 빛을 더합니다.
 const texs=[],browser=typeof document!=='undefined';
 const canvasTex=(w,h,draw,{color=false,repeat=[1,1]}={})=>{if(!browser)return null;const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);if(color)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);texs.push(t);return t;};
 const knitTex=canvasTex(128,96,(g,w,h)=>{g.fillStyle='#7a7a7a';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=8)for(let x=0;x<w;x+=10){const v=150+Math.round(rand()*50);g.fillStyle=`rgb(${v},${v},${v})`;g.beginPath();g.ellipse(x+3,y+4,2.4,4.2,-.5,0,6.2832);g.fill();g.beginPath();g.ellipse(x+7,y+4,2.4,4.2,.5,0,6.2832);g.fill();}},{repeat:[6,5]});
 const cloths=[];
 const cloth=(color,o={})=>{if(!knitTex)return clay(color,o);const key='c'+color+(o.side||'');if(mats.has(key))return mats.get(key);const m=clay(color,o).clone();m.bumpMap=knitTex;m.bumpScale=.55;m.sheen=.6;mats.set(key,m);cloths.push(m);return m;};
 const geo=g=>{geoms.push(g);return g;};
 const SPH=geo(new T.SphereGeometry(1,40,28)),SPH_S=geo(new T.SphereGeometry(1,18,14));
 const mesh=(parent,g,m,{p=[0,0,0],r=[0,0,0],s=[1,1,1]}={})=>{const o=new T.Mesh(g,m);o.position.set(...p);o.rotation.set(...r);o.scale.set(...s);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const onHead=(lat,lon,d=R)=>new T.Vector3(d*Math.cos(lat*deg)*Math.sin(lon*deg),d*Math.sin(lat*deg),d*Math.cos(lat*deg)*Math.cos(lon*deg));
 const Z=new T.Vector3(0,0,1);
 // 머리 표면에 붙는 점토 덩어리: 로컬 z가 표면 바깥을 향합니다.
 const blob=(parent,{lat,lon,d=R,rx,ry,rz,color,roll=0,mat,lift=0})=>{
  const n=onHead(lat,lon,1).normalize(),o=new T.Mesh(SPH,mat||clay(color));
  o.position.copy(n.clone().multiplyScalar(d+lift));o.quaternion.setFromUnitVectors(Z,n);o.rotateZ(roll);o.scale.set(rx,ry,rz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
 };
 const anchor=(parent,lat,lon,d=R)=>{const g=new T.Group(),n=onHead(lat,lon,1).normalize();g.position.copy(n.clone().multiplyScalar(d));g.quaternion.setFromUnitVectors(Z,n);parent.add(g);return g;};

 // ---- 몸통(콩 모양)과 옷 ----
 const {H,W}=A,depth=.82;
 const lathe=(scale,phiStart=0,phiLength=Math.PI*2)=>geo(new T.LatheGeometry([[0,0],[.7,0],[.93,.08],[1,.3],[.97,.55],[.86,.78],[.66,.94],[.36,1.02],[0,1.04]].map(([x,y])=>new T.Vector2(x*W*scale,y*H)),48,phiStart,phiLength));
 const topColor=look.top,under=look.under;
 mesh(torso,lathe(1),cloth(look.topKind==='cardigan'?under:topColor),{p:[0,.02,0],s:[1,1,depth]});
 if(look.topKind==='cardigan'){
  mesh(torso,lathe(1.04,.42,Math.PI*2-.84),cloth(topColor,{side:T.DoubleSide}),{p:[0,.018,0],s:[1,1.004,depth]});
  for(let i=0;i<2;i++)mesh(torso,SPH_S,clay('#efe5d0'),{p:[W*.3,.02+H*(.4+i*.2),W*depth*.98],s:[.011,.011,.007]});
 }
 if(look.topKind==='jacket'){
  mesh(torso,SPH,cloth(under),{p:[0,.02+H*.82,W*depth*.84],r:[.15,0,0],s:[W*.32,H*.22,.035]});
  const lapel=clay(new T.Color(topColor).multiplyScalar(.82).getStyle());
  for(const s of [-1,1])mesh(torso,SPH,lapel,{p:[s*W*.24,.02+H*.74,W*depth*.88],r:[.12,0,s*.45],s:[W*.11,H*.26,.026]});
 }
 if(look.topKind==='hoodie'){
  mesh(torso,geo(new T.TorusGeometry(W*.58,W*.26,16,32,Math.PI*1.25)),cloth(topColor),{p:[0,.02+H*.98,-W*.1],r:[Math.PI/2-.2,0,-Math.PI*.125],s:[1,1,.9]});
  mesh(torso,SPH,cloth(topColor),{p:[0,.02+H*.32,W*depth*.84],s:[W*.6,H*.16,.035]});
  for(const s of [-1,1])mesh(torso,geo(new T.CylinderGeometry(.006,.006,H*.24,8)),clay('#f6f1e6'),{p:[s*W*.18,.02+H*.72,W*depth*.97]});
 }
 if(look.topKind==='sweatshirt'||look.topKind==='knit')mesh(torso,geo(new T.TorusGeometry(W*.36,look.topKind==='knit'?.024:.018,14,36)),clay(new T.Color(topColor).multiplyScalar(.9).getStyle()),{p:[0,.02+H*1.0,0],r:[Math.PI/2,0,0],s:[1,depth*1.15,1]});

 // ---- 큰 머리(목 없이 어깨에 얹힘) ----
 head.position.set(0,.02+H+R*.72,0);
 const skin=clay(look.skin,{rough:.72,sheen:.55});
 // 살갗 가장자리(볼·귀·턱선)에 따뜻한 빛이 살짝 비칩니다: 빛이 피부 속으로 스미는 느낌을 값싸게 흉내 냅니다.
 skin.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>','outgoingLight+=vec3(1.0,.5,.38)*pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),2.6)*.16*(.35+.65*clamp(dot(outgoingLight,vec3(.33)),0.0,1.0));\n#include <opaque_fragment>');};
 skin.customProgramCacheKey=()=>'dasi-skin-rim';
 mesh(head,SPH,skin,{s:[R*1.04,R*.97,R*.98]});
 for(const s of [-1,1])blob(head,{lat:-6,lon:s*90,rx:.02*k,ry:.03*k,rz:.025*k,mat:skin,d:R*1.02});
 blob(head,{lat:-17,lon:0,d:R*.98,rx:.016*k,ry:.012*k,rz:.012*k,color:new T.Color(look.skin).multiplyScalar(.95).getStyle()});
 for(const s of [-1,1])blob(head,{lat:-21,lon:s*40,d:R*.99,rx:.03*k,ry:.019*k,rz:.006,mat:clay(look.cheek||'#eda394',{sheen:.2})});

 // ---- 눈·눈썹·입(얼굴 아래쪽의 큰 눈) ----
 // 눈동자: 위는 짙고 아래로 갈수록 따뜻하게 밝아지는 그라데이션(구의 위아래 좌표에 그려 앞에서 보면 세로로 물듭니다).
 function irisMat(){
  const t=canvasTex(4,128,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#140d0b');gr.addColorStop(.38,'#241813');gr.addColorStop(.62,'#4a3024');gr.addColorStop(.78,'#7d5137');gr.addColorStop(.9,'#9a6845');gr.addColorStop(1,'#3b2a22');g.fillStyle=gr;g.fillRect(0,0,w,h);},{color:true});
  return t?(()=>{const m=new T.MeshStandardMaterial({map:t,roughness:.2});mats.set('iris',m);return m;})():plain('#3b2a22',{roughness:.22});
 }
 const eyes=[],brows=[];
 const sclera=plain('#fbf7f2',{roughness:.5}),iris=irisMat(),pupil=plain('#1b1210',{roughness:.2}),shine=new T.MeshBasicMaterial({color:new T.Color(1.6,1.6,1.6)});
 for(const s of [-1,1]){
  const a=anchor(face,-5,s*23,R*.985),g=new T.Group();a.add(g);
  const m=(gg,mm,o)=>{const x=mesh(g,gg,mm,o);x.castShadow=false;return x;};
  m(SPH,sclera,{s:[.031*k*ek,.037*k*ek,.012]});
  const ir=new T.Group();g.add(ir);
  const im=new T.Mesh(SPH,iris);im.scale.set(.026*k*ek,.031*k*ek,.012);im.position.z=.004;ir.add(im);
  const pm=new T.Mesh(SPH_S,pupil);pm.scale.set(.013*k*ek,.016*k*ek,.008);pm.position.z=.011;ir.add(pm);
  const hl=new T.Mesh(SPH_S,shine);hl.scale.setScalar(.0075*k);hl.position.set(-.009*k,.012*k,.017);ir.add(hl);
  const hl2=new T.Mesh(SPH_S,shine);hl2.scale.setScalar(.0034*k);hl2.position.set(.008*k,-.01*k,.017);ir.add(hl2);
  eyes.push({group:g,iris:ir,side:s});
  const ba=anchor(face,12,s*23,R*1.0),b=mesh(ba,geo(new T.CapsuleGeometry(.0072*k,.032*k,8,12)),clay(look.hairColor,{rough:.6}),{r:[0,0,Math.PI/2]});
  brows.push({anchor:ba,mesh:b,side:s});
 }
 const mouthA=anchor(face,-31,0,R*.975);
 const line=mesh(mouthA,geo(new T.TorusGeometry(.03*k,.006*k,10,28,Math.PI*.5)),plain('#7a3b36',{roughness:.6}),{r:[0,0,-Math.PI*.75]});
 line.castShadow=false;const lineGroup=new T.Group();mouthA.add(lineGroup);lineGroup.add(line);line.position.y=.03*k;
 const openMouth=new T.Group();mouthA.add(openMouth);
 const cavity=new T.Mesh(SPH,plain('#5b2628',{roughness:.7}));cavity.scale.set(1,1,.01);openMouth.add(cavity);
 const tongue=new T.Mesh(SPH_S,plain('#d9727a',{roughness:.5}));tongue.scale.set(.6,.35,.01);tongue.position.set(0,-.45,.004);cavity.add(tongue);

 // ---- 머리카락: 머리 모양을 따라 붙는 얇은 층을 겹치고, 끝을 가늘고 뾰족한 가닥으로 나눕니다 ----
 let hairTips=0,hairBlobs=0;
 // 머리카락 결: 세로로 가는 줄무늬를 요철(bump)로 넣어 가닥이 보이게 합니다(브라우저에서만).
 let strandTex=null;
 if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=128;c.height=64;const g=c.getContext('2d');g.fillStyle='#808080';g.fillRect(0,0,128,64);
  for(let x=0;x<128;x+=2){const v=110+Math.round(rand()*90);g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(x,0,1+(rand()<.3?1:0),64);}
  strandTex=new T.CanvasTexture(c);strandTex.wrapS=strandTex.wrapT=T.RepeatWrapping;texs.push(strandTex);
 }
 const hairMat=(repeat=1)=>{const key='hair'+repeat;if(mats.has(key))return mats.get(key);const base=new T.Color(look.hairColor);
  const m=new T.MeshPhysicalMaterial({color:base,roughness:.52,metalness:0,sheen:.7,sheenRoughness:.45,sheenColor:base.clone().lerp(new T.Color('#ffffff'),.55),side:T.DoubleSide});
  if(strandTex){const t=strandTex.clone();t.needsUpdate=true;t.repeat.set(repeat,1);texs.push(t);m.bumpMap=t;m.bumpScale=1.4;}
  mats.set(key,m);return m;};
 const hairGroup=new T.Group();head.add(hairGroup);
 const H01=n=>{const x=Math.sin(n*127.1+seed*311.7)*43758.5453;return x-Math.floor(x);};
 const sheet=(pos,uv,cols,rows)=>{const idx=[];for(let a=0;a<cols;a++)for(let b=0;b<rows;b++){const p0=a*(rows+1)+b,p1=p0+rows+1;idx.push(p0,p1,p0+1,p1,p1+1,p0+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return geo(g);};
 // 머리를 감싸는 층: 위도 latTop에서 시작해 latBase 근처에서 뾰족한 끝(teeth개)으로 끝납니다. sweep은 가닥을 옆으로 쓸어 넘깁니다.
 function shell({latTop,latBase,lonA,lonB,teeth,depth,rs=1.07,cols=96,rows=12,sweep=0,bulge=.025,flare=0,jitter=.45,phase=0}){
  const pos=[],uv=[];
  for(let a=0;a<=cols;a++){
   // 가닥 끝: 거의 곧은 선 아래로 가늘게 내려오는 끝(sin^2), 가닥마다 길이를 조금씩 다르게
   const u=a/cols,ph=u*teeth+phase,f=ph-Math.floor(ph),tooth=Math.pow(Math.sin(Math.PI*f),2.2),jr=jitter*(H01(Math.floor(ph))-.5)*2;
   const bottom=latBase-depth*tooth*Math.max(.35,1+jr);
   for(let b=0;b<=rows;b++){const v=b/rows,lat=latTop+(bottom-latTop)*v,lon=lonA+(lonB-lonA)*u+sweep*v*v;
    const r=R*rs*(1+bulge*Math.sin(Math.PI*Math.min(1,v*1.1))+flare*v*v),q=onHead(lat,lon,r);pos.push(q.x,q.y*.97,q.z*.98);uv.push(u*teeth,v);}
  }
  hairTips+=Math.round(teeth);
  return mesh(hairGroup,sheet(pos,uv,cols,rows),hairMat(1));
 }
 // 머리 아래로 늘어지는 긴 머리(반묶음): 원통 둘레의 층, 아래 끝이 가닥으로 갈라집니다.
 function curtain({y0,y1,lonA,lonB,teeth,depth,radius,cols=60,rows=10}){
  const pos=[],uv=[];
  for(let a=0;a<=cols;a++){const u=a/cols,ph=u*teeth,f=ph-Math.floor(ph),tooth=Math.pow(Math.sin(Math.PI*f),2.2)*(.7+.6*H01(Math.floor(ph)+9)),bottom=y1-depth*tooth;
   for(let b=0;b<=rows;b++){const v=b/rows,y=y0+(bottom-y0)*v,lon=(lonA+(lonB-lonA)*u)*deg,r=radius*(1-.18*v);pos.push(Math.sin(lon)*r*1.04,y,Math.cos(lon)*r);uv.push(u*teeth,v);}}
  hairTips+=teeth;return mesh(hairGroup,sheet(pos,uv,cols,rows),hairMat(1));
 }
 const cap=(scale=1.06,cover=.56,tilt=.7)=>mesh(hairGroup,geo(new T.SphereGeometry(R*scale,56,32,0,Math.PI*2,0,Math.PI*cover)),hairMat(14),{r:[-tilt,0,0],s:[1.04,.97,.98]});
 const sideLocks=(latBase,depth=8,teeth=2)=>{for(const s of [-1,1])shell({latTop:48,latBase,lonA:s>0?60:-96,lonB:s>0?96:-60,teeth,depth,rs:1.085,cols:24,sweep:s*-4});};
 switch(look.hair){
  case 'bob':   // 턱선까지 오는 단정한 단발, 앞머리는 가는 가닥
   cap();shell({latTop:62,latBase:-40,lonA:58,lonB:302,teeth:18,depth:4,rs:1.1,flare:.06,cols:120});
   sideLocks(-38,7,2);shell({latTop:64,latBase:25,lonA:-64,lonB:64,teeth:13,depth:7,rs:1.09});shell({latTop:60,latBase:27,lonA:-58,lonB:58,teeth:11,depth:6,rs:1.075,phase:.5});break;
  case 'chinbob':   // 옆가르마 턱선 단발
   cap(1.06,.57,.66);shell({latTop:62,latBase:-52,lonA:56,lonB:304,teeth:20,depth:5,rs:1.1,flare:.07,cols:120});
   sideLocks(-50,8,3);shell({latTop:66,latBase:23,lonA:-70,lonB:60,teeth:10,depth:9,rs:1.09,sweep:16});shell({latTop:62,latBase:26,lonA:-60,lonB:55,teeth:9,depth:8,rs:1.075,sweep:12,phase:.5});break;
  case 'halfup':   // 어깨까지 오는 반묶음
   cap(1.06,.56,.66);shell({latTop:62,latBase:-70,lonA:62,lonB:298,teeth:16,depth:4,rs:1.1,flare:.05,cols:110});
   curtain({y0:-R*.62,y1:-R*1.55,lonA:95,lonB:265,teeth:12,depth:R*.16,radius:R*.98});
   sideLocks(-58,10,3);shell({latTop:66,latBase:23,lonA:-68,lonB:58,teeth:10,depth:9,rs:1.09,sweep:14});shell({latTop:62,latBase:27,lonA:-58,lonB:52,teeth:9,depth:7,rs:1.075,sweep:10,phase:.5});
   mesh(hairGroup,geo(new T.SphereGeometry(1,24,16)),hairMat(4),{p:[0,R*.42,-R*1.0],s:[.04*k,.034*k,.032*k]});
   mesh(hairGroup,geo(new T.TorusGeometry(.022*k,.007*k,10,20)),clay('#e8a6a0'),{p:[0,R*.44,-R*.98],r:[.35,0,0]});hairTips+=0;break;
  case 'tousled':   // 짧고 살짝 헝클어진 머리: 정수리부터 겹겹이 뻗친 가닥
   cap(1.06,.58,.62);shell({latTop:88,latBase:46,lonA:0,lonB:360,teeth:11,depth:9,rs:1.11,jitter:.8,cols:110,bulge:.05});
   shell({latTop:70,latBase:-6,lonA:60,lonB:300,teeth:13,depth:7,rs:1.095,jitter:.6,cols:100});
   shell({latTop:66,latBase:25,lonA:-66,lonB:66,teeth:11,depth:9,rs:1.09,jitter:.8,sweep:-6});sideLocks(-4,6,2);break;
  case 'cropped':   // 짧게 다듬은 머리
   cap(1.05,.57,.62);shell({latTop:66,latBase:2,lonA:62,lonB:298,teeth:16,depth:4,rs:1.075,cols:100});
   shell({latTop:62,latBase:32,lonA:-60,lonB:60,teeth:14,depth:4,rs:1.08});sideLocks(4,4,2);break;
  case 'sidepart':   // 짧은 옆가르마: 앞머리를 한쪽으로 쓸어 넘김
   cap(1.055,.57,.6);shell({latTop:66,latBase:0,lonA:62,lonB:298,teeth:15,depth:4,rs:1.08,cols:100});
   shell({latTop:74,latBase:30,lonA:-76,lonB:52,teeth:9,depth:8,rs:1.095,sweep:28,bulge:.05});shell({latTop:68,latBase:34,lonA:-60,lonB:56,teeth:10,depth:5,rs:1.08,sweep:20,phase:.5});sideLocks(6,5,2);break;
  default:   // 어른의 짧은 머리
   cap(1.05,.57,.62);shell({latTop:66,latBase:-2,lonA:62,lonB:298,teeth:15,depth:4,rs:1.075,cols:100});
   shell({latTop:68,latBase:30,lonA:-66,lonB:60,teeth:10,depth:6,rs:1.085,sweep:14});sideLocks(4,5,2);
 }

 // ---- 짧고 부드러운 팔: 어깨에서 한 덩어리로 돌아갑니다(팔꿈치 마디 없음) ----
 const sleeve=cloth(topColor),armLen=A.arm,armR=.044*k*.9;
 const armGeo=geo(new T.CapsuleGeometry(armR,armLen-armR*2,10,16));armGeo.translate(0,-armLen/2+armR*.4,0);
 const arms=[-1,1].map(s=>{
  const pivot=new T.Group();pivot.position.set(s*W*.8,.02+H*.8,0);torso.add(pivot);
  const limbMesh=mesh(pivot,armGeo,sleeve);
  const hand=mesh(pivot,SPH,skin,{p:[0,-armLen+armR*.2,0],s:[armR*1.18,armR*1.05,armR*1.18]});
  return {s,pivot,limbMesh,hand,aim:new T.Vector3(0,-1,0)};
 });
 // 다리: 앉은 자세의 짧은 다리와 동그란 신발
 const bottomMat=cloth(look.bottom||BOTTOM[look.age]||'#4b5265');
 const legR=.05*k*.85;
 for(const s of [-1,1]){
  const hip=new T.Vector3(s*W*.42,.05,.02),knee=new T.Vector3(s*W*.46,.05,.02+A.thigh),foot=new T.Vector3(s*W*.48,.05-A.shin,.04+A.thigh);
  limb(mesh(root,geo(new T.CapsuleGeometry(legR,A.thigh,8,14)),bottomMat),hip,knee);
  limb(mesh(root,geo(new T.CapsuleGeometry(legR*.92,A.shin,8,14)),bottomMat),knee,foot);
  mesh(root,SPH,clay('#f3efe6'),{p:[foot.x,foot.y-legR*.4,foot.z+legR*.8],s:[legR*1.25,legR*.95,legR*1.8]});
 }
 function limb(o,a,b){o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());}

 // ---- 상태 ----
 let pose=null,target=null,mouthTarget={h:0,w:1},mouth={h:0,w:1},state='idle',time=rand()*10;
 let blink={t:1+rand()*3,phase:-1},gaze={t:0,dir:new T.Vector2(),cur:new T.Vector2()},nod={t:2+rand()*3,phase:-1},look3=null;
 const tmp=new T.Vector3(),tmp2=new T.Vector3(),DOWN=new T.Vector3(0,-1,0),goal=new T.Vector3(),qInv=new T.Quaternion();
 // 손이 가려는 곳(몸통 좌표). 팔이 짧아 닿지 않으면 그 방향으로 뻗기만 합니다.
 function handGoal(s,t,p){
  const front=W*depth+.04;
  switch(p.arms){
   case 'crossed':return goal.set(-s*W*.75,.02+H*(s>0?.56:.46),front+(s>0?.035:.01));   // 팔을 반대쪽으로 넘겨 팔짱
   case 'clasp':return goal.set(s*.022,.02+H*.42,front+.05);
   case 'lap':return goal.set(s*.05,.02-H*.05,front+.03);
   case 'fidget':return goal.set(s*.03+s*.008*Math.sin(t*5.3+s),.02+H*.08+.008*Math.sin(t*7.1+s*2),front+.07);
   case 'gesture':return s>0?goal.set(W*1.05,.02+H*.75+.05*Math.sin(t*2.2),front+.06+.03*Math.sin(t*1.6)):goal.set(s*W*.62,.02+H*.12,front+.09);
   default:return goal.set(s*W*.62,.02+H*.12,front+.09);   // 무릎 위에 편하게 올린 손
  }
 }
 function aimArm(arm,dt,t){
  handGoal(arm.s,still?0:t,pose);
  tmp.copy(goal).sub(arm.pivot.position).normalize();
  arm.aim.lerp(tmp,still?1:1-Math.exp(-dt*6)).normalize();
  arm.pivot.quaternion.setFromUnitVectors(DOWN,arm.aim);
 }

 return {
  group:root,head,
  get state(){return state;},
  setPose(p,st=state){target=p;state=st;if(!pose)pose={...p};},
  setMouth(shape,open=0){const m=MOUTH[shape]||MOUTH.REST;mouthTarget={h:m.h?open:0,w:m.w};},
  lookAt(v){look3=v?v.clone():null;},
  // 비율 확인용: 머리 높이, 서 있을 때의 몸(몸통+다리) 높이, 팔 길이, 팔 마디 수
  measure(){return {head:R*.97*2,body:H*1.04+A.thigh+A.shin,arm:armLen,armPieces:1,hairTips,hairBlobs};},
  update(dt,t){
   if(!target)return;time+=dt;
   const kp=still?1:1-Math.exp(-dt*3.2);
   for(const key of Object.keys(target)){if(typeof target[key]==='number')pose[key]+=(target[key]-pose[key])*kp;else pose[key]=target[key];}
   const p=pose,breath=still?0:Math.sin(time*2*Math.PI/3.8),side=seed%2?1:-1;
   torso.rotation.set(p.lean*.18+p.slump*.1+breath*.008,p.turn*side,0);
   torso.scale.set(1+breath*.006,1-p.slump*.03+breath*.01,1+breath*.006);torso.position.y=-p.slump*.01;
   // 시선: 마주 볼지 피할지 가끔 다시 고릅니다.
   if(!still&&(gaze.t-=dt)<=0){
    gaze.t=.7+rand()*1.9;
    if(rand()<p.gazeContact)gaze.dir.set(0,0);
    else if(rand()<p.gazeDown)gaze.dir.set((rand()*2-1)*.35,-.55-rand()*.2);
    else gaze.dir.set((rand()<.5?-1:1)*(.55+rand()*.3),(rand()*2-1)*.15);
   }
   gaze.cur.lerp(gaze.dir,still?1:1-Math.exp(-dt*9));
   let fx=0,fy=0;
   if(look3){root.updateMatrixWorld(true);head.getWorldPosition(tmp);tmp2.copy(look3).sub(tmp);root.getWorldQuaternion(qInv);tmp2.applyQuaternion(qInv.invert());fx=Math.atan2(tmp2.x,tmp2.z);fy=Math.atan2(tmp2.y,Math.hypot(tmp2.x,tmp2.z));}
   const gx=fx+gaze.cur.x,gy=fy+gaze.cur.y;
   if(!still&&nod.phase<0&&state==='listening'&&p.nod>.1&&(nod.t-=dt*p.nod)<=0){nod.phase=0;nod.t=2+rand()*3;}
   let nodOff=0;if(nod.phase>=0){nod.phase+=dt/.55;nodOff=Math.sin(Math.min(1,nod.phase)*Math.PI*2)*.08*(1-nod.phase*.3);if(nod.phase>=1)nod.phase=-1;}
   const yawT=p.headYaw*side-p.turn*side*.6+gx*.45,pitchT=p.headPitch*.9-gy*.4+nodOff;
   const kh=still?1:1-Math.exp(-dt*6);
   head.rotation.x+=(pitchT-head.rotation.x)*kh;head.rotation.y+=(yawT-head.rotation.y)*kh;head.rotation.z+=(p.headTilt*side+breath*.01-head.rotation.z)*(still?1:1-Math.exp(-dt*4));
   const ex=Math.max(-1,Math.min(1,(gx-head.rotation.y-torso.rotation.y)*2.2)),ey=Math.max(-1,Math.min(1,(gy+head.rotation.x)*2.2));
   for(const e of eyes)e.iris.position.set(ex*.01*k,ey*.009*k,0);
   // 깜빡임
   if(!still&&blink.phase<0&&(blink.t-=dt)<=0){blink.phase=0;blink.t=p.blinkMin+rand()*(p.blinkMax-p.blinkMin);if(rand()<.15)blink.t=.25;}
   let lid=1;if(blink.phase>=0){blink.phase+=dt/.16;lid=blink.phase<.4?1-blink.phase/.4*.92:.08+(blink.phase-.4)/.6*.92;if(blink.phase>=1){blink.phase=-1;lid=1;}}
   const sleepy=1-p.slump*.12;for(const e of eyes)e.group.scale.y=Math.max(.08,lid*sleepy);
   for(const b of brows){const inner=p.browInner*.42-p.browFurrow*.38;b.mesh.rotation.z=Math.PI/2+(b.side>0?-inner:inner);b.mesh.position.set(-b.side*p.browFurrow*.006*k,(p.browRaise*.012-p.browFurrow*.004)*k,0);}
   mouth.h+=(mouthTarget.h*p.mouthScale-mouth.h)*(1-Math.exp(-dt*28));mouth.w+=(mouthTarget.w-mouth.w)*(1-Math.exp(-dt*22));
   const open=mouth.h;openMouth.visible=open>.08;lineGroup.visible=!openMouth.visible;
   cavity.scale.set(.021*k*mouth.w*(1-p.lipPress*.2),Math.max(.002,.028*k*open),.01);
   const curve=Math.max(-1,Math.min(1,p.smile));lineGroup.scale.set((1-p.lipPress*.25)*(1+Math.max(0,curve)*.15),curve>=0?.15+curve*.85:-(.15+(-curve)*.85),1);
   for(const arm of arms){arm.pivot.position.y=.02+H*(.8+.08*p.shoulders);aimArm(arm,dt,time);}
  },
  // 낮은 화질: 옷의 뜨개 결 요철을 내려놓습니다.
  setFine(on){for(const m of cloths){const want=on?knitTex:null;if(m.bumpMap!==want){m.bumpMap=want;m.needsUpdate=true;}}},
  dispose(){root.removeFromParent();geoms.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());texs.forEach(t=>t.dispose());}
 };
}
