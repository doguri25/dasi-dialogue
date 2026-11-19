// Rebuilds the files in public/vendor/. Not needed to run the app; run it only to update a vendored library.
//   node tools/vendor-three.mjs
// Needs network access to the npm registry. It downloads three@0.187.0 and pretendard@1.3.9 into a temporary folder,
// bundles three.js and the add-ons the 3D dialogue stage uses into one ES module (public/vendor/three-stage.js),
// and copies the Pretendard Variable dynamic-subset web font (public/vendor/pretendard/).
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,cpSync,rmSync,existsSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const VENDOR=path.join(ROOT,'public','vendor');
const THREE='0.187.0',PRETENDARD='1.3.9',ESBUILD='0.28.2';
const work=mkdtempSync(path.join(tmpdir(),'dasi-vendor-'));
const run=(cmd,args,cwd=work)=>execFileSync(cmd,args,{cwd,stdio:['ignore','pipe','inherit']}).toString().trim();

try{
 writeFileSync(path.join(work,'package.json'),JSON.stringify({private:true,type:'module'}));
 run('npm',['install','--no-audit','--no-fund','--ignore-scripts',`three@${THREE}`,`pretendard@${PRETENDARD}`,`esbuild@${ESBUILD}`]);
 const entry=path.join(work,'entry.js');
 writeFileSync(entry,[
  "export * from 'three';",
  "export {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';",
  "export {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';",
  "export {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';",
  "export {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';",
  "export {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';",
  "export {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';",
  "export {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';"
 ].join('\n'));
 const out=path.join(work,'three-stage.js');
 run(path.join(work,'node_modules','.bin','esbuild'),[entry,'--bundle','--format=esm','--minify','--legal-comments=none','--target=es2020',`--outfile=${out}`]);
 const license=readFileSync(path.join(work,'node_modules','three','LICENSE'),'utf8').trim();
 mkdirSync(VENDOR,{recursive:true});
 writeFileSync(path.join(VENDOR,'three-stage.js'),`/*! three.js r${THREE.split('.')[1]} (https://threejs.org) with EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, RoomEnvironment, mergeGeometries.\n${license}\n*/\n`+readFileSync(out,'utf8'));

 const font=path.join(work,'node_modules','pretendard'),fontOut=path.join(VENDOR,'pretendard');
 if(existsSync(fontOut))rmSync(fontOut,{recursive:true});
 mkdirSync(fontOut,{recursive:true});
 cpSync(path.join(font,'dist','web','variable','pretendardvariable-dynamic-subset.css'),path.join(fontOut,'pretendardvariable-dynamic-subset.css'));
 cpSync(path.join(font,'dist','web','variable','woff2-dynamic-subset'),path.join(fontOut,'woff2-dynamic-subset'),{recursive:true});
 cpSync(path.join(font,'dist','LICENSE.txt'),path.join(fontOut,'LICENSE.txt'));
 console.log('three-stage.js',Math.round(statSync(path.join(VENDOR,'three-stage.js')).size/1024)+' KB');
}finally{rmSync(work,{recursive:true,force:true});}
