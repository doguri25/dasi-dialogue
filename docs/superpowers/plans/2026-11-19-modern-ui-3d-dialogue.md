# 다시, 대화 v0.4 (새 화면 + 3D 대화 장면) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign every screen with one modern design system and add a 3D dialogue stage where procedural clay characters listen, think and speak with Korean lip-sync and mood-driven body language.

**Architecture:** The app stays a no-build vanilla-JS SPA. A persistent stage host element (owned by a "director" in `public/stage/`) is re-parented into a slot after every `render()`. The director runs subtitles, lip-sync timelines and speech, and drives a renderer that is either 3D (Three.js r187 from a vendored bundle, lazy-imported) or 2D (portraits + CSS). Moods come from the AI JSON (`messages[].mood`) or from the demo rules, normalized by one shared module used by server and browser.

**Tech Stack:** Vanilla ES modules, Three.js r187 (vendored bundle with EffectComposer/UnrealBloom/ShaderPass/OutputPass/RoomEnvironment), GLSL, CSS (no framework), Pretendard Variable (vendored), Node 22 `node --test`, Playwright (preinstalled at `/opt/node-tools/node_modules/playwright`).

**Spec:** `docs/superpowers/specs/2026-11-19-modern-ui-3d-dialogue-design.md`

## Global Constraints

- Node ≥ 22, no runtime npm dependencies, no build step. `public/` is deployed as-is (GitHub Pages, Vercel). `npm test` = `node --test tests/*.test.mjs`.
- CSP unchanged (`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:`…). No `style="…"` attributes and no `<style>` in markup. Dynamic CSS values via `element.style.setProperty`.
- Korean UI copy. Base text 18px, large mode 21px (`:root[data-text-size=large]`). Primary buttons ≥ 54px high, other targets ≥ 48px. Visible focus outline. `prefers-reduced-motion` respected.
- Mobile layout at `max-width: 900px`. Desktop room: no page scroll when window height ≥ 560px; stage, transcript, choice grid and send button all inside the viewport.
- Three.js only through `public/vendor/three-stage.js` (three@0.187.0, MIT header kept), ≤ 800 KB. No 3D file is requested on the library screen before first paint + idle.
- Moods, exactly: `calm open hesitant anxious defensive upset withdrawn relieved`. Intensity from risk: `none` 0.55, `tension` 0.8, `stop` 1.0.
- Speech timing: syllable 140 ms ÷ rate; space 40 ms; `,` 220 ms; `. ? !` 380 ms; `…`/`...` 600 ms.
- Stage host attributes: `data-stage-mode="3d|2d"`, `data-stage-state="idle|listening|thinking|speaking"`, `data-speaker`, `data-mood`. The host is `aria-hidden="true"`; transcript and captions are the accessible content.
- Preference key `dasi.stage` = `auto|on|off` (default `auto`); slow-device memo `dasi.stage.slow` = `1`.
- Mood names are never shown in the UI.
- Version `0.4.0`. Work on branch `claude/pensive-curie-6vz1hy`; every commit message ends with the session's attribution lines.

## Review Focus

- A 3000-character AI reply: the caption must keep only the latest lines visible without covering faces, skip must finish it, and nothing may freeze — test in Task 6.
- Text with no Hangul, or empty text (English, digits, emoji, `""`): timeline has no NaN, empty resolves at once — test in Task 2.
- Switching target, advancing phase or leaving the room while a character speaks: speech and voice stop, the new cast does not inherit the old line, the render loop pauses off-room — test in Task 9.
- v0.3 saved sessions without `mood`: resume works and characters take inferred moods — test in Task 4.
- Resizing / rotating / toggling large text while 3D runs: canvas matches its slot, no stretching — test in Task 6.

---

## File Structure

