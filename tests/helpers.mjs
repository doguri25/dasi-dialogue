export async function reviewApplication(page) {
 await page.locator('#application-continue').click();
 await page.locator('#conversation').waitFor();
}

export async function setRoomPane(page,pane){
 if(await page.locator('.mobile-room-tabs').isVisible())await page.locator(`.mobile-room-tabs [data-pane="${pane}"]`).click();
 else if(await page.locator('#facilitator-notes').isVisible()!==(pane==='notes'))await page.locator('.desktop-notes-toggle').click();
}

// PC는 카드를 누르면 문장 창에서 읽고 고릅니다. 휴대전화(v0.9)는 누르면 바로 고르고, 고른 문장 전체를 카드 자리에 보여 줍니다.
export async function chooseQuestion(page,index=0){
 const card=page.locator('.choice-card').nth(index),full=await card.locator('.choice-text').textContent();
 await card.click();
 if(await page.locator('#modal').evaluate(d=>d.open)){
  const shown=await page.locator('#modal .choice-detail').innerText();
  if(shown!==full)throw new Error('Question detail must show the complete original sentence');
  await page.locator('#modal [data-action="choose-example"]').click();
 }else{
  const shown=(await page.locator('.mobile-selection .selection-text').textContent()).trim();
  if(shown!==full.trim())throw new Error('The chosen sentence must be shown in full');
 }
 return full;
}

// v0.4: 대화 상대는 얼굴 버튼(라디오)으로 고릅니다.
export async function chooseTarget(page,role){
 await page.locator(`#target-${role}`).check();
}

// 휴대전화 연습 중(v0.9)에는 앱의 위 막대가 숨고 도구(글자 크기·설정·사례 목록 등)는 메뉴(⋯)에 있습니다.
// 보이는 버튼이 있으면 그것을, 없으면 메뉴를 열어 누릅니다.
export async function tool(page,name){
 const shown=page.locator(`[data-action="${name}"]:visible`).first();
 if(await shown.count())return shown.click();
 await page.locator('[data-action="room-menu"]').click();
 await page.locator(`#modal [data-action="${name}"]`).click();
}

// 고른 문장 보내기: 휴대전화는 카드 자리에 나온 보내기, PC는 질문 칸 아래 보내기
export async function sendChoice(page){
 const phone=page.locator('#send-selected');
 if(await phone.isVisible())return phone.click();
 return page.locator('#compose button[type="submit"]').click();
}
