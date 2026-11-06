import {dismissDrivingGuide} from './browser-support.mjs';
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 850, height: 720 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.text().startsWith('ROUTE:')) console.log(message.text()); });
  await page.goto(baseURL); await dismissDrivingGuide(page);
  await page.bringToFront();
  await page.locator('.target-label').filter({ hasText: '大和' }).waitFor();
  const expected = await page.evaluate(async () => {
    const { locations } = await import('/src/data/locations.ts');
    return { names: locations.map(location => location.shortName), first: locations[0].name };
  });
  const outcome = await page.evaluate(async () => {
    // Read the same low-frequency telemetry used by the map; drive through real input events.
    // Do not teleport, change vehicle state, or call the mission advancement action.
    const { locations } = await import('/src/data/locations.ts');
    const { findRoadRoute, nearestRoadNode } = await import('/src/data/roadNetwork.ts');
    const { useGame } = await import('/src/stores/game.ts');
    const held = new Set();
    const key = (code, down) => {
      if (held.has(code) === down) return;
      if (down) held.add(code); else held.delete(code);
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true, cancelable: true }));
    };
    let mission = -1, waypoints = [], index = 0, lastLog = 0, stalledSince = 0, recoveries = 0;
    const visited = [], started = performance.now();
    const read = () => {
      const { x, z, angle } = useGame.getState();
      const active = document.querySelector('.route-stop.active .stop-number');
      return { x, z, angle,
        speed: Number(document.querySelector('.speed-panel strong').textContent),
        missionIndex: active ? Number(active.textContent) - 1 : locations.length - 1, completed: !active };
    };
    try {
      while (performance.now() - started < 600000) {
        const state = read();
        if (performance.now() - lastLog > 15000) { console.log(`ROUTE: pose ${state.x.toFixed(1)},${state.z.toFixed(1)} speed ${state.speed} waypoint ${index}`); lastLog = performance.now(); }
        if (state.missionIndex !== mission || state.completed) {
          if (mission >= 0) {
            visited.push(locations[mission].shortName);
            if(!document.querySelector('.arrival-note')?.textContent.includes(locations[mission].name))
              throw new Error('抵達後 HUD 未顯示對應站名');
          }
          if (state.completed) return { completed: true, visited, seconds: (performance.now() - started) / 1000 };
          mission = state.missionIndex;
          console.log(`ROUTE: driving to ${locations[mission].shortName}`);
          waypoints = findRoadRoute(nearestRoadNode(state.x, state.z), locations[mission].roadNode);
          // Arrival triggers at 4 m: don't turn back to chase the just-arrived node
          // merely because the ordinary corner threshold below is only 3.5 m.
          index = waypoints.length > 1 && Math.hypot(state.x - waypoints[0][0], state.z - waypoints[0][1]) <= 4.5 ? 1 : 0;
        }
        while (index < waypoints.length - 1 && Math.hypot(state.x - waypoints[index][0], state.z - waypoints[index][1]) < 3.5) index++;
        const target = waypoints[index];
        const desired = Math.atan2(-(target[0] - state.x), -(target[1] - state.z));
        const error = Math.atan2(Math.sin(desired - state.angle), Math.cos(desired - state.angle));
        const targetSpeed = Math.abs(error) > 0.45 ? 15 : 30;
        // A stop against a building is correct collision behaviour. Back away
        // through real keys before trying the turn again; never teleport/reset.
        if (state.speed === 0 && held.has('KeyW')) {
          if (!stalledSince) stalledSince = performance.now();
          if (performance.now() - stalledSince > 1500) {
            if (++recoveries > 12) return { completed: false, visited, reason: 'too many collision recoveries', ...state };
            key('KeyW', false); key('KeyA', false); key('KeyD', false); key('Space', false); key('KeyS', true);
            const before = read();
            await new Promise(resolve => setTimeout(resolve, 1500));
            key('KeyS', false);
            const after = read();
            if (Math.hypot(after.x - before.x, after.z - before.z) < 1) return { completed: false, visited, reason: 'reverse could not clear obstacle', ...after };
            console.log(`ROUTE: collision recovery ${recoveries} by reversing`);
            stalledSince = 0; continue;
          }
        } else stalledSince = 0;
        key('KeyA', error > 0.07); key('KeyD', error < -0.07);
        key('KeyW', state.speed < targetSpeed); key('Space', state.speed > targetSpeed + 8);
        await new Promise(resolve => setTimeout(resolve, 35));
      }
      const state = read();
      return { completed: false, visited, mission, x: state.x, z: state.z, target: waypoints[index] };
    } finally { for (const code of held) window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })); }
  });
  assert.equal(outcome.completed, true, JSON.stringify(outcome));
  assert.deepEqual(outcome.visited, expected.names);
  await expect(page.locator('.mission-summary strong')).toHaveText('五站任務完成');
  const journalBeforeReset=await page.evaluate(async()=>{
    const {explorationStore}=await import('/src/stores/exploration.ts');
    const {locations}=await import('/src/data/locations.ts');
    return locations.map(location=>({id:location.id,entry:explorationStore.getState().entries[location.id]}));
  });
  assert.ok(journalBeforeReset.every(item=>item.entry&&item.entry.completedAt===null),'mainline arrivals discover locations without confirming journal exploration');
  await page.keyboard.down('Space');
  await expect.poll(()=>page.locator('.speed-panel strong').innerText().then(Number),{timeout:15000}).toBe(0);
  await page.keyboard.up('Space');
  // Verify the real transfer sequence after stopping at the fifth destination.
  await page.keyboard.press('e');
  await expect(page.locator('.passenger-status strong')).toHaveText('操控奶奶輪椅・爺爺留在車內',{timeout:90000});
  await page.keyboard.press('e');
  await expect(page.locator('.passenger-status strong')).toHaveText('兩位乘客在車內',{timeout:60000});
  await expect(page.locator('.mission-summary strong')).toHaveText('五站任務完成');
  await mkdir('.test-artifacts', { recursive: true });
  await page.screenshot({ path: '.test-artifacts/five-centers-completed.png' });
  await page.keyboard.press('r');
  await expect(page.locator('.mission-summary strong')).toHaveText(`下一站：${expected.first}`);
  await expect(page.locator('.route-stop.visited')).toHaveCount(0);
  const journalAfterReset=await page.evaluate(async()=>{
    const {explorationStore}=await import('/src/stores/exploration.ts');
    const {locations}=await import('/src/data/locations.ts');
    return locations.map(location=>({id:location.id,entry:explorationStore.getState().entries[location.id]}));
  });
  assert.deepEqual(journalAfterReset,journalBeforeReset,'resetting the completed mainline preserves all five discoveries');
  await page.waitForTimeout(250);
  // Drive into the fountain's collision boundary, then reverse away through actual keys.
  await page.keyboard.down('w');
  await page.waitForTimeout(4200);
  await page.keyboard.up('w');
  const readPosition = () => page.locator('.map-vehicle').getAttribute('transform').then(value => value.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number));
  const contact = await readPosition();
  assert.ok(contact[1] >= 8.45 && contact[1] < 10, `fountain stops forward vehicle before overlap: ${contact}`);
  assert.equal(Number(await page.locator('.speed-panel strong').innerText()), 0);
  await page.keyboard.down('s'); await page.waitForTimeout(1000); await page.keyboard.up('s');
  assert.ok((await readPosition())[1] > contact[1] + 2, 'reverse escapes physical collision');
  await page.keyboard.press('r'); await page.waitForTimeout(250);

  const bridge = await page.evaluate(async () => {
    const { findRoadRoute } = await import('/src/data/roadNetwork.ts');
    const { useGame } = await import('/src/stores/game.ts');
    const points = findRoadRoute('0-0', 'hospital');
    const held = new Set();
    const key = (code, down) => {
      if (held.has(code) === down) return;
      if (down) held.add(code); else held.delete(code);
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true, cancelable: true }));
    };
    let index = 0, crossedRiver = false;
    const start = performance.now();
    try {
      while (performance.now() - start < 90000) {
        const { x, z, angle } = useGame.getState();
        if (x > 85 && x < 95 && Math.abs(z) < 6) crossedRiver = true;
        if (Math.hypot(x - 110, z + 12) < 3.5) return { arrived: true, crossedRiver };
        while (index < points.length - 1 && Math.hypot(x - points[index][0], z - points[index][1]) < 3.5) index++;
        const [tx, tz] = points[index];
        const desired = Math.atan2(-(tx - x), -(tz - z));
        const error = Math.atan2(Math.sin(desired - angle), Math.cos(desired - angle));
        const speed = Number(document.querySelector('.speed-panel strong').textContent);
        const targetSpeed = Math.abs(error) > 0.45 ? 15 : 30;
        key('KeyA', error > 0.07); key('KeyD', error < -0.07); key('KeyW', speed < targetSpeed); key('Space', speed > targetSpeed + 8);
        await new Promise(resolve => setTimeout(resolve, 35));
      }
      return { arrived: false, crossedRiver };
    } finally { for (const code of held) window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })); }
  });
  assert.deepEqual(bridge, { arrived: true, crossedRiver: true });
  await expect(page.locator('.service-note strong')).toContainText('社區綜合醫院');
  await page.screenshot({ path: '.test-artifacts/bridge-hospital-drive.png' });
  assert.deepEqual(errors, []);
  console.log(`PASS: Real browser input drove all five destinations in order (${Math.round(outcome.seconds)}s), completion HUD and R reset.`);
  console.log('PASS: Physical fountain collision and reverse recovery; continuous road/bridge drive to hospital and service HUD.');
} finally { await browser.close(); }
