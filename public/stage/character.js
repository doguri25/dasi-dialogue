// 점토 인형 캐릭터. 기존 학생 그림(매트 클레이 3D 화풍)을 도형으로 옮겼습니다.
// 좌표: 원점은 의자 앉는 면 가운데, +z가 앞(탁자 쪽), +y가 위. 단위는 미터에 가깝게 맞췄습니다.
const AGE={
 elementary:{H:.34,W:.15,R:.172,upper:.15,fore:.14,thigh:.26,shin:.3},
 middle:{H:.4,W:.165,R:.164,upper:.17,fore:.155,thigh:.3,shin:.36},
 high:{H:.44,W:.175,R:.158,upper:.18,fore:.165,thigh:.33,shin:.4},
 adult:{H:.46,W:.185,R:.156,upper:.19,fore:.175,thigh:.35,shin:.42}
};
const BOTTOM={elementary:'#58627a',middle:'#4b5265',high:'#3f4656',adult:'#5b5348'};
const MOUTH={A:{h:1,w:.92},E:{h:.7,w:1.05},I:{h:.4,w:1.16},O:{h:.85,w:.64},U:{h:.5,w:.54},EU:{h:.32,w:1.05},M:{h:0,w:.94},REST:{h:0,w:1}};
const deg=Math.PI/180;

