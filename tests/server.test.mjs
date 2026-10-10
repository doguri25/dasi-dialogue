import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
import {newSession} from '../public/engine.js';
import {scenarios} from '../public/scenarios.js';

test('HTTP app serves assets, protects API origin, validates roles, and preserves Korean JSON',async t=>{
 const choices=Array.from({length:4},(_,i)=>({label:`선택 ${i}`,text:`멈추는 방법 중 ${i}번을 더 설명해도 될까?`}));
 const captured=[];const server=createApp(async req=>{captured.push(req);return req.input==='Connection test.'?{ok:true}:{messages:[{speaker:'v',text:'말하기 싫으면 멈춰도 되나요?'}],teacherChoices:choices,observation:'참여 의사를 묻습니다.',risk:'none',coaching:{strength:'',nextQuestion:'지금 필요한 것은?'}};});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const index=await fetch(base);assert.equal(index.status,200);assert.match(await index.text(),/다시, 대화/);assert.match(index.headers.get('content-security-policy'),/connect-src 'self'/);
 for(const file of ['/app.js','/style.css','/scenarios.js','/engine.js','/mark.svg','/application.js','/application-view.js','/artwork.js','/followups.js','/workspace.js','/experience.js','/experience.css','/version.js','/assets/student-elementary-a.png','/assets/scene-support.png'])assert.equal((await fetch(base+file)).status,200);
 assert.equal((await fetch(base+'/server.mjs')).status,404);
 assert.equal((await fetch(base+'/assets/scene-support.png')).headers.get('content-type'),'image/png');
 assert.equal((await fetch(base+'/assets/scene-support.webp')).headers.get('content-type'),'image/webp');
 const payload={provider:'anthropic',model:'claude-sonnet-4-6',apiKey:'dummy-secret-test'};
 const post=(endpoint,data,origin=base)=>fetch(base+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});
 assert.equal((await post('/api/check',payload,'https://other.example')).status,403);assert.equal(captured.length,0);
 assert.equal((await fetch(base+'/api/check')).status,405);
 assert.equal((await fetch(base+'/api/check',{method:'POST',body:'text'})).status,415);
 assert.equal((await post('/api/check',payload)).status,200);
 const rejected=await post('/api/reply',{...payload,session:newSession(scenarios[0])});assert.equal(rejected.status,400);
 const s={...newSession(scenarios[0]),phase:'pre'};s.messages=[{kind:'teacher',phase:'pre',target:'v',text:'지금 마음이 어떠니? 🌿'}];
 const reply=await post('/api/reply',{...payload,session:s});assert.equal(reply.status,200);const replyData=await reply.json();assert.equal(replyData.messages[0].speaker,'v');assert.deepEqual(replyData.teacherChoices,choices);assert.match(captured.at(-1).system,/teacherChoices/);
 assert.ok(captured.at(-1).input.includes('지금 마음이 어떠니? 🌿'));
 assert.equal((await post('/api/reply',{...payload,session:{...s,target:'all'}})).status,400);
 assert.equal((await post('/api/unknown',payload)).status,404);
});
