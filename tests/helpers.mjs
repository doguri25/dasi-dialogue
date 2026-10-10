export async function reviewApplication(page) {
 await page.locator('#application-continue').click();
 await page.locator('#conversation').waitFor();
}

export async function setRoomPane(page,pane){
 if(await page.locator('.mobile-room-tabs').isVisible())await page.locator(`.mobile-room-tabs [data-pane="${pane}"]`).click();
 else if(await page.locator('#facilitator-notes').isVisible()!==(pane==='notes'))await page.locator('.desktop-notes-toggle').click();
}
