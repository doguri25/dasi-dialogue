// 움직임(v1.2): 원인과 결과를 보여 줄 때만, 모두 같은 리듬(시간·곡선)으로 움직입니다.
// 동작 줄이기를 켜면 하지 않고, 애니메이션이 끝나기를 기다려 상태를 바꾸지 않습니다(누르는 동안에도 화면은 늘 반응).
export const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
export const DUR={press:140,state:220,enter:420,exit:260};   // 나갈 때는 들어올 때의 약 60%
const SPRING='linear(0,.009,.035 2.1%,.141,.281 6.7%,.723 12.9%,.938 16.7%,1.017,1.077,1.121,1.149 24.3%,1.159,1.163,1.161,1.154 29.9%,1.129 32.8%,1.051 39.6%,1.017 43.1%,.991,.977 51%,.974 53.8%,.975 57.1%,.997 69.8%,1.003 76.9%,1)';
export const spring=(typeof CSS!=='undefined'&&CSS.supports?.('transition-timing-function',SPRING))?SPRING:'cubic-bezier(.3,1.35,.5,1)';
export const OUT='cubic-bezier(.22,1,.36,1)',IN='cubic-bezier(.45,0,.9,.4)';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

// 화면 바꾸기: 같은 것(사례 카드 제목 → 연습실 제목 → 회고 제목)은 이어지고, 나머지는 앞(왼쪽)이나 뒤(오른쪽)로 미끄러집니다.
// 바꾸는 일은 update 안에서 곧바로 일어나고, 전환 효과는 그 위에 얹힐 뿐입니다(효과 중에도 누르기를 막지 않음: CSS의 ::view-transition).
export function navigate(dir,update){
 const root=document.documentElement;
 if(reduced()||typeof document.startViewTransition!=='function'||document.visibilityState==='hidden'){update();return;}
 root.dataset.nav=dir;
 try{
  const vt=document.startViewTransition(update);
  vt.finished.catch(()=>{}).finally(()=>{if(root.dataset.nav===dir)delete root.dataset.nav;});
  vt.ready.catch(()=>{});vt.updateCallbackDone?.catch(()=>{});
 }catch{delete root.dataset.nav;update();}
}
// 보낸 말: 누른 제안(또는 입력칸) 자리에서 대화 기록의 내 말풍선 자리로 날아갑니다.
export function flyFrom(src,el){
 if(!src||!el||reduced())return;
 const to=el.getBoundingClientRect();if(!to.width||!src.width)return;
 const dx=src.left-to.left,dy=src.top-to.top,sx=clamp(src.width/to.width,.5,1.6),sy=clamp(src.height/to.height,.5,1.6);
 for(const a of el.getAnimations())a.cancel();
 el.animate([{transformOrigin:'0 0',transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`,opacity:.55},{transformOrigin:'0 0',transform:'none',opacity:1}],{duration:DUR.enter+60,easing:spring});
}
// 학생·보호자의 답: 그 사람 쪽(왼쪽 아래)에서 말풍선이 톡 튀어나옵니다. 여럿이면 차례로.
export function popIn(el,i=0){
 if(!el||reduced())return;
 const delay=i*120,b=el.querySelector('.bubble'),av=el.querySelector('.avatar');
 b?.animate([{transform:'scale(.55)',opacity:0},{transform:'none',opacity:1}],{duration:DUR.enter,delay,easing:spring,fill:'backwards'});
 av?.animate([{transform:'scale(.4)',opacity:0},{transform:'none',opacity:1}],{duration:DUR.enter,delay,easing:spring,fill:'backwards'});
 el.querySelector('.who')?.animate([{opacity:0},{opacity:1}],{duration:DUR.state,delay:delay+80,easing:OUT,fill:'backwards'});
}
export function fadeUp(el,i=0){if(el&&!reduced())el.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:DUR.enter,delay:i*40,easing:OUT,fill:'backwards'});}
// 되돌리기: 지운 내 말이 입력칸으로 돌아가는 모습(복사본만 움직이고, 지우기는 이미 끝났습니다).
export function ghostTo(rect,html,toEl){
 if(!rect||!toEl||reduced())return;
 const b=toEl.getBoundingClientRect(),g=document.createElement('div');
 g.className='motion-ghost';g.setAttribute('aria-hidden','true');g.innerHTML=html;g.querySelectorAll('[data-action],[id]').forEach(n=>{n.removeAttribute('data-action');n.removeAttribute('id');});
 Object.assign(g.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
 document.body.append(g);
 const anim=g.animate([{transform:'none',opacity:1},{transform:`translate(${b.left+12-rect.left}px,${b.top+4-rect.top}px) scale(.55)`,opacity:0}],{duration:DUR.exit+60,easing:IN,fill:'forwards'});
 const drop=()=>g.remove();anim.finished.then(drop,drop);setTimeout(drop,DUR.exit+400);
}
// 작은 알림: 체크한 줄이 톡 튀고, 다음 단계 단추가 한 번 빛납니다.
export function bump(el,s=1.035){if(el&&!reduced())el.animate([{transform:'none'},{transform:`scale(${s})`},{transform:'none'}],{duration:DUR.enter,easing:spring});}
export function glow(el){if(el&&!reduced())el.animate([{boxShadow:'0 0 0 0 rgba(244,191,69,.75)'},{boxShadow:'0 0 0 12px rgba(244,191,69,0)'}],{duration:900,easing:OUT,iterations:2});}
export function stagger(nodes,max=12){if(reduced())return;[...nodes].slice(0,max).forEach((el,i)=>el.animate([{opacity:0,transform:'translateY(14px) scale(.98)'},{opacity:1,transform:'none'}],{duration:DUR.enter,delay:i*38,easing:spring,fill:'backwards'}));}