```
public/vendor/three-stage.js        (new) Three.js r187 bundle + addons
public/vendor/pretendard/           (new) Pretendard Variable dynamic subset (css + woff2 + LICENSE)
tools/vendor-three.mjs              (new) regenerates three-stage.js (npx esbuild), dev-only
public/stage/mood.js                (new, pure) moods, normalize/infer, demo table — shared with server
public/stage/hangul.js              (new, pure) text → mouth timeline
public/stage/looks.js               (new, pure) 7 looks + lookFor(scenario, role)
public/stage/acting.js              (new, pure) poses per mood/state, blendPose, seatsFor
public/stage/support.js             (new, pure) resolveStageMode, quality ladder
public/stage/director.js            (new) persistent host, captions, timelines, TTS, renderer swap
public/stage/index.js               (new) getStage() singleton, preference read/write
public/stage/flat.js                (new) 2D renderer
public/stage/render3d.js            (new) 3D renderer: renderer setup, loop, quality, context loss, camera
public/stage/room.js                (new) meeting room geometry + lights
public/stage/character.js           (new) procedural character + face/joint rig
public/stage/post.js                (new) composer + grade shader
public/stage-lab.html, public/stage-lab.js (new) developer page to view characters/moods
public/styles/{base,shell,library,application,room,stage,review}.css (new) design system, replaces style.css + experience.css
public/index.html, public/app.js, public/application-view.js, public/experience.js (modify) new templates, stage wiring
lib/prompts.mjs, public/engine.js, server.mjs (modify) mood in schema/validation/demo, .woff2 MIME
tests/stage.test.mjs (new), tests/stage-browser.mjs (new), existing tests (modify)
README.md, CHANGELOG.md, docs/UI-DIRECTION.md, docs/VERIFICATION.md, public/version.js, docs/screenshots/* (modify)
```

---

### Task 1: Vendor Three.js and Pretendard

**Files:**
- Create: `tools/vendor-three.mjs`, `public/vendor/three-stage.js`, `public/vendor/pretendard/pretendardvariable-dynamic-subset.css`, `public/vendor/pretendard/woff2-dynamic-subset/*.woff2`, `public/vendor/pretendard/LICENSE.txt`
- Modify: `server.mjs:8` (mime), `.vercelignore` only if it would exclude `public/vendor`
- Test: `tests/stage.test.mjs`, `tests/server.test.mjs`

