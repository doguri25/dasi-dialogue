// 관계회복 대화실: 밝은 나무 원탁, 의자, 오후 햇빛이 드는 창, 책장과 화분.
// 원탁 가운데가 원점이고 교사(카메라)는 +z 쪽에 앉습니다.
export const TABLE_Y=.74,SEAT_Y=.45,SEAT_R=.86,TABLE_R=.62;
const deg=Math.PI/180;
// 각도는 +z(교사)에서 +x 쪽으로 잰 값입니다.
const LAYOUTS={
 pre:{v:180,a:180,g:180},
 main:{v:-148,a:148,g:-104},
 lobby:{v:-128,a:128}
};

export function buildRoom(T) {
 const group=new T.Group(),geoms=[],mats=[],chairs=new Map();
 const geo=g=>{geoms.push(g);return g;};
 const clay=(color,o={})=>{const m=new T.MeshPhysicalMaterial({color,roughness:.8,sheen:.25,sheenRoughness:.8,sheenColor:new T.Color(color).lerp(new T.Color('#fff'),.4),...o});mats.push(m);return m;};
 const mesh=(parent,g,m,{p=[0,0,0],r=[0,0,0],s=[1,1,1]}={},shadow=true)=>{const o=new T.Mesh(g,m);o.position.set(...p);o.rotation.set(...r);o.scale.set(...s);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;};
 const SPH=geo(new T.SphereGeometry(1,24,16)),BOX=geo(new T.BoxGeometry(1,1,1)),CYL=geo(new T.CylinderGeometry(1,1,1,32));

 // 바닥: 결이 보이는 밝은 나무
 const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');
 g.fillStyle='#d9b894';g.fillRect(0,0,512,512);
 for(let i=0;i<8;i++){g.fillStyle=i%2?'#d3b08a':'#dcbd9a';g.fillRect(0,i*64,512,62);g.fillStyle='rgba(120,80,40,.18)';g.fillRect(0,i*64+62,512,2);for(let j=0;j<3;j++){g.fillStyle='rgba(120,80,40,.06)';g.fillRect(((i*137+j*211)%512),i*64,2,62);}}
 const floorTex=new T.CanvasTexture(c);floorTex.colorSpace=T.SRGBColorSpace;floorTex.wrapS=floorTex.wrapT=T.RepeatWrapping;floorTex.repeat.set(3,3);
 const floor=mesh(group,geo(new T.PlaneGeometry(9,9)),new T.MeshStandardMaterial({map:floorTex,roughness:.72}),{r:[-Math.PI/2,0,0]},false);mats.push(floor.material);
 mesh(group,geo(new T.CircleGeometry(1.55,64)),clay('#c7d6bd'),{p:[0,.004,0],r:[-Math.PI/2,0,0]},false);
 mesh(group,geo(new T.RingGeometry(1.42,1.5,64)),clay('#afc3a3'),{p:[0,.006,0],r:[-Math.PI/2,0,0]},false);

 // 벽: 크림색 벽과 세이지색 징두리
 const wallMat=clay('#efe6d6',{sheen:0}),sage=clay('#c9d6bf',{sheen:0});
 mesh(group,BOX,wallMat,{p:[0,1.6,-2.7],s:[9,3.2,.1]},false);
 mesh(group,BOX,sage,{p:[0,.48,-2.62],s:[9,.96,.06]},false);
 mesh(group,BOX,clay('#e8dcc6'),{p:[0,.97,-2.58],s:[9,.04,.06]},false);
 for(const x of [-3.4,3.4]){mesh(group,BOX,wallMat,{p:[x,1.6,0],s:[.1,3.2,9]},false);mesh(group,BOX,sage,{p:[x*.985,.48,0],s:[.06,.96,9]},false);}

 // 창: 은은하게 빛나 빛 번짐이 생깁니다.
 const win=new T.Group();win.position.set(1.7,1.62,-2.62);group.add(win);
 const glass=new T.MeshBasicMaterial({color:new T.Color(1.5,1.44,1.28)});mats.push(glass);
 mesh(win,BOX,glass,{s:[1.3,1.15,.02]},false);
 const frame=clay('#f6efe2');
 for(const [x,y,w,h] of [[0,.6,1.42,.08],[0,-.6,1.42,.1],[-.68,0,.08,1.28],[.68,0,.08,1.28],[0,0,.05,1.15],[0,.05,1.3,.04]])mesh(win,BOX,frame,{p:[x,y,.03],s:[w,h,.06]});
 for(const s of [-1,1])mesh(win,BOX,clay('#f2d2b8'),{p:[s*.84,-.02,.1],s:[.22,1.38,.05]});
 mesh(win,CYL,clay('#e2c49f'),{p:[0,.74,.12],r:[0,0,Math.PI/2],s:[.02,1.95,.02]});
 mesh(win,BOX,clay('#f6efe2'),{p:[0,-.66,.12],s:[1.6,.05,.22]});
 // 창가 화분
 const pot=new T.Group();pot.position.set(1.9,1.0,-2.45);group.add(pot);
 mesh(pot,geo(new T.CylinderGeometry(.09,.07,.14,24)),clay('#d9896a'),{p:[0,.07,0]});
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2;mesh(pot,SPH,clay(i%2?'#7fa36f':'#8db37c'),{p:[Math.cos(a)*.05,.18+(i%3)*.03,Math.sin(a)*.05],r:[Math.cos(a)*.6,0,Math.sin(a)*.6],s:[.035,.09,.035]});}

 // 책장
 const shelf=new T.Group();shelf.position.set(-1.55,0,-2.45);group.add(shelf);
 const wood=clay('#e2c49f');
 mesh(shelf,BOX,wood,{p:[0,.8,0],s:[1.1,1.6,.34]});
 const inner=clay('#d6b48c');for(let i=0;i<3;i++)mesh(shelf,BOX,inner,{p:[0,.32+i*.46,.03],s:[1.0,.4,.3]});
 const bookColors=['#9db697','#b7a8d8','#f2c6a5','#d6a14f','#8fa7c9','#e8a6a0','#c9d6bf','#f3e3b5'];
 for(let row=0;row<3;row++){let x=-.46;for(let i=0;x<.42;i++){const w=.05+((row*7+i*3)%4)*.012,h=.24+((row*5+i*7)%5)*.025;mesh(shelf,BOX,clay(bookColors[(row*3+i)%bookColors.length]),{p:[x+w/2,.14+row*.46+h/2,.08],r:[0,0,i%7===3?.18:0],s:[w,h,.2]});x+=w+.006;}}
 mesh(shelf,geo(new T.CylinderGeometry(.08,.065,.12,20)),clay('#e7d3b7'),{p:[.3,1.66,0]});
 for(let i=0;i<5;i++)mesh(shelf,SPH,clay('#7fa36f'),{p:[.3+(i-2)*.03,1.78+(i%2)*.04,0],r:[0,0,(i-2)*.4],s:[.03,.08,.03]});
 // 벽 그림(글자 없음)
 const art=new T.Group();art.position.set(-.2,1.85,-2.63);group.add(art);
 mesh(art,BOX,clay('#f8f3ea'),{s:[.7,.5,.03]});
 mesh(art,SPH,clay('#f2c6a5'),{p:[-.12,.03,.02],s:[.12,.12,.01]});mesh(art,SPH,clay('#9db697'),{p:[.1,-.05,.025],s:[.15,.1,.01]});mesh(art,SPH,clay('#b7a8d8'),{p:[.16,.1,.03],s:[.06,.06,.01]});
 // 큰 화분(오른쪽 구석)
 const big=new T.Group();big.position.set(2.5,0,-2.0);group.add(big);
 mesh(big,geo(new T.CylinderGeometry(.22,.17,.42,28)),clay('#efe1cf'),{p:[0,.21,0]});
 for(let i=0;i<11;i++){const a=i/11*Math.PI*2,r=.06+(i%3)*.05;mesh(big,SPH,clay(i%2?'#79a06c':'#91b783'),{p:[Math.cos(a)*r,.62+(i%4)*.12,Math.sin(a)*r],r:[Math.sin(a)*.5,a,Math.cos(a)*.5],s:[.07,.2,.03]});}

 // 원탁
 const table=new T.Group();group.add(table);
 const tableWood=clay('#e6c9a3',{roughness:.62});
 mesh(table,geo(new T.CylinderGeometry(TABLE_R,TABLE_R,.045,64)),tableWood,{p:[0,TABLE_Y,0]});
 mesh(table,geo(new T.TorusGeometry(TABLE_R,.024,12,64)),tableWood,{p:[0,TABLE_Y,0],r:[Math.PI/2,0,0]});
 mesh(table,CYL,clay('#d8b78f'),{p:[0,TABLE_Y/2,0],s:[.06,TABLE_Y,.06]});
 mesh(table,CYL,clay('#d8b78f'),{p:[0,.02,0],s:[.32,.04,.32]});
 // 탁자 위: 작은 다육 화분, 이야기 돌, 교사의 수첩
 const succ=new T.Group();succ.position.set(.28,TABLE_Y+.022,-.12);table.add(succ);
 mesh(succ,geo(new T.CylinderGeometry(.05,.04,.07,20)),clay('#f2c6a5'),{p:[0,.035,0]});
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2;mesh(succ,SPH,clay('#8db37c'),{p:[Math.cos(a)*.02,.08,Math.sin(a)*.02],r:[Math.cos(a)*.7,0,Math.sin(a)*.7],s:[.016,.03,.016]});}
 const stone=mesh(table,SPH,clay('#bfb3a6',{roughness:.5}),{p:[-.06,TABLE_Y+.04,.02],s:[.06,.026,.045]});
 const pad=new T.Group();pad.position.set(.1,TABLE_Y+.03,.42);pad.rotation.y=-.18;table.add(pad);
 mesh(pad,BOX,clay('#fbf8f2'),{s:[.2,.012,.27]});mesh(pad,BOX,clay('#9db697'),{p:[0,-.004,0],s:[.205,.008,.275]});
 mesh(pad,geo(new T.CylinderGeometry(.006,.006,.17,10)),clay('#d6a14f'),{p:[.13,.008,0],r:[Math.PI/2,0,.1]});

 // 의자
 const chairColors={v:'#f2c6a5',a:'#c9bfe6',g:'#c9d6bf',solo:'#f2c6a5'};
 function chair(color){
  const ch=new T.Group(),seatMat=clay(color),legMat=clay('#e2c49f');
  mesh(ch,SPH,seatMat,{p:[0,SEAT_Y-.03,0],s:[.24,.05,.23]});
  mesh(ch,SPH,seatMat,{p:[0,SEAT_Y+.3,-.21],r:[-.12,0,0],s:[.23,.22,.05]});
  for(const [x,z] of [[-.17,-.16],[.17,-.16],[-.17,.16],[.17,.16]])mesh(ch,CYL,legMat,{p:[x,(SEAT_Y-.05)/2,z],s:[.02,SEAT_Y-.05,.02]});
  for(const x of [-.17,.17])mesh(ch,CYL,legMat,{p:[x,SEAT_Y+.12,-.2],r:[-.12,0,0],s:[.016,.32,.016]});
  return ch;
 }
 function anchorFor(angle,radius=SEAT_R){
  const a=angle*deg,pos=new T.Vector3(Math.sin(a)*radius,SEAT_Y,Math.cos(a)*radius);
  return {position:pos,facing:Math.atan2(-pos.x,-pos.z)};
 }
 // 자리 배치: 사전모임은 마주 앉고, 본·사후모임은 원으로 앉습니다.
 function arrange(layout,roles){
  const angles=LAYOUTS[layout]||LAYOUTS.main,out={};
  for(const [key,obj] of chairs){if(!roles.includes(key)){obj.removeFromParent();chairs.delete(key);}}
  for(const role of roles){
   const anc=anchorFor(angles[role]??180);out[role]=anc;
   let ch=chairs.get(role);if(!ch){ch=chair(chairColors[role]||chairColors.solo);chairs.set(role,ch);group.add(ch);}
   ch.position.set(anc.position.x,0,anc.position.z);ch.rotation.y=anc.facing;
  }
  return out;
 }

 // 빛: 하늘·바닥 반구광, 창 쪽 따뜻한 주광(그림자), 반대편 보조광, 뒤쪽 테두리광
 const lights=new T.Group();group.add(lights);
 const hemi=new T.HemisphereLight('#fff4e6','#a8957d',.85);lights.add(hemi);
 const key=new T.DirectionalLight('#ffe0bd',1.9);key.position.set(2.4,3.4,1.2);key.target.position.set(0,.8,-.4);lights.add(key,key.target);
 key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-2.2,right:2.2,top:2.2,bottom:-1,near:.5,far:9});key.shadow.bias=-.0004;key.shadow.normalBias=.025;
 const fill=new T.DirectionalLight('#dfe8ff',.4);fill.position.set(-2.5,1.8,2.2);lights.add(fill);
 const rim=new T.DirectionalLight('#fff1dc',.7);rim.position.set(1.2,2.6,-3.2);lights.add(rim);

 return {
  group,key,arrange,
  tableHeight:TABLE_Y,seatHeight:SEAT_Y,
  setShadows(on){key.castShadow=on;},
  dispose(){group.removeFromParent();geoms.forEach(g=>g.dispose());mats.forEach(m=>{m.map?.dispose?.();m.dispose();});}
 };
}