export function createCharacter(T,look,{tableY=.315,tableZ=.3,seed=1}={}) {
 const A=AGE[look.age]||AGE.middle,R=A.R,k=R/.16;
 const ek=look.age==='adult'?.84:1; // 어른은 눈을 조금 작게
 const root=new T.Group(),torso=new T.Group(),head=new T.Group(),face=new T.Group();
 root.add(torso);torso.add(head);head.add(face);
 const geoms=[],mats=new Map();
 let rnd=seed*9301+49297;const rand=()=>((rnd=(rnd*9301+49297)%233280)/233280);
 const clay=(color,{rough=.78,sheen=.35,side}={})=>{
  const key=color+rough+sheen+(side||'');if(mats.has(key))return mats.get(key);
  const c=new T.Color(color),m=new T.MeshPhysicalMaterial({color:c,roughness:rough,metalness:0,sheen,sheenRoughness:.75,sheenColor:c.clone().lerp(new T.Color('#ffffff'),.45),side:side||T.FrontSide});
  mats.set(key,m);return m;
 };
 const plain=(color,opts={})=>{const key='p'+color+JSON.stringify(opts);if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,roughness:.35,...opts}));return mats.get(key);};
 const geo=g=>{geoms.push(g);return g;};
 const SPH=geo(new T.SphereGeometry(1,32,24)),SPH_S=geo(new T.SphereGeometry(1,16,12));
 const mesh=(parent,g,m,{p=[0,0,0],r=[0,0,0],s=[1,1,1]}={})=>{const o=new T.Mesh(g,m);o.position.set(...p);o.rotation.set(...r);o.scale.set(...s);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const onHead=(lat,lon,d=R)=>new T.Vector3(d*Math.cos(lat*deg)*Math.sin(lon*deg),d*Math.sin(lat*deg),d*Math.cos(lat*deg)*Math.cos(lon*deg));
 const Z=new T.Vector3(0,0,1);
 // 머리 표면에 붙는 점토 덩어리: 로컬 z가 표면 바깥을 향합니다.
 const blob=(parent,{lat,lon,d=R,rx,ry,rz,color,roll=0,mat,lift=0})=>{
  const n=onHead(lat,lon,1).normalize(),o=new T.Mesh(SPH,mat||clay(color));
  o.position.copy(n.clone().multiplyScalar(d+lift));o.quaternion.setFromUnitVectors(Z,n);o.rotateZ(roll);o.scale.set(rx,ry,rz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
 };
 const anchor=(parent,lat,lon,d=R)=>{const g=new T.Group(),n=onHead(lat,lon,1).normalize();g.position.copy(n.clone().multiplyScalar(d));g.quaternion.setFromUnitVectors(Z,n);parent.add(g);return g;};

 // ---- 몸통과 옷 ----
 const {H,W}=A,depth=.68;
 const lathe=(scale,phiStart=0,phiLength=Math.PI*2)=>geo(new T.LatheGeometry([[0,0],[.78,0],[.93,.06],[.89,.34],[.9,.6],[.98,.8],[.95,.92],[.72,1],[.32,1.045],[0,1.05]].map(([x,y])=>new T.Vector2(x*W*scale,y*H)),36,phiStart,phiLength));
 const topColor=look.top,under=look.under;
 const body=mesh(torso,lathe(1),clay(look.topKind==='cardigan'?under:topColor),{p:[0,.1,0],s:[1,1,depth]});
 if(look.topKind==='cardigan'){
  mesh(torso,lathe(1.035,.34,Math.PI*2-.68),clay(topColor,{side:T.DoubleSide}),{p:[0,.098,0],s:[1,1.002,depth]});
  for(let i=0;i<3;i++)mesh(torso,SPH_S,clay('#efe5d0'),{p:[W*.27,.1+H*(.42+i*.17),W*depth*.98],s:[.009,.009,.006]});
 }
 if(look.topKind==='jacket'){
  // 재킷 앞의 V자 셔츠와 옷깃
  mesh(torso,SPH,clay(under),{p:[0,.1+H*.86,W*depth*.86],r:[.18,0,0],s:[W*.3,H*.2,.03]});
  const lapel=clay(new T.Color(topColor).multiplyScalar(.82).getStyle());
  for(const s of [-1,1])mesh(torso,SPH,lapel,{p:[s*W*.2,.1+H*.8,W*depth*.9],r:[.15,0,s*.42],s:[W*.1,H*.24,.022]});
  mesh(torso,SPH_S,clay('#e7dcc5'),{p:[0,.1+H*.52,W*depth*.99],s:[.01,.01,.006]});
 }
 if(look.topKind==='hoodie'){
  mesh(torso,geo(new T.TorusGeometry(W*.62,W*.24,14,28,Math.PI*1.25)),clay(topColor),{p:[0,.1+H*1.0,-W*.12],r:[Math.PI/2-.25,0,-Math.PI*.125],s:[1,1,.9]});
  mesh(torso,SPH,clay(topColor),{p:[0,.1+H*.3,W*depth*.86],s:[W*.55,H*.14,.03]});
  for(const s of [-1,1])mesh(torso,geo(new T.CylinderGeometry(.005,.005,H*.28,8)),clay('#f6f1e6'),{p:[s*W*.16,.1+H*.78,W*depth*.98]});
 }
 const collarColor=look.topKind==='knit'?new T.Color(topColor).multiplyScalar(.9).getStyle():look.topKind==='sweatshirt'?new T.Color(topColor).multiplyScalar(.88).getStyle():under||topColor;
 mesh(torso,geo(new T.TorusGeometry(W*.36,look.topKind==='knit'?.022:.016,12,32)),clay(collarColor),{p:[0,.1+H*1.02,0],r:[Math.PI/2,0,0],s:[1,depth*1.2,1]});
 if(look.topKind==='sweatshirt'||look.topKind==='knit')mesh(torso,geo(new T.TorusGeometry(W*.82,.018,10,36)),clay(collarColor),{p:[0,.115,0],r:[Math.PI/2,0,0],s:[1,depth,1]});
 // 목과 머리
 const neckY=.1+H*1.02;
 mesh(torso,geo(new T.CylinderGeometry(.042*k,.046*k,.08,16)),clay(look.skin),{p:[0,neckY+.02,0]});
 head.position.set(0,neckY+.05+R*.82,0);
 const skin=clay(look.skin,{sheen:.45});
 mesh(head,SPH,skin,{s:[R,R*.97,R*.95]});
 for(const s of [-1,1])blob(head,{lat:-4,lon:s*93,rx:.02*k,ry:.032*k,rz:.026*k,mat:skin});
 blob(head,{lat:-13,lon:0,d:R*.97,rx:.02*k,ry:.016*k,rz:.016*k,color:new T.Color(look.skin).multiplyScalar(.95).getStyle()});
 for(const s of [-1,1])blob(head,{lat:-17,lon:s*38,d:R*.985,rx:.03*k,ry:.019*k,rz:.006,color:look.cheek||'#eda394',mat:clay(look.cheek||'#eda394',{sheen:.2})});

 // ---- 눈·눈썹·입 ----
 const eyes=[],brows=[];
 const sclera=plain('#fbf7f2',{roughness:.5}),iris=plain('#3b2a22',{roughness:.22}),pupil=plain('#1b1210',{roughness:.2}),shine=new T.MeshBasicMaterial({color:new T.Color(1.6,1.6,1.6)});
 for(const s of [-1,1]){
  const a=anchor(face,-1,s*21,R*.985),g=new T.Group();a.add(g);
  const m=(gg,mm,o)=>{const x=mesh(g,gg,mm,o);x.castShadow=false;return x;};
  m(SPH,sclera,{s:[.03*k*ek,.036*k*ek,.012]});
  const ir=new T.Group();g.add(ir);
  const im=new T.Mesh(SPH,iris);im.scale.set(.024*k*ek,.029*k*ek,.012);im.position.z=.004;ir.add(im);
  const pm=new T.Mesh(SPH_S,pupil);pm.scale.set(.012*k*ek,.015*k*ek,.008);pm.position.z=.011;ir.add(pm);
  const hl=new T.Mesh(SPH_S,shine);hl.scale.setScalar(.0068*k);hl.position.set(-.008*k,.011*k,.017);ir.add(hl);
  const hl2=new T.Mesh(SPH_S,shine);hl2.scale.setScalar(.003*k);hl2.position.set(.007*k,-.009*k,.017);ir.add(hl2);
  eyes.push({group:g,iris:ir,side:s});
  const ba=anchor(face,14.5,s*21,R*1.0),b=mesh(ba,geo(new T.CapsuleGeometry(.0072*k,.034*k,6,10)),clay(look.hairColor,{rough:.6}),{r:[0,0,Math.PI/2]});
  brows.push({anchor:ba,mesh:b,side:s});
 }
 const mouthA=anchor(face,-30,0,R*.975);
 const line=mesh(mouthA,geo(new T.TorusGeometry(.036*k,.0062*k,8,28,Math.PI*.5)),plain('#7a3b36',{roughness:.6}),{r:[0,0,-Math.PI*.75]});
 line.castShadow=false;const lineGroup=new T.Group();mouthA.add(lineGroup);lineGroup.add(line);line.position.y=.036*k;
 const openMouth=new T.Group();mouthA.add(openMouth);
 const cavity=new T.Mesh(SPH,plain('#5b2628',{roughness:.7}));cavity.scale.set(1,1,.01);openMouth.add(cavity);
 const tongue=new T.Mesh(SPH_S,plain('#d9727a',{roughness:.5}));tongue.scale.set(.6,.35,.01);tongue.position.set(0,-.45,.004);cavity.add(tongue);

 // ---- 머리카락 ----
 const hair=clay(look.hairColor,{rough:.58,sheen:.6}),hairDS=clay(look.hairColor,{rough:.58,sheen:.6,side:T.DoubleSide});
 const hairGroup=new T.Group();head.add(hairGroup);
 const cap=(scale=1.075,cover=.56,tilt=.7)=>mesh(hairGroup,geo(new T.SphereGeometry(R*scale,40,24,0,Math.PI*2,0,Math.PI*cover)),hairDS,{r:[-tilt,0,0]});
 const bangs=(list)=>list.forEach(([lat,lon,rx,ry,rz,roll])=>blob(hairGroup,{lat:lat+3,lon,rx:rx*k,ry:ry*k,rz:rz*k,roll,mat:hair,d:R*1.03}));
 const bell=(bottom,flare=1.14,open=50,inward=.94)=>{
  const pts=[[.9,.55],[1.075,.1],[flare,-.35],[flare*.99,bottom*.7],[flare*.96,bottom],[inward,bottom-.05]].map(([x,y])=>new T.Vector2(x*R,y*R));
  return mesh(hairGroup,geo(new T.LatheGeometry(pts,40,open*deg,Math.PI*2-open*2*deg)),hairDS,{p:[0,0,-R*.02]});
 };
 switch(look.hair){
  case 'bob':cap();bell(-.86,1.15,52);bangs([[30,-46,.05,.034,.026,.2],[31,-23,.052,.036,.026,.08],[31,0,.052,.036,.026,0],[31,23,.052,.036,.026,-.08],[30,46,.05,.034,.026,-.2]]);break;
  case 'chinbob':cap(1.075,.57,.66);bell(-1.02,1.12,50,.98);bangs([[33,-38,.07,.036,.028,.55],[34,-8,.06,.034,.026,.35],[31,24,.055,.032,.026,.15],[28,48,.045,.04,.026,-.3]]);break;
  case 'halfup':cap(1.075,.56,.66);bell(-1.75,1.1,56,1.0);bangs([[33,-30,.075,.036,.028,.5],[33,2,.06,.032,.026,.3],[31,30,.05,.032,.026,.1]]);
   blob(hairGroup,{lat:28,lon:180,rx:.045*k,ry:.04*k,rz:.04*k,mat:hair,d:R*1.06});mesh(hairGroup,geo(new T.TorusGeometry(.022*k,.008*k,8,16)),clay('#e8a6a0'),{p:[0,R*.47,-R*.98],r:[.35,0,0]});break;
  case 'tousled':cap(1.07,.58,.62);
   for(let i=0;i<7;i++){const lat=46+rand()*30,lon=(rand()*2-1)*150;blob(hairGroup,{lat,lon,rx:(.05+rand()*.02)*k,ry:(.03+rand()*.012)*k,rz:(.016+rand()*.008)*k,roll:rand()*3,mat:hair,d:R*1.06});}
   bangs([[30,-34,.045,.04,.028,.6],[32,-10,.05,.042,.03,.2],[31,14,.048,.04,.028,-.3],[29,36,.042,.038,.028,-.6]]);
   for(const s of [-1,1])blob(hairGroup,{lat:5,lon:s*80,rx:.04*k,ry:.06*k,rz:.03*k,mat:hair,d:R*1.0});break;
  case 'cropped':cap(1.045,.57,.62);bangs([[33,-25,.06,.028,.022,.3],[34,0,.06,.028,.022,0],[33,25,.06,.028,.022,-.3]]);
   for(const s of [-1,1])blob(hairGroup,{lat:12,lon:s*78,rx:.05*k,ry:.05*k,rz:.02*k,mat:hair,d:R*1.0});break;
  case 'sidepart':cap(1.055,.57,.6);bangs([[36,-30,.085,.04,.034,.42],[37,0,.07,.036,.03,.2],[34,30,.05,.03,.024,-.2]]);
   blob(hairGroup,{lat:44,lon:-28,rx:.085*k,ry:.042*k,rz:.02*k,roll:.5,mat:hair,d:R*1.06});
   for(const s of [-1,1])blob(hairGroup,{lat:10,lon:s*80,rx:.05*k,ry:.05*k,rz:.02*k,mat:hair,d:R*1.0});break;
  default:cap(1.05,.57,.62);bangs([[35,-24,.07,.032,.026,.4],[36,4,.06,.03,.024,.15],[33,30,.05,.03,.022,-.2]]);
   for(const s of [-1,1])blob(hairGroup,{lat:10,lon:s*80,rx:.05*k,ry:.05*k,rz:.02*k,mat:hair,d:R*1.0});
 }

 // ---- 팔·다리 (두 마디 IK) ----
 const sleeve=clay(topColor);
 const arms=[-1,1].map(s=>({s,
  upper:mesh(root,geo(new T.CapsuleGeometry(.043*k,A.upper-.06,6,12)),sleeve),
  fore:mesh(root,geo(new T.CapsuleGeometry(.038*k,A.fore-.05,6,12)),sleeve),
  hand:mesh(root,SPH,skin,{s:[.03*k,.022*k,.036*k]}),
  target:new T.Vector3(s*.11,tableY+.035,tableZ),goal:new T.Vector3()
 }));
 const bottomMat=clay(look.bottom||BOTTOM[look.age]||'#4b5265');
 for(const s of [-1,1]){
  const hip=new T.Vector3(s*.075,.06,.02),knee=new T.Vector3(s*.085,.07,.02+A.thigh),foot=new T.Vector3(s*.09,.07-A.shin,.06+A.thigh);
  limb(mesh(root,geo(new T.CapsuleGeometry(.055*k,A.thigh-.06,6,12)),bottomMat),hip,knee);
  limb(mesh(root,geo(new T.CapsuleGeometry(.045*k,A.shin-.05,6,12)),bottomMat),knee,foot);
  mesh(root,SPH,clay('#f3efe6'),{p:[s*.09,foot.y-.02,foot.z+.04],s:[.045,.035,.075]});
 }
 function limb(o,a,b){o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());}

 // ---- 상태 ----
 let pose=null,target=null,mouthTarget={h:0,w:1},mouth={h:0,w:1},state='idle',time=rand()*10;
 let blink={t:1+rand()*3,phase:-1},gaze={t:0,dir:new T.Vector2(),cur:new T.Vector2()},nod={t:2+rand()*3,phase:-1},look3=null;
 const tmp=new T.Vector3(),tmp2=new T.Vector3(),sh=new T.Vector3();
 const torsoSpace=v=>torso.localToWorld(v.clone()).applyMatrix4(new T.Matrix4().copy(root.matrixWorld).invert());
 function handGoal(arm,t){
  const s=arm.s,p=pose,g=arm.goal;
  switch(p.arms){
   case 'crossed':return g.copy(torsoSpace(new T.Vector3(-s*.085,.1+H*(s>0?.6:.53),W*depth+.05+(s>0?.02:0))));
   case 'clasp':return g.copy(torsoSpace(new T.Vector3(s*.028,.1+H*.5,W*depth+.07)));
   case 'lap':return g.set(s*.075,.13,.22);
   case 'fidget':return g.set(s*.035+s*.008*Math.sin(t*5.3+s),tableY+.032+.008*Math.sin(t*7.1+s*2),tableZ+.06);
   case 'gesture':return s>0?g.set(.14,tableY+.13+.05*Math.sin(t*2.2),tableZ+.02+.035*Math.sin(t*1.6)):g.set(-.075,tableY+.028,tableZ+.1);
   default:return g.set(s*.075,tableY+.028,tableZ+.1);
  }
 }
 function solveArm(arm,dt,t){
  sh.set(arm.s*(W*.86),.1+H*(.9+.06*pose.shoulders),0);const S=torsoSpace(sh);
  arm.target.lerp(handGoal(arm,t),1-Math.exp(-dt*6));
  const T0=arm.target,l1=A.upper,l2=A.fore,dir=tmp.copy(T0).sub(S);let d=dir.length();dir.normalize();
  d=Math.min(l1+l2-.002,Math.max(Math.abs(l1-l2)+.01,d));
  const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));
  const pole=tmp2.set(arm.s*.9,-.45,pose.arms==='crossed'?.25:-.2);pole.sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const E=S.clone().add(dir.clone().multiplyScalar(a)).add(pole.multiplyScalar(h)),Hd=S.clone().add(dir.clone().multiplyScalar(d));
  limb(arm.upper,S,E);limb(arm.fore,E,Hd);arm.hand.position.copy(Hd);arm.hand.quaternion.copy(arm.fore.quaternion);
 }

 return {
  group:root,head,
  get state(){return state;},
  setPose(p,st=state){target=p;state=st;if(!pose)pose={...p};},
  setMouth(shape,open=0){const m=MOUTH[shape]||MOUTH.REST;mouthTarget={h:m.h?open:0,w:m.w};},
  lookAt(v){look3=v?v.clone():null;},
  update(dt,t){
   if(!target)return;time+=dt;
   const kp=1-Math.exp(-dt*3.2);
   for(const key of Object.keys(target)){if(typeof target[key]==='number')pose[key]+=(target[key]-pose[key])*kp;else pose[key]=target[key];}
   const p=pose,breath=Math.sin(time*2*Math.PI/3.8);
   torso.rotation.set(p.lean*.2+p.slump*.12+breath*.006,p.turn*(seed%2?1:-1),0);
   torso.scale.set(1,1-p.slump*.03+breath*.008,1);torso.position.y=breath*.002-p.slump*.012;root.updateMatrixWorld(true);
   // 시선: 마주 볼지 피할지 가끔 다시 고릅니다.
   if((gaze.t-=dt)<=0){
    gaze.t=.7+rand()*1.9;
    if(rand()<p.gazeContact)gaze.dir.set(0,0);
    else if(rand()<p.gazeDown)gaze.dir.set((rand()*2-1)*.35,-.55-rand()*.2);
    else gaze.dir.set((rand()<.5?-1:1)*(.55+rand()*.3),(rand()*2-1)*.15);
   }
   gaze.cur.lerp(gaze.dir,1-Math.exp(-dt*9));
   let fx=0,fy=0;
   if(look3){root.updateMatrixWorld();head.getWorldPosition(tmp);tmp2.copy(look3).sub(tmp);const inv=new T.Quaternion();root.getWorldQuaternion(inv);tmp2.applyQuaternion(inv.invert());fx=Math.atan2(tmp2.x,tmp2.z);fy=Math.atan2(tmp2.y,Math.hypot(tmp2.x,tmp2.z));}
   const gx=fx+gaze.cur.x,gy=fy+gaze.cur.y;
   if(nod.phase<0&&state==='listening'&&p.nod>.1&&(nod.t-=dt*p.nod)<=0){nod.phase=0;nod.t=2+rand()*3;}
   let nodOff=0;if(nod.phase>=0){nod.phase+=dt/.55;nodOff=Math.sin(Math.min(1,nod.phase)*Math.PI*2)*.07*(1-nod.phase*.3);if(nod.phase>=1)nod.phase=-1;}
   const yawT=p.headYaw*(seed%2?1:-1)-p.turn*(seed%2?1:-1)*.6+gx*.42,pitchT=p.headPitch-gy*.4+nodOff;
   head.rotation.x+=(pitchT-head.rotation.x)*(1-Math.exp(-dt*6));head.rotation.y+=(yawT-head.rotation.y)*(1-Math.exp(-dt*6));head.rotation.z+=(p.headTilt*(seed%2?1:-1)-head.rotation.z)*(1-Math.exp(-dt*4));
   const ex=Math.max(-1,Math.min(1,(gx-head.rotation.y-torso.rotation.y)*2.2)),ey=Math.max(-1,Math.min(1,(gy+head.rotation.x)*2.2));
   for(const e of eyes){e.iris.position.set(ex*.009*k,ey*.008*k,0);}
   // 깜빡임
   if(blink.phase<0&&(blink.t-=dt)<=0){blink.phase=0;blink.t=p.blinkMin+rand()*(p.blinkMax-p.blinkMin);if(rand()<.15)blink.t=.25;}
   let lid=1;if(blink.phase>=0){blink.phase+=dt/.16;lid=blink.phase<.4?1-blink.phase/.4*.92:.08+(blink.phase-.4)/.6*.92;if(blink.phase>=1){blink.phase=-1;lid=1;}}
   const sleepy=1-p.slump*.12;for(const e of eyes)e.group.scale.y=Math.max(.08,lid*sleepy);
   for(const b of brows){const inner=p.browInner*.42-p.browFurrow*.38;b.mesh.rotation.z=Math.PI/2+(b.side>0?-inner:inner);b.mesh.position.set(-b.side*p.browFurrow*.005,(p.browRaise*.011-p.browFurrow*.004)*k,0);}
   mouth.h+=(mouthTarget.h*p.mouthScale-mouth.h)*(1-Math.exp(-dt*28));mouth.w+=(mouthTarget.w-mouth.w)*(1-Math.exp(-dt*22));
   const open=mouth.h;openMouth.visible=open>.08;lineGroup.visible=!openMouth.visible;
   cavity.scale.set(.02*k*mouth.w*(1-p.lipPress*.2),Math.max(.002,.028*k*open),.01);
   const curve=Math.max(-1,Math.min(1,p.smile));lineGroup.scale.set((1-p.lipPress*.25)*(1+Math.max(0,curve)*.15),curve>=0?.15+curve*.85:-(.15+(-curve)*.85),1);
   for(const arm of arms)solveArm(arm,dt,time);
  },
  dispose(){root.removeFromParent();geoms.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());}
 };
}
