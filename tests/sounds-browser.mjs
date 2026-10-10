import assert from 'node:assert/strict';
import {reviewApplication,chooseQuestion} from './helpers.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 window.audioEvidence={contexts:0,starts:[]};const Native=window.AudioContext;
 window.AudioContext=class extends Native{
  constructor(...args){super(...args);window.audioEvidence.contexts++;}
  createOscillator(){const tone=super.createOscillator(),start=tone.start.bind(tone);tone.start=at=>{window.audioEvidence.starts.push({at,state:this.state});return start(at);};return tone;}
 };
});
try{
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:3213');
 await page.locator('[data-action="quick"]').click();await page.locator('#start-form button[type="submit"]').click();await reviewApplication(page);
 assert.equal(await page.evaluate(()=>audioEvidence.contexts),0,'no autoplay');
 await page.locator('.choice-card').first().click();await page.locator('.choice-detail').waitFor();
 assert.equal(await page.locator('.message.teacher').count(),0);assert.equal(await page.locator('input[name="question-choice"]:checked').count(),0,'preview is not confirmation');
 await page.waitForFunction(()=>audioEvidence.starts.length===1);await page.keyboard.press('Escape');
 await chooseQuestion(page);const selectedId=await page.locator('input[name="question-choice"]:checked').getAttribute('value');
 await page.locator('.choice-card').nth(1).click();await page.locator('.choice-detail').waitFor();await page.screenshot({path:'.test-artifacts/question-detail-dialog.png'});await page.keyboard.press('Escape');
 assert.equal(await page.locator('input[name="question-choice"]:checked').getAttribute('value'),selectedId);assert.equal(await page.locator('.message.teacher').count(),0);
 await page.locator('#compose button[type="submit"]').click();
 await page.waitForFunction(()=>audioEvidence.starts.length===7);
 assert.ok(await page.evaluate(()=>audioEvidence.starts.every(x=>x.state==='running')));
 await page.locator('[data-action="sound-toggle"]').click();assert.equal(await page.locator('[data-action="sound-toggle"]').getAttribute('aria-pressed'),'false');
 const count=await page.evaluate(()=>audioEvidence.starts.length);
 await chooseQuestion(page);await page.locator('#compose button[type="submit"]').click();assert.equal(await page.evaluate(()=>audioEvidence.starts.length),count);
 await page.locator('[data-action="save"]').click();await page.reload();await page.locator('[data-action="resume"]').first().click();
 assert.equal(await page.locator('[data-action="sound-toggle"]').getAttribute('aria-pressed'),'false');assert.equal(await page.evaluate(()=>audioEvidence.contexts),0);
 await page.locator('[data-action="sound-toggle"]').click();await page.waitForFunction(()=>audioEvidence.starts.length===1);
 // Keyboard users can also inspect the entire question and cancel safely.
 await page.locator('input[name="question-choice"]').first().focus();await page.keyboard.press('Space');await page.locator('.choice-detail').waitFor();await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,audio:'real AudioContext running, oscillator starts observed',physicalSpeakersTested:false}));
}finally{await browser.close();}
