const BASE_URL=process.env.BIRTHDAY_BASE_URL||'http://127.0.0.1:8765/';
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const unlock=require('./enter-birthday.cjs'),output=path.resolve(__dirname,'../artifacts');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BIRTHDAY_BROWSER_CHANNEL?{channel:process.env.BIRTHDAY_BROWSER_CHANNEL}:{})}),errors=[],requests=[];
 function watch(p){p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('request',r=>requests.push(r.url()))}
 const birthdayAge=async(p,date)=>p.evaluate(async date=>{const {createBirthdayProfile}=await import('./birthday-profile.js?v=2');return createBirthdayProfile('测试',date).birthdayAge;},date);
 const cake=async p=>{await p.locator('#start').click();await p.locator('#enter-cake').click({timeout:12000});await p.waitForFunction(()=>!document.getElementById('studio-edit').disabled)};
 const wish=async p=>{await p.locator('#studio-confirm').click();await p.keyboard.down('Space');await p.waitForFunction(()=>document.getElementById('studio-wish-progress').value>=100,{},{timeout:45000});await p.keyboard.up('Space');await p.locator('#wish-letter-dialog').waitFor({state:'visible',timeout:30000})};
 try{
  await fs.mkdir(output,{recursive:true});const context=await browser.newContext({viewport:{width:1440,height:960}});const page=await context.newPage();watch(page);await page.goto(BASE_URL);
  assert.equal(await page.locator('#identity-screen').isVisible(),true);assert.equal(await page.locator('#start').isVisible(),false);await page.keyboard.press('r');assert.equal(await page.locator('.wish-card').count(),0);await page.locator('#birthday-name').fill('');
  await page.screenshot({path:path.join(output,'birthday-entry.png')});
  await page.locator('#identity-submit').click();await page.waitForFunction(()=>!document.getElementById('identity-submit').disabled);assert.ok((await page.locator('#identity-error').textContent()).length>0);assert.equal(await page.locator('#identity-screen').isVisible(),true);
  await page.locator('#birthday-name').fill('若曦');await page.locator('#birthday-password').fill('2001.02.29');await page.locator('#identity-submit').click();await page.waitForFunction(()=>!document.getElementById('identity-submit').disabled);assert.ok((await page.locator('#identity-error').textContent()).includes('不存在'));
  await page.locator('#birthday-password-toggle').click();assert.equal(await page.locator('#birthday-password').getAttribute('type'),'text');await page.locator('#birthday-password-toggle').click();
  const age=await birthdayAge(page,'2000.02.01');await unlock(page,'若曦','2000.02.01');assert.equal(await page.locator('#birthday-password').inputValue(),'');assert.ok((await page.locator('#intro-description').textContent()).includes(`若曦的${age}岁`));
  await page.locator('#start').click();await page.locator('#enter-cake').waitFor({state:'visible',timeout:12000});assert.equal(await page.locator('.wish-card').count(),64);assert.ok((await page.locator('#recipient-greeting').textContent()).includes('若曦'));assert.ok((await page.locator('.card-message').allTextContents()).some(text=>text.includes('若曦')));await page.screenshot({path:path.join(output,'birthday-named-heart.png')});
  await page.locator('#enter-cake').click();await page.waitForFunction(()=>!document.getElementById('studio-edit').disabled);assert.ok((await page.locator('.lab-title').textContent()).includes('你喜欢什么样的蛋糕？'));
  assert.equal(await page.locator('[data-option="candles"] [data-value="number"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#studio-age').inputValue(),String(age));assert.ok((await page.locator('#studio-message').inputValue()).includes('若曦'));assert.ok((await page.locator('#cake-recipient-line').textContent()).includes(`${age}岁`));
  await page.screenshot({path:path.join(output,'birthday-personal-cake.png')});await wish(page);
  assert.ok((await page.locator('#wish-letter-title').textContent()).includes(`若曦，${age}岁生日快乐`));assert.ok((await page.locator('#wish-letter-copy').textContent()).includes('若曦'));await page.screenshot({path:path.join(output,'birthday-final-letter.png')});
  await page.locator('#wish-letter-close').click();assert.equal(await page.locator('#cake-screen').isVisible(),true);await page.locator('#studio-letter').click();await page.locator('#wish-letter-again').click();assert.equal(await page.locator('#studio-wish').isVisible(),true);assert.equal(await page.locator('#studio-wish-progress').getAttribute('value'),'0');
  const values=await page.evaluate(()=>Object.values(localStorage));assert.ok(values.every(v=>!v.includes('2000.02.01')));
  const storageState=await context.storageState();const mobile=await browser.newContext({viewport:{width:360,height:760},isMobile:true,hasTouch:true,storageState});const phone=await mobile.newPage();watch(phone);await phone.goto(BASE_URL);await phone.screenshot({path:path.join(output,'birthday-entry-mobile.png')});
  const age2=await birthdayAge(phone,'2005.12.31');await unlock(phone,'小满','2005.12.31');await cake(phone);assert.equal(await phone.locator('#studio-age').inputValue(),String(age2));assert.ok((await phone.locator('#studio-message').inputValue()).includes('小满'));assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const header=await phone.evaluate(()=>({entry:document.getElementById('studio-edit').getBoundingClientRect().right,back:document.getElementById('back-heart').getBoundingClientRect().left}));assert.ok(header.entry<header.back);
  await wish(phone);assert.ok((await phone.locator('#wish-letter-title').textContent()).includes(`小满，${age2}岁`));await phone.screenshot({path:path.join(output,'birthday-letter-mobile.png')});await phone.keyboard.press('Escape');assert.equal(await phone.locator('#cake-screen').isVisible(),true);
  await phone.reload();assert.equal(await phone.locator('#identity-screen').isVisible(),true);assert.equal(await phone.locator('#birthday-password').inputValue(),'');
  assert.ok(requests.every(url=>url.startsWith(BASE_URL)||url.startsWith('data:')));assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,entryValidation:true,personalizedCards:true,numericAge:true,finalLetter:true,rawBirthdayStored:false,mobileHeader:header,errors:0}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
