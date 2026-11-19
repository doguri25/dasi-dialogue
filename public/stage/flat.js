// 그림 무대(2D): 3D를 쓸 수 없거나 끈 경우. 기존 학생 그림을 크게 보여 주고 같은 흐름·자막을 씁니다.
export function createFlatRenderer(container) {
 const root=document.createElement('div');root.className='flat-stage';container.appendChild(root);
 const seats=new Map();
 return {
  kind:'2d',debug:{fps:0,level:0,paused:false},
  setCast({seats:list=[],phase='pre'}={}){
   root.dataset.phase=phase;root.dataset.count=String(list.length);
   for(const [role,el] of seats)if(!list.some(s=>s.role===role)){el.remove();seats.delete(role);}
   for(const s of list){
    let el=seats.get(s.role);
    if(!el||el.dataset.look!==s.lookKey){
     el?.remove();el=document.createElement('div');el.className='flat-seat';el.dataset.role=s.role;el.dataset.look=s.lookKey;
     const face=document.createElement('div');face.className='flat-face';
     if(s.lookKey==='guardian'){const span=document.createElement('span');span.className='flat-initial';span.textContent='보';face.append(span);}
     else{const img=document.createElement('img');img.src=`assets/student-${s.lookKey}.webp`;img.alt='';img.width=240;img.height=240;img.decoding='async';face.append(img);}
     const ring=document.createElement('i');ring.className='flat-ring';
     el.append(ring,face);seats.set(s.role,el);
    }
    root.append(el);el.dataset.mood=s.mood||'calm';el.dataset.state='idle';
   }
  },
  setState(role,state,{mood}={}){const el=seats.get(role);if(!el)return;el.dataset.state=state;if(mood)el.dataset.mood=mood;},
  setMouth(role,shape,open){seats.get(role)?.style.setProperty('--open',String(shape==='M'||shape==='REST'?0:open||0));},
  setFocus(role){for(const [r,el] of seats)el.classList.toggle('focused',r===role);},
  resize(){},pause(){},resume(){},
  dispose(){root.remove();seats.clear();}
 };
}
