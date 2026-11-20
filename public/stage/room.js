// 관계회복 대화실: 밝은 나무 원탁, 의자, 오후 햇빛이 드는 창, 책장과 화분.
// 원탁 가운데가 원점이고 교사(카메라)는 +z 쪽에 앉습니다.
// 2등신 캐릭터에 맞춘 낮은 원탁(찻상)과 푹신한 안락의자. 기존 삽화(scene-support)의 대화 자리와 같은 구성입니다.
// 그래픽(v0.8): 폭주 구구단 1.2의 방식대로 질감을 캔버스에 그리고(textures.js), 가구 밑에 접지 그림자를 깔고,
// 창으로 드는 빛줄기와 떠다니는 먼지, 바닥에 비친 창 모양 햇빛을 더하고, 반사광은 이 방을 본뜬 장면에서 굽습니다.
import * as TX from './textures.js';
export const TABLE_Y=.34,SEAT_Y=.32,SEAT_R=.82,TABLE_R=.44;
const deg=Math.PI/180;
// 각도는 +z(교사)에서 +x 쪽으로 잰 값입니다.
const LAYOUTS={
 pre:{v:180,a:180,g:180},
 main:{v:-148,a:148,g:-104},
 lobby:{v:-128,a:128}
};
const WINDOW={x:1.7,y:1.62,z:-2.62,w:1.3,h:1.15};

