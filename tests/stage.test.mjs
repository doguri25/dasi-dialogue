import test from 'node:test';
import assert from 'node:assert/strict';
import {stat} from 'node:fs/promises';
import {MOODS,moodIntensity,inferMood,normalizeMood,demoMood,MOOD_GUIDE} from '../public/stage/mood.js';
import {decompose,speechTimeline} from '../public/stage/hangul.js';
import {LOOKS,lookFor} from '../public/stage/looks.js';
import {POSES,poseFor,blendPose,seatsFor} from '../public/stage/acting.js';
import {resolveStageMode,QUALITY_LEVELS,nextQualityLevel,isTooSlow} from '../public/stage/support.js';
import {scenarios} from '../public/scenarios.js';
import {portraitFor} from '../public/artwork.js';

test('vendored three bundle exposes r187 and the post-processing addons',async()=>{
 const T=await import('../public/vendor/three-stage.js');
 assert.equal(T.REVISION,'187');
 for(const k of ['WebGLRenderer','EffectComposer','RenderPass','UnrealBloomPass','ShaderPass','OutputPass','RoomEnvironment','mergeGeometries'])assert.equal(typeof T[k],'function',k);
 assert.ok((await stat('public/vendor/three-stage.js')).size<=800*1024);
});

test('moods normalize and infer from risk',()=>{
 assert.deepEqual(MOODS,['calm','open','hesitant','anxious','defensive','upset','withdrawn','relieved']);
 assert.equal(normalizeMood(' Defensive ',{}),'defensive');
 assert.equal(normalizeMood('방어',{risk:'tension',speaker:'a'}),'defensive');
 assert.equal(normalizeMood(undefined,{risk:'stop',speaker:'v'}),'withdrawn');
 assert.equal(normalizeMood(null,{risk:'stop',speaker:'g'}),'anxious');
 assert.equal(normalizeMood('',{risk:'none'}),'calm');
 assert.equal(inferMood({risk:'tension',speaker:'a'}),'defensive');
 assert.equal(inferMood({risk:'tension',speaker:'v'}),'hesitant');
 assert.deepEqual([moodIntensity('none'),moodIntensity('tension'),moodIntensity('stop'),moodIntensity('x')],[.55,.8,1,.55]);
 for(const m of MOODS)assert.ok(MOOD_GUIDE.includes(m),m);
});
test('demo moods follow the spec examples',()=>{
 assert.equal(demoMood({intent:'pressure',role:'v',variant:'cooperative',phase:'main'}),'upset');
 assert.equal(demoMood({intent:'pressure',role:'a',variant:'cooperative',phase:'main'}),'defensive');
 assert.ok(['anxious','withdrawn'].includes(demoMood({intent:'story',role:'v',variant:'unsafe',phase:'pre'})));
 assert.equal(demoMood({intent:'story',role:'a',variant:'resistant',phase:'pre',turn:1}),'defensive');
 assert.equal(demoMood({intent:'story',role:'v',variant:'resistant',phase:'pre',turn:1}),'hesitant');
 assert.equal(demoMood({intent:'feeling',role:'v',variant:'cooperative',phase:'main'}),'open');
 assert.equal(demoMood({intent:'safety',role:'v',variant:'cooperative',phase:'main'}),'relieved');
 assert.equal(demoMood({intent:'open',role:'a',variant:'relapse',phase:'post'}),'hesitant');
 for(const intent of ['pressure','safety','followup','plan','responsibility','need','feeling','story','open'])for(const role of ['v','a','g'])for(const variant of ['cooperative','resistant','unsafe','relapse'])for(const phase of ['pre','main','post'])assert.ok(MOODS.includes(demoMood({intent,role,variant,phase,turn:0})));
});
test('hangul timeline maps vowels, closures and pauses',()=>{
 assert.deepEqual(decompose('밥'),{initial:7,medial:0,final:17});
 assert.equal(decompose('a'),null);
 const t=speechTimeline('밥, 어?');
 assert.deepEqual(t.cues.map(c=>c.shape),['M','A','M','REST','REST','E','REST']);
 assert.equal(t.duration,140+220+40+140+380);
 assert.equal(speechTimeline('가',{rate:2}).duration,70);
 assert.equal(speechTimeline('오우이으').cues.map(c=>c.shape).join(),'O,U,I,EU');
 assert.deepEqual(speechTimeline('가나').cues.map(c=>c.charIndex),[0,1]);
 assert.deepEqual(speechTimeline('가').cues[0],{start:0,duration:140,shape:'A',open:1,charIndex:0});
});
test('timeline survives text without Hangul and empty text',()=>{
 for(const s of ['OK 123','😀😀','...','',' \n '])
 {const t=speechTimeline(s);assert.ok(Number.isFinite(t.duration));assert.ok(t.cues.every(c=>Number.isFinite(c.start+c.duration+c.open)));}
 assert.equal(speechTimeline('').duration,0);
 assert.equal(speechTimeline('…').duration,600);
 assert.equal(speechTimeline('...').duration,600);
 assert.equal(speechTimeline('A').cues[0].shape,'E');
});
test('looks match the portrait each role already shows',()=>{
 for(const c of scenarios)for(const role of ['v','a'])assert.ok(portraitFor(c,role).includes(`student-${lookFor(c,role)}.webp`));
 assert.equal(lookFor(scenarios[0],'g'),'guardian');
 assert.equal(Object.keys(LOOKS).length,7);
 for(const look of Object.values(LOOKS))for(const k of ['age','hair','hairColor','skin','top','topKind'])assert.ok(look[k],k);
});
test('poses carry the body language of each mood',()=>{
 assert.equal(poseFor('defensive',{intensity:1}).arms,'crossed');
 assert.equal(poseFor('anxious',{intensity:1}).arms,'clasp');
 assert.equal(poseFor('hesitant',{intensity:1}).arms,'fidget');
 assert.equal(poseFor('withdrawn',{intensity:1}).arms,'lap');
 const g=m=>poseFor(m,{intensity:1}).gazeContact;
 assert.ok(g('open')>g('calm')&&g('calm')>g('hesitant')&&g('hesitant')>g('anxious')&&g('anxious')>g('withdrawn'));
 const r=m=>poseFor(m,{intensity:1}).speechRate;
 assert.ok(r('withdrawn')<r('hesitant')&&r('hesitant')<1&&r('anxious')>1);
 const half=poseFor('defensive',{intensity:.4}).lean,full=poseFor('defensive',{intensity:.8}).lean,calm=POSES.calm.lean;
 assert.ok(Math.abs(half-calm)<Math.abs(full-calm));
 assert.equal(poseFor('open',{state:'speaking',intensity:.8}).arms,'gesture');
 assert.ok(poseFor('calm',{state:'thinking'}).gazeContact<=.15);
 assert.equal(poseFor('nonsense').arms,POSES.calm.arms);
 const mid=blendPose(POSES.calm,POSES.defensive,.5);assert.ok(mid.lean<Math.max(POSES.calm.lean,POSES.defensive.lean)&&mid.lean>Math.min(POSES.calm.lean,POSES.defensive.lean));
 assert.equal(blendPose(POSES.calm,POSES.defensive,.4).arms,POSES.calm.arms);
 assert.equal(blendPose(POSES.calm,POSES.defensive,.6).arms,'crossed');
 assert.deepEqual([seatsFor('pre','a'),seatsFor('main','all'),seatsFor('lobby')],[['a'],['v','a','g'],['v','a']]);
});
test('stage mode and quality ladder',()=>{
 const base={setting:'auto',webgl2:true,saveData:false,deviceMemory:8,cores:8,slow:false};
 assert.equal(resolveStageMode(base),'3d');
 for(const over of [{setting:'off'},{webgl2:false},{saveData:true},{deviceMemory:2},{cores:2},{slow:true}])assert.equal(resolveStageMode({...base,...over}),'2d',JSON.stringify(over));
 assert.equal(resolveStageMode({...base,setting:'on',slow:true,deviceMemory:2}),'3d');
 assert.equal(resolveStageMode({...base,setting:'on',webgl2:false}),'2d');
 assert.equal(resolveStageMode({...base,deviceMemory:undefined,cores:undefined}),'3d');
 assert.equal(QUALITY_LEVELS.length,5);
 assert.equal(nextQualityLevel(40,0),1);assert.equal(nextQualityLevel(15,2),1);assert.equal(nextQualityLevel(25,2),2);assert.equal(nextQualityLevel(60,4),4);assert.equal(nextQualityLevel(10,0),0);
 assert.equal(isTooSlow(55,4),true);assert.equal(isTooSlow(55,3),false);assert.equal(isTooSlow(45,4),false);
});
test('the quality ladder gives up fine surface detail before shadows, and atmosphere only at the bottom',()=>{
 // 요철·코팅 같은 화소마다 비싼 효과를 먼저 끄고(그림자보다 먼저), 빛줄기·먼지는 맨 아래 단계에서 끕니다.
 assert.deepEqual(QUALITY_LEVELS.map(q=>q.fine),[true,true,false,false,false]);
 assert.deepEqual(QUALITY_LEVELS.map(q=>q.atmosphere),[true,true,true,true,false]);
 assert.ok(QUALITY_LEVELS.findIndex(q=>!q.fine)<QUALITY_LEVELS.findIndex(q=>!q.shadows));
});
test('after a lost graphics context, quality never climbs back above the lowered ceiling',()=>{
 // 문맥을 잃었다 돌아오면 한 단계 낮춘 화질이 상한입니다. 빨라져도 그 위로 올리지 않고, 느려지면 더 낮춥니다.
 assert.equal(nextQualityLevel(10,2,2),2);
 assert.equal(nextQualityLevel(10,3,2),2);
 assert.equal(nextQualityLevel(40,2,2),3);
 assert.equal(nextQualityLevel(10,1),0,'without a ceiling it still climbs to the best level');
});
test('characters are about two heads tall with short one-piece soft arms',async()=>{
 const T=await import('../public/vendor/three-stage.js');const {createCharacter}=await import('../public/stage/character.js');
 for(const [key,look] of Object.entries(LOOKS)){
  const c=createCharacter(T,look,{seed:1}),m=c.measure();
  const ratio=(m.head+m.body)/m.head;
  assert.ok(ratio>=1.8&&ratio<=2.3,`${key}: ${ratio.toFixed(2)} heads tall`);
  assert.equal(m.armPieces,1,`${key}: arms bend as one soft piece, not jointed segments`);
  assert.ok(m.arm<m.head,`${key}: arms shorter than the head`);
  c.dispose();
 }
});
test('hair is made of fine pointed strands, not round clumps',async()=>{
 const T=await import('../public/vendor/three-stage.js');const {createCharacter}=await import('../public/stage/character.js');
 for(const [key,look] of Object.entries(LOOKS)){
  const c=createCharacter(T,look,{seed:2}),m=c.measure();
  assert.equal(m.hairBlobs,0,`${key}: no round clumps in the hair`);
  assert.ok(m.hairTips>=6,`${key}: at least 6 fine strand tips (got ${m.hairTips})`);
  c.dispose();
 }
});
test('with reduced motion, characters change pose at once and then hold still',async()=>{
 const T=await import('../public/vendor/three-stage.js');const {createCharacter}=await import('../public/stage/character.js');
 const snap=g=>{const out=[];g.updateMatrixWorld(true);g.traverse(o=>out.push(o.matrixWorld.elements.map(v=>v.toFixed(5)).join(',')));return out.join('|');};
 const c=createCharacter(T,LOOKS['elementary-a'],{seed:3,still:true});
 c.setPose(poseFor('calm',{state:'idle',intensity:.55}),'idle');c.update(1/60,0);
 c.setPose(poseFor('withdrawn',{state:'listening',intensity:1}),'listening');c.update(1/60,1/60);
 const first=snap(c.group);
 for(let i=0;i<240;i++)c.update(1/60,(i+2)/60);
 assert.equal(snap(c.group),first,'no breathing, glancing, nodding, blinking or slow blending');
 const moving=createCharacter(T,LOOKS['elementary-a'],{seed:3});
 moving.setPose(poseFor('calm',{state:'idle',intensity:.55}),'idle');moving.update(1/60,0);
 moving.setPose(poseFor('withdrawn',{state:'listening',intensity:1}),'listening');moving.update(1/60,1/60);
 const early=snap(moving.group);for(let i=0;i<240;i++)moving.update(1/60,(i+2)/60);
 assert.notEqual(snap(moving.group),early,'without reduced motion the pose still blends and breathes');
 c.dispose();moving.dispose();
});

