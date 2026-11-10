import { createServer } from 'node:http';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { dismissDrivingGuide } from '../tests/browser-support.mjs';

// Serve the actual build below the same project prefix used on GitHub Pages.
const root=path.resolve('dist'),prefix='/lohas-rush/';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.hdr':'application/octet-stream','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/lohas-rush'){res.writeHead(302,{Location:prefix});res.end();return;}
    if(!pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}
    const filename=path.resolve(root,pathname.slice(prefix.length)||'index.html');
    if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const bytes=await readFile(filename);res.setHeader('Content-Type',mime[path.extname(filename)]||'application/octet-stream');res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}${prefix}`;
let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:800}}),requests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',response=>{if(/\.js(?:\?|$)|\.css(?:\?|$)|\.hdr(?:\?|$)|lohas_service_van\.glb/.test(response.url()))requests.push({path:new URL(response.url()).pathname,status:response.status()});});
  await page.goto(base+'?quality=low');await dismissDrivingGuide(page);
  await page.waitForFunction(()=>window.__LOHAS_RENDERING__?.environment==='ready');
  await expectStatus('lohas-afternoon.hdr');await expectStatus('lohas_service_van.glb');
  async function expectStatus(file){for(let n=0;n<100;n++){if(requests.some(r=>r.path.endsWith(file)&&r.status===200))return;await page.waitForTimeout(100);}throw new Error('Required asset not loaded: '+file);}
  assert(requests.every(r=>r.path.startsWith(prefix)&&r.status===200));assert.deepEqual(errors,[]);
  const state=await page.evaluate(()=>({stats:window.__LOHAS_RENDERING__,canvas:[document.querySelector('canvas').width,document.querySelector('canvas').height]}));
  await mkdir('.test-artifacts/rendering',{recursive:true});await page.screenshot({path:'.test-artifacts/rendering/pages-production.png'});
  await writeFile('.test-artifacts/rendering/pages-validation.json',JSON.stringify({passed:true,simulatedPrefix:prefix,requests,errors,state,deployed:false},null,2));
  console.log('PASS: Actual production build JS/CSS/HDR/GLB load beneath /lohas-rush/; no deployment performed.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
