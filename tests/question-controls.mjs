import assert from 'node:assert/strict';

// Measure rendered text, including words that wrap; a scrollable list is allowed,
// but each individual card and button must contain all of its own text.
export async function checkQuestionControls(page){
 const result=await page.evaluate(()=>{
  const rgb=value=>value.match(/[\d.]+/g).slice(0,3).map(Number);
  const lum=value=>rgb(value).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const issues=[];
  const contains=(outer,inner)=>inner.left>=outer.left-1&&inner.right<=outer.right+1&&inner.top>=outer.top-1&&inner.bottom<=outer.bottom+1;
  const buttons=[...document.querySelectorAll('.input-method,.composer-wrap button')].filter(el=>el.getBoundingClientRect().width);
  for(const button of buttons){
   const box=button.getBoundingClientRect(),walker=document.createTreeWalker(button,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){
    if(!walker.currentNode.textContent.trim())continue;
    const range=document.createRange();range.selectNodeContents(walker.currentNode);
    if([...range.getClientRects()].some(r=>!contains(box,r)))issues.push('Button text outside: '+button.innerText);
   }
   if(button.scrollWidth>button.clientWidth+1||button.scrollHeight>button.clientHeight+1)issues.push('Button overflow: '+button.innerText);
  }
  for(const card of document.querySelectorAll('.choice-card')){
   const box=card.getBoundingClientRect();
   for(const el of card.querySelectorAll('.choice-text,.choice-title,.choice-selected')){
    const range=document.createRange();range.selectNodeContents(el);const style=getComputedStyle(el);
    if([...range.getClientRects()].some(r=>!contains(box,r)))issues.push('Card text outside: '+el.className);
    if(style.webkitLineClamp!=='none'||style.textOverflow==='ellipsis'||el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1)issues.push('Clipped text: '+el.className);
   }
  }
  const active=getComputedStyle(document.querySelector('.input-method.active')),inactive=getComputedStyle(document.querySelector('.input-method:not(.active)'));
  const card=document.querySelector('.choice-card:not(.selected)'),cardStyle=card&&getComputedStyle(card),panel=getComputedStyle(document.querySelector('.composer-wrap'));
  return {issues,tabTextContrast:contrast(active.color,active.backgroundColor),tabStateContrast:contrast(active.backgroundColor,inactive.backgroundColor),cardBoundaryContrast:cardStyle?contrast(cardStyle.borderTopColor,panel.backgroundColor):null};
 });
 assert.deepEqual(result.issues,[]);
 assert.ok(result.tabTextContrast>=4.5,'active tab text must be readable');
 assert.ok(result.tabStateContrast>=3,'active tab must be distinct from inactive tab');
 if(result.cardBoundaryContrast!==null)assert.ok(result.cardBoundaryContrast>=3,'white cards must have a visible boundary');
 return result;
}
