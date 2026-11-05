// Exercise the real Skip control; never bypass onboarding through app-only flags.
export async function dismissDrivingGuide(page) {
  await page.locator('main[data-guide-state]').waitFor();
  if(await page.locator('main').getAttribute('data-guide-state')==='open')
    await page.getByRole('button',{name:'略過引導',exact:true}).click();
}
