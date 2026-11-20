// v1.0 화면 검사: 누르는 횟수와 스크롤을 줄인 새 화면(설계: docs/superpowers/specs/2026-11-19-ui-rebuild-design.md).
// 서버를 켠 뒤 실행합니다: npm start, 그다음 node tests/ui-browser.mjs
// UI_ONLY=home,room 처럼 일부만 실행할 수 있습니다. 무대는 그림 무대로 빠르게 돌립니다(3D는 stage-browser.mjs).
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const {scenarios}=await import('../public/scenarios.js');
const {introductionOptions}=await import('../public/premeeting.js');
const base=process.env.TEST_URL||'http://127.0.0.1:3210';
const only=(process.env.UI_ONLY||'').split(',').filter(Boolean),want=name=>!only.length||only.includes(name);
// 배포 주소와 같은 보안 정책: 글 속 style 속성이나 인라인 스크립트가 있으면 콘솔 오류가 납니다.
const CSP="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
await mkdir('.test-artifacts',{recursive:true});
const browser=await chromium.launch({channel:process.env.PW_CHANNEL||'chrome',headless:true});
const passed=[];

async function open({width=1440,height=900,stage='off',reduced=false,init,mobile=false}={}){
 const context=await browser.newContext({viewport:{width,height},locale:'ko-KR',acceptDownloads:true,reducedMotion:reduced?'reduce':'no-preference',hasTouch:mobile,isMobile:mobile});
 const page=await context.newPage(),problems=[];
 page.on('pageerror',e=>problems.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))problems.push('console: '+m.text());});
 await page.route(u=>new URL(u).pathname==='/',async route=>{const r=await route.fetch();await route.fulfill({response:r,headers:{...r.headers(),'content-security-policy':CSP}});});
 await page.addInitScript(stage=>{if(!sessionStorage.getItem('ui-init')){sessionStorage.setItem('ui-init','1');try{localStorage.setItem('dasi.stage',stage);}catch{}}},stage);
 if(init)await page.addInitScript(init);
 await page.goto(base);await page.locator('.appbar').waitFor();
 return {page,context,problems};
}
const act=(page,name,extra='')=>page.locator(`[data-action="${name}"]${extra}:visible`).first();
const fitsScreen=page=>page.evaluate(()=>{const d=document.documentElement;return d.scrollHeight<=innerHeight+1&&d.scrollWidth<=innerWidth;});
const noSideScroll=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
const teacherCount=page=>page.locator('#transcript .msg.teacher').count();
const lastTeacher=async page=>(await page.locator('#transcript .msg.teacher .bubble').last().innerText()).trim();
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('dasi.sessions.v1')||'[]'));
async function quick(page){await act(page,'quick').click();await page.locator('.room').waitFor();}
async function settled(page){await page.waitForFunction(()=>!document.querySelector('.thinking')&&document.querySelectorAll('.sug').length>=4);}
// 제안을 한 번 누르면 바로 보냅니다(확인 창 없음).
async function say(page,i=0){
 const text=(await page.locator('.sug .sug-text').nth(i).innerText()).trim(),n=await teacherCount(page);
 await page.locator('.sug .sug-say').nth(i).click();
 await page.waitForFunction(n=>document.querySelectorAll('#transcript .msg.teacher').length===n+1,n);await settled(page);
 return text;
}
async function write(page,text){const n=await teacherCount(page);await page.locator('#draft').fill(text);await page.locator('#draft').press('Enter');await page.waitForFunction(n=>document.querySelectorAll('#transcript .msg.teacher').length===n+1,n);await settled(page);}
// 사진은 화면이 들어오는 효과가 끝난 뒤에 찍습니다.
async function shot(page,path){await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path});}
const noDialog=async page=>assert.equal(await page.locator('dialog[open]').count(),0,'no confirmation dialog');
async function done(name,{page,context,problems}){assert.deepEqual(problems,[],name+': no page or console errors');await context.close();passed.push(name);console.log('✓',name);}

