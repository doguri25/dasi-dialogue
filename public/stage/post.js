// 화면 마무리: 장면 → 빛 번짐 → 색 보정 → 톤 매핑(OutputPass).
// 폭주 구구단(pokju-edu)의 js_fx2.js와 grade.frag 구성을 대화실에 맞게 줄였습니다.
const GRADE=`uniform sampler2D tDiffuse;uniform float uTime,uMood,uAspect;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 vec3 col=texture2D(tDiffuse,vUv).rgb;
 col=pow(max(col,vec3(0.)),vec3(1.08));
 vec2 c=vUv-.5;c.x*=uAspect*.62;float r=length(c);
 float l=dot(col,vec3(.2126,.7152,.0722));
 // 긴장(uMood>0): 조금 차갑고 채도가 낮게, 안도(uMood<0): 조금 따뜻하게
 float tense=max(uMood,0.),warm=max(-uMood,0.);
 col=mix(col,vec3(l),.12*tense);
 col*=mix(vec3(1.),vec3(.96,.985,1.04),tense);
 col*=mix(vec3(1.),vec3(1.04,1.,.95),warm);
 col*=1.-smoothstep(.42,.95,r)*.24;
 col+=(h(vUv*913.+fract(uTime)*41.)-.5)*.012;
 gl_FragColor=vec4(col,1.);
}`;

export function createPost(T,renderer,scene,camera) {
 let composer=null,bloom=null,grade=null,rt=null;
 try{
  rt=new T.WebGLRenderTarget(2,2,{type:T.HalfFloatType,samples:4});
  composer=new T.EffectComposer(renderer,rt);
  composer.addPass(new T.RenderPass(scene,camera));
  bloom=new T.UnrealBloomPass(new T.Vector2(256,256),.18,.35,1.2);
  const size=bloom.setSize.bind(bloom);
  bloom.setSize=(w,h)=>{const k=Math.min(1,960/Math.max(1,w));size(Math.round(w*k),Math.round(h*k));};
  // 한 픽셀의 NaN이 빛 번짐으로 화면 전체를 검게 만들지 않도록(pokju-edu 1.4와 같음)
  const hp=bloom.materialHighPassFilter,from='vec4 texel = texture2D( tDiffuse, vUv );';
  if(hp.fragmentShader.includes(from)){hp.fragmentShader=hp.fragmentShader.replace(from,from+'\n\t\t\tif ( any( isnan( texel ) ) || any( isinf( texel ) ) ) texel = vec4( 0.0 );');hp.needsUpdate=true;}
  composer.addPass(bloom);
  grade=new T.ShaderPass({uniforms:{tDiffuse:{value:null},uTime:{value:0},uMood:{value:0},uAspect:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:GRADE});
  composer.addPass(grade);
  composer.addPass(new T.OutputPass());
 }catch{composer?.dispose?.();composer=null;rt?.dispose();rt=null;}
 let mood=0,moodTarget=0;
 return {
  get active(){return !!composer;},
  setSize(w,h){if(!composer)return;composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);grade.uniforms.uAspect.value=w/Math.max(1,h);},
  setBloom(on){if(bloom)bloom.enabled=on;},
  setMood(v){moodTarget=Math.max(-1,Math.min(1,v));},
  render(dt,time){
   mood+=(moodTarget-mood)*(1-Math.exp(-dt*1.5));
   if(!composer){renderer.render(scene,camera);return;}
   grade.uniforms.uTime.value=time;grade.uniforms.uMood.value=mood;
   composer.render(dt);
  },
  dispose(){composer?.dispose?.();rt?.dispose();}
 };
}
