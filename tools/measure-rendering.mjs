import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dismissDrivingGuide } from '../tests/browser-support.mjs';

const label = process.argv[2] || 'after';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173/';
await mkdir('.test-artifacts/rendering', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base); await dismissDrivingGuide(page);
  await page.waitForFunction(async () => {
    const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const state = _roots.get(document.querySelector('canvas'))?.store.getState();
    return state?.scene.getObjectByName('service-van-model')?.userData.modelState === 'ready';
  });
  const samples = [];
  if(label!=='before')await page.getByRole('button',{name:'畫面設定',exact:true}).click();
  for (const quality of label === 'before' ? ['original'] : ['low', 'medium', 'high']) {
    if (quality !== 'original') {
      await page.getByLabel('畫質', { exact: true }).selectOption(quality);
      await page.waitForFunction(() => window.__LOHAS_RENDERING__?.environment === 'ready');
    }
    await page.waitForTimeout(2000);
    const result = await page.evaluate(async quality => {
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const state = _roots.get(document.querySelector('canvas')).store.getState();
      const timings = [], calls = [], triangles = [],beauty=[],shadows=[];
      let started = performance.now(), previous = started;
      await new Promise(resolve => {
        const tick = now => {
          timings.push(now - previous); previous = now;
          calls.push(window.__LOHAS_RENDERING__?.calls ?? state.gl.info.render.calls);
          triangles.push(window.__LOHAS_RENDERING__?.triangles ?? state.gl.info.render.triangles);
          beauty.push(window.__LOHAS_RENDERING__?.beautyCalls??state.gl.info.render.calls);
          shadows.push(window.__LOHAS_RENDERING__?.shadowCalls??0);
          if (timings.length >= 30 && now-started > 3000 || now-started > 20000) resolve();
          else requestAnimationFrame(tick);
        }; requestAnimationFrame(tick);
      });
      const context=state.gl.getContext(),extension=context.getExtension('WEBGL_debug_renderer_info');
      const average = array => array.reduce((a,b)=>a+b,0)/array.length;
      const sorted=timings.slice().sort((a,b)=>a-b);
      return { quality, viewport:[innerWidth,innerHeight], drawingBuffer:[state.gl.domElement.width,state.gl.domElement.height],
        sampledFrames:timings.length, fps:1000/average(timings), frameMsP95:sorted[Math.floor(sorted.length*.95)],
        drawCalls:average(calls),triangles:average(triangles),geometries:state.gl.info.memory.geometries,textures:state.gl.info.memory.textures,
        beautyDrawCalls:average(beauty),shadowDrawCalls:quality==='original'?null:average(shadows),
        jsHeapBytes:performance.memory?.usedJSHeapSize ?? null,
        gpu:extension?context.getParameter(extension.UNMASKED_RENDERER_WEBGL):'unavailable',
        hardwareGPUBytes:null,environment:window.__LOHAS_RENDERING__?.environment ?? 'original',
        note:'Headless Chrome SwiftShader is a software renderer, not an RTX 3050 benchmark. JS heap is not GPU memory.' };
    }, quality);
    samples.push(result);
    await page.screenshot({ path:`.test-artifacts/rendering/${label}-${quality}.png` });
    console.log(JSON.stringify(result));
  }
  await writeFile(`.test-artifacts/rendering/${label}.json`,JSON.stringify({label,samples,errors},null,2));
  if(errors.length)throw new Error(errors.join('\n'));
} finally { await browser.close(); }
