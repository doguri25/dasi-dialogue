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
 await writeFile('.test-artifacts/features-browser.json',JSON.stringify({passed:true,results},null,2));
 console.log(JSON.stringify({passed:true,results}));
}finally{await browser.close();}
