import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios} from '../public/scenarios.js';

test('hand-drawn icons cover every topic, step and empty screen, stay inside the box and carry no inline styles',async()=>{
 const {DOODLES,TOPIC_DOODLE,doodle}=await import('../public/views/doodles.js');
 for(const c of new Set(scenarios.map(c=>c.category)))assert.ok(DOODLES[TOPIC_DOODLE[c]],`topic ${c} has a doodle`);
 for(const name of ['tap','say','checklist','reflect','pre','main','post','search','notebook'])assert.ok(DOODLES[name],name);
 for(const [name,svg] of Object.entries(DOODLES)){
  const html=doodle(name,'lg');
  assert.match(html,/^<svg class="doodle lg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">/);
  assert.ok(!/style=|<script|on\w+=/i.test(html),`${name}: no inline style or script (CSP)`);
  assert.match(svg,/class="dd-fill" d="M/,`${name}: colour wash`);assert.match(svg,/class="dd-ink" d="M/,`${name}: ink line`);
  const nums=svg.match(/-?\d+(?:\.\d+)?/g).map(Number);
  assert.ok(nums.every(n=>n>=-1&&n<=49),`${name}: drawn inside the 48×48 box`);
 }
 assert.equal(doodle('없는그림'),'');
});
