const BASE_URL=process.env.BIRTHDAY_BASE_URL||'http://127.0.0.1:8765/';
// Deterministic, offline frame capture. Uses an isolated browser; no user tabs,
// live screen capture, credentials, or application source changes are required.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events');
const ROOT=path.resolve(__dirname,'..'),FPS=30,DURATION=40,FRAMES=FPS*DURATION;
const name=process.env.BIRTHDAY_RECORD_NAME,birthday=process.env.BIRTHDAY_RECORD_DATE;
if(!name||!birthday)throw new Error('Set BIRTHDAY_RECORD_NAME and BIRTHDAY_RECORD_DATE first.');
const preview=process.argv.includes('--preview'),slug=name.replace(/[^a-zA-Z0-9_-]/g,'_')||'birthday';
const desktop=process.argv.includes('--desktop');
const capture=desktop?{viewport:{width:1920,height:1080},deviceScaleFactor:1,isMobile:false,hasTouch:false}:{viewport:{width:540,height:960},deviceScaleFactor:2,isMobile:true,hasTouch:true};
const width=desktop?1920:1080,height=desktop?1080:1920;
const dir=path.join(ROOT,'artifacts','recordings',slug,...(desktop?['desktop']:[])),ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
const silent=path.join(dir,`${slug}-silent.mp4`),output=path.join(dir,`${slug}-birthday-${desktop?'desktop-':''}1080p.mp4`);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function waitDOM(page,fn,label){for(let i=0;i<500;i++){if(await page.evaluate(fn))return;await pause(20)}throw new Error(`Timed out: ${label}`);}
async function runFFmpeg(args){const p=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{windowsHide:true});let log='';p.stderr.on('data',d=>log+=d);const [code]=await once(p,'close');if(code)throw new Error(`FFmpeg ${code}: ${log}`);}
(async()=>{
 await fs.mkdir(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.BIRTHDAY_BROWSER_CHANNEL?{channel:process.env.BIRTHDAY_BROWSER_CHANNEL}:{})}),errors=[],checkpoints=[];let encoder=null,encoderLog='';
 try{
  const context=await browser.newContext({...capture,reducedMotion:'no-preference'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  // Raise only this capture's canvas resolution to match the 1080p output.
  await page.route('**/workshop.js?v=9',async route=>{const response=await route.fetch();const body=(await response.text()).replace('Math.min(devicePixelRatio || 1, 1.6)','Math.min(devicePixelRatio || 1, 2)');await route.fulfill({response,body});});
  await page.addInitScript(()=>{let seed=81173;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};});
  const recordDate=new Date();await page.clock.install({time:new Date(+recordDate-5000)});
  await page.goto(BASE_URL);await page.clock.pauseAt(recordDate);
  await page.addStyleTag({content:':focus-visible{outline:none!important}'});
  await page.evaluate(({name,birthday})=>{document.getElementById('birthday-name').value=name;document.getElementById('birthday-password').value=birthday;document.getElementById('identity-form').requestSubmit();},{name,birthday});
  await waitDOM(page,()=>!document.getElementById('intro-screen').hidden,'birthday entry');
  const recipient=await page.evaluate(async()=>{
   const {getRecipient}=await import('./birthday-profile.js?v=2'),p=getRecipient();
   localStorage.setItem('birthday-cake-recipient-v1',JSON.stringify({name:p.name,year:p.celebrationYear,age:p.birthdayAge}));
   localStorage.setItem('birthday-galaxy-cake-v2',JSON.stringify({layers:3,shape:'round',skin:'galaxy',creamStyle:'pearls',topping:'stars',candles:'number',age:p.birthdayAge,plate:'galaxy',message:`${p.name}，生日快乐`}));
   const {loadThree}=await import('./cake.js?v=3');await loadThree();await import('./workshop.js?v=9');
   return {name:p.name,birthdayAge:p.birthdayAge,celebrationYear:p.celebrationYear};
  });
  await page.evaluate(()=>document.fonts.ready);
  // CSS animation/transition time is separate from JS timers. Drive both clocks.
  async function seekCSS(ms){await page.evaluate(ms=>{window.__captureAnimations??=new WeakMap();for(const a of document.getAnimations()){
   if(!window.__captureAnimations.has(a))window.__captureAnimations.set(a,ms-(Number(a.currentTime)||0));
   a.pause();a.currentTime=Math.max(0,ms-window.__captureAnimations.get(a));
  }},ms);}
  await seekCSS(0);
  const click=selector=>page.evaluate(selector=>{const n=document.querySelector(selector);if(!n||n.disabled||n.closest('[hidden]'))throw new Error(`Cannot activate ${selector}`);n.click();},selector);
  let dragOrigin=null;
  const events=new Map();function at(seconds,fn){events.set(Math.round(seconds*FPS),fn)}
  at(2,async()=>{const r=await page.locator('#start').boundingBox();await page.mouse.click(r.x+r.width/2,r.y+r.height*.75);});
  at(8.6,async()=>{dragOrigin=await page.locator('.wish-card').last().boundingBox();await page.mouse.move(dragOrigin.x+dragOrigin.width*.4,dragOrigin.y+dragOrigin.height*.6);await page.mouse.down();});
  for(let i=1;i<=18;i++)at(8.6+i/FPS,async()=>{await page.mouse.move(dragOrigin.x+dragOrigin.width*.4-(desktop?260:115)*i/18,dragOrigin.y+dragOrigin.height*.6+(desktop?160:90)*i/18);});
  at(9.23,()=>page.mouse.up());
  at(9.8,()=>click('.wish-card:last-child .card-message'));
  at(11.7,()=>click('#card-reader-return'));
  at(12.6,async()=>{await click('#enter-cake');await waitDOM(page,()=>Boolean(document.querySelector('#workshop-canvas canvas'))&&+document.getElementById('cake-screen').dataset.version>0,'cake initialization');});
  at(15.5,()=>click('#studio-edit'));
  at(15.1,()=>click('#studio-rotate'));
  at(16.9,async()=>{await click('#tab-inspiration');await click('#inspiration-choices button[data-mood="blush"]');});
  at(19.2,()=>click('#studio-random'));
  at(21.6,()=>click('#studio-random'));
  at(desktop?23:23.9,async()=>{
   await click('#tab-candles');await click('[data-option="candles"] [data-value="number"]');
   await click('#tab-layers');await click('[data-option="layers"] [data-value="3"]');await click('[data-option="skin"] [data-value="galaxy"]');await click('[data-option="shape"] [data-value="round"]');
   if(desktop){await click('#tab-cream');await click('[data-option="creamStyle"] [data-value="braid"]');}
   await click('#tab-toppings');await click('[data-option="topping"] [data-value="hearts"]');
   await click('#tab-plate');await click('[data-option="plate"] [data-value="galaxy"]');await click('#tab-candles');
  });
  at(27.5,()=>click('#studio-explode'));
  at(28.8,()=>click('#studio-done'));
  at(30.5,()=>page.keyboard.down('Space'));
  at(32.8,()=>page.keyboard.up('Space'));
  const stills=new Map([[0,'01-intro'],[Math.round(7.9*FPS),'02-heart'],[Math.round(10.7*FPS),'03-card'],[Math.round(15*FPS),'04-galaxy-cake'],[Math.round(20.9*FPS),'05-workshop'],[Math.round(29.2*FPS),'06-final-cake'],[Math.round(35.5*FPS),'07-letter']]);
  if(!preview){
   encoder=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(FPS),'-i','pipe:0','-an','-vf','fade=t=in:st=0:d=0.3,fade=t=out:st=39.4:d=0.6','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-threads','4',silent],{windowsHide:true,stdio:['pipe','ignore','pipe']});
   encoder.stderr.on('data',d=>encoderLog=(encoderLog+d).slice(-8000));encoder.stdin.on('error',()=>{});
  }
  for(let frame=0;frame<FRAMES;frame++){
   if(events.has(frame))await events.get(frame)();
   await page.clock.runFor(Math.round((frame+1)*1000/FPS)-Math.round(frame*1000/FPS));await seekCSS((frame+1)*1000/FPS);
   if(!preview||stills.has(frame)){
    const jpeg=await page.screenshot({type:'jpeg',quality:94,animations:'allow',caret:'hide',scale:'device'});
    if(stills.has(frame)){const file=path.join(dir,`${stills.get(frame)}.jpg`);await fs.writeFile(file,jpeg);checkpoints.push({timeSeconds:(frame+1)/FPS,file,design:await page.evaluate(()=>JSON.parse(localStorage.getItem('birthday-galaxy-cake-v2')))});}
    if(encoder){if(encoder.exitCode!==null)throw new Error(`Encoder stopped: ${encoderLog}`);if(!encoder.stdin.write(jpeg))await once(encoder.stdin,'drain');}
   }
   if(frame%90===0)console.log(`${preview?'Preview':'Render'} ${Math.round(frame/FRAMES*100)}% · ${frame}/${FRAMES}`);
  }
  const title=await page.locator('#wish-letter-title').innerText();if(!title.includes(`${name}，${recipient.birthdayAge}岁生日快乐`))throw new Error('Final personal letter missing');
  if(errors.length)throw new Error(errors.join('\n'));
  const metadata={...recipient,width,height,layout:desktop?'desktop':'portrait',fps:FPS,durationSeconds:DURATION,frames:FRAMES,checkpoints,errors};await fs.writeFile(path.join(dir,'recording.json'),JSON.stringify(metadata,null,2));
  if(encoder){const closed=once(encoder,'close');encoder.stdin.end();const [code]=await closed;if(code)throw new Error(encoderLog);encoder=null;
   const filter=`atrim=0:${DURATION-2},asetpts=PTS-STARTPTS,volume=1.25,afade=t=in:st=0:d=1.4,adelay=2000:all=1,volume=volume=0.42:enable='between(t,9.8,11.7)+gte(t,33.4)',afade=t=out:st=38.6:d=1.4`;
   if(process.env.BIRTHDAY_RECORD_MUSIC)await runFFmpeg(['-i',silent,'-i',path.resolve(process.env.BIRTHDAY_RECORD_MUSIC),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af',filter,'-c:a','aac','-b:a','192k','-ar','48000','-t',String(DURATION),'-movflags','+faststart','-metadata',`title=${name} · ${recipient.birthdayAge}岁生日快乐`,output]);
   else await runFFmpeg(['-i',silent,'-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-t',String(DURATION),'-movflags','+faststart',output]);
   console.log(JSON.stringify({complete:true,output,...recipient,bytes:(await fs.stat(output)).size,frames:FRAMES}));
  }else console.log(JSON.stringify({preview:true,dir,...recipient,checkpoints:checkpoints.map(s=>({time:s.timeSeconds,design:s.design}))}));
 }finally{if(encoder){encoder.stdin.destroy();encoder.kill();}await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
