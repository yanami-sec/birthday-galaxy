const BASE_URL=process.env.BIRTHDAY_BASE_URL||'http://127.0.0.1:8765/';
const unlockBirthday=require('./enter-birthday.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const output=path.resolve(__dirname,'../artifacts'),key='birthday-galaxy-cake-v2';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BIRTHDAY_BROWSER_CHANNEL?{channel:process.env.BIRTHDAY_BROWSER_CHANNEL}:{})}),errors=[],remote=[];
 const idle=p=>p.waitForFunction(()=>document.getElementById('cake-screen').dataset.motion==='idle'&&!document.getElementById('studio-random').disabled,{},{timeout:20000});
 async function enter(p){
  p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('request',r=>{if(!r.url().startsWith(BASE_URL)&&!r.url().startsWith('data:'))remote.push(r.url())});
  await p.goto(BASE_URL);await unlockBirthday(p);await p.locator('#start').click();await p.locator('#enter-cake').click({timeout:12000});await p.waitForFunction(()=>!document.getElementById('studio-edit').disabled);
 }
 try{
  await fs.mkdir(output,{recursive:true});const c=await browser.newContext({viewport:{width:1440,height:960},acceptDownloads:true});const p=await c.newPage();await enter(p);
  assert.ok((await p.locator('#studio-edit').textContent()).includes('你喜欢什么样的蛋糕？'));assert.equal(await p.locator('#recipe-card').isVisible(),false);
  await p.locator('#studio-edit').click();assert.equal(await p.locator('#studio-edit').getAttribute('aria-expanded'),'true');await p.locator('#tab-inspiration').click();assert.equal(await p.locator('#inspiration-choices [data-mood]').count(),5);
  await p.locator('#inspiration-choices [data-mood="breeze"]').click();await idle(p);await p.waitForTimeout(1300);
  let state=JSON.parse(await p.evaluate(k=>localStorage.getItem(k),key));assert.equal(state.mood,'breeze');assert.deepEqual(state.colors,['#388e9f','#8dcecb','#b8cddd']);assert.equal(state.layers,1);assert.equal(state.candles,'number');assert.equal(await p.locator('#cake-screen').getAttribute('data-mood'),'breeze');
  await p.screenshot({path:path.join(output,'lab-breeze-inspiration.png')});
  await p.locator('#studio-random').click();await idle(p);state=JSON.parse(await p.evaluate(k=>localStorage.getItem(k),key));assert.equal(state.mood,'breeze');assert.deepEqual([...state.colors].sort(),['#388e9f','#8dcecb','#b8cddd'].sort());assert.equal(await p.locator('#cake-screen').getAttribute('data-mode'),'open');
  await p.locator('#studio-explode').click();await p.waitForFunction(()=>!document.getElementById('studio-done').disabled);await p.locator('#studio-done').click();assert.equal(await p.locator('#recipe-card').isVisible(),true);assert.equal(await p.locator('#recipe-title').textContent(),'晚风里的小心愿');
  await p.locator('#recipe-name-open').click();await p.locator('#recipe-name-input').fill('今晚的晚风限定');await p.keyboard.press('Escape');assert.equal(await p.locator('#cake-screen').isVisible(),true);assert.equal(await p.locator('#recipe-name-dialog').isVisible(),false);assert.equal(await p.locator('#recipe-title').textContent(),'晚风里的小心愿');
  const version=await p.locator('#cake-screen').getAttribute('data-version');await p.locator('#recipe-name-open').click();await p.locator('#recipe-name-input').fill('把晚风寄给你');await p.locator('#recipe-name-form [type="submit"]').click();
  assert.equal(await p.locator('#recipe-title').textContent(),'把晚风寄给你');assert.equal(await p.locator('#cake-screen').getAttribute('data-confirmed'),'true');assert.equal(await p.locator('#cake-screen').getAttribute('data-version'),version);
  const download=p.waitForEvent('download');await p.locator('#recipe-export').click();const poster=await download;await poster.saveAs(path.join(output,'lab-named-keepsake.png'));const bytes=await fs.readFile(path.join(output,'lab-named-keepsake.png'));assert.ok(bytes.length>30000);
  await p.screenshot({path:path.join(output,'lab-named-desktop.png')});
  const storageState=await c.storageState();const mobile=await browser.newContext({viewport:{width:360,height:760},isMobile:true,hasTouch:true,storageState});const phone=await mobile.newPage();await enter(phone);
  assert.equal(await phone.locator('#recipe-card').isVisible(),false);await phone.locator('#studio-confirm').click();assert.equal(await phone.locator('#recipe-title').textContent(),'把晚风寄给你');
  await phone.screenshot({path:path.join(output,'lab-named-mobile.png')});assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const geometry=await phone.evaluate(()=>({entry:document.getElementById('studio-edit').getBoundingClientRect().right,back:document.getElementById('back-heart').getBoundingClientRect().left}));assert.ok(geometry.entry<geometry.back);
  await phone.locator('#studio-edit').click();await phone.locator('#tab-inspiration').click();await phone.locator('#inspiration-choices [data-mood="sunset"]').click();await idle(phone);assert.equal(await phone.locator('#recipe-card').isVisible(),false);assert.equal(await phone.locator('#studio-wish').isVisible(),false);assert.equal(await phone.locator('#cake-screen').getAttribute('data-mood'),'sunset');await phone.screenshot({path:path.join(output,'lab-mood-mobile.png')});
  await p.locator('#cake-exit').click();await phone.locator('#cake-exit').click();assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);console.log(JSON.stringify({passed:true,moodResponse:true,namePersistence:true,posterBytes:bytes.length,mobileHeader:true,errors:0,remote:0}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
