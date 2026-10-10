import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {reviewApplication,chooseQuestion,setRoomPane} from './helpers.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'ko-KR'});
const page=await context.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});page.on('dialog',d=>d.accept());
const base=process.env.TEST_URL||'http://127.0.0.1:3210';
const action=name=>page.locator(`[data-action="${name}"]`).first();
const settle=()=>page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
const screenshot=async(name,selector)=>{if(selector)await page.locator(selector).evaluate(el=>el.scrollIntoView({block:'start'}));await settle();await page.screenshot({path:`.test-artifacts/${name}.png`,fullPage:false});};
const overflow=async label=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label);
const start=async(variant='cooperative')=>{await action('library').click();await action('quick').click();await page.locator(`input[name="variant"][value="${variant}"]`).check();await page.locator('#start-form button[type="submit"]').click();};
const sendChoice=async()=>{await chooseQuestion(page);await page.locator('#compose button[type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('.thinking'));};
try{
 await mkdir('.test-artifacts',{recursive:true});await page.goto(base);await start();
 assert.equal(await page.locator('#application-document input,#application-document select,#application-review,#application-form').count(),0);
 assert.equal(await page.locator('#application-continue').isEnabled(),true);assert.equal(await page.locator('#conversation').count(),0);
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});await overflow(`Reading ${width}`);await action('text-size').click();await overflow(`Large reading ${width}`);await action('text-size').click();
 }
 await screenshot('application-simple-desktop','.application-reading-next');await reviewApplication(page);
 assert.match(await page.locator('.pre-meeting-guide .current').innerText(),/대화모임 안내/);assert.match(await page.locator('.question-choices legend').innerText(),/먼저 대화모임/);
 assert.match(await page.locator('.message .bubble').first().innerText(),/어떻게 하는/);assert.equal(await page.locator('[data-check]:checked').count(),0);
 await screenshot('pre-introduction-desktop','.pre-meeting-guide');
 await sendChoice();assert.match(await page.locator('.pre-meeting-guide .current').innerText(),/무슨 일이/);assert.match(await page.locator('.choice-text').first().innerText(),/무슨 일이 있었는지/);
 assert.equal(await page.locator('input[name="question-choice"]:checked').count(),0);await sendChoice();assert.match(await page.locator('.message .bubble').last().innerText(),/제가 그린/);
 await page.locator('#target').selectOption('a');assert.match(await page.locator('.pre-meeting-guide .current').innerText(),/대화모임 안내/);
 assert.ok(!(await page.locator('#transcript').innerText()).includes('제가 그린'));await page.locator('#input-write').click();await page.locator('#draft').fill('오늘은 네가 겪은 일을 듣는 대화모임이야. 말하기 어렵다면 멈춰도 돼. 궁금한 게 있니?');await page.locator('#compose button[type="submit"]').click();
 assert.match(await page.locator('.pre-meeting-guide .current').innerText(),/무슨 일이/);await page.locator('#input-choices').click();await page.locator('#target').selectOption('v');assert.match(await page.locator('.pre-meeting-guide .current').innerText(),/무슨 일이/);
 await action('save').click();await page.reload();await action('history').click();await action('resume').click();assert.match(await page.locator('.pre-meeting-guide .current').innerText(),/무슨 일이/);
 await setRoomPane(page,'notes');await action('view-application').click();assert.match(await page.locator('#modal').innerText(),/신청서 열람/);await action('close').click();await setRoomPane(page,'chat');
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:900});await overflow(`Story ${width}`);await action('text-size').click();await overflow(`Large story ${width}`);await action('text-size').click();}
 await page.setViewportSize({width:390,height:900});await screenshot('pre-story-mobile','.pre-meeting-guide');
 await start('resistant');assert.match(await page.locator('.document-list').innerText(),/동의 서명 확인 불가/);await reviewApplication(page);assert.match(await page.locator('.pre-meeting-guide .current').innerText(),/대화모임 안내/);
 await start('unsafe');await reviewApplication(page);await sendChoice();assert.match(await page.locator('#transcript').innerText(),/오늘은 만나지/);assert.equal(await action('advance').isDisabled(),true);
 await start();await reviewApplication(page);await screenshot('pre-introduction-mobile','.pre-meeting-guide');await overflow('Mobile intro');await action('text-size').click();await overflow('Mobile intro large');await action('text-size').click();
 // Failed requests must keep the introduction and selected wording.
 await page.locator('.topbar [data-action="settings"]').click();await page.locator('input[name="mode"][value="ai"]').check();await page.locator('#api-key').fill('dummy-test-introduction-key');await page.locator('#settings-form button[type="submit"]').click();
 let fail=true;await page.route('**/api/reply',route=>fail?route.fulfill({status:401,json:{error:'테스트 인증 오류'}}):route.fulfill({json:{messages:[{speaker:'v',text:'어떤 자리인지 알겠어요.'}],observation:'안내를 들음',risk:'none',coaching:{strength:'',nextQuestion:'무슨 일이 있었니?'}}}));
 await chooseQuestion(page);await page.locator('#compose button[type="submit"]').click();await page.locator('.error').waitFor();assert.match(await page.locator('.pre-meeting-guide .current').innerText(),/대화모임 안내/);assert.equal(await page.locator('.choice-card.selected').count(),1);
 fail=false;await page.locator('#compose button[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('.pre-meeting-guide .current')?.textContent.includes('무슨 일이'));
 assert.deepEqual(errors,[]);assert.equal(requests.length,2);
 await writeFile('.test-artifacts/intake-results.json',JSON.stringify({passed:true,flows:['application read-only direct entry in every condition','introduction then story','separate progress for each participant','free text introduction','save/resume','legacy review preserved in unit tests','refusal still respected','AI failure preserves introduction','320 to 1440 and large text','no page errors'],api:'two mocked requests, no real calls'},null,2));console.log(JSON.stringify({passed:true,viewports:[320,390,768,1024,1440],mockedRequests:requests.length}));
}finally{await browser.close();}