**Interfaces:**
- Produces: `public/vendor/three-stage.js` exporting `* as THREE` members at top level (`WebGLRenderer`, `Scene`, …, `REVISION`) plus `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `ShaderPass`, `OutputPass`, `RoomEnvironment`, `mergeGeometries`.

- [ ] **Step 1: Write failing tests**

```js
// tests/stage.test.mjs
test('vendored three bundle exposes r187 and the post-processing addons', async () => {
  const T = await import('../public/vendor/three-stage.js');
  assert.equal(T.REVISION, '187');
  for (const k of ['WebGLRenderer','EffectComposer','RenderPass','UnrealBloomPass','ShaderPass','OutputPass','RoomEnvironment','mergeGeometries']) assert.equal(typeof T[k], 'function', k);
  assert.ok((await stat('public/vendor/three-stage.js')).size <= 800 * 1024);
});
// tests/server.test.mjs: GET /vendor/pretendard/woff2-dynamic-subset/PretendardVariable.subset.0.woff2 → 200, content-type font/woff2
```

- [ ] **Step 2: Run** `node --test tests/stage.test.mjs tests/server.test.mjs` — expected FAIL (module not found / 404).
- [ ] **Step 3: Write `tools/vendor-three.mjs`**: in a temp dir `npm pack three@0.187.0`, write an entry re-exporting `three` and the six addon paths (`three/examples/jsm/postprocessing/{EffectComposer,RenderPass,UnrealBloomPass,ShaderPass,OutputPass}.js`, `three/examples/jsm/environments/RoomEnvironment.js`, `mergeGeometries` from `utils/BufferGeometryUtils.js`), run `npx esbuild@0.28.2 --bundle --format=esm --minify`, prepend the three.js MIT notice, write `public/vendor/three-stage.js`. Copy Pretendard 1.3.9 (`npm pack pretendard@1.3.9`) `dist/web/variable/pretendardvariable-dynamic-subset.css` + `woff2-dynamic-subset/` + LICENSE. Run it once.
- [ ] **Step 4: Add** `'.woff2':'font/woff2'` to the `mime` map in `server.mjs`.
- [ ] **Step 5: Run** `npm test` — expected PASS.
- [ ] **Step 6: Commit** `feat: vendor three.js r187 bundle and Pretendard font`

---

### Task 2: Pure stage modules (mood, hangul, looks, acting, support)

**Files:**
- Create: `public/stage/mood.js`, `public/stage/hangul.js`, `public/stage/looks.js`, `public/stage/acting.js`, `public/stage/support.js`
- Test: `tests/stage.test.mjs`

**Interfaces:**
- Produces:
  - `MOODS: string[]` (8, order above); `moodIntensity(risk) → number`; `inferMood({risk, speaker}) → mood` (stop: v→`withdrawn` else `anxious`; tension: a→`defensive` else `hesitant`; else `calm`); `normalizeMood(value, {risk, speaker}) → mood` (trims + lowercases; unknown → `inferMood`); `demoMood({intent, variant, phase, preStep, role, turn}) → mood`; `MOOD_GUIDE: string` (Korean one-line meaning per mood, for the prompt).
  - `decompose(ch) → {initial, medial, final} | null`; `speechTimeline(text, {rate=1}) → {cues: [{start, duration, shape, open, charIndex}], duration}` with shapes `A E O U EU I M REST`, open `A 1, E .7, O .65, U .4, EU .3, I .35, M 0, REST 0`; ㅁ/ㅂ/ㅃ/ㅍ initials give an `M` cue for the first 35 % of the syllable; finals ㅁ ㅂ ㅄ ㄻ ㄿ close the last 25 %; non-Hangul letters/digits = `E` .5 for 110 ms ÷ rate; other symbols 0 ms; `\n` = 220 ms.
  - `LOOKS: Record<'elementary-a'|'elementary-b'|'middle-a'|'middle-b'|'high-a'|'high-b'|'guardian', Look>` where `Look = {age:'elementary'|'middle'|'high'|'adult', hair:'bob'|'tousled'|'halfup'|'cropped'|'chinbob'|'sidepart'|'short', hairColor, skin, top, topKind:'sweatshirt'|'cardigan'|'hoodie'|'jacket'|'knit', under|null}` (spec §5.4 table); `lookFor(scenario, role) → key` (g → `guardian`, v/a → the key inside `portraitFor(c, role)`).
  - `POSES: Record<mood, Pose>`; `poseFor(mood, {state='idle', intensity=.55}) → Pose`; `blendPose(a, b, t) → Pose`; `seatsFor(phase, target) → role[]` (pre → `[target]`, main/post → `['v','a','g']`, lobby → `['v','a']`).
    `Pose = {lean, turn, shoulders, slump, headPitch, headYaw, headTilt, arms:'table'|'crossed'|'lap'|'clasp'|'fidget'|'gesture', browRaise, browInner, browFurrow, smile, lipPress, gazeContact, gazeDown, blinkMin, blinkMax, speechRate, prePause, mouthScale, nod}` — values follow spec §5.2 table; numeric fields scale from `POSES.calm` toward the mood by `intensity / 0.8` (capped at 1.25).
  - `resolveStageMode({setting, webgl2, saveData, deviceMemory, cores, slow}) → '3d'|'2d'` (spec §5.6); `QUALITY_LEVELS = [{scale:1,shadows:true,bloom:true},{scale:.85,shadows:true,bloom:true},{scale:.7,shadows:true,bloom:true},{scale:.7,shadows:false,bloom:true},{scale:.7,shadows:false,bloom:false}]`; `nextQualityLevel(medianMs, level) → level` (>34 ms → +1, <20 ms → −1); `isTooSlow(medianMs, level) → boolean` (level 4 and >50 ms).

- [ ] **Step 1: Write failing tests** (all in `tests/stage.test.mjs`)

```js
test('moods normalize and infer from risk', () => {
  assert.deepEqual(MOODS, ['calm','open','hesitant','anxious','defensive','upset','withdrawn','relieved']);
  assert.equal(normalizeMood(' Defensive ', {}), 'defensive');
  assert.equal(normalizeMood('방어', {risk:'tension', speaker:'a'}), 'defensive');
  assert.equal(normalizeMood(undefined, {risk:'stop', speaker:'v'}), 'withdrawn');
  assert.equal(normalizeMood(null, {risk:'stop', speaker:'g'}), 'anxious');
  assert.equal(normalizeMood('', {risk:'none'}), 'calm');
  assert.deepEqual([moodIntensity('none'), moodIntensity('tension'), moodIntensity('stop'), moodIntensity('x')], [.55, .8, 1, .55]);
});
test('demo moods follow the spec examples', () => {
  assert.equal(demoMood({intent:'pressure', role:'v', variant:'cooperative', phase:'main'}), 'upset');
  assert.equal(demoMood({intent:'pressure', role:'a', variant:'cooperative', phase:'main'}), 'defensive');
  assert.ok(['anxious','withdrawn'].includes(demoMood({intent:'story', role:'v', variant:'unsafe', phase:'pre'})));
  assert.equal(demoMood({intent:'story', role:'a', variant:'resistant', phase:'pre', turn:1}), 'defensive');
  assert.equal(demoMood({intent:'story', role:'v', variant:'resistant', phase:'pre', turn:1}), 'hesitant');
  assert.equal(demoMood({intent:'feeling', role:'v', variant:'cooperative', phase:'main'}), 'open');
  assert.equal(demoMood({intent:'safety', role:'v', variant:'cooperative', phase:'main'}), 'relieved');
  assert.equal(demoMood({intent:'open', role:'a', variant:'relapse', phase:'post'}), 'hesitant');
});
test('hangul timeline maps vowels, closures and pauses', () => {
  assert.deepEqual(decompose('밥'), {initial:7, medial:0, final:17});
  const t = speechTimeline('밥, 어?');
  assert.deepEqual(t.cues.map(c => c.shape), ['M','A','M','REST','REST','E','REST']);
  assert.equal(t.duration, 140 + 220 + 40 + 140 + 380);
  assert.equal(speechTimeline('가', {rate:2}).duration, 70);
  assert.ok(speechTimeline('오우이으').cues.map(c => c.shape).join() === 'O,U,I,EU');
});
test('timeline survives text without Hangul and empty text', () => {
  for (const s of ['OK 123', '😀😀', '...', '']) { const t = speechTimeline(s); assert.ok(Number.isFinite(t.duration)); assert.ok(t.cues.every(c => Number.isFinite(c.start + c.duration + c.open))); }
  assert.equal(speechTimeline('').duration, 0);
  assert.equal(speechTimeline('…').duration, 600);
});
test('looks match the portrait each role already shows', () => {
  for (const c of scenarios) for (const role of ['v','a']) assert.ok(portraitFor(c, role).includes(`student-${lookFor(c, role)}.webp`));
  assert.equal(lookFor(scenarios[0], 'g'), 'guardian');
  assert.equal(Object.keys(LOOKS).length, 7);
});
test('poses carry the body language of each mood', () => {
  assert.equal(poseFor('defensive', {intensity:1}).arms, 'crossed');
  assert.equal(poseFor('anxious', {intensity:1}).arms, 'clasp');
  assert.equal(poseFor('hesitant', {intensity:1}).arms, 'fidget');
  assert.equal(poseFor('withdrawn', {intensity:1}).arms, 'lap');
  const g = m => poseFor(m, {intensity:1}).gazeContact;
  assert.ok(g('open') > g('calm') && g('calm') > g('hesitant') && g('hesitant') > g('anxious') && g('anxious') > g('withdrawn'));
  const r = m => poseFor(m, {intensity:1}).speechRate;
  assert.ok(r('withdrawn') < r('hesitant') && r('hesitant') < 1 && r('anxious') > 1);
  const half = poseFor('defensive', {intensity:.4}).lean, full = poseFor('defensive', {intensity:.8}).lean, calm = POSES.calm.lean;
  assert.ok(Math.abs(half - calm) < Math.abs(full - calm));
  assert.equal(poseFor('open', {state:'speaking', intensity:.8}).arms, 'gesture');
  assert.ok(poseFor('calm', {state:'thinking'}).gazeContact <= .15);
  assert.deepEqual([seatsFor('pre','a'), seatsFor('main','all'), seatsFor('lobby')], [['a'], ['v','a','g'], ['v','a']]);
});
test('stage mode and quality ladder', () => {
  const base = {setting:'auto', webgl2:true, saveData:false, deviceMemory:8, cores:8, slow:false};
  assert.equal(resolveStageMode(base), '3d');
  for (const over of [{setting:'off'}, {webgl2:false}, {saveData:true}, {deviceMemory:2}, {cores:2}, {slow:true}]) assert.equal(resolveStageMode({...base, ...over}), '2d');
  assert.equal(resolveStageMode({...base, setting:'on', slow:true, deviceMemory:2}), '3d');
  assert.equal(resolveStageMode({...base, deviceMemory:undefined, cores:undefined}), '3d');
  assert.equal(nextQualityLevel(40, 0), 1); assert.equal(nextQualityLevel(15, 2), 1); assert.equal(nextQualityLevel(25, 2), 2); assert.equal(nextQualityLevel(60, 4), 4);
  assert.equal(isTooSlow(55, 4), true); assert.equal(isTooSlow(55, 3), false);
});
```

- [ ] **Step 2: Run** `node --test tests/stage.test.mjs` — expected FAIL (modules missing).
- [ ] **Step 3: Implement the five modules** with the signatures above. `demoMood` full table: pressure → v `upset`, a `defensive`, g `anxious`; variant `unsafe` → v `anxious` if intent `safety` else `withdrawn`, a `hesitant`, g `anxious`; phase `pre` + preStep `intro` → `hesitant` for `resistant`, else `calm`; phase `post` → `relapse` all `hesitant`, otherwise intent `safety` or role v/g `relieved`, a `open`; `resistant` and `turn < 4` and intent ≠ `safety` → a `defensive`, v `hesitant`; g → `relieved` for safety, `calm` for plan, else `hesitant`; intent `feeling`/`need`/`plan` → `open`; `safety` → `relieved`; `story` → v `hesitant`, a `calm`; `responsibility` → v `calm`, a `hesitant`; `followup` → `calm`; `open` → `hesitant`. `normalizeMood` also maps the Korean labels of `MOOD_GUIDE` (e.g. `방어`) to their value.
- [ ] **Step 4: Run** `npm test` — expected PASS.
- [ ] **Step 5: Commit** `feat: add pure stage modules for moods, lip-sync, looks, poses and quality`

---

### Task 3: Character spike + stage lab (checkpoint: send pictures to the user)

**Files:**
- Create: `public/stage/character.js`, `public/stage/room.js`, `public/stage/post.js`, `public/stage/render3d.js` (first version), `public/stage-lab.html`, `public/stage-lab.js`
- Test: `tests/stage-browser.mjs` (first section)

**Interfaces:**
- Consumes: Task 1 bundle; Task 2 `LOOKS`, `poseFor`, `blendPose`, `seatsFor`.
- Produces:
  - `createCharacter(T, look) → Character` with `group` (THREE.Group, seated, origin at chair seat), `setPose(pose)`, `setMouth(shape, open)`, `lookAt(worldVec3 | null)`, `update(dt, time)` (breathing, blinking, saccades, nod), `dispose()`.
  - `buildRoom(T) → {group, seatAnchors: {teacher, v, a, g, solo}, lights, dispose()}`.
  - `createPost(T, renderer, scene, camera) → {composer | null, setSize(w, h), setMood(tension:number), render(dt), dispose()}` (half-float RT with `samples:4` as pokju-edu, bloom 0.25/0.4/0.92 with the NaN guard, grade pass with vignette + grain + warm/cool tilt, `needsSwap=false`).
  - `createRenderer3D(container, {reducedMotion}) → Promise<Renderer>`; `Renderer = {kind:'3d', setCast({seats:[{role, lookKey, mood, intensity}], phase}), setState(role, state, {mood, intensity, toward}), setMouth(role, shape, open), setFocus(role|null), resize(), pause(), resume(), onLost(fn), dispose()}`.
  - `stage-lab.html?look=elementary-a&mood=defensive&state=speaking` renders one character; `?cast=main` renders the circle; `window.__lab = {ready:boolean}`.

- [ ] **Step 1: Write the failing browser test section**: `tests/stage-browser.mjs` launches Chromium (`/opt/node-tools/node_modules/playwright`), loads `/stage-lab.html?look=elementary-a&mood=open`, waits for `window.__lab.ready`, asserts the canvas pixel standard deviation of a center crop > 12 (not blank), no `pageerror`, and saves `.test-artifacts/lab-<look>-<mood>.png` at deviceScaleFactor 2 for looks × moods `calm, defensive, anxious, open`.
- [ ] **Step 2: Run** `node tests/stage-browser.mjs` (server on 3210) — expected FAIL (404).
- [ ] **Step 3: Build** room, character (spec §5.4: matte clay `MeshPhysicalMaterial` roughness ≈ .8 + sheen; eyes with lids; brows; mouth with open/width/round driven by shape; jointed arms for `table/crossed/lap/clasp/fidget/gesture`), post, render3d (renderer: sRGB, ACES, `PCFShadowMap`, pixel ratio ≤ 1.5, PMREM `RoomEnvironment`, `renderer.compile` before first frame), lab page.
- [ ] **Step 4: Run** the browser test — expected PASS; look at every screenshot; iterate until faces meet spec §2 (no caricature, no uncanny look).
- [ ] **Step 5: Commit** `feat: add procedural clay characters, meeting room and stage lab`, push, and **send the user the screenshots** (SendUserFile) with one line asking for direction; continue with Task 4 meanwhile.

---

### Task 4: Mood in the conversation data (server, demo, storage)

**Files:**
- Modify: `lib/prompts.mjs` (schema text + `validateReply`), `public/engine.js` (`demoReply`)
- Test: `tests/providers.test.mjs` or `tests/core.test.mjs`, `tests/workspace.test.mjs`

**Interfaces:**
- Consumes: `MOODS`, `MOOD_GUIDE`, `normalizeMood`, `demoMood` from `public/stage/mood.js`.
- Produces: every reply message `{speaker, text, mood}`; participant messages in sessions carry `mood` (app already spreads `...m`).

- [ ] **Step 1: Failing tests**

```js
test('role prompt asks for a mood per message', () => { const p = rolePrompt(prepareContext(ctx)); assert.match(p.system, /"mood"/); for (const m of MOODS) assert.ok(p.system.includes(m)); });
test('validateReply normalizes moods', () => {
  const r = validateReply({messages:[{speaker:'v', text:'네', mood:'Upset'}], risk:'none'}, prepared);
  assert.equal(r.messages[0].mood, 'upset');
  assert.equal(validateReply({messages:[{speaker:'v', text:'네'}], risk:'stop'}, prepared).messages[0].mood, 'withdrawn');
});
test('demo replies carry moods', () => { const r = demoReply(session, c, '싫어도 사과해.'); assert.ok(r.messages.every(m => MOODS.includes(m.mood))); });
test('v0.3 sessions without mood still resume', () => { /* restoreWorkspace + storedSession on a fixture without mood → no throw; normalizeMood(undefined,{risk,speaker}) gives a MOODS value */ });
```

- [ ] **Step 2: Run** `npm test` — expected FAIL.
- [ ] **Step 3: Implement**: add `"mood":"<값>"` to the JSON format line and append `MOOD_GUIDE` plus "observation과 같은 방향으로 고르세요"; `validateReply` maps messages through `normalizeMood(m.mood, {risk, speaker})`; `demoReply` adds `mood: demoMood({intent, variant, phase, preStep, role, turn: n})` (intro branch too).
- [ ] **Step 4: Run** `npm test` — expected PASS.
- [ ] **Step 5: Commit** `feat: add participant mood to AI schema and demo replies`

---

### Task 5: Director, 2D renderer and stage facade

**Files:**
- Create: `public/stage/director.js`, `public/stage/flat.js`, `public/stage/index.js`
- Modify: `public/stage-lab.js` (drive the director), `tests/stage-browser.mjs`

**Interfaces:**
- Consumes: Task 2 modules, Task 3 `createRenderer3D`.
- Produces:
  - `getStage() → Director` (singleton). `readStagePreference() → 'auto'|'on'|'off'`, `writeStagePreference(v)`.
  - `Director = {element, mode, state, attach(slot), detach(), setCast({scenario, phase, target, moods:{v,a,g}}), teacherSaid(text), think(), listen(on), speak(messages, {tts, risk}) → Promise<void>, skip(), interrupt(), setPreference(v), setReducedMotion(b)}`.
  - Host markup (owned by director): `.stage-host[data-stage-mode][data-stage-state][data-speaker][data-mood] > .stage-canvas + .stage-caption > .stage-caption-name + .stage-caption-text`.
  - `createFlatRenderer(container) → Renderer` (same interface as 3D; portraits from `portraitFor`, guardian = text avatar "보"; classes `.flat-seat[data-role][data-state]`).
- Behavior pinned by spec §5.1/§5.3: teacher caption "나: …" while listening; think = all seated look away; speak runs messages in order, `prePause` from pose, cues from `speechTimeline(text, {rate: pose.speechRate})`, caption reveals to `charIndex`; with `tts` it uses `SpeechSynthesisUtterance` (`lang ko-KR`, pitch student 1.15 / guardian 0.9, rate = pose.speechRate × 0.95), syncs on `boundary` (`charIndex`), finishes on `end` or timeline end + 500 ms; reduced motion shows the whole caption at once; `teacherSaid` during speech calls `interrupt()` first. 3D creation failure or `onLost` → swap to flat renderer, keep state, set `data-stage-mode="2d"`.

- [ ] **Step 1: Failing browser tests** (lab page with `?director=1`, flat forced by `?mode=2d` and 3D by default):

```js
await lab.evaluate(() => window.__lab.director.speak([{speaker:'v', text:'제가 그린 건데 허락도 안 받았어요.', mood:'upset'}], {tts:false}));
assert.equal(await host.getAttribute('data-stage-state'), 'idle');
assert.equal(await page.locator('.stage-caption-text').innerText(), '제가 그린 건데 허락도 안 받았어요.');
// during speech: state speaking, data-speaker v, data-mood upset; skip() → caption complete at once
// interrupt: start a long speak, call teacherSaid('잠깐만') → state listening within 300 ms, promise resolves
// two speakers: order v then a, data-speaker changes
// ?mode=2d: same assertions, data-stage-mode 2d, .flat-seat count matches seats
// context loss: WEBGL_lose_context.loseContext() → data-stage-mode 2d, no pageerror
```

- [ ] **Step 2: Run** — expected FAIL.
- [ ] **Step 3: Implement** director, flat renderer, facade.
- [ ] **Step 4: Run** `node tests/stage-browser.mjs` and `npm test` — expected PASS.
- [ ] **Step 5: Commit** `feat: add stage director with captions, lip-sync, speech and 2D fallback`

---

### Task 6: 3D runtime polish — all looks, acting, camera, quality

**Files:**
- Modify: `public/stage/character.js`, `public/stage/render3d.js`, `public/stage/room.js`, `public/stage/post.js`, `tests/stage-browser.mjs`

**Interfaces:**
- Consumes/Produces: unchanged `Renderer` interface. Adds `renderer.debug = {fps, level, paused}` for tests (the director exposes the active renderer as `director.renderer`).

- Behavior (spec §5.4–5.6): all 7 looks; pose transitions 0.6–1.2 s via `blendPose`; listeners look at the speaker (or the camera when the teacher speaks); camera eases 1.2 s to the speaker in multi-seat casts, small handheld drift (off in reduced motion); portrait aspect reframes; grade tilts cooler at risk tension/stop, warmer for `relieved`; loop stops when the host is off-screen, the tab is hidden or `#modal` is open; 30 fps when nobody speaks; quality ladder from `nextQualityLevel` on a 2 s median; `isTooSlow` for 3 s → `onSlow` callback → director stores `dasi.stage.slow=1`, swaps to 2D and toasts once.

