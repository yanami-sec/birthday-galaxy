const BASE_URL=process.env.BIRTHDAY_BASE_URL||'http://127.0.0.1:8765/';
const unlockBirthday=require('./enter-birthday.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const output=path.resolve(__dirname,'../artifacts');
const key='birthday-galaxy-cake-v2';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BIRTHDAY_BROWSER_CHANNEL?{channel:process.env.BIRTHDAY_BROWSER_CHANNEL}:{})}),errors=[],remote=[];
 const idle=page=>page.waitForFunction(()=>document.getElementById('cake-screen').dataset.motion==='idle'&&!document.getElementById('studio-random').disabled,{},{timeout:20000});
 const open=page=>page.waitForFunction(()=>Number(document.getElementById('cake-screen').dataset.expansion)>.98);
 const closed=page=>page.waitForFunction(()=>Number(document.getElementById('cake-screen').dataset.expansion)<.01);
 async function enter(page){
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('request',r=>{if(!r.url().startsWith(BASE_URL)&&!r.url().startsWith('data:'))remote.push(r.url())});
  await page.goto(BASE_URL);await unlockBirthday(page);await page.locator('#start').click();await page.locator('#enter-cake').click({timeout:12000});
  await page.waitForFunction(()=>!document.getElementById('studio-edit').disabled);await page.waitForTimeout(500);
 }
 async function track(page){await page.evaluate(()=>{window.__samples=[];window.__tracking=true;function sample(){if(!window.__tracking)return;window.__samples.push(Number(document.getElementById('cake-screen').dataset.expansion));requestAnimationFrame(sample)}sample()})}
 async function samples(page){return page.evaluate(()=>{window.__tracking=false;return window.__samples})}
 async function option(page,field,value){await page.locator(`[data-option="${field}"] [data-value="${value}"]`).click();await idle(page)}
 try{
  await fs.mkdir(output,{recursive:true});const context=await browser.newContext({viewport:{width:1440,height:960},acceptDownloads:true});const page=await context.newPage();await enter(page);
  assert.equal(await page.locator('canvas').count(),1);assert.equal(await page.locator('#studio-wish').isVisible(),false);
  await page.locator('#workshop-canvas').click({position:{x:70,y:200}});await page.keyboard.press('Space');await page.waitForTimeout(150);assert.equal(await page.locator('#studio-wish-progress').getAttribute('value'),'0');
  await page.screenshot({path:path.join(output,'galaxy-assembled.png')});
  // Closed random must never transition into the exploded configuration.
  await track(page);await page.locator('#galaxy-random').click();await idle(page);let values=await samples(page);assert.ok(Math.max(...values)<.01);
  assert.equal(await page.locator('#studio-wish').isVisible(),false);
  await page.locator('#studio-edit').click();await open(page);assert.equal(await page.locator('#studio-done').isDisabled(),true);
  await track(page);await page.locator('#studio-random').click();await idle(page);await page.waitForTimeout(700);values=await samples(page);assert.ok(Math.min(...values)>.97);
  // Continuous random also keeps the selected mode; stop only the next cycle.
  await page.locator('#studio-auto-edit').click();let version=Number(await page.locator('#cake-screen').getAttribute('data-version'));
  await page.waitForFunction(v=>Number(document.getElementById('cake-screen').dataset.version)>v,version,{timeout:12000});await page.locator('#studio-auto-edit').click();await idle(page);await open(page);
  await option(page,'shape','flower');await option(page,'skin','aurora');await option(page,'layers','2');
  await page.locator('#tab-cream').click();await option(page,'creamStyle','braid');
  await page.locator('#tab-toppings').click();await option(page,'topping','butterflies');
  await page.locator('#tab-plate').click();await option(page,'plate','crystal');
  await page.locator('#tab-candles').click();await option(page,'candles','heart');
  await page.screenshot({path:path.join(output,'galaxy-expanded-variety.png')});
  for(const [tab,field,count] of [['tab-layers','shape',6],['tab-layers','skin',7],['tab-cream','creamStyle',7],['tab-toppings','topping',15],['tab-candles','candles',9],['tab-plate','plate',9]]){
   await page.locator('#'+tab).click();assert.equal(await page.locator(`[data-option="${field}"] button`).count(),count);
  }
  assert.equal(await page.locator('#studio-done').isDisabled(),true);
  await page.locator('#studio-explode').click();await closed(page);
  assert.equal(await page.locator('#studio-wish').isVisible(),false);
  await track(page);await page.locator('#studio-random').click();await idle(page);values=await samples(page);assert.ok(Math.max(...values)<.02);
  // Selecting the exact desired candle for the confirmation and wish flow.
  await page.locator('#tab-candles').click();await option(page,'candles','sparkler');
  await page.locator('#studio-done').click();assert.equal(await page.locator('#studio-editor').isVisible(),false);assert.equal(await page.locator('#studio-wish').isVisible(),true);
  assert.equal(await page.locator('#cake-screen').getAttribute('data-confirmed'),'true');
  const box=await page.locator('#studio-wish').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(3000);await page.mouse.up();
  await page.locator('#wish-letter-dialog').waitFor({state:'visible',timeout:8000});await page.locator('#wish-letter-close').click();await page.locator('#studio-relight').click();
  // Any further random change invalidates confirmation.
  await page.locator('#galaxy-random').click();assert.equal(await page.locator('#studio-wish').isVisible(),false);await idle(page);
  await track(page);await page.locator('#studio-auto').click();version=Number(await page.locator('#cake-screen').getAttribute('data-version'));
  await page.waitForFunction(v=>Number(document.getElementById('cake-screen').dataset.version)>=v+2,version,{timeout:30000});await page.locator('#studio-auto').click();await idle(page);values=await samples(page);assert.ok(Math.max(...values)<.01);
  await page.locator('#studio-confirm').click();assert.equal(await page.locator('#studio-wish').isVisible(),true);
  await page.screenshot({path:path.join(output,'galaxy-confirmed.png')});
  const before=await page.evaluate(k=>localStorage.getItem(k),key);await page.locator('#back-heart').click();assert.equal(await page.locator('.wish-card').count(),64);await page.locator('#enter-cake').click();assert.equal(await page.locator('canvas').count(),1);assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),before);
  await page.locator('#studio-edit').click();await open(page);const downloadPromise=page.waitForEvent('download');await page.locator('#studio-export').click();const download=await downloadPromise;await download.saveAs(path.join(output,'galaxy-export.png'));const png=await fs.readFile(path.join(output,'galaxy-export.png'));assert.ok(png.length>30000);
  const saved=await context.storageState();const phoneContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,storageState:saved});const phone=await phoneContext.newPage();await enter(phone);
  assert.equal(await phone.locator('#studio-wish').isVisible(),false);await phone.locator('#studio-edit').click();await open(phone);await phone.locator('#tab-toppings').click();await option(phone,'topping','macarons');await phone.screenshot({path:path.join(output,'galaxy-mobile-edit.png')});
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await phone.locator('#studio-explode').click();await closed(phone);await phone.locator('#studio-done').click();await phone.screenshot({path:path.join(output,'galaxy-mobile.png')});assert.equal(await phone.locator('#studio-wish').isVisible(),true);
  await phone.locator('#cake-exit').click();await page.locator('#cake-exit').click();assert.equal(await page.locator('#end-screen').isVisible(),true);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);console.log(JSON.stringify({passed:true,modePreservation:true,confirmationGate:true,errors:0,externalRequests:0,exportBytes:png.length,output}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
