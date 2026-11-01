const assert=require('node:assert/strict');
const {chromium,webkit}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const BASE_URL=process.env.BIRTHDAY_BASE_URL||'http://127.0.0.1:8765/';
const isWebKit=process.env.BIRTHDAY_BROWSER_ENGINE==='webkit';
(async()=>{
 const browser=await (isWebKit?webkit:chromium).launch({headless:true,...(!isWebKit&&process.env.BIRTHDAY_BROWSER_CHANNEL?{channel:process.env.BIRTHDAY_BROWSER_CHANNEL}:{})});
 try{
  for(const missingStylesheet of [false,true]){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
   if(missingStylesheet)await page.route('**/style.css*',route=>route.abort());
   await page.goto(BASE_URL);assert.equal(await page.locator('#identity-screen').isVisible(),true);
   await page.locator('#birthday-name').fill('小满');await page.locator('#birthday-password').fill('2000.02.01');await page.locator('#identity-submit').tap();
   await page.waitForFunction(()=>!document.getElementById('intro-screen').hidden);
   assert.equal(await page.locator('#identity-screen').isVisible(),false,'Successful entry must hide the form even if the main stylesheet fails');
   assert.equal(await page.locator('#birthday-password').inputValue(),'');assert.equal(await page.locator('#start').isVisible(),true);
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log(JSON.stringify({passed:true,engine:isWebKit?'webkit':'chromium',mobileEntry:true,missingStylesheet:true}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
