const BASE_URL=process.env.BIRTHDAY_BASE_URL||'http://127.0.0.1:8765/';
// Prepend the actual name/password entry to an existing finished recording.
// The original video and audio are concatenated without another lossy encode.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process'),{once}=require('node:events');
const root=path.resolve(__dirname,'..'),name=process.env.BIRTHDAY_RECORD_NAME,birthday=process.env.BIRTHDAY_RECORD_DATE;
if(!name||!birthday)throw new Error('Set BIRTHDAY_RECORD_NAME and BIRTHDAY_RECORD_DATE.');
const desktop=process.argv.includes('--desktop'),width=desktop?1920:1080,height=desktop?1080:1920;
const slug=name.replace(/[^a-zA-Z0-9_-]/g,'_')||'birthday',dir=path.join(root,'artifacts','recordings',slug,...(desktop?['desktop']:[])),fps=30,seconds=5,frames=fps*seconds;
const ff=process.env.FFMPEG_PATH||'ffmpeg',original=path.join(dir,`${slug}-birthday-${desktop?'desktop-':''}1080p.mp4`);
const silent=path.join(dir,'entry-silent.mp4'),prefix=path.join(dir,'entry-with-silence.mp4'),output=path.join(dir,`${slug}-birthday-${desktop?'desktop-':''}with-login-1080p.mp4`);
async function run(args){const p=spawn(ff,['-hide_banner','-loglevel','error','-y',...args],{windowsHide:true});let log='';p.stderr.on('data',d=>log+=d);const [code]=await once(p,'close');if(code)throw new Error(log);}
async function until(page,fn){for(let i=0;i<250;i++){if(await page.evaluate(fn))return;await new Promise(r=>setTimeout(r,20))}throw new Error('Entry submission did not finish');}
(async()=>{
 await fs.access(original);const browser=await chromium.launch({headless:true,...(process.env.BIRTHDAY_BROWSER_CHANNEL?{channel:process.env.BIRTHDAY_BROWSER_CHANNEL}:{})}),errors=[];let encoder=null,log='';
 try{
  const page=await browser.newPage(desktop?{viewport:{width:1920,height:1080},deviceScaleFactor:1}:{viewport:{width:540,height:960},deviceScaleFactor:2,isMobile:true,hasTouch:true});page.on('pageerror',e=>errors.push(String(e)));
  const today=new Date();await page.clock.install({time:new Date(+today-5000)});await page.goto(BASE_URL);await page.clock.pauseAt(today);
  await page.addStyleTag({content:':focus-visible{outline:none!important}#birthday-password{-webkit-text-security:disc!important}'});await page.evaluate(()=>document.fonts.ready);
  if(await page.locator('#birthday-password').getAttribute('type')!=='password')throw new Error('Password must remain masked');
  const actions=new Map(),at=(time,fn)=>actions.set(Math.round(time*fps),fn);
  const focus=id=>page.evaluate(id=>document.getElementById(id).focus({preventScroll:true}),id);
  at(.7,()=>focus('birthday-name'));Array.from(name).forEach((ch,i)=>at(.83+i*.14,()=>page.keyboard.type(ch)));
  at(1.8,()=>focus('birthday-password'));Array.from(birthday).forEach((ch,i)=>at(2+i*.14,()=>page.keyboard.type(ch)));
  at(4.6,async()=>{const r=await page.locator('#identity-submit').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();});
  encoder=spawn(ff,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-an','-vf','fade=t=in:st=0:d=0.2,fade=t=out:st=4.75:d=0.25','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-threads','4',silent],{windowsHide:true,stdio:['pipe','ignore','pipe']});encoder.stderr.on('data',d=>log+=d);encoder.stdin.on('error',()=>{});
  for(let frame=0;frame<frames;frame++){
   if(actions.has(frame))await actions.get(frame)();await page.clock.runFor(Math.round((frame+1)*1000/fps)-Math.round(frame*1000/fps));
   const jpeg=await page.screenshot({type:'jpeg',quality:94,caret:'hide',scale:'device'});if([15,50,115,140].includes(frame))await fs.writeFile(path.join(dir,`entry-check-${frame}.jpg`),jpeg);
   if(encoder.exitCode!==null)throw new Error(log);if(!encoder.stdin.write(jpeg))await once(encoder.stdin,'drain');if(frame%30===0)console.log(`Entry ${frame}/${frames}`);
  }
  await page.mouse.up();await until(page,()=>document.getElementById('identity-screen').hidden&&!document.getElementById('intro-screen').hidden);
  const profile=await page.evaluate(async()=>{const p=(await import('./birthday-profile.js?v=2')).getRecipient();return {name:p.name,birthdayAge:p.birthdayAge,celebrationYear:p.celebrationYear};});
  const previous=JSON.parse(await fs.readFile(path.join(dir,'recording.json'),'utf8'));if(profile.name!==previous.name||profile.birthdayAge!==previous.birthdayAge)throw new Error('Entry birthday does not match existing recording');if(errors.length)throw new Error(errors.join('\n'));
  const closed=once(encoder,'close');encoder.stdin.end();const [code]=await closed;encoder=null;if(code)throw new Error(log);
  await run(['-i',silent,'-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-t',String(seconds),prefix]);
  const list=path.join(dir,'entry-concat.txt');await fs.writeFile(list,[prefix,original].map(file=>`file '${file.replaceAll('\\','/')}'`).join('\n')+'\n');
  await run(['-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart','-metadata',`title=${name} · ${profile.birthdayAge}岁生日快乐 · 含登录开场`,output]);
  await fs.writeFile(path.join(dir,'entry-recording.json'),JSON.stringify({...profile,width,height,layout:desktop?'desktop':'portrait',fps,entrySeconds:seconds,totalSeconds:seconds+previous.durationSeconds,passwordMasked:true,originalPreserved:true,output,bytes:(await fs.stat(output)).size},null,2));
  console.log(JSON.stringify({complete:true,output,...profile,seconds:45,passwordMasked:true}));
 }finally{if(encoder){encoder.stdin.destroy();encoder.kill();}await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