- [ ] **Step 1: Failing tests**: (a) a 3000-character reply: caption box height ≤ 34 % of host height and its last line visible, `skip()` completes it, no `pageerror`; (b) resizing the page from 1366×768 to 390×844 and toggling `data-text-size=large`: canvas client size equals the host's within 2 px and the drawing buffer aspect matches; (c) CDP `Emulation.setCPUThrottlingRate {rate: 4}` for 6 s: `renderer.debug.level` increases or the mode becomes 2d, and the page stays responsive (a click handler runs within 500 ms); (d) screenshots of the main-meeting cast for each phase.
- [ ] **Step 2: Run** — expected FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `node tests/stage-browser.mjs` — expected PASS; review screenshots.
- [ ] **Step 5: Commit** `feat: polish 3D characters, camera, quality ladder and slow-device fallback`

---

### Task 7: Design system and app shell

**Files:**
- Create: `public/styles/base.css`, `public/styles/shell.css`
- Modify: `public/index.html` (link `vendor/pretendard/pretendardvariable-dynamic-subset.css` and the seven style files in order base, shell, library, application, room, stage, review), `public/app.js` (shell markup in `render()`: `.topbar` app bar with `nav` holding the existing `.nav-link[data-action]` items, mobile bottom nav), `tests/responsive.mjs` (`.sidebar nav` → `.mobile-nav`)
- Delete: `public/style.css`, `public/experience.css` (after Tasks 8–9 have moved every rule they still need)

