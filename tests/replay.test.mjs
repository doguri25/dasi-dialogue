import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneAt,sceneIndexFor} from '../public/replay.js';
const T=(phase,target,text)=>({kind:'teacher',phase,target,text});
const P=(phase,target,speaker,text,mood='calm',risk='none')=>({kind:'participant',phase,target,speaker,text,mood,risk});
const session={messages:[
 P('pre','v','v','안녕하세요.'),
 T('pre','v','무슨 일이 있었니?'),
 P('pre','v','v','그림에 줄이 있었어요.','hurt'),
 P('pre','a','a','저는 지우예요.'),            // 다른 학생에게 옮겨 가며 나온 첫인사
 T('pre','a','어떤 일이 있었는지 들려줄래?'),
 P('pre','a','a','장난이었어요.','defensive','tension'),
 T('main','all','서로에게 하고 싶은 말이 있니?'),
 P('main','all','v','먼저 들어 줬으면 해요.','hesitant'),
 P('main','all','a','미안하다고 말하고 싶어요.','open'),
 {kind:'system',phase:'main',text:'진행 확인'},
 T('main','all','어떤 약속을 정해 볼까?')
]};

test('a scene is one question and the answers that followed it',()=>{
 const scene=sceneAt(session,1);
 assert.equal(scene.teacher,'무슨 일이 있었니?');
 assert.equal(scene.phase,'pre');assert.equal(scene.target,'v');
 assert.deepEqual(scene.replies,[{speaker:'v',text:'그림에 줄이 있었어요.',mood:'hurt',risk:'none'}],'another student\'s greeting is not part of the scene');
});

test('in the main meeting every answer until the next question belongs to the scene',()=>{
 const scene=sceneAt(session,6);
 assert.deepEqual(scene.replies.map(r=>r.speaker),['v','a']);
 assert.equal(scene.replies[1].mood,'open');
});

test('characters start the scene with the feelings they had just before it',()=>{
 const scene=sceneAt(session,4);
 assert.deepEqual(scene.moods.a,{mood:'calm',risk:'none'});
 assert.equal(sceneAt(session,6).moods.v,undefined,'feelings from an earlier step do not carry over');
});

test('only a question starts a scene, and a question without an answer has no replies',()=>{
 assert.equal(sceneAt(session,2),null);
 assert.equal(sceneAt(session,99),null);
 assert.deepEqual(sceneAt(session,10).replies,[]);
});

test('a quoted question in the review is found again in the conversation',()=>{
 assert.equal(sceneIndexFor(session,{phase:'main',quote:'서로에게 하고 싶은 말이 있니?'}),6);
 assert.equal(sceneIndexFor(session,{phase:'pre',quote:'서로에게 하고 싶은 말이 있니?'}),-1);
});
