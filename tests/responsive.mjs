import {reviewApplication} from './helpers.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'ko-KR'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.TEST_URL||'http://127.0.0.1:3210';
await mkdir('.test-artifacts',{recursive:true});
const settle=()=>page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
const screenshot=async name=>{await settle();await page.screenshot({path:`.test-artifacts/${name}.png`,fullPage:false});};
const overflow=async label=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label);
const nav=action=>page.locator(`nav [data-action="${action}"]`);
const pane=which=>page.locator(`.mobile-room-tabs [data-pane="${which}"]`);
const metrics=[];
try{
 await page.goto(base);await settle();await screenshot('ui-desktop-library');
 await page.locator('[data-action="quick"]').click();await page.locator('#start-form button[type="submit"]').click();await reviewApplication(page);await settle();
 assert.equal(await page.locator('.mobile-room-tabs').isVisible(),false);assert.equal(await page.locator('#conversation').isVisible(),true);assert.equal(await page.locator('#facilitator-notes').isVisible(),false);
 await page.locator('.composer-wrap').scrollIntoViewIfNeeded();await screenshot('ui-desktop-questions');
 const choose=page.locator('input[name="question-choice"]').first();await choose.check();assert.match(await page.locator('.choice-card.selected').innerText(),/선택됨/);
 const before=await page.locator('.choice-card.selected .choice-text').innerText();await page.locator('[data-action="text-size"]').click();assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize),'21px');assert.equal(await page.locator('.choice-card.selected .choice-text').innerText(),before);
 await overflow('Desktop larger text');await page.locator('[data-action="text-size"]').click();
 // A mobile viewport has its own notes view, and switching does not discard the question.
 await page.setViewportSize({width:390,height:844});await pane('notes').click();await settle();assert.equal(await page.locator('#conversation').isVisible(),false);assert.equal(await page.locator('#facilitator-notes').isVisible(),true);
 for(const k of ['v','a','g','safe'])await page.locator(`[data-check="${k}"]`).check();
 await page.locator('.note-section').nth(1).scrollIntoViewIfNeeded();await screenshot('ui-mobile-notes');
 await pane('chat').click();assert.equal(await page.locator('.choice-card.selected .choice-text').innerText(),before);
 await page.locator('#compose button[type="submit"]').click();await settle();
 await pane('notes').click();await page.locator('[data-action="coach-question"]').click();assert.equal(await page.locator('#conversation').isVisible(),true);assert.ok((await page.locator('#draft').inputValue()).length>5);
 await pane('notes').click();await page.locator('[data-action="advance"]').click();await settle();assert.match(await page.locator('.steps .current').innerText(),/본모임/);assert.equal(await page.locator('#conversation').isVisible(),true);
 await pane('notes').click();await page.locator('[data-check="main"]').check();await page.locator('[data-agreement="action"]').fill('합의하지 못한 부분은 따로 확인');await page.locator('[data-agreement="review"]').fill('다음 주 교사가 개별 안전 점검');await page.locator('[data-action="advance"]').click();assert.match(await page.locator('.steps .current').innerText(),/사후모임/);
 await page.locator('#input-choices').click();
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});await settle();await overflow(`Meeting ${width}`);
  const info=await page.evaluate(()=>({width:innerWidth,bodyFont:parseFloat(getComputedStyle(document.body).fontSize),questionFont:parseFloat(getComputedStyle(document.querySelector('.choice-text')).fontSize),sendHeight:document.querySelector('#compose button[type="submit"]').getBoundingClientRect().height,notesVisible:document.querySelector('#facilitator-notes').getBoundingClientRect().width>0,navPosition:getComputedStyle(document.querySelector('.sidebar nav')).position}));
  assert.ok(info.questionFont>=18);assert.ok(info.sendHeight>=52);assert.equal(info.notesVisible,false);assert.equal(info.navPosition,width<=900?'fixed':'static');metrics.push(info);
  await page.locator('.composer-wrap').scrollIntoViewIfNeeded();await screenshot(`ui-questions-${width}`);
  await page.locator('[data-action="text-size"]').click();await overflow(`Larger meeting ${width}`);await page.locator('[data-action="text-size"]').click();
 }
 // Preference survives reload; no low-motion animation runs even on screen transitions/dialogs.
 await page.setViewportSize({width:390,height:844});await page.locator('[data-action="save"]').first().click();await page.locator('[data-action="text-size"]').click();await page.reload();await settle();assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).fontSize),'21px');await overflow('Mobile large library');await screenshot('ui-mobile-library-large');
 await page.locator('[data-action="text-size"]').click();await page.evaluate(()=>scrollTo(0,0));await screenshot('ui-mobile-library');
 await nav('history').click();await page.locator('[data-action="resume"]').click();await settle();assert.equal(await page.locator('.mobile-room-tabs').isVisible(),true);
 await page.locator('.topbar [data-action="settings"]').click();await settle();await overflow('Mobile settings');await screenshot('ui-mobile-settings');await page.locator('[data-action="close"]').click();
 await page.emulateMedia({reducedMotion:'reduce'});await nav('guide').click();assert.equal(await page.evaluate(()=>document.getAnimations().length),0);await page.locator('.topbar [data-action="settings"]').click();assert.equal(await page.evaluate(()=>document.getAnimations().length),0);await page.locator('[data-action="close"]').click();
 assert.deepEqual(errors,[]);await writeFile('.test-artifacts/responsive-results.json',JSON.stringify({passed:true,metrics,flows:['separate mobile notes','mobile pre/main/post','choice and text survive view switching','coach returns to chat','font preference persists','320 to 1440 widths','large text reflow','reduced motion','no page errors']},null,2));console.log(JSON.stringify({passed:true,metrics},null,2));
}finally{await browser.close();}
