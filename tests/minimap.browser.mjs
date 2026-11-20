import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dismissDrivingGuide } from './browser-support.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5210/?quality=low';
await mkdir('.test-artifacts/minimap', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const overlaps = (a,b) => Math.min(a.right,b.right)-Math.max(a.x,b.x)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
try {
  for (const [name,width,height,touch] of [['desktop',1440,900,false],['mobile',390,844,true],['small',320,568,true],['landscape',568,320,true]]) {
    const page = await browser.newPage({ viewport: { width,height }, isMobile:touch, hasTouch:touch });
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base);await dismissDrivingGuide(page);
    const map=page.locator('.route-map'),toggle=page.locator('.route-map-toggle');
    await expect(map).toHaveClass(/is-collapsed/);await expect(toggle).toHaveAttribute('aria-expanded','false');
    assert.equal(Number((await page.locator('.route-map svg').getAttribute('viewBox')).split(' ')[2]),68);
    const boxes=await page.locator('.route-map, header, footer, .destination-strip, .graphics-toolbar, .passenger-panel, .speed-panel, .touch-button, .touch-joystick').evaluateAll(nodes=>nodes.filter(node=>node.checkVisibility()).map(node=>{const r=node.getBoundingClientRect();return{name:node.className||node.tagName,x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
    const compact=boxes.find(box=>box.name.startsWith('route-map'));
    assert(compact.x>=0&&compact.y>=0&&compact.right<=width&&compact.bottom<=height);
    for(const other of boxes.filter(box=>box!==compact))assert(!overlaps(compact,other),JSON.stringify({name,compact,other}));
    await page.screenshot({path:`.test-artifacts/minimap/${name}-compact.png`});
    const before=await page.locator('.map-vehicle').getAttribute('transform');
    // Click the map itself, away from the small label, to exercise the full hit area.
    const x=compact.x+(compact.right-compact.x)/2,y=compact.y+(compact.bottom-compact.y)*.75;
    if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
    await expect(map).not.toHaveClass(/is-collapsed/);await expect(toggle).toHaveAttribute('aria-expanded','true');
    await expect(page.locator('.route-map svg')).toHaveAttribute('viewBox','-722 -722 1444 1444');
    assert.equal(await page.locator('.map-vehicle').getAttribute('transform'),before,'opening the map does not reset or move the car');
    const expanded=await map.boundingBox();assert(expanded.width>compact.right-compact.x);
    assert(expanded.x>=0&&expanded.y>=0&&expanded.x+expanded.width<=width+1&&expanded.y+expanded.height<=height+1);
    await page.screenshot({path:`.test-artifacts/minimap/${name}-expanded.png`});
    await toggle.click();await expect(map).toHaveClass(/is-collapsed/);
    await toggle.focus();await page.keyboard.press('Enter');await expect(map).not.toHaveClass(/is-collapsed/);
    await page.keyboard.press('Space');await expect(map).toHaveClass(/is-collapsed/);
    await page.reload();await dismissDrivingGuide(page);await expect(map).toHaveClass(/is-collapsed/);
    assert.deepEqual(errors,[]);results.push({name,width,height,defaultCompact:true,clickAnywhere:true,keyboard:true,reloadCompact:true,noControlOverlap:true});
    await page.close();console.log(`PASS: ${name} compact corner GPS, full-map click/tap, keyboard, reload default and control clearance.`);
  }
  await writeFile('.test-artifacts/minimap/validation.json',JSON.stringify({passed:true,results},null,2));
} finally {await browser.close();}
