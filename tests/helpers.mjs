export async function reviewApplication(page) {
 await page.locator('#application-continue').click();
 await page.locator('#conversation').waitFor();
}

export async function setRoomPane(page,pane){
 if(await page.locator('.mobile-room-tabs').isVisible())await page.locator(`.mobile-room-tabs [data-pane="${pane}"]`).click();
 else if(await page.locator('#facilitator-notes').isVisible()!==(pane==='notes'))await page.locator('.desktop-notes-toggle').click();
}

export async function chooseQuestion(page,index=0){
 const card=page.locator('.choice-card').nth(index),full=await card.locator('.choice-text').textContent();
 await card.click();
 const shown=await page.locator('#modal .choice-detail').innerText();
 if(shown!==full)throw new Error('Question detail must show the complete original sentence');
 await page.locator('#modal [data-action="choose-example"]').click();
 return full;
}
