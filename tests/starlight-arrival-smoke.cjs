const BASE_URL=process.env.BIRTHDAY_BASE_URL||'http://127.0.0.1:8765/';
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const unlockBirthday=require('./enter-birthday.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const output=path.resolve(__dirname,'../artifacts');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BIRTHDAY_BROWSER_CHANNEL?{channel:process.env.BIRTHDAY_BROWSER_CHANNEL}:{})}),errors=[];
 const idle=p=>p.waitForFunction(()=>document.getElementById('cake-screen').dataset.motion==='idle'&&!document.getElementById('studio-random').disabled,{},{timeout:20000});
 async function enter(page){page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto(BASE_URL);await unlockBirthday(page);await page.locator('#start').click();await page.locator('#enter-cake').click({timeout:15000});await page.waitForFunction(()=>!document.getElementById('studio-edit').disabled);await page.waitForTimeout(1200);}
 async function remix(page,open){
  await page.evaluate(()=>{window.__remixSamples=[];window.__track=true;function sample(){if(!window.__track)return;const s=document.getElementById('cake-screen');window.__remixSamples.push({phase:s.dataset.motion,reveal:Number(s.dataset.reveal??1),expansion:Number(s.dataset.expansion),version:s.dataset.version,flight:Number(s.dataset.flight)});requestAnimationFrame(sample)}sample()});
  await page.locator(open?'#studio-random':'#galaxy-random').click();
  await page.waitForFunction(()=>document.getElementById('cake-screen').dataset.motion==='replacing'&&Number(document.getElementById('cake-screen').dataset.reveal)>.15);
  await page.screenshot({path:path.join(output,`cake-drop-${open?'open':'closed'}-entrance.png`)});await idle(page);
  const samples=await page.evaluate(()=>{window.__track=false;return window.__remixSamples;});
  const incoming=samples.filter(s=>s.phase==='replacing'),outgoing=samples.filter(s=>s.phase==='shuffling');assert.ok(incoming.length>5&&outgoing.length>5);
  assert.ok(Math.min(...incoming.map(s=>s.reveal))<.12);assert.ok(Math.max(...incoming.map(s=>s.reveal))>.85);
  assert.ok(samples.every(s=>open?s.expansion>.97:s.expansion<.01));
  for(let i=1;i<incoming.length;i++)assert.ok(incoming[i].reveal>=incoming[i-1].reveal);
  assert.ok(incoming[0].flight>1);assert.ok(incoming.some(s=>Math.abs(s.flight)<.15));assert.ok(Math.abs(Number(await page.locator('#cake-screen').getAttribute('data-flight')))<.001);
  assert.equal(new Set(samples.map(s=>s.version)).size,2,'Exactly one model replacement per transition');
 }
 try{
  await fs.mkdir(output,{recursive:true});const page=await browser.newPage({viewport:{width:1440,height:960}});await enter(page);
  const atlas=await page.evaluate(async()=>{const {loadThree}=await import('./cake.js?v=3');const T=await loadThree();const {createStarlightAtlas}=await import('./starlight-atlas.js?v=1');const t=createStarlightAtlas(T),c=document.createElement('canvas');c.width=768;c.height=125;const ctx=c.getContext('2d');ctx.fillStyle='#100e24';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(t.image,0,0);ctx.fillStyle='#d7bbeb';ctx.font='12px sans-serif';ctx.textAlign='center';['爱心','四角星芒','五角星','月牙','钻石','蝴蝶','六角星','环形行星'].forEach((s,i)=>ctx.fillText(s,i*96+48,114));t.dispose();return c.toDataURL().split(',')[1];});await fs.writeFile(path.join(output,'starlight-shapes.png'),Buffer.from(atlas,'base64'));
  await page.screenshot({path:path.join(output,'starlight-new-desktop.png')});await remix(page,false);
  await page.locator('#studio-edit').click();await page.waitForFunction(()=>Number(document.getElementById('cake-screen').dataset.expansion)>.99);await remix(page,true);
  await page.locator('#studio-explode').click();await page.waitForFunction(()=>Number(document.getElementById('cake-screen').dataset.expansion)<.01);await page.locator('#studio-done').click();assert.equal(await page.locator('#studio-wish').isVisible(),true);
  const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await enter(phone);await remix(phone,false);await phone.screenshot({path:path.join(output,'starlight-new-mobile.png')});assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await phone.locator('#cake-exit').click();await page.locator('#cake-exit').click();assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,closedAndOpen:true,fallingArrival:true,mobile:true,shaderErrors:0}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
