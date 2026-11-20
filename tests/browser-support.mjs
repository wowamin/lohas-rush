// Exercise the real Skip control; never bypass onboarding through app-only flags.
export async function dismissDrivingGuide(page) {
  await page.locator('main[data-guide-state]').waitFor();
  if(await page.locator('main').getAttribute('data-guide-state')==='open')
    await page.getByRole('button',{name:'略過引導',exact:true}).click();
  await page.locator('main[data-loading-state="ready"]').waitFor({timeout:30000});
  await dismissOrientationNotice(page);
}

export async function dismissOrientationNotice(page) {
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  if(await page.locator('main').getAttribute('data-orientation-state')==='open')
    await page.getByRole('button',{name:'繼續直向遊玩',exact:true}).click();
}
