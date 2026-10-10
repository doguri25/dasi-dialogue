import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {reviewApplication,setRoomPane,chooseQuestion} from './helpers.mjs';
import {checkQuestionControls} from './question-controls.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768},locale:'ko-KR'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.TEST_URL||'http://127.0.0.1:3211';
const action=name=>page.locator(`[data-action="${name}"]`).first();
const send=()=>page.locator('#compose button[type="submit"]').click();
const metrics=[];
async function fits(label){
 await checkQuestionControls(page);
 const info=await page.evaluate(()=>{
  const r=s=>{const e=document.querySelector(s),b=e.getBoundingClientRect();return {top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
  return {width:innerWidth,height:innerHeight,pageHeight:document.documentElement.scrollHeight,pageWidth:document.documentElement.scrollWidth,scrollY,chat:r('#transcript'),grid:r('.choice-grid'),send:r('#compose button[type="submit"]')};
 });
 assert.ok(info.pageHeight<=info.height+1&&info.pageWidth<=info.width,label+': page overflow');assert.equal(info.scrollY,0,label+': page moved');
 for(const rect of [info.chat,info.grid,info.send])assert.ok(rect.top>=0&&rect.bottom<=info.height+1&&rect.width>0,label+': off-screen control');
 assert.ok(info.chat.height>=100,label+': conversation too short');assert.ok(info.send.height>=52,label+': small send target');metrics.push({label,...info});
}
try{
 await mkdir('.test-artifacts',{recursive:true});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(base);await action('quick').click();await page.locator('#start-form button[type="submit"]').click();await reviewApplication(page);
 for(const [width,height] of [[901,640],[1024,640],[1024,768],[1280,640],[1280,720],[1366,768],[1440,900],[1920,1080]]){
  await page.setViewportSize({width,height});
  for(const large of [false,true]){
   if(await action('text-size').getAttribute('aria-pressed')!==String(large))await action('text-size').click();
   await fits(`${width}x${height} ${large?'large':'normal'}`);
   if(large&&(width===901||width===1024&&height===768))await page.screenshot({path:`.test-artifacts/desktop-buttons-${width}-large.png`});
   await chooseQuestion(page,3);await fits('selected');
   assert.ok(await page.locator('.choice-grid').evaluate(el=>{const card=el.querySelector('.selected').getBoundingClientRect(),box=el.getBoundingClientRect();return card.top>=box.top&&card.bottom<=box.bottom;}),'selected choice stays in view after rendering');
   await action('other-choices').click();await action('other-choices').click();
  }
 }
 await page.setViewportSize({width:1366,height:768});await action('text-size').click();
 await page.screenshot({path:'.test-artifacts/desktop-room-choices.png'});
 const full=await page.locator('.choice-text').first().textContent();await action('view-examples').click();assert.equal(await page.locator('#modal .full-examples section').count(),4);assert.equal(await page.locator('#modal .full-examples p').first().innerText(),full);
 await page.locator('[data-action="choose-example"]').first().click();assert.equal(await page.locator('#modal').isVisible(),false);assert.equal(await page.locator('.message.teacher').count(),0);assert.equal(await page.locator('.choice-card.selected .choice-text').innerText(),full);await fits('full example selected');
 await page.screenshot({path:'.test-artifacts/desktop-room-selected.png'});
 await send();await page.locator('.message.teacher').waitFor();await fits('after student reply');
 await action('input-mode').click();await page.locator('#input-write').click();await page.locator('#draft').fill('학생에게 확인할 작성 중인 문장');await checkQuestionControls(page);
 await setRoomPane(page,'notes');assert.equal(await page.locator('#transcript').isVisible(),true);assert.equal(await page.locator('.composer-wrap').isVisible(),false);
 await page.locator('[data-check="v"]').check();const before=await page.locator('#facilitator-notes').evaluate(el=>el.scrollTop);
 await page.locator('[data-check="a"]').check();const after=await page.locator('#facilitator-notes').evaluate(el=>el.scrollTop);assert.ok(Math.abs(after-before)<130,'checking progress should preserve notes position');
 for(const k of ['g','safe'])await page.locator(`[data-check="${k}"]`).check();
 await page.screenshot({path:'.test-artifacts/desktop-room-notes.png'});await setRoomPane(page,'chat');assert.equal(await page.locator('#draft').inputValue(),'학생에게 확인할 작성 중인 문장');
 assert.equal(await page.evaluate(()=>scrollY),0);await page.locator('#input-choices').click();await setRoomPane(page,'notes');await action('advance').click();await fits('main meeting');
 await setRoomPane(page,'notes');await page.locator('[data-check="main"]').check();await page.locator('[data-agreement="action"]').fill('각자의 뜻을 따로 확인');await page.locator('[data-agreement="review"]').fill('내일 담임이 확인');await action('advance').click();await fits('post meeting');
 // Long replies and errors stay inside the desk; examples are never silently sent.
 await page.locator('.topbar [data-action="settings"]').click();await page.locator('input[name="mode"][value="ai"]').check();await page.locator('#api-key').fill('dummy-desktop-test');await page.locator('#settings-form button[type="submit"]').click();
 let fail=false;const long='말하기 어려웠던 장면을 천천히 들어 주셨으면 좋겠어요. '.repeat(30);
 await page.route('**/api/reply',route=>route.fulfill(fail?{status:502,json:{error:'테스트 서비스 오류: 고른 문장은 유지됩니다.'}}:{json:{messages:[{speaker:'v',text:long}],teacherChoices:Array.from({length:4},(_,i)=>({label:`학생에게 있었던 일을 천천히 확인하는 질문 ${i+1}`,text:'어떤 도움이 필요했는지 '.repeat(20)+'말해 줄래?'})),risk:'none',observation:'가상 검사',coaching:{strength:'',nextQuestion:''}}}));
 await chooseQuestion(page);await send();await page.waitForFunction(()=>!document.querySelector('.thinking'));await fits('long AI response');
 await page.setViewportSize({width:901,height:640});await fits('long AI headings on narrow desktop');await page.setViewportSize({width:1366,height:768});
 assert.ok(await page.locator('#transcript').evaluate(el=>el.scrollHeight>el.clientHeight&&el.scrollHeight-el.scrollTop-el.clientHeight<3));
 await chooseQuestion(page);await fits('long selected example');fail=true;await send();await page.locator('#reply-error').waitFor();await fits('failed response');assert.equal(await page.locator('.choice-card.selected').count(),1);
 await action('finish').click();await page.locator('#finish-form button[type="submit"]').click();assert.equal(await page.locator('.review-header').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.dataset.practice),'');
 assert.deepEqual(errors,[]);await writeFile('.test-artifacts/desktop-room-results.json',JSON.stringify({passed:true,url:base,metrics,limits:'Browser viewports and mocked AI, no physical phone or live AI.'},null,2));console.log(JSON.stringify({passed:true,viewports:8,layouts:metrics.length}));
}finally{await browser.close();}
