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
// 연습실 3D에 필요한 파일(render3d.js가 불러오는 모든 파일, tests/stage.test.mjs가 목록을 확인).
export const STAGE_3D_FILES=['./render3d.js','../vendor/three-stage.js','./room.js','./textures.js','./character.js','./post.js','./looks.js','../artwork.js','./acting.js','./support.js'];
let preloaded=false;
// 파일만 받아 둡니다(modulepreload). WebGL 확인이나 3D 만들기는 연습실에 들어갈 때 합니다. 3D를 끄거나 데이터 절약·느린 기기면 받지 않습니다.
export function preloadStage() {
 if(preloaded)return;
 let slow=false;try{slow=localStorage.getItem(SLOW)==='1';}catch{}
 const mode=resolveStageMode({setting:readStagePreference(),webgl2:true,saveData:!!navigator.connection?.saveData,deviceMemory:navigator.deviceMemory,cores:navigator.hardwareConcurrency,slow});
 if(mode!=='3d')return;
 preloaded=true;
 for(const file of STAGE_3D_FILES){const link=document.createElement('link');link.rel='modulepreload';link.href=new URL(file,import.meta.url).href;document.head.append(link);}
}
// 첫 화면을 다 그리고 한가해진 뒤에 미리 받습니다(첫 화면이 그려지는 동안은 3D 파일을 받지 않음).
export function preloadStageWhenIdle() {
 const idle=cb=>window.requestIdleCallback?requestIdleCallback(cb,{timeout:4000}):setTimeout(cb,300);
 const later=()=>setTimeout(()=>idle(preloadStage),1500);
 if(document.readyState==='complete')later();else addEventListener('load',later,{once:true});
}
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