**Interfaces:**
- Produces CSS tokens on `:root`: `--bg #F7F5F0`, `--surface #fff`, `--ink`, `--muted`, `--primary #1E4D43`, `--primary-press #163B33`, `--danger`, topic colors `--cat-0…6` (+ `-ink`), `--radius-s 14px`, `--radius 22px`, `--radius-l 28px`, `--shadow-1`, `--shadow-2`, `--ease cubic-bezier(.2,.7,.2,1)`; font stack `"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`. Components: `.button.primary|outline|danger`, `.text-button`, `.icon-button`, inputs, `dialog#modal` (centered card ≥901px, bottom sheet ≤900px), `#toast`.
- Screen transitions: `document.startViewTransition` when available and motion allowed, else the current `animate()` fade.

- [ ] **Step 1: Update** `tests/responsive.mjs` and `tests/browser.mjs` shell assertions to the new markup (bottom nav fixed on mobile, `.topbar [data-action="settings"]` present on desktop and mobile, no horizontal overflow at 320/390/768/1024/1440 in both text sizes).
- [ ] **Step 2: Run** them — expected FAIL.
- [ ] **Step 3: Implement** tokens, base, shell, view transitions.
- [ ] **Step 4: Run** `node tests/responsive.mjs` — expected PASS for shell checks (screen-specific checks may still fail until Tasks 8–9).
- [ ] **Step 5: Commit** `feat: new design system and top app bar shell`

