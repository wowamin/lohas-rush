import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';

const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage();
  await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:5173/');
  await page.locator('.target-label').filter({hasText:'大和'}).waitFor();
  const skip=page.getByRole('button',{name:'略過引導',exact:true});
  if(await skip.isVisible())await skip.click();
  const speed=()=>page.locator('.speed-panel strong').innerText().then(Number);
  // Both key events occur in one JS task, before React effects or the next
  // physics frame. Reset must clear old input without discarding the new W.
  await page.evaluate(()=>{
    for(const [type,code] of [['keydown','KeyR'],['keyup','KeyR'],['keydown','KeyW']])
      window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
  });
  await expect.poll(speed).toBeGreaterThan(5);
  await page.keyboard.press('r');
  await page.waitForTimeout(400);
  assert.equal(await speed(),0,'the pre-reset held W must remain cleared');
  await page.keyboard.up('w');
  await page.locator('.journal-toggle').focus();
  await page.keyboard.down('ArrowUp');await expect.poll(speed).toBeGreaterThan(5);
  await page.keyboard.up('ArrowUp');await page.keyboard.down('Space');
  await expect.poll(speed).toBe(0);await page.keyboard.up('Space');
  await expect(page.locator('.exploration-journal')).toHaveCount(0);
  console.log('PASS: Immediate post-reset input survives; stale input clears; arrows and braking remain functional.');
} finally {await browser.close();}
