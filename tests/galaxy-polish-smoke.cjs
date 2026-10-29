const BASE_URL=process.env.BIRTHDAY_BASE_URL||'http://127.0.0.1:8765/';
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const unlockBirthday=require('./enter-birthday.cjs');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises');
const output=path.resolve(__dirname,'../artifacts');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BIRTHDAY_BROWSER_CHANNEL?{channel:process.env.BIRTHDAY_BROWSER_CHANNEL}:{})}),errors=[];
 async function enter(page){page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto(BASE_URL);await unlockBirthday(page);await page.locator('#start').click();await page.locator('#enter-cake').click({timeout:15000});await page.waitForFunction(()=>!document.getElementById('studio-edit').disabled);await page.waitForTimeout(1600);}
 const idle=page=>page.waitForFunction(()=>document.getElementById('cake-screen').dataset.motion==='idle'&&!document.getElementById('studio-random').disabled,{},{timeout:20000});
 async function option(page,field,value){await page.locator(`[data-option="${field}"] [data-value="${value}"]`).click();await idle(page);}
 async function pixels(page){return page.evaluate(()=>{const source=document.querySelector('#workshop-canvas canvas'),c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d');ctx.drawImage(source,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;const out=[];for(let y=Math.floor(c.height*.25);y<c.height*.82;y+=3)for(let x=Math.floor(c.width*.3);x<c.width*.7;x+=3){const i=(y*c.width+x)*4;out.push(data[i],data[i+1],data[i+2]);}return out;});}
 try{
  await fs.mkdir(output,{recursive:true});const page=await browser.newPage({viewport:{width:1920,height:1080}});await enter(page);
  assert.match(await page.locator('#lab-toggle').innerText(),/开始制作你的蛋糕/);
  await page.screenshot({path:path.join(output,'galaxy-wide-polished.png')});
  // Both far margins must contain actual rendered stars, independent of the cake.
  const margins=await page.evaluate(()=>{const source=document.querySelector('#workshop-canvas canvas'),c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d');ctx.drawImage(source,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;return [0,.82].map(start=>{let bright=0;for(let y=Math.floor(c.height*.2);y<c.height*.85;y++)for(let x=Math.floor(c.width*start);x<c.width*(start+.18);x++){const i=(y*c.width+x)*4;if(Math.max(d[i],d[i+1],d[i+2])>65)bright++;}return bright;});});assert.ok(margins.every(n=>n>100),JSON.stringify(margins));
  await page.locator('#studio-rotate').click();await page.locator('#studio-edit').click();await page.locator('#tab-candles').click();
  for(const style of ['single','three','spiral','rainbow','heart','star','sparkler','number']){await option(page,'candles',style);if(['number','heart','spiral'].includes(style))await page.screenshot({path:path.join(output,`candle-${style}-polished.png`)});}
  // Remove flame/particles/decorations/rotation to isolate movement of the cake skin.
  await option(page,'candles','none');await page.locator('#tab-toppings').click();await option(page,'topping','none');await page.locator('#studio-sprinkles').uncheck();await idle(page);
  await page.locator('#tab-cream').click();await option(page,'creamStyle','none');await page.locator('#tab-wish').click();await page.locator('#studio-message').fill('');await page.locator('#studio-message').blur();await idle(page);
  await page.locator('#tab-layers').click();await option(page,'skin','galaxy');await page.locator('#studio-explode').click();await page.waitForFunction(()=>Number(document.getElementById('cake-screen').dataset.expansion)<.001);await page.locator('#studio-edit').click();await page.waitForTimeout(2200);
  await page.locator('#studio-effects').click();await page.waitForTimeout(600);const before=await pixels(page);await page.screenshot({path:path.join(output,'galaxy-surface-flow-before.png')});await page.waitForTimeout(2400);const after=await pixels(page);await page.screenshot({path:path.join(output,'galaxy-surface-flow-after.png')});
  const moving=after.filter((value,i)=>Math.abs(value-before[i])>8).length;assert.ok(moving>800,`Only ${moving} surface channels changed`);
  await page.locator('#studio-effects').click();const downloadPromise=page.waitForEvent('download');await page.locator('#studio-edit').click();await page.locator('#studio-export').click();const download=await downloadPromise;await download.saveAs(path.join(output,'galaxy-polished-export.png'));assert.ok((await fs.stat(path.join(output,'galaxy-polished-export.png'))).size>30000);
  const phone=await browser.newPage({viewport:{width:360,height:800},isMobile:true,hasTouch:true});await enter(phone);const bounds=await phone.locator('#studio-edit').boundingBox(),back=await phone.locator('#back-heart').boundingBox();assert.ok(bounds.x+bounds.width<back.x,JSON.stringify({bounds,back}));assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await phone.screenshot({path:path.join(output,'galaxy-polished-mobile.png')});await phone.locator('#studio-edit').click();assert.match(await phone.locator('#lab-toggle').innerText(),/收起/);await phone.locator('#cake-exit').click();await page.locator('#cake-exit').click();assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,candleStyles:8,marginStars:margins,movingSurfaceChannels:moving,mobileHeader:true}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
