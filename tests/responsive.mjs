import {reviewApplication,chooseQuestion,sendChoice} from './helpers.mjs';
import {checkQuestionControls} from './question-controls.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:process.env.PW_CHANNEL||'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'ko-KR'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.TEST_URL||'http://127.0.0.1:3210';
await mkdir('.test-artifacts',{recursive:true});
const settle=()=>page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
const screenshot=async name=>{await settle();await page.screenshot({path:`.test-artifacts/${name}.png`,fullPage:false});};
const overflow=async label=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label);
const nav=action=>page.locator(`nav [data-action="${action}"]`);
// 휴대전화(v0.9): 진행 확인은 단계 줄의 "진행 확인 열기"로 열고, 진행 확인의 "대화로 돌아가기"로 닫습니다.
const pane=which=>which==='notes'?page.locator('[data-action="show-notes"]').first():page.locator('#facilitator-notes [data-action="room-pane"][data-pane="chat"]');
// 연습 중 휴대전화에서는 위 막대가 숨고 글자 크기·설정은 메뉴(⋯)에 있습니다.
const roomTool=async name=>{if(await page.locator('[data-action="room-menu"]').isVisible()){await page.locator('[data-action="room-menu"]').click();await page.locator(`#modal [data-action="${name}"]`).click();}else await page.locator(`.topbar [data-action="${name}"]`).click();};
const metrics=[];
try{
 await page.goto(base);await settle();await screenshot('ui-desktop-library');
 assert.equal(await page.locator('.sidebar').count(),0,'v0.4 replaces the sidebar with the top app bar');assert.equal(await page.locator('.topbar .app-nav').isVisible(),true);assert.equal(await page.locator('.topbar .brand').isVisible(),true);
 await page.locator('[data-action="quick"]').click();await page.locator('#start-form button[type="submit"]').click();await reviewApplication(page);await settle();
 assert.equal(await page.locator('.mobile-room-tabs').isVisible(),false);assert.equal(await page.locator('#conversation').isVisible(),true);assert.equal(await page.locator('#facilitator-notes').isVisible(),false);
 await page.locator('.composer-wrap').scrollIntoViewIfNeeded();await screenshot('ui-desktop-questions');
 await chooseQuestion(page);assert.match(await page.locator('.choice-card.selected').innerText(),/선택됨/);
 const before=await page.locator('.choice-card.selected .choice-text').innerText();await page.locator('[data-action="text-size"]').click();assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize),'21px');assert.equal(await page.locator('.choice-card.selected .choice-text').innerText(),before);
 await overflow('Desktop larger text');await page.locator('[data-action="text-size"]').click();
 // A mobile viewport has its own notes view, and switching does not discard the question.
 await page.setViewportSize({width:390,height:844});await pane('notes').click();await settle();assert.equal(await page.locator('#conversation').isVisible(),false);assert.equal(await page.locator('#facilitator-notes').isVisible(),true);
 for(const k of ['v','a','g','safe'])await page.locator(`[data-check="${k}"]`).check();
 await page.locator('.note-section').nth(1).scrollIntoViewIfNeeded();await screenshot('ui-mobile-notes');
 await pane('chat').click();assert.equal(await page.locator('.choice-card.selected .choice-text').innerText(),before);
 await sendChoice(page);await settle();
 await pane('notes').click();await page.locator('[data-action="coach-question"]').click();assert.equal(await page.locator('#conversation').isVisible(),true);assert.ok((await page.locator('#draft').inputValue()).length>5);
 await pane('notes').click();await page.locator('[data-action="advance"]').click();await settle();assert.match(await page.locator('.steps .current').innerText(),/본모임/);assert.equal(await page.locator('#conversation').isVisible(),true);
 await pane('notes').click();await page.locator('[data-check="main"]').check();await page.locator('[data-agreement="action"]').fill('합의하지 못한 부분은 따로 확인');await page.locator('[data-agreement="review"]').fill('다음 주 교사가 개별 안전 점검');await page.locator('[data-action="advance"]').click();assert.match(await page.locator('.steps .current').innerText(),/사후모임/);
 await page.locator('#input-choices').click();
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});await settle();await overflow(`Meeting ${width}`);await checkQuestionControls(page);
  // 휴대전화에서 보내기는 카드를 고르면 그 자리에 나옵니다(고른 뒤 잰 뒤 다시 고르기로 돌아감).
  let phoneSend=null;if(width<=900){await chooseQuestion(page);phoneSend=await page.locator('#send-selected').evaluate(el=>el.getBoundingClientRect().height);await page.locator('[data-action="choose-again"]').click();}
  const info=await page.evaluate(phoneSend=>({width:innerWidth,bodyFont:parseFloat(getComputedStyle(document.body).fontSize),questionFont:parseFloat(getComputedStyle(document.querySelector('.choice-label')).fontSize),sendHeight:phoneSend??document.querySelector('#compose button[type="submit"]').getBoundingClientRect().height,notesVisible:document.querySelector('#facilitator-notes').getBoundingClientRect().width>0,navPosition:getComputedStyle(document.querySelector('.app-nav')).position,navInTopbar:!!document.querySelector('.topbar .app-nav')}),phoneSend);
  assert.ok(info.questionFont>=14&&info.questionFont<=16);assert.ok(info.sendHeight>=52);assert.equal(info.notesVisible,false);assert.equal(info.navPosition,width<=900?'fixed':'static');metrics.push(info);
  await page.locator('.composer-wrap').scrollIntoViewIfNeeded();await screenshot(`ui-questions-${width}`);
  await roomTool('text-size');await overflow(`Larger meeting ${width}`);await checkQuestionControls(page);await roomTool('text-size');
 }
 // Preference survives reload; no low-motion animation runs even on screen transitions/dialogs.
 await page.setViewportSize({width:390,height:844});await page.locator('[data-action="save"]').first().click();await roomTool('text-size');await page.reload();await settle();assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize),'21px');await overflow('Mobile large library');await screenshot('ui-mobile-library-large');
 await page.locator('[data-action="text-size"]').click();await page.evaluate(()=>scrollTo(0,0));await screenshot('ui-mobile-library');
 await nav('history').click();await page.locator('[data-action="resume"]').click();await settle();assert.equal(await page.locator('[data-action="show-notes"]').first().isVisible(),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'the phone practice room fits one screen');
 await roomTool('settings');await settle();await overflow('Mobile settings');await screenshot('ui-mobile-settings');await page.locator('[data-action="close"]').click();
 await page.emulateMedia({reducedMotion:'reduce'});await roomTool('library');await nav('guide').click();assert.equal(await page.evaluate(()=>document.getAnimations().length),0);await page.locator('.topbar [data-action="settings"]').click();assert.equal(await page.evaluate(()=>document.getAnimations().length),0);await page.locator('[data-action="close"]').click();
 assert.deepEqual(errors,[]);await writeFile('.test-artifacts/responsive-results.json',JSON.stringify({passed:true,metrics,flows:['phone room fits one screen','separate mobile notes','mobile pre/main/post','choice and text survive view switching','coach returns to chat','font preference persists','320 to 1440 widths','large text reflow','reduced motion','no page errors']},null,2));console.log(JSON.stringify({passed:true,metrics},null,2));
}finally{await browser.close();}