test('nobody sits on a chair the colour of their own clothes',async()=>{
 const {chairFabricFor,ROLE_FABRIC,colourDistance}=await import('../public/stage/looks.js');
 for(const [key,look] of Object.entries(LOOKS))for(const role of ['v','a','g']){
  const f=chairFabricFor(role,key),worn=[look.top,look.under].filter(Boolean);
  for(const c of worn)assert.ok(colourDistance(f.seat,c)>=28,`${key} as ${role}: chair ${f.seat} too close to clothes ${c} (${colourDistance(f.seat,c).toFixed(1)})`);
  assert.equal(f.trim,ROLE_FABRIC[role],'the role colour stays on the chair trim');
 }
 // 옷과 충분히 다르면 역할 색 그대로 앉습니다.
 assert.equal(chairFabricFor('g','guardian').seat,ROLE_FABRIC.g);
 assert.notEqual(chairFabricFor('v','elementary-a').seat,ROLE_FABRIC.v,'sage sweatshirt does not sit on the sage chair');
 assert.notEqual(chairFabricFor('a','middle-b').seat,ROLE_FABRIC.a,'lilac hoodie does not sit on the lilac chair');
});

test('arms grow out of the shoulders and move with the body',async()=>{
 const T=await import('../public/vendor/three-stage.js');const {createCharacter}=await import('../public/stage/character.js');
 for(const [key,look] of Object.entries(LOOKS)){
  const c=createCharacter(T,look,{seed:4}),m=c.measure();
  // 팔은 이어 붙인 조각(어깨 공·소맷부리 고리) 없이 매끈한 한 조각 소매입니다. 조각이 만나는 곳은 금처럼 보입니다.
  assert.equal(m.sleevePieces,1,`${key}: one seamless sleeve per arm (got ${m.sleevePieces})`);
  assert.ok(m.sleeveBuried>0,`${key}: the top of the sleeve is buried in the body, so no seam shows (${m.sleeveBuried.toFixed(3)})`);
  assert.equal(m.cuffs,2,`${key}: the sleeve itself swells into a cuff at the wrist`);
  assert.ok(m.handToSleeve<=1.02,`${key}: hands are not wider than the sleeve (${m.handToSleeve.toFixed(2)})`);
  c.dispose();
 }
 const torsoOf=c=>c.group.children[0];
 const pivots=c=>{const out=[];torsoOf(c).children.forEach(o=>{if(o.userData.armPivot)out.push(o);});return out;};
 // 숨을 쉬면 어깨(팔이 붙은 곳)도 함께 오르내립니다.
 const b=createCharacter(T,LOOKS['elementary-a'],{seed:5});b.setPose(poseFor('calm',{state:'idle',intensity:.55}),'idle');
 const ys=[];for(let i=0;i<240;i++){b.update(1/60,i/60);if(i%20===0)ys.push(pivots(b)[0].position.y);}
 assert.ok(Math.max(...ys)-Math.min(...ys)>.0015,'shoulders rise and fall with the breath');
 // 손짓할 때는 몸통도 그쪽으로 따라갑니다.
 const g=createCharacter(T,LOOKS['middle-a'],{seed:6});g.setPose(poseFor('open',{state:'speaking',intensity:1}),'speaking');
 let lean=0;for(let i=0;i<180;i++){g.update(1/60,i/60);lean=Math.max(lean,Math.abs(torsoOf(g).rotation.z));}
 assert.ok(lean>.01,`the body follows a gesture (${lean.toFixed(3)})`);
 const r=createCharacter(T,LOOKS['middle-a'],{seed:6});r.setPose(poseFor('calm',{state:'idle',intensity:.55}),'idle');
 let rest=0;for(let i=0;i<180;i++){r.update(1/60,i/60);rest=Math.max(rest,Math.abs(torsoOf(r).rotation.z));}
 assert.ok(rest<lean/2,'and stays upright with hands at rest');
 [b,g,r].forEach(c=>c.dispose());
});

