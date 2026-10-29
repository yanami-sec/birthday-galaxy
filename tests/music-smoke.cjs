const BASE_URL=process.env.BIRTHDAY_BASE_URL||'http://127.0.0.1:8765/';
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const unlock=require('./enter-birthday.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const output=path.resolve(__dirname,'../artifacts');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BIRTHDAY_BROWSER_CHANNEL?{channel:process.env.BIRTHDAY_BROWSER_CHANNEL}:{})}),errors=[],remote=[];
 async function prepare(page){
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('request',r=>{if(!r.url().startsWith(BASE_URL)&&!r.url().startsWith('data:'))remote.push(r.url())});
  await page.addInitScript(()=>{const NativeAudio=window.Audio;window.__music=[];window.Audio=function(...args){const a=new NativeAudio(...args);window.__music.push(a);return a;};window.Audio.prototype=NativeAudio.prototype;Object.setPrototypeOf(window.Audio,NativeAudio);});
  await page.goto(BASE_URL);await unlock(page);
  assert.equal(await page.evaluate(()=>window.__music.length),0,'No audio before the start click');
 }
 try{
  const source=await fs.readFile(path.resolve(__dirname,'../web/app.js'),'utf8');
  if(/BACKGROUND_MUSIC\s*=\s*\{\s*src:\s*["']{2}/.test(source)){
   const page=await browser.newPage();await prepare(page);await page.locator('#start').click();await page.locator('#enter-cake').waitFor({state:'visible',timeout:12000});
   assert.equal(await page.locator('#music').isVisible(),false);assert.equal(await page.evaluate(()=>window.__music.length),0);await page.locator('#exit').click();assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
   console.log(JSON.stringify({passed:true,optionalMusic:true,quietLaunch:true,missingAudioRequests:0}));return;
  }
  await fs.mkdir(output,{recursive:true});const page=await browser.newPage({viewport:{width:1440,height:960}});await prepare(page);await page.locator('#start').click();
  await page.waitForFunction(()=>window.__music[0]?.currentTime>.1&&!window.__music[0].paused);const duration=await page.evaluate(()=>window.__music[0].duration);assert.ok(duration>215&&duration<225,`Expected complete song, got ${duration}s`);
  await page.waitForTimeout(1700);assert.ok(await page.evaluate(()=>Math.abs(window.__music[0].volume-.38)<.01));
  await page.locator('#enter-cake').waitFor({state:'visible',timeout:12000});const card=page.locator('.wish-card').last();await card.locator('.card-message').click();await page.waitForTimeout(750);assert.ok(await page.evaluate(()=>Math.abs(window.__music[0].volume-.16)<.01));await page.locator('#card-reader-close').click();await page.waitForTimeout(750);assert.ok(await page.evaluate(()=>Math.abs(window.__music[0].volume-.38)<.01));
  await page.locator('#music').click();await page.waitForFunction(()=>window.__music[0].paused&&window.__music[0].volume===0);assert.equal(await page.locator('#music').getAttribute('aria-pressed'),'false');await page.locator('#music').click();await page.waitForFunction(()=>!window.__music[0].paused);assert.equal(await page.evaluate(()=>window.__music.length),1);
  // Mute and resume quickly while the fade is still active; latest intent wins.
  await page.locator('#music').click();await page.locator('#music').click();await page.waitForTimeout(1600);assert.ok(await page.evaluate(()=>!window.__music[0].paused&&Math.abs(window.__music[0].volume-.38)<.01));
  await page.evaluate(()=>{const a=window.__music[0];a.currentTime=a.duration-.25;});await page.waitForTimeout(850);assert.ok(await page.evaluate(()=>window.__music[0].loop&&!window.__music[0].paused&&window.__music[0].currentTime<4));
  await page.locator('#enter-cake').click();await page.waitForFunction(()=>!document.getElementById('studio-edit').disabled);assert.equal(await page.locator('#cake-music').getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>window.__music.length),1);await page.screenshot({path:path.join(output,'cake-with-music-control.png')});await page.locator('#cake-music').click();await page.waitForFunction(()=>window.__music[0].paused);await page.locator('#cake-music').click();await page.waitForFunction(()=>!window.__music[0].paused);await page.locator('#cake-exit').click();assert.ok(await page.evaluate(()=>window.__music[0].paused&&window.__music[0].volume===0));
  const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await prepare(phone);await phone.locator('#start-quiet').tap();await phone.locator('#enter-cake').waitFor({state:'visible',timeout:12000});assert.equal(await phone.evaluate(()=>window.__music.length),0);await phone.locator('#music').tap();await phone.waitForFunction(()=>window.__music[0]?.currentTime>.1);await phone.locator('#enter-cake').tap();await phone.waitForFunction(()=>!document.getElementById('studio-edit').disabled);assert.equal(await phone.locator('#cake-music').isVisible(),true);assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await phone.screenshot({path:path.join(output,'cake-music-mobile.png')});await phone.locator('#cake-music').tap();await phone.waitForFunction(()=>window.__music[0].paused);await phone.locator('#cake-exit').tap();assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log(JSON.stringify({passed:true,durationSeconds:duration,startsOnClick:true,fadeIn:true,readingVolume:true,muteResume:true,loop:true,singleAudioInstance:true,mobile:true,exitPause:true,externalRequests:0}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
