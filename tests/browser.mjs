import {reviewApplication,setRoomPane} from './helpers.mjs';
// Run with PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/browser.mjs.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const {scenarios}=await import('../public/scenarios.js');
await mkdir('.test-artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1080},locale:'ko-KR'});
const page=await context.newPage();const errors=[];page.on('pageerror',err=>errors.push(err.message));
const base=process.env.TEST_URL||'http://127.0.0.1:3210';
const action=name=>page.locator(`[data-action="${name}"]`).first();
const click=name=>action(name).click();
const send=async text=>{await page.locator('#input-write').click();await page.locator('#draft').fill(text);await page.locator('#compose button[type="submit"]').click();await page.locator('.message.teacher').last().waitFor();};
const pick=async(index=0)=>{await page.locator('#input-choices').click();const text=await page.locator('.choice-text').nth(index).innerText();await page.locator('input[name="question-choice"]').nth(index).check();return text;};
const sendChoice=async(index=0)=>{const text=await pick(index);await page.locator('#compose button[type="submit"]').click();await page.waitForFunction(text=>Array.from(document.querySelectorAll('.message.teacher .bubble')).some(el=>el.textContent===text),text);return text;};
try{
 await page.goto(base);await page.locator('.case-card').first().waitFor();assert.equal(await page.locator('.case-card').count(),30);
 await page.screenshot({path:'.test-artifacts/library-desktop.png',fullPage:false});
 await page.locator('[data-action="grade"][data-value="고등"]').click();assert.equal(await page.locator('.case-card').count(),4);
 await page.locator('[data-action="grade"][data-value="전체"]').click();
 await page.locator('#search').fill('없는검색어987');assert.equal(await page.locator('.case-card').count(),0);
 await page.locator('#search').fill('');assert.equal(await page.locator('.case-card').count(),30);
 await click('quick');await page.locator('#start-form button[type="submit"]').click();await reviewApplication(page);
 assert.equal(await action('advance').isDisabled(),true);
 assert.equal(await page.locator('.choice-card').count(),4);assert.equal(await page.locator('#draft').count(),0);assert.equal(await page.locator('#compose button[type="submit"]').isDisabled(),true);
 const firstText=await pick();assert.equal(await page.locator('.message.teacher').count(),0);
 await click('other-choices');assert.equal(await page.locator('input[name="question-choice"]:checked').count(),0);assert.equal(await page.locator('#compose button[type="submit"]').isDisabled(),true);assert.ok(!(await page.locator('.question-choices').innerText()).includes(firstText));
 await click('other-choices');await sendChoice();assert.match(await page.locator('.message.teacher .bubble').last().innerText(),/멈춰도 돼/);
 const editText=await pick(1);await click('edit-choice');assert.equal(await page.locator('#draft').inputValue(),editText);
 await page.locator('#draft').fill('직접 쓰던 문장');await pick(2);await page.locator('#input-write').click();assert.equal(await page.locator('#draft').inputValue(),'직접 쓰던 문장');
 await page.locator('#input-choices').click();await page.screenshot({path:'.test-artifacts/choices-desktop.png',fullPage:true});
 await page.locator('#target').selectOption('g');assert.equal(await page.locator('input[name="question-choice"]:checked').count(),0);assert.match(await page.locator('.question-choices').innerText(),/학생이 겪은 일/);
 await page.locator('#target').selectOption('v');
 await send('원하지 않으면 멈춰도 돼. 지금 마음은 어떠니?');
 assert.match(await page.locator('#transcript').innerText(),/멈춰도 돼/);
 await page.locator('#target').selectOption('a');assert.ok(!(await page.locator('#transcript').innerText()).includes('원하지 않으면 멈춰도 돼'));
 await send('그날 무슨 일이 있었는지 들려줄래?');await page.locator('#target').selectOption('g');await send('어떤 지원이 필요할까요?');
 await setRoomPane(page,'notes');
 for(const k of ['v','a','g','safe'])await page.locator(`[data-check="${k}"]`).check();
 await setRoomPane(page,'chat');await pick();await setRoomPane(page,'notes');await click('advance');assert.match(await page.locator('.steps .current').innerText(),/본모임/);assert.equal(await page.locator('input[name="question-choice"]:checked').count(),0);await sendChoice();
 await send('그 행동이 상대의 생활에 어떤 영향을 주었을까?');
 await setRoomPane(page,'notes');await page.locator('[data-check="main"]').check();assert.equal(await action('advance').isDisabled(),true);
 for(const [k,v] of Object.entries({action:'상대 물건은 허락을 받고 사용하기',owner:'행동한 학생, 담임 지원',when:'오늘부터',support:'담임이 개별로 확인',review:'금요일 점심시간 담임이 개별 점검'}))await page.locator(`[data-agreement="${k}"]`).fill(v);
 await page.screenshot({path:'.test-artifacts/meeting-desktop.png',fullPage:false});
 await click('advance');assert.match(await page.locator('.steps .current').innerText(),/사후모임/);await sendChoice();
 await send('약속 중 실제로 지켜진 것은 무엇이니?');await click('finish');await page.locator('#finish-form button[type="submit"]').click();
 await page.locator('#reflection').fill('기다려 주기, 선택을 다시 확인하기.');await click('save');
 const download=page.waitForEvent('download');await click('export');const file=await download;await file.saveAs('.test-artifacts/dialogue.md');
 const transcript=await readFile('.test-artifacts/dialogue.md','utf8');assert.match(transcript,/금요일 점심시간/);assert.match(transcript,/선택을 다시 확인/);
 await click('history');assert.equal(await page.locator('.history-item').count(),1);await click('resume');assert.equal(await page.locator('#reflection').inputValue(),'기다려 주기, 선택을 다시 확인하기.');
 // Independent safety pause: no pressure to advance is required.
 await click('library');await click('quick');await page.locator('input[value="unsafe"]').check();await page.locator('#start-form button[type="submit"]').click();await reviewApplication(page);
 assert.match(await page.locator('.question-choices').innerText(),/먼저 대화모임/);await sendChoice();await send('지금은 중단하고 따로 이야기해도 돼.');assert.match(await page.locator('#transcript').innerText(),/오늘은 만나지/);
 await click('finish');assert.equal(await page.locator('#outcome').inputValue(),'안전을 위한 보류·중단');await page.locator('#finish-form button[type="submit"]').click();await click('save');
 // Every provider is wired through the same UI; no real keys or paid API calls.
 const requests=[];let fail=false;
 await page.route('**/api/**',async route=>{const data=route.request().postDataJSON();requests.push({path:new URL(route.request().url()).pathname,data});
  if(fail)return route.fulfill({status:401,json:{error:'테스트: API 키 인증에 실패했습니다.'}});
  if(route.request().url().endsWith('/check'))return route.fulfill({json:{ok:true}});
  if(route.request().url().endsWith('/review'))return route.fulfill({json:{title:'선택을 확인한 대화',summary:'가상 API 회고입니다.',strengths:['실제 질문을 돌아보기'],improvements:['지원 계획 점검'],nextPractice:'다시 듣기'}});
  return route.fulfill({json:{messages:[{speaker:data.session.target==='all'?'v':data.session.target,text:'가상 API 응답: 조금 더 이야기해 볼게요.'}],observation:'가상 응답',risk:'none',coaching:{strength:'질문을 건넸습니다.',nextQuestion:'필요한 도움은 무엇일까?'}}});
 });
 for(const provider of ['anthropic','gemini','openai']){
  await click('settings');await page.locator('input[name="mode"][value="ai"]').check();await page.locator('#provider').selectOption(provider);await page.locator('#api-key').fill('dummy-key-for-browser-test');
  await click('check-key');await page.getByText('연결을 확인했습니다. 설정 적용을 눌러 주세요.',{exact:true}).waitFor();
  await page.locator('#settings-form button[type="submit"]').click();assert.equal(requests.at(-1).data.provider,provider);
  if(provider==='anthropic'){await click('library');await click('quick');await page.locator('#start-form button[type="submit"]').click();await reviewApplication(page);}
  await sendChoice();assert.equal(requests.at(-1).data.session.messages.at(-1).inputMethod,'choice');await send('지금 이야기해도 괜찮니?');await page.getByText('가상 API 응답: 조금 더 이야기해 볼게요.',{exact:true}).first().waitFor();assert.equal(requests.at(-1).data.provider,provider);
 }
 const failedChoice=await pick();fail=true;await page.locator('#compose button[type="submit"]').click();await page.locator('.error').waitFor();assert.equal(await page.locator('.choice-card.selected .choice-text').innerText(),failedChoice);assert.equal(await page.locator('#compose button[type="submit"]').isDisabled(),false);fail=false;
 await page.locator('#input-write').click();
 fail=true;const teacherCount=await page.locator('.message.teacher').count();await page.locator('#draft').fill('실패해도 사라지면 안 되는 질문');await page.locator('#compose button[type="submit"]').click();await page.locator('.error').waitFor();
 assert.equal(await page.locator('#draft').inputValue(),'실패해도 사라지면 안 되는 질문');assert.equal(await page.locator('.message.teacher').count(),teacherCount);fail=false;
 await click('finish');await page.locator('#finish-form button[type="submit"]').click();await click('ai-review');await page.getByRole('heading',{name:'선택을 확인한 대화'}).waitFor();await click('save');
 assert.ok(!(await page.evaluate(()=>JSON.stringify(localStorage))).includes('dummy-key-for-browser-test'));
 await page.reload();await page.locator('.case-card').first().waitFor();await click('settings');assert.equal(await page.locator('#api-key').inputValue(),'');await click('close');
 // Speech stub checks draft-only conversion, confirmation, and permission failure handling.
 await page.evaluate(()=>{class FakeRecognition{constructor(){window.fakeRecognition=this;}start(){}stop(){this.onend?.();}abort(){this.onend?.();}}window.SpeechRecognition=FakeRecognition;});
 await click('quick');await page.locator('#start-form button[type="submit"]').click();await reviewApplication(page);
 await page.locator('#input-write').click();await page.locator('#draft').fill('먼저 ');await click('mic');assert.equal(await page.locator('#draft').getAttribute('readonly'),'');
 await page.evaluate(()=>{const final=[{transcript:'어떤 마음이 들었니?'}];final.isFinal=true;const partial=[{transcript:'천천히'}];partial.isFinal=false;window.fakeRecognition.onresult({resultIndex:0,results:[final,partial]});});
 assert.match(await page.locator('#draft').inputValue(),/어떤 마음이/);assert.equal(await page.locator('.message.teacher').count(),0);assert.equal(await page.locator('#compose button[type="submit"]').isDisabled(),true);
 await click('mic');assert.equal(await page.locator('#draft').getAttribute('readonly'),null);assert.equal(await page.locator('.message.teacher').count(),0);
 await click('mic');await click('settings');await click('close');assert.equal(await page.locator('#draft').getAttribute('readonly'),null);assert.match(await action('mic').innerText(),/말해서 입력/);
 await click('mic');await page.evaluate(()=>{window.fakeRecognition.onerror({error:'not-allowed'});window.fakeRecognition.onend();});assert.match(await page.locator('#speech-status').innerText(),/거부/);
 await page.evaluate(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});await click('mic');assert.match(await page.locator('#speech-status').innerText(),/지원하지/);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.test-artifacts/meeting-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile meeting should not overflow');
 await page.locator('#input-choices').click();await page.screenshot({path:'.test-artifacts/choices-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile choices should not overflow');
 await click('library');await page.screenshot({path:'.test-artifacts/library-mobile.png',fullPage:false});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile catalog should not overflow');
 await click('history');const oldCount=await page.locator('.history-item').count();await click('delete');await click('confirm-delete');assert.equal(await page.locator('.history-item').count(),oldCount-1);
 assert.deepEqual(errors,[]);
 const result={passed:true,cases:scenarios.length,providerChecks:requests.filter(r=>r.path==='/api/check').map(r=>r.data.provider),flows:['four visible question choices','selection does not auto-send','change options and edit selected text','choice resets on target or phase change','choices in all three phases','chosen question through all provider mocks','choice preserved on API error','mobile choice layout','filters','three phases','consent gate','agreement gate','save/resume/delete/export','safety pause','three provider mock calls','API error preserves draft','AI review mock','keys excluded from storage and reload','speech input mock without automatic send','speech permission error and fallback','mobile overflow','no page errors'],limits:'No real API key or physical microphone used.'};
 await writeFile('.test-artifacts/browser-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