// 머리 위가 파여 보이지 않게: 머리카락 층(가닥 층)의 윗가장자리는 정수리 덮개 안쪽에서 시작해야 합니다.
// 덮개 바로 바깥에서 시작하면 둘레에 턱이 생겨 위에서 볼 때 정수리가 움푹 파인 것처럼 보입니다(사용자가 하린에서 짚음).
test('hair layers start under the crown cover, so the top of the head is not sunken',async()=>{
 const T=await import('../public/vendor/three-stage.js');const {createCharacter}=await import('../public/stage/character.js');
 for(const [key,look] of Object.entries(LOOKS)){
  const c=createCharacter(T,look,{seed:5,still:true}),R=c.headRadius;c.hair.updateMatrixWorld(true);
  const inv=c.hair.parent.matrixWorld.clone().invert(),rel=o=>inv.clone().multiply(o.matrixWorld);
  const cap=c.hair.children.find(o=>o.isMesh&&o.geometry.type==='SphereGeometry'&&o.geometry.parameters.thetaLength<Math.PI);assert.ok(cap,`${key}: crown cover`);
  const capInv=rel(cap).invert(),Rc=cap.geometry.parameters.radius,v=new T.Vector3(),d=new T.Vector3();
  // 덮개(늘이고 기울인 구)의 표면까지 거리: 방향 d에서 |M⁻¹·(t·d)| = Rc
  const capRadius=dir=>{d.copy(dir).normalize();const o=new T.Vector3(0,0,0).applyMatrix4(capInv),p=d.clone().applyMatrix4(capInv).sub(o);return Rc/p.length();};
  let layers=0;
  for(const o of c.hair.children){
   if(!o.isMesh||o.geometry.type!=='BufferGeometry')continue;
   const m=rel(o),pos=o.geometry.attributes.position,pts=[];
   for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(m);pts.push({p:v.clone(),lat:Math.asin(v.y/v.length())*180/Math.PI});}
   const top=Math.max(...pts.map(q=>q.lat));if(top<20)continue;   // 아래로 늘어진 반묶음 머리는 덮개와 만나지 않습니다
   layers++;
   for(const q of pts.filter(q=>q.lat>top-1.5)){const over=(q.p.length()-capRadius(q.p))/R;assert.ok(over<=.004,`${key}: a hair layer's top edge stands ${over.toFixed(3)}R outside the crown cover at ${q.lat.toFixed(0)}°`);}
  }
  assert.ok(layers>=3,`${key}: hair layers checked (${layers})`);
 }
});
