export async function reviewApplication(page) {
 await page.locator('#application-continue').click();
 await page.locator('#conversation').waitFor();
}
