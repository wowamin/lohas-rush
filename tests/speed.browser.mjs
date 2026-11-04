import assert from 'node:assert/strict';
import { expect } from '@playwright/test';

export async function testHighSpeed(page) {
  await page.keyboard.press('r'); await page.waitForTimeout(250);
  const result = await page.evaluate(async () => {
    const { findRoadRoute } = await import('/src/data/roadNetwork.ts');
    const { useGame } = await import('/src/stores/game.ts');
    const points = findRoadRoute('0-0', 'artery-south');
    const held = new Set();
    const key = (code, down) => {
      if (held.has(code) === down) return;
      if (down) held.add(code); else held.delete(code);
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true, cancelable: true }));
    };
    let index = 0, peak = 0;
    const started = performance.now();
    try {
      while (performance.now() - started < 90000) {
        const { x, z, angle } = useGame.getState();
        const speed = Number(document.querySelector('.speed-panel strong').textContent);
        peak = Math.max(peak, speed);
        if (peak > 85) return { peak, x, z };
        while (index < points.length - 1 && Math.hypot(x - points[index][0], z - points[index][1]) < 3.5) index++;
        const [tx, tz] = points[index];
        const desired = Math.atan2(-(tx - x), -(tz - z));
        const error = Math.atan2(Math.sin(desired - angle), Math.cos(desired - angle));
        const targetSpeed = Math.abs(error) > .45 ? 15 : index === points.length - 1 ? 120 : 30;
        key('KeyA', error > .07); key('KeyD', error < -.07);
        key('KeyW', speed < targetSpeed); key('Space', speed > targetSpeed + 8);
        await new Promise(resolve => setTimeout(resolve, 35));
      }
      return { peak };
    } finally { for (const code of held) key(code, false); }
  });
  assert.ok(result.peak > 85, `keyboard driving exceeds 80 km/h: ${JSON.stringify(result)}`);
  await page.keyboard.down('Space');
  await expect.poll(async () => Number(await page.locator('.speed-panel strong').innerText()), { timeout: 15000 }).toBe(0);
  await page.keyboard.up('Space');
  assert.equal(Number(await page.locator('.speed-panel strong').innerText()), 0, 'brakes stop high-speed vehicle');
  await page.keyboard.press('r');
  console.log(`PASS: Actual keyboard road driving reached ${result.peak} km/h; high-speed braking/reset.`);
}
