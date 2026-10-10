import assert from 'node:assert/strict';

// The four cards must fit in a 2x2 grid; detail text is read in the dialog.
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
   for(const el of card.querySelectorAll('.choice-title,.choice-selected,.choice-open')){
    const range=document.createRange();range.selectNodeContents(el);const style=getComputedStyle(el);
    if([...range.getClientRects()].some(r=>!contains(box,r)))issues.push('Card text outside: '+el.className);
    if(style.webkitLineClamp!=='none'||style.textOverflow==='ellipsis'||el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1)issues.push('Clipped text: '+el.className);
   }
  }
  const grid=document.querySelector('.choice-grid');
  if(grid){
   const cards=[...grid.querySelectorAll('.choice-card')].map(el=>el.getBoundingClientRect()),box=grid.getBoundingClientRect();
   if(cards.length!==4||cards.some(card=>!contains(box,card)))issues.push('All four cards must fit inside the grid');
   if(cards.length===4&&(Math.abs(cards[0].top-cards[1].top)>1||Math.abs(cards[2].top-cards[3].top)>1||cards[2].top<=cards[0].bottom||cards[1].left<=cards[0].right))issues.push('Choices must form two rows and two columns');
   if(grid.scrollHeight>grid.clientHeight+1)issues.push('Choice grid must not scroll');
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
