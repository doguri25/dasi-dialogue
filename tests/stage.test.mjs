import test from 'node:test';
import assert from 'node:assert/strict';
import {stat} from 'node:fs/promises';

test('vendored three bundle exposes r187 and the post-processing addons',async()=>{
 const T=await import('../public/vendor/three-stage.js');
 assert.equal(T.REVISION,'187');
 for(const k of ['WebGLRenderer','EffectComposer','RenderPass','UnrealBloomPass','ShaderPass','OutputPass','RoomEnvironment','mergeGeometries'])assert.equal(typeof T[k],'function',k);
 assert.ok((await stat('public/vendor/three-stage.js')).size<=800*1024);
});