---

### Task 8: Library, case dialog, application, history, guide, review

**Files:**
- Create: `public/styles/library.css`, `public/styles/application.css`, `public/styles/review.css`
- Modify: `public/app.js` (`library()`, `caseCard`, `caseDialog`, `history()`, `guide()`, `reviewPage()`, `settingsDialog()` gains the "3D 대화 장면 자동/켜기/끄기" radio group `name="stage-pref"`), `public/application-view.js`, `public/experience.js`
- Test: `tests/browser.mjs`, `tests/intake-browser.mjs`, `tests/v02-browser.mjs`

**Interfaces:**
- Consumes: `getStage`, `readStagePreference`, `writeStagePreference` (Task 5).
- Produces: library hero contains `<div id="hero-stage-slot">` (desktop ≥901px, mode `3d`, motion allowed), filled after `requestIdleCallback` (fallback 1500 ms) by `getStage().attach(slot)` + `setCast({scenario: scenarios[0], phase:'lobby'})`; otherwise the scene illustration. Existing ids, `data-action` names and classes used by tests (`.case-card`, `.level-group`, `#search`, `#start-form`, `#application-continue`, `.continue-practice`, `.history-item`, `.review-header`, `#reflection`) stay.

- [ ] **Step 1: Add tests**: library first paint makes no request matching `/vendor/three-stage.js` before `requestIdleCallback` fires (record `page.on('request')` until `load` + one animation frame); settings dialog saves `dasi.stage=off` and the room then shows `data-stage-mode="2d"`; existing flows still pass.
- [ ] **Step 2: Run** — expected FAIL.
- [ ] **Step 3: Implement** templates and CSS (spec §6.4 sketches).
- [ ] **Step 4: Run** `node tests/browser.mjs`, `node tests/intake-browser.mjs`, `node tests/v02-browser.mjs` — expected PASS.
- [ ] **Step 5: Commit** `feat: redesign library, application, review, history and guide`

