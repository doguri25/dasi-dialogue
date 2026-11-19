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