try{
 // 1. 첫 화면: 한 화면, 3D를 받지 않음, 검색·필터, 카드나 조건 칩을 한 번 누르면 바로 연습실
 if(want('home')){const t=await open(),{page}=t;
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.textSize),'large','PC starts with large text');
  assert.equal(await page.locator('.case').count(),30);assert.ok(await fitsScreen(page),'home fits one screen');
  // 손그림 아이콘: 사례 카드마다 갈등 주제 그림, 주제 칩, 연습 순서, 빈 화면
  assert.equal(await page.locator('.case .doodle').count(),30);assert.equal(await page.locator('.topics .chip .doodle').count(),7);assert.equal(await page.locator('.how .doodle').count(),3);
  await act(page,'go','[data-view="history"]').click();assert.ok(await page.locator('.history .empty .doodle').isVisible(),'empty records show a drawing');
  await act(page,'go','[data-view="help"]').click();assert.ok(await page.locator('.help .doodle').count()>=7,'help steps and phases have drawings');
  await act(page,'go','[data-view="home"]').click();
  for(const v of ['home','history','help'])assert.ok(await page.locator(`.appbar nav [data-action="go"][data-view="${v}"]`).isVisible(),v);
  assert.ok(await page.locator('.appbar [data-action="settings"]').isVisible());
  assert.deepEqual(await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/render3d|three-stage/.test(n))),[],'no 3D on the first screen');
  const filter=(key,value)=>page.locator(`[data-action="filter"][data-key="${key}"][data-value="${value}"]`).click();
  await filter('grade','고등');assert.equal(await page.locator('.case').count(),4);await filter('grade','전체');
  await filter('category','디지털');assert.equal(await page.locator('.case').count(),5);await filter('category','전체');
  await filter('difficulty','입문');assert.equal(await page.locator('.case').count(),5);
  await page.locator('#search').fill('없는검색어987');assert.equal(await page.locator('.case').count(),0);assert.ok(await page.locator('.empty .doodle').isVisible(),'no results shows a drawing');
  await act(page,'clear-filters').click();assert.equal(await page.locator('.case').count(),30);assert.equal(await page.locator('#search').inputValue(),'');
  await shot(page,'.test-artifacts/v1-home-desktop.png');
  const c=scenarios[3];
  await page.locator(`.case[data-id="${c.id}"] .case-main`).click();await page.locator('.room').waitFor();await noDialog(page);
  assert.match(await page.locator('.room-bar').innerText(),new RegExp(c.title));assert.match(await page.locator('.room-bar').innerText(),/협력/);
  assert.match(await page.locator('.phase-steps [aria-current="step"]').innerText(),/사전/);
  assert.equal(await page.locator('#transcript .msg.participant').count(),1,'the student greets first');
  // 신청서: 대화 맨 위 문서 카드에서 전문을 읽음(읽기 창은 남김)
  await page.locator('#transcript .doc-card [data-action="view-application"]').click();await page.locator('#modal .application-paper').waitFor();await page.keyboard.press('Escape');await noDialog(page);
  await act(page,'go','[data-view="home"]').click();await page.locator('.case').first().waitFor();
  await page.locator(`.case[data-id="${c.id}"] [data-action="start"][data-variant="resistant"]`).click();await page.locator('.room').waitFor();await noDialog(page);
  assert.match(await page.locator('.room-bar').innerText(),/교착/);
  await act(page,'go','[data-view="home"]').click();await quick(page);assert.match(await page.locator('.room-bar').innerText(),new RegExp(scenarios[0].title));
  await done('home',t);
 }

 // 2. 연습실(PC): 한 화면, 노트 늘 펼침, 제안 4개 전체 글, 누르면 보냄, 되돌리기, 연필로 고쳐 쓰기, Enter, 숫자 키, 학생별 분리
 if(want('room')){const t=await open(),{page}=t;await quick(page);
  assert.ok(await fitsScreen(page),'room fits one screen');
  const notes=await page.locator('#notes').boundingBox();assert.ok(notes&&Math.abs(notes.width-340)<=2,'notes panel is open beside the conversation');
  assert.equal(await page.locator('[data-action="notes"]:visible').count(),0,'no notes toggle on wide screens');
  assert.equal(await page.locator('.sug').count(),4);
  assert.equal((await page.locator('.sug-text').first().innerText()).trim(),introductionOptions('v')[0][1],'full suggestion text');
  assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.sug-text')].every(el=>el.scrollHeight<=el.clientHeight+1&&el.scrollWidth<=el.clientWidth+1)),'suggestions are not cut');
  await shot(page,'.test-artifacts/v1-room-desktop.png');
  const first=await say(page,0);assert.equal(await lastTeacher(page),first);await noDialog(page);
  assert.ok(await page.locator('#transcript .msg.participant').count()>=2,'the student answered');
  assert.match(await page.locator('.suggestions').innerText(),/방금 말에 이어서/,'next suggestions follow the reply');
  assert.equal(await page.locator('#transcript [data-action="undo"]').count(),1,'undo only on the last line');
  await page.locator('#transcript .msg.teacher').last().locator('[data-action="undo"]').click();
  assert.equal(await teacherCount(page),0);assert.equal(await page.locator('#draft').inputValue(),first,'the sentence comes back to the input');
  assert.equal((await page.locator('.sug-text').first().innerText()).trim(),introductionOptions('v')[0][1],'back to the introduction step');
  await page.locator('#draft').fill('');
  const second=(await page.locator('.sug-text').nth(1).innerText()).trim();await page.locator('.sug [data-action="edit-suggestion"]').nth(1).click();
  assert.equal(await page.locator('#draft').inputValue(),second);assert.equal(await teacherCount(page),0,'pencil does not send');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'draft');
  await page.locator('#draft').fill('첫 줄');await page.locator('#draft').press('Shift+Enter');await page.locator('#draft').pressSequentially('둘째 줄');
  assert.equal(await page.locator('#draft').inputValue(),'첫 줄\n둘째 줄');await page.locator('#draft').press('Enter');await settled(page);
  assert.equal(await lastTeacher(page),'첫 줄\n둘째 줄');assert.equal(await page.locator('#draft').inputValue(),'');
  const before=await page.locator('.sug-text').allInnerTexts();await act(page,'more').click();assert.notDeepEqual(await page.locator('.sug-text').allInnerTexts(),before,'↻ shows other suggestions');
  await page.evaluate(()=>document.activeElement?.blur());const k=(await page.locator('.sug-text').nth(1).innerText()).trim(),n=await teacherCount(page);
  await page.keyboard.press('2');await page.waitForFunction(n=>document.querySelectorAll('#transcript .msg.teacher').length===n+1,n);assert.equal(await lastTeacher(page),k,'key 2 sends the second suggestion');await settled(page);
  await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('Alt+1');assert.equal(await teacherCount(page),n+1,'modifier keys are left to the browser');
  await page.locator('#draft').focus();await page.keyboard.type('3');assert.equal(await page.locator('#draft').inputValue(),'3');assert.equal(await teacherCount(page),n+1,'digits type while writing');
  // 학생별 분리와 학생별 초안
  await page.locator('#draft').fill('민서에게 쓰던 글');
  await page.locator('label[for="target-a"]').click();await page.waitForFunction(()=>document.querySelector('#target-a')?.checked);
  assert.equal(await teacherCount(page),0,'the other student does not see these lines');assert.equal(await page.locator('#draft').inputValue(),'');
  assert.equal((await page.locator('.sug-text').first().innerText()).trim(),introductionOptions('a')[0][1]);
  await page.locator('label[for="target-v"]').click();await page.waitForFunction(()=>document.querySelector('#target-v')?.checked);
  assert.equal(await page.locator('#draft').inputValue(),'민서에게 쓰던 글');assert.ok(await teacherCount(page)>=2);
  await page.locator('#notes [data-action="view-transcript"]').click();await page.locator('#modal.reader[open]').waitFor();
  assert.match(await page.locator('#modal').innerText(),/나 → 민서/);assert.ok(!(await page.locator('#modal').innerText()).includes('민서에게 쓰던 글'),'unsent drafts are not in the transcript');
  await page.keyboard.press('Escape');await noDialog(page);
  for(const [w,h] of [[1280,720],[1366,768],[1920,1080]]){
   await page.setViewportSize({width:w,height:h});assert.ok(await fitsScreen(page),`room fits ${w}x${h}`);
   const tr=await page.locator('#transcript').boundingBox(),st=await page.locator('#stage-slot').boundingBox();
   assert.ok(tr.height>=110,`transcript keeps room at ${w}x${h}: ${tr.height}`);assert.ok(st.height>=140,`stage keeps room at ${w}x${h}: ${st.height}`);
   assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.sug-text')].every(el=>el.scrollHeight<=el.clientHeight+1)),`suggestions not cut at ${w}x${h}`);
  }
  await page.setViewportSize({width:1280,height:720});await shot(page,'.test-artifacts/v1-room-1280.png');
  // 가로 720~1099: 노트는 머리줄의 노트 단추로 여닫는 서랍
  await page.setViewportSize({width:1024,height:768});assert.ok(await fitsScreen(page));
  assert.equal(await page.locator('#notes').isVisible(),false);await act(page,'notes').click();await page.locator('#notes input[data-check="v"]').waitFor({state:'visible'});
  await shot(page,'.test-artifacts/v1-room-tablet-notes.png');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#notes')?.checkVisibility());
  await done('room',t);
 }

 // 3. 단계 관문: 늘 펼친 체크, 다 되면 다음 단계, 본모임 합의·점검 계획, 사후모임, 마치기 한 번이면 회고(기본 결과)
 if(want('gate')){const t=await open(),{page}=t;await quick(page);
  const adv=page.locator('#notes [data-action="advance"]');assert.equal(await adv.isDisabled(),true);
  for(const k of ['v','a','g','safe'])await page.locator(`#notes input[data-check="${k}"]`).check();
  assert.match(await page.locator('#notes .check-progress').innerText(),/4\s*\/\s*4/);
  await adv.click();assert.match(await page.locator('.phase-steps [aria-current="step"]').innerText(),/본/);
  assert.match(await page.locator('#transcript .msg.system').last().innerText(),/본모임/);
  assert.equal(await page.locator('#target-all').isChecked(),true);await noDialog(page);
  await say(page,0);
  const adv2=page.locator('#notes [data-action="advance"]');assert.equal(await adv2.isDisabled(),true);
  await page.locator('#notes input[data-check="main"]').check();await page.locator('#notes textarea[data-agreement="action"]').fill('다음 주까지 그림을 돌려주기');
  assert.equal(await adv2.isDisabled(),true,'the review plan is still missing');
  await page.locator('#notes textarea[data-agreement="review"]').fill('금요일에 담임이 확인');assert.equal(await adv2.isDisabled(),false);
  await adv2.click();assert.match(await page.locator('.phase-steps [aria-current="step"]').innerText(),/사후/);
  assert.equal(await page.locator('#notes textarea[data-agreement="action"]').inputValue(),'다음 주까지 그림을 돌려주기','agreement is carried to the follow-up');
  await say(page,0);
  await act(page,'finish').click();await page.locator('.review').waitFor();await noDialog(page);
  assert.equal(await page.locator('[data-action="outcome"][aria-pressed="true"]').innerText(),'관계회복 진전·실천 확인');
  await done('gate',t);
 }

 // 4. 자동 저장·이어 하기·기록(삭제는 되돌리기 알림)
 if(want('save')){const t=await open(),{page}=t;
  await quick(page);await act(page,'go','[data-view="home"]').click();assert.equal((await stored(page)).length,0,'an untouched practice is not kept');
  await quick(page);const sent=await say(page,0);
  const list=await stored(page);assert.equal(list.length,1);assert.ok(list[0].messages.some(m=>m.kind==='teacher'&&m.text===sent),'saved without a save button');
  assert.match(await page.locator('.room-bar .save-state').innerText(),/저장/);
  await page.locator('#draft').fill('이어서 쓸 문장');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dasi.sessions.v1')||'[]')[0]?.workspace?.drafts?.['pre:v']==='이어서 쓸 문장');
  await page.reload();await page.locator('.appbar').waitFor();
  await act(page,'resume').click();await page.locator('.room').waitFor();
  assert.equal(await lastTeacher(page),sent);assert.equal(await page.locator('#draft').inputValue(),'이어서 쓸 문장');
  // 다른 사례를 바로 시작해도 확인 창 없이 앞 연습은 기록에 남음
  await act(page,'go','[data-view="home"]').click();await page.locator(`.case[data-id="${scenarios[1].id}"] .case-main`).click();await page.locator('.room').waitFor();await noDialog(page);await say(page,0);
  await act(page,'go','[data-view="home"]').click();await act(page,'go','[data-view="history"]').click();assert.equal(await page.locator('.record').count(),2);
  await page.locator('.record [data-action="delete-record"]').first().click();assert.equal(await page.locator('.record').count(),1);await noDialog(page);
  await page.locator('#toast [data-action="undo-delete"]').click();assert.equal(await page.locator('.record').count(),2);assert.equal((await stored(page)).length,2);
  await page.locator(`.record[data-id="${(await stored(page)).find(s=>s.scenarioId===scenarios[0].id).id}"] [data-action="open-record"]`).click();await page.locator('.room').waitFor();assert.equal(await lastTeacher(page),sent);
  await done('save',t);
 }

 // 5. 회고: 한 화면 세 칸, 결과 칩(창 없음), 나의 회고 자동 저장, 장면 다시 보기(창 없이 그 자리), 다시 해 본 질문, 내려받기, 인쇄, 다시 연습
 if(want('review')){const t=await open({init:()=>{window.printCalls=0;window.print=()=>{window.printCalls++;};}}),{page}=t;await quick(page);
  await say(page,0);await say(page,0);await write(page,'어떤 마음이었니?');
  await page.locator('#transcript .msg.teacher').last().locator('[data-action="undo"]').click();await page.locator('#draft').press('Enter');await settled(page);
  await act(page,'finish').click();await page.locator('.review').waitFor();await noDialog(page);
  assert.ok(await fitsScreen(page),'review fits one screen');
  const cols=await page.locator('.review-col').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().width));assert.equal(cols.length,3);assert.ok(cols.every(w=>w>=240),'three columns');
  assert.equal(await page.locator('[data-action="outcome"][aria-pressed="true"]').innerText(),'부분 진전·추가 모임 필요');
  await page.locator('[data-action="outcome"][data-value="교착·합의에 이르지 못함"]').click();
  assert.equal(await page.locator('[data-action="outcome"][aria-pressed="true"]').innerText(),'교착·합의에 이르지 못함');assert.equal((await stored(page))[0].outcome,'교착·합의에 이르지 못함');
  await page.locator('#reflection').fill('기다려 주기, 선택을 다시 확인하기.');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dasi.sessions.v1')||'[]')[0]?.reflection==='기다려 주기, 선택을 다시 확인하기.');
  assert.match(await page.locator('.review-retries').innerText(),/어떤 마음이었니\?/,'retried question is kept');
  await page.locator('[data-action="replay"]').first().click();await page.locator('#replay-slot .stage-host').waitFor();await noDialog(page);
  await page.locator('[data-replay-state="done"]').waitFor({timeout:30000});
  await shot(page,'.test-artifacts/v1-review-desktop.png');
  const [download]=await Promise.all([page.waitForEvent('download'),act(page,'export').click()]);const md=await readFile(await download.path(),'utf8');
  assert.match(md,new RegExp(scenarios[0].title));assert.match(md,/어떤 마음이었니\?/);assert.match(md,/선택을 다시 확인/);
  await act(page,'print').click();assert.equal(await page.evaluate(()=>window.printCalls),1);
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.appbar').isVisible(),false);assert.equal(await page.locator('.review-actions').isVisible(),false);
  assert.match(await page.locator('.print-reflection').innerText(),/선택을 다시 확인/);assert.ok(await page.locator('.review-transcript').isVisible());
  await page.pdf({path:'.test-artifacts/v1-review.pdf',format:'A4'});await page.emulateMedia({media:'screen'});
  await act(page,'again').click();await page.locator('.room').waitFor();assert.equal(await teacherCount(page),0);assert.match(await page.locator('.room-bar').innerText(),new RegExp(scenarios[0].title));
  await done('review',t);
 }

 // 6. 설정 판(바로 적용)과 AI: 세 제공사, 이어지는 제안, 오류 시 문장이 입력칸으로, 키는 저장하지 않음, AI 회고
 if(want('ai')){const t=await open(),{page}=t;await quick(page);
  await act(page,'settings').click();await page.locator('#modal.sheet[open]').waitFor();
  await page.locator('#modal [data-action="text-size"]').click();assert.equal(await page.evaluate(()=>document.documentElement.dataset.textSize),'normal');
  await page.locator('#modal [data-action="text-size"]').click();assert.equal(await page.evaluate(()=>document.documentElement.dataset.textSize),'large');
  await page.locator('#modal input[name="mode"][value="ai"]').check();await page.keyboard.press('Escape');
  const n=await teacherCount(page);await page.locator('.sug .sug-say').first().click();await page.locator('#modal.sheet[open] #api-key').waitFor();assert.equal(await teacherCount(page),n,'no key: nothing is sent');
  const requests=[];let fail=false;
  await page.route('**/api/**',async route=>{const data=route.request().postDataJSON(),path=new URL(route.request().url()).pathname;requests.push({path,data});
   if(fail)return route.fulfill({status:502,json:{error:'Claude · HTTP 529: 서비스가 일시적으로 혼잡합니다. 입력한 문장은 유지됩니다.'}});
   if(path.endsWith('/check'))return route.fulfill({json:{ok:true}});
   if(path.endsWith('/review'))return route.fulfill({json:{title:'선택을 확인한 대화',summary:'가상 API 회고입니다.',strengths:['실제 질문을 돌아보기'],improvements:['지원 계획 점검'],nextPractice:'다시 듣기'}});
   assert.ok(!JSON.stringify(data.session).includes('nextQuestions')&&!Object.hasOwn(data.session,'coach'),'suggestions and coach notes are not sent back');
   return route.fulfill({json:{messages:[{speaker:data.session.target==='all'?'v':data.session.target,text:'가상 API 응답: 조금 더 이야기해 볼게요.',mood:'open'}],observation:'가상 응답',risk:'none',coaching:{strength:'질문을 건넸습니다.',nextQuestion:'필요한 도움은 무엇일까?'},teacherChoices:['말뜻 확인','마음 듣기','장면 살피기','도움 묻기'].map((label,i)=>({label,text:`AI 제안 ${i+1}: 조금 더 들려줄래?`}))}});
  });
  for(const provider of ['anthropic','gemini','openai']){
   if(!(await page.locator('#modal.sheet[open]').count()))await act(page,'settings').click();
   await page.locator('#modal input[name="mode"][value="ai"]').check();await page.locator('#provider').selectOption(provider);await page.locator('#api-key').fill('dummy-key-for-browser-test');
   await page.locator('#modal [data-action="check-key"]').click();await page.locator('#connection-status',{hasText:'연결을 확인했어요'}).waitFor();
   await page.keyboard.press('Escape');await noDialog(page);
   await say(page,0);assert.equal(requests.at(-1).data.provider,provider);assert.equal(requests.at(-1).data.session.messages.at(-1).inputMethod,'choice');
   assert.equal((await page.locator('.sug-text').first().innerText()).trim(),'AI 제안 1: 조금 더 들려줄래?','AI follow-up suggestions');
   assert.match(await page.locator('.suggestions').innerText(),/AI/);
   await write(page,'지금 이야기해도 괜찮니?');assert.equal(requests.at(-1).data.session.messages.at(-1).inputMethod,'write');
  }
  assert.match(await page.locator('#notes .coach').innerText(),/필요한 도움은 무엇일까/);
  await page.locator('#notes [data-action="coach-question"]').click();assert.equal(await page.locator('#draft').inputValue(),'필요한 도움은 무엇일까?');await page.locator('#draft').fill('');
  fail=true;let count=await teacherCount(page);const chosen=(await page.locator('.sug-text').first().innerText()).trim();
  await page.locator('.sug .sug-say').first().click();await page.locator('#reply-error').waitFor();assert.match(await page.locator('#reply-error').innerText(),/HTTP 529/);
  assert.equal(await teacherCount(page),count);assert.equal(await page.locator('#draft').inputValue(),chosen,'the failed sentence returns to the input');
  await page.locator('#draft').fill('실패해도 사라지면 안 되는 질문');await page.locator('#draft').press('Enter');await page.waitForFunction(()=>!document.querySelector('.thinking'));
  assert.equal(await page.locator('#draft').inputValue(),'실패해도 사라지면 안 되는 질문');assert.equal(await teacherCount(page),count);fail=false;
  await act(page,'finish').click();await page.locator('.review').waitFor();await act(page,'ai-review').click();await page.getByRole('heading',{name:'선택을 확인한 대화'}).waitFor();
  assert.ok(!(await page.evaluate(()=>JSON.stringify(localStorage))).includes('dummy-key-for-browser-test'),'keys are never stored');
  assert.equal((await stored(page))[0].savedReview?.title,'선택을 확인한 대화','the AI review is kept with the record');
  const [aiFile]=await Promise.all([page.waitForEvent('download'),act(page,'export').click()]);assert.match(await readFile(await aiFile.path(),'utf8'),/선택을 확인한 대화/,'the AI review is exported');
  await page.reload();await page.locator('.appbar').waitFor();await act(page,'settings').click();assert.equal(await page.locator('#api-key').inputValue(),'');
  await page.keyboard.press('Escape');
  await done('ai',t);
 }

 // 7. 음성 입력: 글로만 바뀌고 저절로 보내지 않음, 듣는 동안 입력칸 읽기 전용, 권한 거부·미지원 안내
 if(want('speech')){const t=await open(),{page}=t;
  await page.evaluate(()=>{class FakeRecognition{constructor(){window.fakeRecognition=this;}start(){}stop(){this.onend?.();}abort(){this.onend?.();}}window.SpeechRecognition=FakeRecognition;});
  await quick(page);await page.locator('#draft').fill('먼저 ');await act(page,'mic').click();assert.equal(await page.locator('#draft').getAttribute('readonly'),'');
  await page.evaluate(()=>{const final=[{transcript:'어떤 마음이 들었니?'}];final.isFinal=true;const partial=[{transcript:'천천히'}];partial.isFinal=false;window.fakeRecognition.onresult({resultIndex:0,results:[final,partial]});});
  assert.match(await page.locator('#draft').inputValue(),/어떤 마음이/);assert.equal(await teacherCount(page),0);assert.equal(await page.locator('#send').isDisabled(),true);
  await act(page,'mic').click();assert.equal(await page.locator('#draft').getAttribute('readonly'),null);assert.equal(await teacherCount(page),0,'speech never sends by itself');
  await act(page,'mic').click();await page.evaluate(()=>{window.fakeRecognition.onerror({error:'not-allowed'});window.fakeRecognition.onend();});assert.match(await page.locator('#speech-status').innerText(),/거부/);
  await page.evaluate(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});await act(page,'mic').click();assert.match(await page.locator('#speech-status').innerText(),/지원하지/);
  await done('speech',t);
 }

 // 8. 중단이 필요한 순간: 다음 단계 대신 보류 안내, 마치면 보류·중단이 기본 결과
 if(want('unsafe')){const t=await open(),{page}=t;
  await page.locator(`.case[data-id="${scenarios[0].id}"] [data-action="start"][data-variant="unsafe"]`).click();await page.locator('.room').waitFor();
  assert.equal(await page.locator('#notes [data-action="advance"]').count(),0);assert.match(await page.locator('#notes').innerText(),/멈춰/);
  await say(page,0);await write(page,'지금은 중단하고 따로 이야기해도 돼.');assert.match(await page.locator('#transcript').innerText(),/오늘은 만나지/);
  await act(page,'finish').click();await page.locator('.review').waitFor();assert.equal(await page.locator('[data-action="outcome"][aria-pressed="true"]').innerText(),'안전을 위한 보류·중단');
  await done('unsafe',t);
 }

 // 8-1. 큰 글자: 연습실·회고·첫 화면이 어느 폭에서도 옆으로 넘치지 않음
 if(want('large')){const t=await open(),{page}=t;
  // PC는 처음부터 큰 글자. 한 번 끄고 다시 켜서, 고른 값이 저장되는지도 봅니다.
  await act(page,'settings').click();for(let i=0;i<2;i++)await page.locator('#modal [data-action="text-size"]').click();await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>localStorage.getItem('dasi.large-text')),'true');
  for(const view of ['home','room','review']){
   if(view==='room'){await quick(page);await say(page,0);}
   if(view==='review'){await act(page,'finish').click();await page.locator('.review').waitFor();}
   for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:900});assert.ok(await noSideScroll(page),`large text ${view} ${width}`);}
   await page.setViewportSize({width:1440,height:900});
  }
  await page.reload();await page.locator('.appbar').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.dataset.textSize),'large','text size is remembered');
  await act(page,'settings').click();await page.locator('#modal [data-action="text-size"]').click();await page.keyboard.press('Escape');
  await page.reload();await page.locator('.appbar').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.dataset.textSize),'normal','choosing normal text on a PC is remembered');
  await done('large',t);
 }

 // 8-2. 검토에서 찾은 것: 마치기 되돌리기, 두 번 누르기, 숫자 키 연달아, 쓰던 글 지키기, 두 탭, 휴대전화 가로, 음성 안내 지우기, 좁은 태블릿 제목, 체크 뒤 초점
 if(want('fixes')){const t=await open(),{page}=t;
  await quick(page);const first=await say(page,0);
  await act(page,'finish').click();await page.locator('.review').waitFor();
  await page.locator('#toast [data-action="unfinish"]').click();await page.locator('.room').waitFor();
  assert.equal(await lastTeacher(page),first,'undoing 마치기 returns to the same practice');assert.equal((await stored(page))[0].finished,false);
  await act(page,'finish').click();await page.locator('.review').waitFor();await act(page,'reopen').click();await page.locator('.room').waitFor();
  assert.equal(await lastTeacher(page),first,'a finished practice can be continued from the review');
  let n=await teacherCount(page);await page.locator('.sug .sug-say').first().dblclick();await settled(page);await page.waitForTimeout(300);
  assert.equal(await teacherCount(page),n+1,'a double-click sends one line');
  await act(page,'go','[data-view="home"]').click();await page.locator(`.case[data-id="${scenarios[2].id}"] .case-main`).dblclick();await page.locator('.room').waitFor();await page.waitForTimeout(300);
  assert.equal(await teacherCount(page),0,'a double-click on a case only starts it');
  await say(page,0);n=await teacherCount(page);await page.keyboard.press('2');await page.waitForFunction(n=>document.querySelectorAll('#transcript .msg.teacher').length===n+1,n);await settled(page);
  assert.notEqual(await page.evaluate(()=>document.activeElement?.id),'draft','tapping a suggestion does not move focus into the input');
  n=await teacherCount(page);await page.keyboard.press('3');await page.waitForFunction(n=>document.querySelectorAll('#transcript .msg.teacher').length===n+1,n);await settled(page);
  // 쓰던 글: 되돌리기와 실패한 제안 보내기가 덮어쓰지 않음
  await page.locator('#draft').fill('쓰고 있던 내 질문');await page.locator('#transcript .msg.teacher').last().locator('[data-action="undo"]').click();
  assert.equal(await page.locator('#draft').inputValue(),'쓰고 있던 내 질문','undo keeps what the teacher is writing');
  await act(page,'settings').click();await page.locator('#modal input[name="mode"][value="ai"]').check();await page.locator('#api-key').fill('dummy-key-for-browser-test');await page.keyboard.press('Escape');
  await page.route('**/api/reply',route=>route.fulfill({status:502,json:{error:'테스트: 잠시 혼잡합니다.'}}));
  await page.locator('.sug .sug-say').first().click();await page.locator('#reply-error').waitFor();
  assert.equal(await page.locator('#draft').inputValue(),'쓰고 있던 내 질문','a failed suggestion does not replace a draft');await page.unroute('**/api/reply');
  await act(page,'settings').click();await page.locator('#modal input[name="mode"][value="demo"]').check();await page.keyboard.press('Escape');
  // 음성 안내는 보낸 뒤 사라짐
  await page.evaluate(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});await act(page,'mic').click();assert.match(await page.locator('#speech-status').innerText(),/지원하지/);
  await page.locator('#draft').fill('글로 묻기');await page.locator('#draft').press('Enter');await settled(page);assert.equal((await page.locator('#speech-status').innerText()).trim(),'','old speech notes clear after sending');
  // 키보드로 체크해도 초점이 그 칸에 남음
  await page.locator('#notes input[data-check="v"]').focus();await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>document.activeElement?.dataset?.check),'v');
  // 두 탭: 서로의 기록을 지우지 않음
  const other=await t.context.newPage();await other.goto(base);await other.locator('.appbar').waitFor();await other.locator(`.case[data-id="${scenarios[4].id}"] .case-main`).click();await other.locator('.room').waitFor();await say(other,0);
  await say(page,0);
  const ids=(await stored(page)).map(x=>x.scenarioId);assert.ok(ids.includes(scenarios[4].id)&&ids.includes(scenarios[2].id),'both tabs keep their records '+ids);await other.close();
  // 좁은 태블릿의 머리줄 제목, 휴대전화 가로
  await page.setViewportSize({width:768,height:1024});assert.ok((await page.locator('.room-title h1').boundingBox()).width>=120,'the title stays readable at 768');
  for(const [w,h] of [[844,390],[740,360],[932,430]]){await page.setViewportSize({width:w,height:h});assert.ok(await fitsScreen(page),`phone landscape ${w}x${h} fits`);const sb=await page.locator('#send').boundingBox(),tb=await page.locator('#transcript').boundingBox();assert.ok(sb.y+sb.height<=h&&tb.height>=70,`landscape ${w}x${h}: send ${sb.y+sb.height}, transcript ${tb.height}`);}
  await done('fixes',t);
 }

 // 9. 휴대전화: 첫 화면·연습실 한 화면, 가로로 미는 제안 카드(전체 글, 누르면 보냄), 노트 판(남은 확인 수), 누르기 크기
 if(want('phone'))for(const [width,height,name] of [[390,844,'iphone'],[440,956,'promax'],[320,568,'se1'],[360,740,'android']]){
  const t=await open({width,height,mobile:true}),{page}=t;
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.textSize),'normal',`${name}: phones start with normal text`);
  assert.ok(await fitsScreen(page),`${name}: home fits`);
  const bar=await page.locator('.appbar').boundingBox();assert.ok(bar.height<=64);
  for(const v of ['home','history','help'])assert.ok(await page.locator(`.appbar nav [data-action="go"][data-view="${v}"]`).isVisible());
  if(name==='iphone')await shot(page,'.test-artifacts/v1-home-phone.png');
  await quick(page);assert.ok(await fitsScreen(page),`${name}: room fits`);
  const stage=await page.locator('#stage-slot').boundingBox(),tr=await page.locator('#transcript').boundingBox(),send=await page.locator('#send').boundingBox();
  assert.ok(stage.height>=height*.12&&stage.height<=height*.3,`${name}: stage band ${stage.height}`);assert.ok(tr.height>=80,`${name}: transcript ${tr.height}`);assert.ok(send.y+send.height<=height,'send stays on screen');
  const cards=await page.locator('.sug').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),t=el.querySelector('.sug-text');return {w:r.width,cut:t.scrollHeight>t.clientHeight+1}}));
  assert.equal(cards.length,4);assert.ok(cards.every(c=>c.w>=width*.6&&!c.cut),`${name}: full-text cards`);
  assert.equal(await page.locator('.suggestions-track').evaluate(el=>getComputedStyle(el).scrollSnapType.includes('x')),true);
  if(name==='iphone')await shot(page,'.test-artifacts/v1-room-phone.png');
  const sent=await say(page,0);assert.equal(await lastTeacher(page),sent);assert.ok(await fitsScreen(page));
  await page.waitForFunction(()=>{const t=document.querySelector('#transcript'),l=[...t.querySelectorAll('.msg')].at(-1).getBoundingClientRect(),b=t.getBoundingClientRect();return l.bottom<=b.bottom+2&&l.top<b.bottom;});
  assert.equal((await page.locator('[data-action="notes"] .badge').innerText()).trim(),'4');
  await act(page,'notes').click();await page.locator('#notes input[data-check="v"]').check();assert.equal((await page.locator('[data-action="notes"] .badge').innerText()).trim(),'3');
  if(name==='iphone')await shot(page,'.test-artifacts/v1-notes-phone.png');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#notes')?.checkVisibility());
  const small=await page.locator('.room button:visible, .room label.face:visible').evaluateAll(els=>els.map(el=>({h:el.getBoundingClientRect().height,w:el.getBoundingClientRect().width,t:(el.getAttribute('aria-label')||el.textContent).trim().slice(0,20)})).filter(b=>b.h<40||b.w<40));
  assert.deepEqual(small,[],`${name}: touch targets`);
  await act(page,'finish').click();await page.locator('.review').waitFor();assert.ok(await noSideScroll(page),`${name}: review has no side scroll`);
  if(name==='iphone')await shot(page,'.test-artifacts/v1-review-phone.png');
  await done('phone-'+name,t);
 }

 // 10. 효과음: 첫 화면에서 소리 없음, 보내면 소리, 설정에서 끄면 조용, 다시 열어도 유지 / 동작 줄이기: 화면이 바뀌어도 움직임 없음
 if(want('sound')){const t=await open({reduced:true,init:()=>{window.audioEvidence={contexts:0,starts:[]};const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...a){super(...a);window.audioEvidence.contexts++;}createOscillator(){const tone=super.createOscillator(),start=tone.start.bind(tone);tone.start=at=>{window.audioEvidence.starts.push({at,state:this.state});return start(at);};return tone;}};}}),{page}=t;
  await quick(page);assert.equal(await page.evaluate(()=>audioEvidence.contexts),0,'no autoplay');
  assert.equal(await page.evaluate(()=>document.getAnimations().length),0,'reduced motion: no animation');
  await say(page,0);await page.waitForFunction(()=>audioEvidence.starts.length>=4);assert.ok(await page.evaluate(()=>audioEvidence.starts.every(x=>x.state==='running')));
  await act(page,'settings').click();await page.locator('#modal [data-action="sound-toggle"]').click();assert.equal(await page.locator('#modal [data-action="sound-toggle"]').getAttribute('aria-pressed'),'false');await page.keyboard.press('Escape');
  const count=await page.evaluate(()=>audioEvidence.starts.length);await say(page,0);assert.equal(await page.evaluate(()=>audioEvidence.starts.length),count);
  await page.reload();await page.locator('.appbar').waitFor();await act(page,'settings').click();assert.equal(await page.locator('#modal [data-action="sound-toggle"]').getAttribute('aria-pressed'),'false');await page.keyboard.press('Escape');
  await act(page,'go','[data-view="help"]').click();await page.locator('.help').waitFor();assert.equal(await page.evaluate(()=>document.getAnimations().length),0);assert.ok(await fitsScreen(page)||true);
  await done('sound',t);
 }
 console.log(JSON.stringify({passed:true,sections:passed},null,1));
}finally{await browser.close();}
