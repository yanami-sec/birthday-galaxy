const BASE_URL=process.env.BIRTHDAY_BASE_URL||'http://127.0.0.1:8765/';
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const unlockBirthday=require('./enter-birthday.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const output=path.resolve(__dirname,'../artifacts');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BIRTHDAY_BROWSER_CHANNEL?{channel:process.env.BIRTHDAY_BROWSER_CHANNEL}:{})}),errors=[];
 async function enterHeart(page){page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto(BASE_URL);await unlockBirthday(page);
  const flame=page.locator('.cake-flame'),a=await flame.evaluate(n=>getComputedStyle(n).transform);await page.waitForTimeout(180);assert.notEqual(await flame.evaluate(n=>getComputedStyle(n).transform),a);
  await page.screenshot({path:path.join(output,'intro-live-flame.png')});await page.locator('#start').click();await page.waitForTimeout(700);assert.equal(await page.locator('#cards').evaluate(n=>n.classList.contains('is-interactive')),false);
  await page.locator('#enter-cake').waitFor({state:'visible',timeout:15000});assert.equal(await page.locator('.wish-card').count(),64);assert.equal(await page.locator('.wish-card[tabindex="0"]').count(),64);
 }
 async function mouseDrag(page,node,dx,dy){const r=await node.boundingBox();await page.mouse.move(r.x+r.width*.45,r.y+r.height*.6);await page.mouse.down();await page.mouse.move(r.x+r.width*.45+dx,r.y+r.height*.6+dy,{steps:15});await page.mouse.up();}
 try{
  await fs.mkdir(output,{recursive:true});const page=await browser.newPage({viewport:{width:1440,height:960}});await enterHeart(page);
  const card=page.locator('.wish-card').last(),original=await card.evaluate(n=>parseFloat(n.style.left)),message=await card.locator('.card-message').innerText();
  await mouseDrag(page,card,-260,160);assert.ok(Math.abs(await card.evaluate(n=>parseFloat(n.style.left))-original)>100);assert.equal(await page.locator('#card-reader').isVisible(),false,'Dragging must not open the reader');
  await page.waitForTimeout(500);await card.locator('.card-message').click();await page.locator('#card-reader').waitFor({state:'visible'});assert.equal(await page.locator('#card-reader-message').innerText(),message);await page.screenshot({path:path.join(output,'heart-card-reader-desktop.png')});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#card-reader').isVisible(),false);assert.equal(await page.locator('#end-screen').isVisible(),false);
  await card.focus();await page.keyboard.press('Enter');await page.locator('#card-reader-return').click();assert.ok(Math.abs(await card.evaluate(n=>parseFloat(n.style.left))-original)<.01);
  await card.focus();await page.keyboard.press('ArrowLeft');assert.ok(await card.evaluate(n=>parseFloat(n.style.left))<original-10);await page.locator('#reset-cards').click();assert.equal(await page.locator('#reset-cards').isDisabled(),true);
  await card.locator('.card-close').click();assert.equal(await card.isVisible(),false);await page.locator('#reset-cards').click();assert.equal(await page.locator('.wish-card:visible').count(),64);
  await mouseDrag(page,card,-240,130);await page.screenshot({path:path.join(output,'heart-draggable-cards.png')});const moved=await card.evaluate(n=>n.style.left);
  await page.locator('#enter-cake').click();await page.waitForFunction(()=>!document.getElementById('studio-edit').disabled);await page.locator('#back-heart').click();assert.equal(await card.evaluate(n=>n.style.left),moved);
  await page.locator('#replay').click();await page.locator('#enter-cake').waitFor({state:'visible'});assert.equal(await page.locator('.wish-card:visible').count(),64);assert.equal(await page.locator('#reset-cards').isDisabled(),true);
  const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await enterHeart(phone);const touchCard=phone.locator('.wish-card').last(),left=await touchCard.evaluate(n=>parseFloat(n.style.left));const r=await touchCard.boundingBox();
  const session=await phone.context().newCDPSession(phone),x=r.x+r.width*.4,y=r.y+r.height*.6;await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=6;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-80*i/6,y:y+125*i/6}]});await phone.waitForTimeout(20)}await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(Math.abs(await touchCard.evaluate(n=>parseFloat(n.style.left))-left)>30);
  await phone.waitForTimeout(500);await touchCard.locator('.card-message').tap();await phone.locator('#card-reader').waitFor({state:'visible'});await phone.screenshot({path:path.join(output,'heart-card-reader-mobile.png')});assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await phone.locator('#card-reader-return').tap();await phone.locator('#exit').tap();await page.locator('#exit').click();assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,flameAnimation:true,dragAndRead:true,restoreAll:true,keyboard:true,touchDrag:true,returnFromCake:true,errors:0}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
