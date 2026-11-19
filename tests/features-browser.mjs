// v0.8 기능 검사: PC 키보드 단축키, 회고 인쇄, 방금 질문 다시 해 보기, 회고에서 장면 다시 보기.
// 서버를 켠 뒤 실행합니다: npm start, 그다음 node tests/features-browser.mjs
// FEATURES_ONLY=keys,print 처럼 일부만 실행할 수 있습니다.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {reviewApplication} from './helpers.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:process.env.PW_CHANNEL||'chrome',headless:true});
const base=process.env.TEST_URL||'http://127.0.0.1:3210';
const only=(process.env.FEATURES_ONLY||'').split(',').filter(Boolean),run=name=>!only.length||only.includes(name);
const results=[];
await mkdir('.test-artifacts',{recursive:true});

async function open({width=1440,height=900}={}){
 const context=await browser.newContext({viewport:{width,height},locale:'ko-KR'});
 // 이 검사들은 무대 그림을 보지 않으므로 그림 무대로 빠르게 돌립니다(장면 다시 보기 검사는 따로 켭니다).
 await context.addInitScript(()=>{try{if(!sessionStorage.getItem('keep-stage'))localStorage.setItem('dasi.stage','off');}catch{}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const action=name=>page.locator(`[data-action="${name}"]`).first();
 return {context,page,errors,action};
}
async function startPractice(page,action){
 await page.goto(base);await action('quick').click();await page.locator('#start-form button[type="submit"]').click();await reviewApplication(page);
 await page.locator('.choice-card').first().waitFor();
}
const blur=page=>page.evaluate(()=>document.activeElement?.blur?.());
const teacherCount=page=>page.locator('.message.teacher').count();
const settled=page=>page.waitForFunction(()=>!document.querySelector('.thinking')&&document.querySelectorAll('.choice-card').length===4&&!document.querySelector('#compose fieldset[disabled]'));

try{
 // 1. PC 키보드: 1–4로 문장 창을 열고, Enter로 고르고, 한 번 더 Enter로 보냄. Esc로 닫힘. 글을 쓰는 중에는 숫자가 글자로 들어감.
 if(run('keys')){
  const {context,page,errors,action}=await open();
  await startPractice(page,action);
  assert.equal(await page.locator('.keyboard-hint').isVisible(),true,'shortcut hint is shown on PC');
  const second=await page.locator('.choice-card').nth(1).locator('.choice-text').textContent();
  await blur(page);await page.keyboard.press('2');
  await page.locator('#modal[open] .choice-detail').waitFor();
  assert.equal(await page.locator('#modal .choice-detail').innerText(),second,'2 opens the second card');
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.action),'choose-example','the choose button has focus');
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>!document.querySelector('#modal').open);
  assert.equal(await page.locator('.choice-card.selected .choice-text').textContent(),second,'Enter in the dialog chooses it');
  assert.equal(await teacherCount(page),0,'choosing does not send');
  // Esc는 고른 것을 바꾸지 않고 창만 닫습니다.
  await blur(page);await page.keyboard.press('1');await page.locator('#modal[open]').waitFor();
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#modal').open);
  assert.equal(await page.locator('.choice-card.selected .choice-text').textContent(),second,'Esc keeps the earlier choice');
  // 고른 뒤 Enter를 누르면 보냅니다.
  await blur(page);await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelectorAll('.message.teacher').length===1);
  assert.equal((await page.locator('.message.teacher').last().innerText()).includes(second.slice(0,20)),true,'Enter sends the chosen sentence');
  await settled(page);
  // 수정 키와 함께 누르면(브라우저 단축키) 아무 일도 하지 않습니다.
  await blur(page);await page.keyboard.press('Control+1');
  assert.equal(await page.evaluate(()=>document.querySelector('#modal').open),false,'Ctrl+1 is left to the browser');
  // 직접 입력 중에는 숫자와 Enter가 글쓰기에 쓰입니다.
  await page.locator('#input-write').click();await page.locator('#draft').click();await page.keyboard.type('3번째');
  assert.equal(await page.evaluate(()=>document.querySelector('#modal').open),false,'typing a number does not open a dialog');
  assert.equal(await page.locator('#draft').inputValue(),'3번째');
  // 휴대전화 폭에서는 안내를 보이지 않습니다.
  await page.setViewportSize({width:390,height:844});await page.locator('#input-choices').click();
  assert.equal(await page.locator('.keyboard-hint').isVisible(),false,'no shortcut hint on phones');
  assert.deepEqual(errors,[]);await context.close();
  results.push('keys: 1–4 open a sentence, Enter chooses then sends, Esc closes, typing and Ctrl untouched');
 }
 // 2. 회고 인쇄·PDF: 메뉴·버튼은 빠지고, 머리말·나의 회고(글로)·전체 대화가 펼쳐져 인쇄됨. 인쇄 뒤에는 화면이 그대로.
 if(run('print')){
  const {context,page,errors,action}=await open();
  await startPractice(page,action);
  await page.locator('#input-write').click();await page.locator('#draft').fill('오늘 어떤 일이 있었는지 들려줄래?');await page.locator('#compose button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.message.teacher').length===1&&!document.querySelector('.thinking')&&!document.querySelector('#compose textarea[disabled]'));
  await action('finish').click();await page.locator('#finish-form button[type="submit"]').click();
  await page.locator('.review-header').waitFor();
  await page.locator('#reflection').fill('다음에는 대답을 더 기다려 주고 싶어요.');
  assert.match(await action('print').innerText(),/인쇄/,'review has a print button');
  await page.evaluate(()=>{window.__seen=null;addEventListener('beforeprint',()=>{window.__seen={open:document.querySelector('.all-transcript').open,reflection:document.querySelector('.print-reflection')?.textContent||'',moving:document.getAnimations().filter(a=>a.playState!=='finished'&&a.effect?.getComputedTiming().iterations!==Infinity).length};});});
  await page.emulateMedia({media:'print'});
  const looks=await page.evaluate(()=>{const d=el=>el?getComputedStyle(el).display:'missing';return {
   rail:d(document.querySelector('.topbar')),footer:d(document.querySelector('footer')),skip:d(document.querySelector('a[href="#main"]')),
   buttons:[...document.querySelectorAll('.review-buttons,.review-side .button,.review-side .text-button,.review-save-state')].map(d),
   textarea:d(document.querySelector('#reflection')),printReflection:d(document.querySelector('.print-reflection')),head:d(document.querySelector('.print-head')),
   main:d(document.querySelector('.review-main')),evidence:d(document.querySelector('.review-evidence')),
   overflow:document.documentElement.scrollWidth<=document.documentElement.clientWidth+1};});
  assert.equal(looks.rail,'none','no menu rail on paper');assert.equal(looks.skip,'none','no skip link on paper');assert.equal(looks.footer,'none');
  assert.ok(looks.buttons.length>=3&&looks.buttons.every(v=>v==='none'),`no buttons on paper ${looks.buttons}`);
  assert.equal(looks.textarea,'none','the reflection box is printed as text');assert.notEqual(looks.printReflection,'none');
  assert.notEqual(looks.head,'none','a print header names the case and date');assert.notEqual(looks.main,'none');assert.notEqual(looks.evidence,'none');
  const pdf=await page.pdf({format:'A4',printBackground:true});await writeFile('.test-artifacts/review-print.pdf',pdf);
  const pages=(pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length;
  assert.ok(pages>=1&&pages<=6,`review fits on a few A4 pages (${pages})`);
  const seen=await page.evaluate(()=>window.__seen);
  assert.equal(seen?.moving,0,'screen-change effects are finished before printing (a half-faded page prints blank)');
  assert.equal(seen?.open,true,'the full conversation is unfolded for printing');
  assert.equal(seen?.reflection,'다음에는 대답을 더 기다려 주고 싶어요.','the typed reflection is printed');
  assert.equal(await page.evaluate(()=>document.querySelector('.all-transcript').open),false,'unfolded conversation closes again after printing');
  await page.emulateMedia({media:'screen'});
  // 버튼은 브라우저 인쇄 창을 엽니다(검사에서는 창 대신 횟수를 셉니다).
  await page.evaluate(()=>{window.__printed=0;window.print=()=>{window.__printed++;};});
  await action('print').click();assert.equal(await page.evaluate(()=>window.__printed),1);
  await page.screenshot({path:'.test-artifacts/review-print-screen.png'});
  assert.deepEqual(errors,[]);await context.close();
  results.push(`print: menu and buttons hidden, header, reflection as text, conversation unfolded, ${pages} A4 page(s)`);
 }
 // 3. 방금 질문 다시 해 보기: 마지막 질문과 답을 지우고, 직접 쓴 글은 입력창에 돌려주며, 회고에 "다시 해 본 질문"으로 남김.
 if(run('undo')){
  const {context,page,errors,action}=await open();
  await startPractice(page,action);
  assert.equal(await page.locator('[data-action="retry-turn"]').count(),0,'nothing to take back before the first question');
  // 고른 안내를 보낸 뒤 되돌리면 고르기 화면으로 돌아갑니다.
  await page.locator('.choice-card').first().click();await page.locator('#modal [data-action="choose-example"]').click();
  await page.locator('#compose button[type="submit"]').click();await settled(page);
  assert.equal(await teacherCount(page),1);
  await action('retry-turn').click();
  assert.equal(await teacherCount(page),0,'the question is taken back');
  assert.equal(await page.locator('.choice-card').count(),4,'choices are shown again');
  assert.match(await page.locator('.question-choices legend').innerText(),/먼저 대화모임/,'back to the introduction step');
  // 직접 쓴 질문은 입력창에 돌아옵니다.
  await page.locator('#input-write').click();await page.locator('#draft').fill('오늘은 대화모임을 안내할게. 참여는 네가 고를 수 있어.');await page.locator('#compose button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.message.teacher').length===1&&!document.querySelector('.thinking')&&!document.querySelector('#draft[disabled]'));
  await page.locator('#draft').fill('혹시 궁금한 거 있니?');await page.locator('#compose button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.message.teacher').length===2&&!document.querySelector('.thinking')&&!document.querySelector('#draft[disabled]'));
  const replies=await page.locator('.message:not(.teacher)').count();
  await action('retry-turn').click();
  assert.equal(await teacherCount(page),1);assert.equal(await page.locator('.message:not(.teacher)').count(),replies-1,'its answer is removed too');
  assert.equal(await page.locator('#draft').inputValue(),'혹시 궁금한 거 있니?','the written question comes back to be rewritten');
  assert.match(await page.locator('#toast').innerText(),/다시/);
  await page.locator('#draft').fill('오늘 어떤 일이 있었는지 천천히 들려줄래?');await page.locator('#compose button[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.message.teacher').length===2&&!document.querySelector('.thinking'));
  await action('finish').click();await page.locator('#finish-form button[type="submit"]').click();await page.locator('.review-header').waitFor();
  const tried=await page.locator('.review-retries').innerText();
  assert.match(tried,/다시 해 본 질문/);assert.match(tried,/혹시 궁금한 거 있니\?/);
  assert.equal(await page.locator('.review-retries article').count(),2,'both taken-back questions are listed');
  await page.screenshot({path:'.test-artifacts/review-retries.png',fullPage:true});
  assert.deepEqual(errors,[]);await context.close();
  results.push('undo: take back chosen and written questions, rewrite, listed in the review');
 }
 await writeFile('.test-artifacts/features-browser.json',JSON.stringify({passed:true,results},null,2));
 console.log(JSON.stringify({passed:true,results}));
}finally{await browser.close();}