---

### Task 9: Practice room redesign and stage wiring

**Files:**
- Create: `public/styles/room.css`, `public/styles/stage.css`
- Modify: `public/app.js` (`room()`, `composerHtml`, `messageHtml`, `sendMessage`, `microphone`, `stopSpeech`, event handlers, post-render hook), `tests/helpers.mjs` (add `chooseTarget(page, role)` → `page.locator('#target-'+role).check()`), `tests/browser.mjs`, `tests/desktop-room.mjs`, `tests/followups-browser.mjs`, `tests/question-controls.mjs`, `tests/sounds-browser.mjs`, `tests/stage-browser.mjs`

**Interfaces:**
- Consumes: Director API (Task 5), `normalizeMood`.
- Produces: room markup with `#stage-slot` inside `#conversation`, face chips `fieldset.target-chips > input[type=radio][name=target]#target-{v|a|g|all}` (labels carry the avatar), stage controls `[data-action="stage-skip"]`, `[data-action="tts-toggle"]` (`aria-pressed`, replaces `#tts`), `[data-action="stage-mode"]`; the post-render hook calls `attach` and `setCast` when `scenarioId|phase|target` changed, moods = last participant `mood` per role normalized with its `risk`; `sendMessage` calls `teacherSaid` → `think` → `speak(result.messages, {tts: state.tts, risk: result.risk})` and no longer calls `speechSynthesis` itself; leaving the room calls `detach()` and `interrupt()`.