export function buildRoom(T,{anisotropy=1,still=false}={}) {
 const group=new T.Group(),geoms=[],mats=[],texs=[],chairs=new Map();
 const geo=g=>{geoms.push(g);return g;};
 const tex=(canvas,{repeat=[1,1],color=true,aniso=false}={})=>{const t=new T.CanvasTexture(canvas);if(color)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);if(aniso)t.anisotropy=Math.max(1,anisotropy);texs.push(t);return t;};
 const clay=(color,o={})=>{const m=new T.MeshPhysicalMaterial({color,roughness:.8,sheen:.25,sheenRoughness:.8,sheenColor:new T.Color(color).lerp(new T.Color('#fff'),.4),...o});mats.push(m);return m;};
 const glaze=(color,o={})=>fine(new T.MeshPhysicalMaterial({color,roughness:.42,clearcoat:.9,clearcoatRoughness:.18,...o}),true);
 // 낮은 화질에서 끄는 결(요철 지도·맑은 코팅): 화소마다 비싼 효과라 느린 기기에서는 먼저 내려놓습니다.
 const fineMats=[];let fineOn=true;
 function fine(m,own=false){if(own)mats.push(m);const f={m,bump:m.bumpMap||null,clearcoat:m.clearcoat||0};fineMats.push(f);if(!fineOn)applyFine(f,false);return m;}
 function applyFine(f,on){f.m.bumpMap=on?f.bump:null;if(f.clearcoat)f.m.clearcoat=on?f.clearcoat:0;f.m.needsUpdate=true;}
 const mesh=(parent,g,m,{p=[0,0,0],r=[0,0,0],s=[1,1,1]}={},shadow=true)=>{const o=new T.Mesh(g,m);o.position.set(...p);o.rotation.set(...r);o.scale.set(...s);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;};
 const SPH=geo(new T.SphereGeometry(1,24,16)),BOX=geo(new T.BoxGeometry(1,1,1)),CYL=geo(new T.CylinderGeometry(1,1,1,32)),PLANE=geo(new T.PlaneGeometry(1,1));

 // ---- 질감 ----
 const oak=TX.oakFloor(7),rugCanvas=TX.roundRug(11),panel=TX.beadboard(5);
 const floorTex=tex(oak.color,{repeat:[3,3],aniso:true}),floorBump=tex(oak.bump,{repeat:[3,3],color:false,aniso:true});
 const rugTex=tex(rugCanvas,{aniso:true});
 const wallTex=tex(TX.plaster(3),{repeat:[4,2]});
 const panelTex=tex(panel.color,{repeat:[6,1]}),panelBump=tex(panel.bump,{repeat:[6,1],color:false});
 const grainTex=tex(TX.woodGrain(9),{repeat:[1.6,1.6]});
 const weaveTex=tex(TX.weave(13),{repeat:[5,5],color:false});
 const viewTex=tex(TX.windowView(19));
 const paintTex=tex(TX.painting(23));
 const spineTex=tex(TX.bookSpine());
 const foldTex=tex(TX.folds(),{repeat:[2,1]});
 const shadowTex=tex(TX.softShadow(),{color:false});
 const speckTex=tex(TX.speck(),{color:false});
 const beamTex=tex(TX.beam(),{color:false});
 const patchTex=tex(TX.windowLight(),{color:false});

 // ---- 바닥과 러그 ----
 const floorMat=fine(new T.MeshStandardMaterial({map:floorTex,bumpMap:floorBump,bumpScale:.9,roughness:.62}),true);
 mesh(group,geo(new T.PlaneGeometry(9,9)),floorMat,{r:[-Math.PI/2,0,0]},false);
 // 러그는 섞지 않고(불투명) 가장자리 술만 잘라 냅니다. 반투명으로 두면 위에 까는 접지 그림자를 덮어 버립니다.
 const rugMat=fine(new T.MeshStandardMaterial({map:rugTex,alphaTest:.5,roughness:1,bumpMap:weaveTex,bumpScale:.6}),true);
 mesh(group,geo(new T.CircleGeometry(1.6,72)),rugMat,{p:[0,.005,0],r:[-Math.PI/2,0,0]},false);

 // ---- 접지 그림자(그림자 지도가 꺼진 낮은 화질에서도 가구가 바닥에 붙어 보입니다) ----
 let contactShadows=0;
 const shadowMat=new T.MeshBasicMaterial({alphaMap:shadowTex,color:'#3b2a1c',transparent:true,depthWrite:false,opacity:.8,polygonOffset:true,polygonOffsetFactor:-2});mats.push(shadowMat);
 const contact=(parent,x,z,sx,sz,o=1,y=.009)=>{const m=o===1?shadowMat:shadowMat.clone();if(m!==shadowMat){m.opacity=.8*o;mats.push(m);}const s=new T.Mesh(PLANE,m);s.rotation.x=-Math.PI/2;s.position.set(x,y,z);s.scale.set(sx,sz,1);s.renderOrder=1;parent.add(s);contactShadows++;return s;};

 // ---- 벽: 회벽과 세이지색 판벽, 걸레받이 ----
 const wallMat=clay('#ffffff',{sheen:0,map:wallTex}),sage=fine(clay('#ffffff',{sheen:0,map:panelTex,bumpMap:panelBump,bumpScale:.8})),rail=clay('#e8dcc6',{sheen:0});
 mesh(group,BOX,wallMat,{p:[0,1.6,-2.7],s:[9,3.2,.1]},false);
 mesh(group,BOX,sage,{p:[0,.48,-2.62],s:[9,.96,.06]},false);
 mesh(group,BOX,rail,{p:[0,.97,-2.58],s:[9,.04,.07]},false);
 mesh(group,BOX,clay('#f4ecdf',{sheen:0}),{p:[0,.035,-2.585],s:[9,.07,.05]},false);
 for(const x of [-3.4,3.4]){mesh(group,BOX,wallMat,{p:[x,1.6,0],s:[.1,3.2,9]},false);mesh(group,BOX,sage,{p:[x*.985,.48,0],s:[.06,.96,9]},false);}

 // ---- 창: 창밖 풍경이 밝게 빛나 창가에 빛 번짐이 생깁니다 ----
 let glows=0;
 const win=new T.Group();win.position.set(WINDOW.x,WINDOW.y,WINDOW.z);group.add(win);
 const view=new T.MeshBasicMaterial({map:viewTex,color:new T.Color(1.32,1.3,1.24),toneMapped:true});mats.push(view);
 mesh(win,BOX,view,{s:[WINDOW.w,WINDOW.h,.02]},false);glows++;
 const frame=clay('#f6efe2',{roughness:.55});
 for(const [x,y,w,h] of [[0,.6,1.42,.08],[0,-.6,1.42,.1],[-.68,0,.08,1.28],[.68,0,.08,1.28],[0,0,.05,1.15],[0,.05,1.3,.04]])mesh(win,BOX,frame,{p:[x,y,.03],s:[w,h,.06]});
 const curtain=clay('#f5ddc8',{map:foldTex,sheen:.5,roughness:.9});
 for(const s of [-1,1])mesh(win,BOX,curtain,{p:[s*.84,-.02,.1],s:[.22,1.38,.05]});
 mesh(win,CYL,clay('#e2c49f',{map:grainTex}),{p:[0,.74,.12],r:[0,0,Math.PI/2],s:[.02,1.95,.02]});
 mesh(win,BOX,clay('#f6efe2',{roughness:.55}),{p:[0,-.66,.12],s:[1.6,.05,.22]});
 // 창가 화분(유약 바른 도자기)
 const pot=new T.Group();pot.position.set(1.9,1.0,-2.45);group.add(pot);
 mesh(pot,geo(new T.CylinderGeometry(.09,.07,.14,24)),glaze('#d9896a'),{p:[0,.07,0]});
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2;mesh(pot,SPH,clay(i%2?'#7fa36f':'#8db37c'),{p:[Math.cos(a)*.05,.18+(i%3)*.03,Math.sin(a)*.05],r:[Math.cos(a)*.6,0,Math.sin(a)*.6],s:[.035,.09,.035]});}
 contact(pot,0,0,.26,.22,.7,.002);

 // ---- 책장: 나뭇결, 책등 무늬, 위에는 따뜻한 스탠드 ----
 const shelf=new T.Group();shelf.position.set(-1.55,0,-2.45);group.add(shelf);
 const wood=clay('#e2c49f',{map:grainTex,roughness:.6});
 // 속이 빈 틀(옆판·바닥·선반 둘·윗판·뒤판)로 짜고 책은 안쪽에 들입니다. 예전처럼 통나무 상자 앞에 판과 책을 같은 깊이로 붙이면
 // 두 면이 번갈아 그려져 책장이 깜박입니다. 어느 두 면도 같은 깊이에서 겹치지 않게 둡니다(판끼리는 맞닿는 면이 서로 가려짐).
 for(const x of [-.53,.53])mesh(shelf,BOX,wood,{p:[x,.8,0],s:[.04,1.6,.34]});
 for(const [y,h] of [[.06,.12],[.55,.06],[1.01,.06],[1.52,.16]])mesh(shelf,BOX,wood,{p:[0,y,0],s:[1.02,h,.34]});
 // 뒤판 앞면은 벽의 허리 띠(앞면 z −2.545)보다 1.5cm 앞(−2.53)에 둡니다. 더 뒤에 두면 띠가 책장 칸 안으로 비쳐 보입니다.
 const inner=clay('#d6b48c',{map:grainTex});mesh(shelf,BOX,inner,{p:[0,.8,-.1],s:[1.02,1.6,.04]});
 const bookColors=['#9db697','#b7a8d8','#f2c6a5','#d6a14f','#8fa7c9','#e8a6a0','#c9d6bf','#f3e3b5'];
 const bookMats=bookColors.map(c=>clay(c,{map:spineTex,roughness:.7}));
 // 칸마다 선반 위(.12·.58·1.04)에 세우고, 맨 위 칸 오른쪽은 비워 눕힌 책 두 권을 둡니다. 책 앞면은 틀 앞면보다 7.5cm 안쪽, 책 뒤는 뒤판 속.
 for(let row=0;row<3;row++){let x=-.46;const end=row===2?.1:.42;for(let i=0;x<end;i++){const w=.05+((row*7+i*3)%4)*.012,h=.24+((row*5+i*7)%5)*.025,tilt=i%7===3?.18:0;mesh(shelf,BOX,bookMats[(row*3+i)%bookMats.length],{p:[x+w/2,.122+row*.46+h/2+Math.abs(Math.sin(tilt))*w/2,0],r:[0,0,tilt],s:[w,h,.19]});x+=w+.006;}}
 mesh(shelf,BOX,bookMats[4],{p:[.28,1.059,.005],s:[.26,.035,.18]});mesh(shelf,BOX,bookMats[1],{p:[.29,1.094,.01],r:[0,.12,0],s:[.22,.03,.16]});
 mesh(shelf,geo(new T.CylinderGeometry(.08,.065,.12,20)),glaze('#e7d3b7'),{p:[.3,1.66,0]});
 for(let i=0;i<5;i++)mesh(shelf,SPH,clay('#7fa36f'),{p:[.3+(i-2)*.03,1.78+(i%2)*.04,0],r:[0,0,(i-2)*.4],s:[.03,.08,.03]});
 const lamp=new T.Group();lamp.position.set(-.3,1.6,0);shelf.add(lamp);
 mesh(lamp,geo(new T.CylinderGeometry(.05,.065,.03,24)),glaze('#f6efe2'),{p:[0,.015,0]});
 mesh(lamp,CYL,clay('#d6a14f',{roughness:.4}),{p:[0,.11,0],s:[.008,.18,.008]});
 const lampGlow=new T.MeshBasicMaterial({color:new T.Color(2.1,1.62,1.02)});mats.push(lampGlow);
 mesh(lamp,geo(new T.CylinderGeometry(.06,.1,.11,28,1,true)),lampGlow,{p:[0,.24,0]},false);glows++;
 contact(shelf,0,.05,1.45,.62,.75,.004);

 // ---- 벽 그림: 하얀 매트와 나무 액자 속 풍경(글자 없음) ----
 const art=new T.Group();art.position.set(-.2,1.85,-2.63);group.add(art);
 mesh(art,BOX,clay('#d9bb92',{map:grainTex,roughness:.5}),{s:[.74,.54,.035]});
 mesh(art,BOX,clay('#fbf7f0',{sheen:0}),{p:[0,0,.012],s:[.66,.46,.02]});
 mesh(art,BOX,clay('#ffffff',{map:paintTex,sheen:0,roughness:.9}),{p:[0,0,.024],s:[.52,.36,.004]},false);

 // ---- 큰 화분(오른쪽 구석) ----
 const big=new T.Group();big.position.set(2.5,0,-2.0);group.add(big);
 mesh(big,geo(new T.CylinderGeometry(.22,.17,.42,28)),glaze('#efe1cf'),{p:[0,.21,0]});
 for(let i=0;i<11;i++){const a=i/11*Math.PI*2,r=.06+(i%3)*.05;mesh(big,SPH,clay(i%2?'#79a06c':'#91b783'),{p:[Math.cos(a)*r,.62+(i%4)*.12,Math.sin(a)*r],r:[Math.sin(a)*.5,a,Math.cos(a)*.5],s:[.07,.2,.03]});}
 contact(big,0,0,.95,.95,.8);

 // ---- 원탁: 니스 칠한 나뭇결(맑은 코팅에 창이 비칩니다) ----
 const table=new T.Group();group.add(table);
 const tableWood=fine(new T.MeshPhysicalMaterial({color:'#e6c9a3',map:grainTex,roughness:.5,clearcoat:.55,clearcoatRoughness:.22,sheen:.15,sheenColor:new T.Color('#fff4e6')}),true);
 mesh(table,geo(new T.CylinderGeometry(TABLE_R,TABLE_R,.045,64)),tableWood,{p:[0,TABLE_Y,0]});
 mesh(table,geo(new T.TorusGeometry(TABLE_R,.024,12,64)),tableWood,{p:[0,TABLE_Y,0],r:[Math.PI/2,0,0]});
 const legWood=clay('#d8b78f',{map:grainTex,roughness:.6});
 for(let i=0;i<3;i++){const a=i/3*Math.PI*2+.5;mesh(table,CYL,legWood,{p:[Math.cos(a)*.26,TABLE_Y/2,Math.sin(a)*.26],r:[Math.sin(a)*.08,0,-Math.cos(a)*.08],s:[.03,TABLE_Y,.03]});contact(table,Math.cos(a)*.27,Math.sin(a)*.27,.17,.17,.95,.011);}
 contact(table,0,0,1.55,1.55,.8);
 // 탁자 위: 작은 다육 화분, 이야기 돌, 교사의 수첩
 const succ=new T.Group();succ.position.set(.2,TABLE_Y+.022,-.1);table.add(succ);
 mesh(succ,geo(new T.CylinderGeometry(.05,.04,.07,20)),glaze('#f2c6a5'),{p:[0,.035,0]});
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2;mesh(succ,SPH,clay('#8db37c'),{p:[Math.cos(a)*.02,.08,Math.sin(a)*.02],r:[Math.cos(a)*.7,0,Math.sin(a)*.7],s:[.016,.03,.016]});}
 mesh(table,SPH,glaze('#bfb3a6',{roughness:.38,clearcoat:.6}),{p:[-.06,TABLE_Y+.04,.02],s:[.06,.026,.045]});
 const pad=new T.Group();pad.position.set(.08,TABLE_Y+.03,.3);pad.rotation.y=-.18;table.add(pad);
 mesh(pad,BOX,clay('#fbf8f2',{sheen:0}),{s:[.2,.012,.27]});mesh(pad,BOX,clay('#9db697'),{p:[0,-.004,0],s:[.205,.008,.275]});
 for(let i=0;i<6;i++)mesh(pad,BOX,clay('#d7dde3',{sheen:0}),{p:[0,.0065,-.09+i*.035],s:[.15,.0008,.003]},false);
 mesh(pad,geo(new T.CylinderGeometry(.006,.006,.17,10)),glaze('#d6a14f'),{p:[.13,.008,0],r:[Math.PI/2,0,.1]});

 // ---- 의자: 천의 짜임이 보이는 푹신한 안락의자 ----
 // 앉는 천(seat)은 옷과 겹치지 않는 색, 둘레 테(trim)는 역할 색(looks.js의 chairFabricFor가 고름).
 const defaultFabric={v:{seat:'#a9c4a2',trim:'#a9c4a2'},a:{seat:'#b8afd9',trim:'#b8afd9'},g:{seat:'#a7c3d6',trim:'#a7c3d6'}};
 function chair({seat:color,trim}){
  const before=mats.length;
  const ch=new T.Group(),seatMat=fine(clay(color,{bumpMap:weaveTex,bumpScale:.7,sheen:.45})),legMat=clay('#e2c49f',{map:grainTex});
  // 둥글고 푹신한 안락의자: 방석, 등받이, 팔걸이, 짧은 다리, 방석 둘레의 가는 테
  mesh(ch,SPH,seatMat,{p:[0,SEAT_Y-.05,.02],s:[.27,.09,.25]});
  mesh(ch,SPH,seatMat,{p:[0,SEAT_Y-.11,0],s:[.29,.08,.27]});
  mesh(ch,SPH,seatMat,{p:[0,SEAT_Y+.2,-.2],r:[-.18,0,0],s:[.27,.26,.09]});
  for(const x of [-.27,.27])mesh(ch,SPH,seatMat,{p:[x,SEAT_Y+.01,-.04],s:[.05,.08,.2]});
  const pipe=clay(new T.Color(trim).multiplyScalar(.92).getStyle(),{sheen:.35});
  mesh(ch,PIPE,pipe,{p:[0,SEAT_Y-.1,0],r:[Math.PI/2,0,0],s:[.29,.27,.8]});
  for(const [x,z] of [[-.2,-.17],[.2,-.17],[-.2,.17],[.2,.17]])mesh(ch,CYL,legMat,{p:[x,(SEAT_Y-.16)/2,z],s:[.018,SEAT_Y-.16,.018]});
  contact(ch,0,-.02,.98,.92,.85,.01);
  ch.userData={seat:color,own:mats.slice(before)};
  return ch;
 }
 const PIPE=geo(new T.TorusGeometry(1,.045,8,48));
 function dropChair(ch){ch.removeFromParent();for(const m of ch.userData.own){m.dispose();const i=mats.indexOf(m);if(i>=0)mats.splice(i,1);const f=fineMats.findIndex(x=>x.m===m);if(f>=0)fineMats.splice(f,1);}}
 function anchorFor(angle,radius=SEAT_R){
  const a=angle*deg,pos=new T.Vector3(Math.sin(a)*radius,SEAT_Y,Math.cos(a)*radius);
  return {position:pos,facing:Math.atan2(-pos.x,-pos.z)};
 }
 // 자리 배치: 사전모임은 마주 앉고, 본·사후모임은 원으로 앉습니다.
 function arrange(layout,roles,fabrics={}){
  const angles=LAYOUTS[layout]||LAYOUTS.main,out={};
  for(const [key,obj] of chairs){if(!roles.includes(key)){dropChair(obj);chairs.delete(key);}}
  for(const role of roles){
   const anc=anchorFor(angles[role]??180);out[role]=anc;
   const fabric=fabrics[role]||defaultFabric[role]||defaultFabric.v;
   let ch=chairs.get(role);if(ch&&ch.userData.seat!==fabric.seat){dropChair(ch);ch=null;}
   if(!ch){ch=chair(fabric);chairs.set(role,ch);group.add(ch);}
   ch.position.set(anc.position.x,0,anc.position.z);ch.rotation.y=anc.facing;
  }
  return out;
 }

 // ---- 햇빛: 창에서 바닥으로 비스듬히 드는 빛줄기, 바닥에 비친 창 모양, 빛 속을 떠다니는 먼지 ----
 const light=new T.Group();group.add(light);
 // 해는 창을 지나 바닥의 한 점(LAND)에 닿습니다. 그림자·빛줄기·바닥 햇빛이 모두 이 방향을 따릅니다.
 const from=new T.Vector3(WINDOW.x,WINDOW.y,WINDOW.z+.05),LAND=new T.Vector3(.55,0,-.62),to=LAND.clone();
 const sunDir=LAND.clone().sub(from).normalize();
 const beamMat=new T.MeshBasicMaterial({map:beamTex,color:new T.Color(1,.9,.72),transparent:true,opacity:.15,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});mats.push(beamMat);
 let beams=0;const beamMeshes=[];
 const axis=to.clone().sub(from),len=axis.length(),dir=axis.clone().normalize(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0),dir);
 for(const [dx,w,turn] of [[-.38,.34,0],[-.02,.46,Math.PI/2],[.34,.3,.4]]){
  const b=new T.Mesh(PLANE,beamMat);
  b.scale.set(w,len,1);b.quaternion.copy(q);b.rotateY(turn);
  b.position.copy(from).addScaledVector(dir,len/2).add(new T.Vector3(dx,0,0));b.renderOrder=3;light.add(b);beamMeshes.push(b);beams++;
 }
 const patchMat=new T.MeshBasicMaterial({map:patchTex,color:new T.Color(1,.88,.68),transparent:true,opacity:.24,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-3});mats.push(patchMat);
 const patch=new T.Mesh(PLANE,patchMat);patch.rotation.set(-Math.PI/2,0,Math.atan2(sunDir.x,sunDir.z));patch.position.set(to.x,.012,to.z);patch.scale.set(1.05,1.05/Math.max(.35,-sunDir.y),1);patch.renderOrder=2;light.add(patch);
 // 먼지: 빛줄기 둘레의 상자 안에서 천천히 떠오르고 흔들립니다(동작 줄이기에서는 멈춤).
 const DUST=96,rd=TX.seeded(29),dustPos=new Float32Array(DUST*3),dustSeed=new Float32Array(DUST);
 const box={x0:from.x-.75,x1:from.x+.35,y0:.15,y1:WINDOW.y+.35,z0:from.z+.2,z1:to.z+.35};
 for(let i=0;i<DUST;i++){const t=rd();const p=from.clone().lerp(to,t);dustPos[i*3]=p.x+(rd()-.5)*.8;dustPos[i*3+1]=p.y+(rd()-.5)*.5;dustPos[i*3+2]=p.z+(rd()-.5)*.6;dustSeed[i]=rd()*100;}
 const dustBase=dustPos.slice();
 const dustGeo=geo(new T.BufferGeometry());dustGeo.setAttribute('position',new T.BufferAttribute(dustPos,3));
 const dustMat=new T.PointsMaterial({map:speckTex,color:new T.Color(1,.93,.78),size:.022,sizeAttenuation:true,transparent:true,opacity:.75,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});mats.push(dustMat);
 const dust=new T.Points(dustGeo,dustMat);dust.frustumCulled=false;light.add(dust);
 let breathe=0;
 function update(dt,time){
  if(still)return;
  breathe=time;
  const o=.15+Math.sin(time*.35)*.022+Math.sin(time*.91)*.01;beamMat.opacity=o;patchMat.opacity=.24+(o-.15)*.8;
  for(let i=0;i<DUST;i++){
   const s=dustSeed[i],k=i*3,rise=((time*.018+s*.01)%1)*.45;
   dustPos[k]=dustBase[k]+Math.sin(time*.21+s)*.06;
   dustPos[k+1]=box.y0+(((dustBase[k+1]-box.y0)+rise)%(box.y1-box.y0));
   dustPos[k+2]=dustBase[k+2]+Math.cos(time*.17+s*1.3)*.05;
  }
  dustGeo.attributes.position.needsUpdate=true;
 }

 // ---- 빛: 하늘·바닥 반구광, 창 쪽 따뜻한 주광(그림자), 반대편 보조광, 창에서 오는 테두리광 ----
 // 빛을 한 이야기로 맞춥니다: 오후 해는 창(오른쪽 뒤)에서 들어와 그림자를 선생님 쪽으로 길게 드리우고,
 // 머리카락·어깨 가장자리를 데웁니다. 얼굴은 선생님 쪽의 부드러운 빛이 밝히고, 책장 위 스탠드가 왼쪽 구석을 데웁니다.
 const lights=new T.Group();group.add(lights);
 const hemi=new T.HemisphereLight('#fff6ea','#a08a70',.58);lights.add(hemi);
 const SUN_AT=new T.Vector3(0,.45,-.3);
 const key=new T.DirectionalLight('#ffd6a0',3.1);key.position.copy(SUN_AT).addScaledVector(sunDir,-5.5);key.target.position.copy(SUN_AT);lights.add(key,key.target);
 key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-2.4,right:2.4,top:2.2,bottom:-2.2,near:1,far:11});key.shadow.bias=-.0005;key.shadow.normalBias=.03;key.shadow.radius=2.5;
 const face=new T.DirectionalLight('#fff1e2',.98);face.position.set(.5,2.1,3.4);face.target.position.set(0,.6,-.5);lights.add(face,face.target);
 const cool=new T.DirectionalLight('#dde6ff',.3);cool.position.set(-2.6,1.6,1.1);lights.add(cool);
 const lampLight=new T.PointLight('#ffc27a',1.1,2.6,2);lampLight.position.set(-1.85,1.86,-2.4);lights.add(lampLight);
 // 스탠드 갓 둘레의 은은한 빛무리(늘 화면을 향함)
 const halo=new T.Sprite(new T.SpriteMaterial({map:speckTex,color:new T.Color(1,.78,.5),transparent:true,opacity:.5,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));mats.push(halo.material);
 halo.position.set(-1.85,1.85,-2.36);halo.scale.setScalar(.62);light.add(halo);glows++;

 // 반사광: 이 방을 본뜬 작은 장면(벽·바닥 색, 밝은 창, 스탠드)을 흐린 반사 지도로 굽습니다.
 // 폭주 구구단이 하늘 돔을 구워 차체·유리에 비추던 방식입니다. 탁자의 코팅·도자기·눈동자에 이 방이 비칩니다.
 function environment(renderer){
  const env=new T.Scene(),own=[];const add=(g,m,p,s,r)=>{own.push(g,m);const o=new T.Mesh(g,m);o.position.set(...p);if(s)o.scale.set(...s);if(r)o.rotation.set(...r);env.add(o);};
  const B=new T.BoxGeometry(1,1,1),P=new T.PlaneGeometry(1,1),basic=c=>new T.MeshBasicMaterial({color:c,side:T.BackSide});
  add(B,basic(new T.Color('#efe6d6').multiplyScalar(1.15)),[0,1.6,0],[6.8,3.2,5.4]);
  add(P,new T.MeshBasicMaterial({color:new T.Color('#c9a77f').multiplyScalar(.95)}),[0,.01,0],[6.8,5.4,1],[-Math.PI/2,0,0]);
  add(P,new T.MeshBasicMaterial({color:new T.Color('#c9d6bf').multiplyScalar(.85),side:T.DoubleSide}),[0,.48,-2.68],[6.8,.96,1]);
  add(P,new T.MeshBasicMaterial({color:new T.Color(5.2,5,4.4),side:T.DoubleSide}),[WINDOW.x,WINDOW.y,-2.66],[WINDOW.w,WINDOW.h,1]);
  add(P,new T.MeshBasicMaterial({color:new T.Color(2.6,2.4,2.1),side:T.DoubleSide}),[0,3.15,0],[2.2,1.6,1],[Math.PI/2,0,0]);
  add(new T.SphereGeometry(.12,12,8),new T.MeshBasicMaterial({color:new T.Color(3.2,2.4,1.4)}),[-1.85,1.84,-2.45]);
  const pm=new T.PMREMGenerator(renderer);
  try{return pm.fromScene(env,.02,.1,20);}finally{pm.dispose();own.forEach(x=>x.dispose());}
 }

 let detail=true;
 return {
  group,key,arrange,update,environment,
  windowCenter:new T.Vector3(WINDOW.x,WINDOW.y,WINDOW.z),
  tableHeight:TABLE_Y,seatHeight:SEAT_Y,
  setShadows(on){key.castShadow=on;},
  // 가장 낮은 화질에서는 창의 빛줄기·먼지·바닥 햇빛을 끕니다(접지 그림자는 가벼워 그대로 둡니다).
  setDetail(on){detail=!!on;light.visible=detail;},
  setFine(on){on=!!on;if(on===fineOn)return;fineOn=on;fineMats.forEach(f=>applyFine(f,on));},
  chairColours(){const out={};for(const [role,ch] of chairs)out[role]=ch.userData.seat;return out;},
  lighting(){
   const beamAxis=beamMeshes[0]?new T.Vector3(0,-1,0).applyQuaternion(q):sunDir,windowDir=from.clone().sub(patch.position).normalize();
   return {sunCastsShadow:key.castShadow,sunFromWindow:+(-sunDir.dot(windowDir)).toFixed(3),beamAlignment:+beamAxis.dot(sunDir).toFixed(3),shadowsTowardTeacher:sunDir.z>0,faceFill:face.intensity>0&&face.position.z>0,lamp:lampLight.intensity>0};
  },
  stats(){return {textures:texs.length,anisotropy:floorTex.anisotropy,contactShadows,beams,dust:DUST,glows,fine:fineMats.length,fineOn,atmosphere:light.visible};},
  dustSample(){return Array.from(dustPos.slice(0,6),v=>v.toFixed(4)).join(',');},
  dispose(){group.removeFromParent();geoms.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());texs.forEach(t=>t.dispose());}
 };
}
