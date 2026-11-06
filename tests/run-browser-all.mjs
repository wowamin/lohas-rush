import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5173/';
if(!(await fetch(base)).ok)throw new Error('請先啟動 npm run dev，並用 TEST_BASE_URL 指向該伺服器。');
const sources=await Promise.all(['src/App.tsx','src/game/Car.tsx','src/components/ExplorationJournal.tsx'].map(async path=>(await fetch(new URL(path,base))).text()));
if(sources.some(source=>/stores\/(?:game|exploration)\.ts\?t=/.test(source)))throw new Error('偵測到 Vite 熱更新模組版本。請重新啟動 dev server，避免畫面與測試使用不同的狀態實例，再執行完整驗收。');
const suites=['input.browser.mjs','onboarding.browser.mjs','exploration.browser.mjs','browser.mjs','wheelchair.browser.mjs','passengers.browser.mjs','orbit.browser.mjs','expansion.browser.mjs','vehicle.browser.mjs','turn-signals.browser.mjs','pedestrian-street.browser.mjs','street-furniture.browser.mjs','characters.browser.mjs','chairperson.browser.mjs','care-city.browser.mjs','routes.browser.mjs'];
const folder=process.env.TEST_REPORT_DIR||'.test-artifacts/v02a-acceptance';await mkdir(folder,{recursive:true});
const retry=process.argv.includes('--retry-failed');
const previous=retry?JSON.parse(await readFile(folder+'/results.json','utf8')):[];
const results=previous.filter(r=>r.status==='passed');
const files=suites.filter(file=>!results.some(r=>r.file===file));let index=0;
if(retry){
  await writeFile(folder+'/previous-results.json',JSON.stringify(previous,null,2));
  for(const r of previous.filter(r=>r.status==='failed'))await writeFile(folder+'/'+r.file+'.previous.log',await readFile(folder+'/'+r.file+'.log'));
}
await writeFile(folder+'/results.json',JSON.stringify(results,null,2));
let report=Promise.resolve();
async function worker(){
  while(index<files.length){
    const file=files[index++],started=Date.now();let output='';
    const log=createWriteStream(folder+'/'+file+'.log');
    console.log('RUN '+file);
    const code=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,['tests/'+file],{env:{...process.env,TEST_BASE_URL:base,TEST_CARE_CITY_URL:process.env.TEST_CARE_CITY_URL||new URL('care-city/index.html',base).href},windowsHide:true});
      child.stdout.on('data',chunk=>{output+=chunk;log.write(chunk);if(/ROUTE: driving to|PASS:/.test(String(chunk)))console.log(file+': '+String(chunk).trim());});child.stderr.on('data',chunk=>{output+=chunk;log.write(chunk);});
      child.on('error',reject);child.on('close',code=>resolve(code));
    });
    const result={file,status:code===0?'passed':'failed',seconds:Math.round((Date.now()-started)/1000)};
    await new Promise(resolve=>log.end(resolve));results.push(result);
    report=report.then(()=>writeFile(folder+'/results.json',JSON.stringify(results,null,2)));await report;
    console.log(result.status.toUpperCase()+' '+file+' ('+result.seconds+'s)');
    if(code!==0)console.log(output.slice(-4000));
  }
}
// SwiftShader and real-time transfer assertions share the local CPU/GPU.
// Run Chrome suites serially so one scene cannot slow another's physics clock.
await worker();
console.log(JSON.stringify(results,null,2));
process.exitCode=results.some(r=>r.status==='failed')?1:0;
