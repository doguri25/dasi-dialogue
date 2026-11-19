// 무대 입구: 앱 전체에서 무대 하나(같은 렌더러·캔버스)를 함께 씁니다.
import {createDirector} from './director.js';
import {createFlatRenderer} from './flat.js';
import {resolveStageMode} from './support.js';

const PREF='dasi.stage',SLOW='dasi.stage.slow';
let director=null,webgl2=null,noticeFn=null;

export function readStagePreference() {
 try{const v=localStorage.getItem(PREF);return ['auto','on','off'].includes(v)?v:'auto';}catch{return 'auto';}
}
function hasWebGL2() {
 if(webgl2!==null)return webgl2;
 try{const c=document.createElement('canvas'),g=c.getContext('webgl2');webgl2=!!g;g?.getExtension('WEBGL_lose_context')?.loseContext();}catch{webgl2=false;}
 return webgl2;
}
export function stageMode(setting=readStagePreference()) {
 let slow=false;try{slow=localStorage.getItem(SLOW)==='1';}catch{}
 return resolveStageMode({setting,webgl2:hasWebGL2(),saveData:!!navigator.connection?.saveData,deviceMemory:navigator.deviceMemory,cores:navigator.hardwareConcurrency,slow});
}
export function writeStagePreference(value) {
 const v=['auto','on','off'].includes(value)?value:'auto';
 try{localStorage.setItem(PREF,v);if(v==='on')localStorage.removeItem(SLOW);}catch{}
 director?.setSlowFallback(v==='auto');director?.setMode(stageMode(v));
 return v;
}
export function onStageNotice(fn){noticeFn=fn;}
// 느린 기기에서 그림 무대로 바꾸는 것은 '자동'일 때만입니다(설계 5.6).
export function getStage({forceMode,slowFallback=readStagePreference()==='auto'}={}) {
 if(!director)director=createDirector({
  mode:forceMode||stageMode(),
  reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
  load3D:()=>import('./render3d.js').then(m=>m.createRenderer3D),
  createFlat:createFlatRenderer,
  slowFallback,
  onNotice:text=>noticeFn?.(text)
 });
 return director;
}