- [ ] **Step 1: Update existing browser tests** to `chooseTarget` and new stage controls; **add** to `tests/stage-browser.mjs` (app flow): send a choice in demo mode → `data-stage-state` goes `listening`/`thinking` → `speaking` → `idle`, caption equals the transcript's last participant bubble; while speaking switch target, advance phase, or go to the library → `speechSynthesis.speaking === false`, the new cast's caption is empty, and on the library the 3D loop reports paused (`renderer.debug.paused`).
- [ ] **Step 2: Run** — expected FAIL.
- [ ] **Step 3: Implement** room layout (spec §6.4 desktop/mobile sketches; desktop height rules from Global Constraints) and wiring.
- [ ] **Step 4: Run** all eight existing browser tests plus `stage-browser.mjs` and `npm test` — expected PASS; then delete `public/style.css` and `public/experience.css` and rerun.
- [ ] **Step 5: Commit** `feat: redesign practice room around the 3D dialogue stage`

---

### Task 10: Docs, version, final verification

**Files:**
- Modify: `public/version.js` (`0.4.0`), `package.json` (`0.4.0`), `README.md` (3D 대화 장면, 설정, 실행 검사 목록), `CHANGELOG.md` (v0.4.0), `docs/UI-DIRECTION.md` (v0.4 direction), `docs/VERIFICATION.md` (commands, results, limits: SwiftShader + CPU throttle, no physical Chromebook/phone, no live AI), `docs/screenshots/desktop.png`, `docs/screenshots/mobile.png`

- [ ] **Step 1: Run** `npm test` and every `tests/*.mjs` browser script against `npm start`; expected all PASS, no page errors.
- [ ] **Step 2: Capture** new screenshots (library, room 3D desktop, room mobile) at deviceScaleFactor 2.
- [ ] **Step 3: Update** docs and version.
- [ ] **Step 4: Commit** `docs: release v0.4.0 notes, verification and screenshots` and push.
