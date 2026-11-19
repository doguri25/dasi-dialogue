// 3D 대화 장면 검사. 서버를 켠 뒤 실행합니다: npm start, 그다음 node tests/stage-browser.mjs
// PLAYWRIGHT_MODULE로 Playwright 경로를, PW_CHANNEL로 브라우저 채널(예: chrome)을 바꿀 수 있습니다.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let pw;try{pw=await import(process.env.PLAYWRIGHT_MODULE||'playwright');}catch{pw=require('/opt/node-tools/node_modules/playwright');}
const chromium=pw.chromium||pw.default.chromium;
const base=process.env.TEST_URL||'http://127.0.0.1:3210';
const launch=()=>chromium.launch({headless:true,...(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{})});
let browser=await launch();
const results=[];
const only=(process.env.STAGE_ONLY||'').split(',').filter(Boolean),run=name=>!only.length||only.includes(name),quick=process.env.STAGE_QUICK==='1';
await mkdir('.test-artifacts',{recursive:true});

async function labPage(query,{width=960,height=600,scale=2}={}){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:scale,locale:'ko-KR'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}/stage-lab.html?${query}`);
 await page.waitForFunction(()=>window.__lab?.ready===true||window.__lab?.error,null,{timeout:60000});
 const failure=await page.evaluate(()=>window.__lab.error||'');assert.equal(failure,'',`lab failed: ${failure}`);
 return {page,errors};
}
// 캔버스 가운데를 잘라 밝기 표준편차를 잽니다. 빈 화면이면 0에 가깝습니다.
const centerDeviation=page=>page.evaluate(()=>{
 const src=document.querySelector('#stage canvas'),c=document.createElement('canvas');c.width=200;c.height=200;
 const g=c.getContext('2d');g.drawImage(src,src.width/2-src.width/6,src.height/2-src.height/4,src.width/3,src.height/2,0,0,200,200);
 const d=g.getImageData(0,0,200,200).data;let sum=0,sq=0,n=0;for(let i=0;i<d.length;i+=4){const l=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];sum+=l;sq+=l*l;n++;}
 const mean=sum/n;return Math.sqrt(sq/n-mean*mean);
});

try{
 // 1. 캐릭터 한 명이 실제로 그려지는지, 생김새·감정별 사진
 if(run('looks'))for(const look of quick?['elementary-a','guardian']:['elementary-a','elementary-b','middle-a','middle-b','high-a','high-b','guardian']){
  // 소프트웨어 GPU(SwiftShader)는 큰 화면을 여러 장 그리면 메모리가 쌓이므로 생김새마다 브라우저를 새로 엽니다.
  await browser.close();browser=await launch();
  for(const mood of quick?['defensive']:['calm','defensive','anxious','open']){
   const {page,errors}=await labPage(`look=${look}&mood=${mood}&preserve=1`);
   const dev=await centerDeviation(page);
   assert.ok(dev>12,`${look}/${mood}: canvas looks blank (deviation ${dev.toFixed(1)})`);
   await page.screenshot({path:`.test-artifacts/lab-${look}-${mood}.png`});
   assert.deepEqual(errors,[],`${look}/${mood} errors`);
   await page.close();
  }
 }
 if(run('looks'))results.push(quick?'characters render (quick)':'characters render for 7 looks x 4 moods');
 // 2. 말하는 장면과 여러 명이 앉은 장면
 if(run('casts'))for(const q of ['look=middle-b&mood=open&state=speaking','cast=main&mood=hesitant','cast=lobby&mood=calm']){
  const {page,errors}=await labPage(q+'&preserve=1',{width:1280,height:720});
  assert.ok(await centerDeviation(page)>12,q+' blank');
  await page.screenshot({path:`.test-artifacts/lab-${q.replace(/[^a-z]+/g,'-')}.png`});
  assert.deepEqual(errors,[]);await page.close();
 }
 if(run('casts'))results.push('speaking and circle casts render');

 // 3. 감독: 자막·말하기 순서·끼어들기·2D 대체·문맥 손실
 for(const mode of run('director')?['3d','2d']:[]){
  console.log('director',mode);
  const {page,errors}=await labPage(`director=1&mode=${mode}&noslow=1`,{width:960,height:600,scale:1});
  const host=page.locator('.stage-host');
  assert.equal(await host.getAttribute('data-stage-mode'),mode);
  assert.equal(await host.getAttribute('aria-hidden'),'true');
  const line='제가 그린 건데 허락도 안 받았어요.';
  const states=page.evaluate(()=>new Promise(res=>{const seen=[];const h=document.querySelector('.stage-host');const mo=new MutationObserver(()=>{const v=h.dataset.stageState+':'+(h.dataset.speaker||'')+':'+(h.dataset.mood||'');if(seen.at(-1)!==v)seen.push(v);});mo.observe(h,{attributes:true});setTimeout(()=>{mo.disconnect();res(seen);},6500);})).catch(()=>[]);
  await page.evaluate(line=>window.__lab.director.speak([{speaker:'v',text:line,mood:'upset'}],{tts:false,risk:'tension'}),line);
  assert.equal(await host.getAttribute('data-stage-state'),'idle');
  assert.equal(await page.locator('.stage-caption-text').innerText(),line);
  assert.ok((await states).includes('speaking:v:upset'),mode+': speaking state with speaker and mood');
  // 자막 넘기기: 현재 줄이 한 번에 다 나옴
  const long='말하기 어려웠던 장면을 천천히 들어 주셨으면 좋겠어요. '.repeat(3).trim();
  const done=page.evaluate(long=>window.__lab.director.speak([{speaker:'v',text:long,mood:'hesitant'}],{tts:false}),long).catch(e=>e);
  await page.waitForFunction(()=>document.querySelector('.stage-host').dataset.stageState==='speaking');
  await page.waitForTimeout(400);
  assert.ok((await page.locator('.stage-caption-text').innerText()).length<long.length,mode+': caption reveals gradually');
  await page.evaluate(()=>window.__lab.director.skip());
  await page.waitForFunction(long=>document.querySelector('.stage-caption-text').innerText===long,long,{timeout:2000});
  await done;
  // 끼어들기: 말하는 도중 교사가 말하면 300ms 안에 듣는 자세
  const interrupted=page.evaluate(long=>window.__lab.director.speak([{speaker:'v',text:long,mood:'open'}],{tts:false}).then(()=>'resolved'),long).catch(e=>String(e));
  await page.waitForFunction(()=>document.querySelector('.stage-host').dataset.stageState==='speaking');
  const after=await page.evaluate(()=>{window.__lab.director.teacherSaid('잠깐만, 하나 물어봐도 될까?');return document.querySelector('.stage-host').dataset.stageState;});
  assert.equal(after,'listening',mode+': teacher interrupts immediately');assert.equal(await interrupted,'resolved');
  assert.match(await page.locator('.stage-caption-name').innerText(),/나/);
  // 여럿이 차례로 말함
  await page.evaluate(()=>window.__lab.director.setCast({scenario:window.__lab.scenario,phase:'main',target:'all',moods:{}}));
  const order=page.evaluate(()=>new Promise(res=>{const seen=[];const h=document.querySelector('.stage-host');const mo=new MutationObserver(()=>{const v=h.dataset.speaker;if(v&&seen.at(-1)!==v)seen.push(v);});mo.observe(h,{attributes:true});setTimeout(()=>{mo.disconnect();res(seen);},9000);})).catch(()=>[]);
  await page.evaluate(()=>window.__lab.director.speak([{speaker:'v',text:'저는 아직 어려워요.',mood:'hesitant'},{speaker:'a',text:'저도 생각해 볼게요.',mood:'calm'}],{tts:false}));
  assert.deepEqual((await order).slice(0,2),['v','a']);
  if(mode==='2d')assert.equal(await page.locator('.flat-seat').count(),3);
  if(mode==='3d'){
   // 문맥 손실 → 2D 무대로 바뀌고 오류 없음
   await page.evaluate(()=>window.__lab.director.renderer.canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
   await page.waitForFunction(()=>document.querySelector('.stage-host').dataset.stageMode==='2d',null,{timeout:3000});
   assert.equal(await page.locator('.flat-seat').count(),3);
  }
  assert.deepEqual(errors,[],mode+' errors');
  await page.close();
 }
 if(run('director'))results.push('director: captions, skip, interrupt, order, 2D, context loss');

 // 4. 사례 목록: 첫 화면에서는 3D 파일을 받지 않고, 한가해진 뒤 미리보기 무대가 열림. 설정에서 끌 수 있음.
 if(run('library')){
  const page=await browser.newPage({viewport:{width:1366,height:820},locale:'ko-KR'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const nocache=await page.context().newCDPSession(page);await nocache.send('Network.enable');await nocache.send('Network.setCacheDisabled',{cacheDisabled:true});
  await page.goto(base);
  await page.waitForSelector('.hero-stage .stage-host[data-stage-mode="3d"]',{timeout:60000});
  const timing=await page.evaluate(()=>({three:performance.getEntriesByType('resource').find(r=>/three-stage\.js/.test(r.name))?.startTime,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime}));
  assert.ok(timing.fcp>0&&timing.three>timing.fcp,`3D files load only after first paint ${JSON.stringify(timing)}`);
  await page.waitForFunction(()=>document.querySelector('.hero-stage canvas'),null,{timeout:60000});
  await page.screenshot({path:'.test-artifacts/library-hero-stage.png'});
  await page.locator('.topbar [data-action="settings"]').click();
  await page.locator('input[name="stage-pref"][value="off"]').check();
  assert.equal(await page.evaluate(()=>localStorage.getItem('dasi.stage')),'off');
  await page.locator('[data-action="close"]').first().click();
  assert.equal(await page.locator('.hero-stage .stage-host').count(),0,'stage off hides the 3D preview');
  assert.equal(await page.locator('.hero-stage img').isVisible(),true);
  await page.evaluate(()=>localStorage.removeItem('dasi.stage'));
  assert.deepEqual(errors,[]);await page.close();results.push('library: no early 3D request, hero preview, preference off');
  // 3D를 불러오는 중에 화면을 떠나도 크기 0인 화면에 그리지 않음(그래픽 오류 폭주 → 탐색 멈춤 회귀 방지)
  const quick=await browser.newPage({viewport:{width:1440,height:900},locale:'ko-KR'});
  const gl=[];quick.on('console',m=>{if(/GL_INVALID|incomplete/i.test(m.text()))gl.push(m.text());});
  await quick.goto(base);await quick.waitForTimeout(250);
  await quick.locator('[data-action="quick"]').first().click();await quick.locator('#start-form button[type="submit"]').click();await quick.locator('#application-continue').click();
  await quick.waitForTimeout(9000);
  assert.deepEqual(gl.slice(0,2),[],'no WebGL errors while the stage waits off-screen');
  const t0=Date.now();await quick.reload({timeout:15000});assert.ok(Date.now()-t0<15000);
  await quick.close();results.push('library: leaving during 3D load causes no GL errors');
 }

 // 5. 다듬기: 아주 긴 답, 화면 크기 바꾸기, 느린 기기
 if(run('polish')){
  let {page,errors}=await labPage('director=1&mode=3d&noslow=1',{width:1366,height:768,scale:1});
  const long='말하기 어려웠던 장면을 천천히 들어 주셨으면 좋겠어요. '.repeat(60).trim().slice(0,3000);
  const done=page.evaluate(long=>window.__lab.director.speak([{speaker:'v',text:long,mood:'hesitant'}],{tts:false}),long).catch(e=>e);
  await page.waitForFunction(()=>document.querySelector('.stage-host').dataset.stageState==='speaking');
  await page.waitForTimeout(1500);await page.evaluate(()=>window.__lab.director.skip());
  await page.waitForFunction(long=>document.querySelector('.stage-caption-text').textContent===long,long,{timeout:3000});
  const box=await page.evaluate(()=>{const h=document.querySelector('.stage-host').getBoundingClientRect(),c=document.querySelector('.stage-caption').getBoundingClientRect(),t=document.querySelector('.stage-caption-text');return {ratio:c.height/h.height,bottom:t.scrollHeight-t.scrollTop-t.clientHeight};});
  assert.ok(box.ratio<=.345,`caption stays within a third of the stage (${box.ratio.toFixed(2)})`);
  assert.ok(box.bottom<=2,'caption shows its last line');
  await done;
  for(const [w,h,large] of [[390,844,false],[1024,700,true],[1366,768,false]]){
   await page.setViewportSize({width:w,height:h});await page.evaluate(large=>document.documentElement.dataset.textSize=large?'large':'normal',large);
   await page.waitForTimeout(900);
   const m=await page.evaluate(()=>{const c=document.querySelector('.stage-host canvas'),h=document.querySelector('.stage-host').getBoundingClientRect();return {cw:c.clientWidth,ch:c.clientHeight,hw:h.width,hh:h.height,bw:c.width,bh:c.height};});
   assert.ok(Math.abs(m.cw-m.hw)<=2&&Math.abs(m.ch-m.hh)<=2,`canvas fills the stage at ${w}x${h} ${JSON.stringify(m)}`);
   assert.ok(Math.abs(m.bw/m.bh-m.cw/m.ch)<.03,`drawing buffer keeps the aspect at ${w}x${h}`);
  }
  assert.deepEqual(errors,[]);await page.close();
  // 느린 기기: CPU 4배 느리게 → 화질을 낮추거나 그림 무대로 바뀌고, 화면은 계속 반응함
  ({page,errors}=await labPage('director=1&mode=3d',{width:1366,height:768,scale:1}));
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.evaluate(()=>window.__lab.director.speak([{speaker:'v',text:'천천히 이야기해 볼게요. '.repeat(12),mood:'calm'}],{tts:false}));
  const after=await page.evaluate(()=>({level:window.__lab.director.renderer.debug?.level||0,mode:document.querySelector('.stage-host').dataset.stageMode}));
  assert.ok(after.level>0||after.mode==='2d',`slow device lowers quality ${JSON.stringify(after)}`);
  const lagNow=()=>page.evaluate(async()=>{let worst=0;for(let i=0;i<5;i++){const t=performance.now();await new Promise(r=>setTimeout(r,0));worst=Math.max(worst,performance.now()-t);await new Promise(r=>setTimeout(r,100));}return worst;});
  let lag=Infinity,state=after;const until=Date.now()+20000;
  while(Date.now()<until){lag=await lagNow();state=await page.evaluate(()=>({level:window.__lab.director.renderer.debug?.level||0,mode:document.querySelector('.stage-host').dataset.stageMode}));if(lag<500)break;}
  console.log('event loop lag under 4x CPU (ms)',Math.round(lag),JSON.stringify(state));
  assert.ok(lag<500,`within 20s the stage adapts so a click handler runs within 500ms (worst lag ${Math.round(lag)}ms, ${JSON.stringify(state)})`);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  assert.deepEqual(errors,[]);await page.close();
  // 화면 밖으로 스크롤하면 그리기를 멈춤
  ({page,errors}=await labPage('director=1&mode=3d&noslow=1&tall=1',{width:960,height:700,scale:1}));
  assert.equal(await page.evaluate(()=>window.__lab.director.renderer.debug.visible),true);
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(600);
  assert.equal(await page.evaluate(()=>window.__lab.director.renderer.debug.visible),false,'off-screen stage stops drawing');
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(600);
  assert.equal(await page.evaluate(()=>window.__lab.director.renderer.debug.visible),true);
  assert.deepEqual(errors,[]);await page.close();results.push('polish: long caption, resize, slow device, off-screen pause');
 }

 // 6. 연습실: 질문 → 듣기·생각하기 → 말하기 → 대기, 자막과 대화 기록이 같은 문장, 말하는 중 대상 바꾸기·단계 이동·화면 떠나기
 if(run('room')){
  const ctx=await browser.newContext({viewport:{width:1366,height:768},locale:'ko-KR'});
  await ctx.addInitScript(()=>{if(!sessionStorage.getItem('stage-set')){localStorage.setItem('dasi.stage','on');sessionStorage.setItem('stage-set','1');}});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.locator('[data-action="quick"]').first().click();await page.locator('#start-form button[type="submit"]').click();await page.locator('#application-continue').click();
  const host=page.locator('#stage-slot .stage-host');await host.waitFor({timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#stage-slot .stage-host canvas'),null,{timeout:60000});
  assert.equal(await host.getAttribute('data-stage-mode'),'3d');
  const watch=()=>page.evaluate(()=>new Promise(res=>{const seen=[];const h=document.querySelector('.stage-host');const mo=new MutationObserver(()=>{const v=h.dataset.stageState;if(seen.at(-1)!==v)seen.push(v);if(v==='idle'&&seen.includes('speaking')){mo.disconnect();res(seen);}});mo.observe(h,{attributes:true});setTimeout(()=>{mo.disconnect();res(seen);},30000);})).catch(()=>[]);
  let states=watch();
  await page.locator('.choice-card').first().click();await page.locator('#modal [data-action="choose-example"]').click();await page.locator('#compose button[type="submit"]').click();
  states=await states;
  assert.ok(states.includes('listening')||states.includes('thinking'),'listens or thinks first '+states);
  assert.ok(states.indexOf('speaking')>=0&&states.at(-1)==='idle','then speaks and settles '+states);
  const lastBubble=await page.locator('.message:not(.teacher) .bubble').last().innerText();
  assert.equal(await page.locator('.stage-caption-text').innerText(),lastBubble,'caption and transcript show the same line');
  // 말하는 중 대상 바꾸기: 목소리를 끄고 새 출연진은 이전 자막을 이어받지 않음
  await page.locator('[data-action="tts-toggle"]').click();assert.equal(await page.locator('[data-action="tts-toggle"]').getAttribute('aria-pressed'),'true');
  await page.locator('.choice-card').first().click();await page.locator('#modal [data-action="choose-example"]').click();await page.locator('#compose button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelector('.stage-host').dataset.stageState==='speaking',null,{timeout:30000});
  await page.locator('#target-a').check();
  assert.equal(await page.evaluate(()=>speechSynthesis.speaking),false,'voice stops when switching target');
  assert.notEqual(await page.locator('.stage-caption-text').innerText(),lastBubble,'new cast does not inherit the old line');
  // 다른 화면으로 가면 무대를 떼어 내고(그리기 멈춤) 목소리도 멈춤
  await page.locator('nav [data-action="history"]').click();
  assert.equal(await page.evaluate(()=>speechSynthesis.speaking),false);
  assert.equal(await page.locator('.stage-host').count(),0,'stage is detached off the room');
  await page.waitForTimeout(300);
  // 설정에서 3D를 끄면 연습실은 그림 무대
  await page.locator('nav [data-action="room"]').click();await host.waitFor();
  await page.locator('.topbar [data-action="settings"]').click();await page.locator('input[name="stage-pref"][value="off"]').check();await page.locator('[data-action="close"]').first().click();
  await page.waitForFunction(()=>document.querySelector('.stage-host')?.dataset.stageMode==='2d',null,{timeout:5000});
  assert.equal(await page.locator('.flat-seat').count(),1);
  await page.screenshot({path:'.test-artifacts/room-2d.png'});
  assert.deepEqual(errors,[]);await ctx.close();results.push('room: listen→speak→idle, caption = transcript, target switch, leave, 3D off');
 }
 await writeFile('.test-artifacts/stage-browser.json',JSON.stringify({passed:true,results},null,2));
 console.log(JSON.stringify({passed:true,results}));
}finally{await browser.close();}
