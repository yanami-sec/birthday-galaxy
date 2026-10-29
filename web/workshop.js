import { loadThree } from "./cake.js?v=3";
import { DEFAULT_DESIGN, SWATCHES, normalizeDesign, randomDesign, buildCakeModel } from "./workshop-model.js?v=9";
import { CATALOG } from "./cake-catalog.js?v=1";
import { MOODS, suggestRecipeName, recipeName as cleanRecipeName } from "./cake-inspiration.js?v=1";
import { createGalaxyEffects, galaxyTexture } from "./galaxy-effects.js?v=6";
import { createGalaxyBackdrop } from './galaxy-backdrop.js?v=2';
import { animateGalaxySurface } from './animated-surface.js?v=1';
import { RemixTimeline } from "./remix-timeline.js?v=5";
import { getRecipient, cakeGreeting, birthdayBlessing } from './birthday-profile.js?v=2';

const STORAGE_KEY = "birthday-galaxy-cake-v2";
const RECIPIENT_KEY='birthday-cake-recipient-v1';
export async function createWorkshop(container) {
  const THREE = await loadThree(), $ = id => document.getElementById(id);
  const screen = $("cake-screen"), editor = $("studio-editor"), status = $("workshop-status");
  screen.dataset.motion="arriving";screen.dataset.expansion="0";screen.dataset.auto="false";
  $("studio-rotate").setAttribute("aria-pressed","true");$("studio-effects").setAttribute("aria-pressed","true");
  const abort = new AbortController();
  const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal: abort.signal });
  const compact = matchMedia("(max-width: 700px)").matches;
  let state = normalizeDesign(DEFAULT_DESIGN), selectedLayer = 0;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state = normalizeDesign(JSON.parse(saved));
    else {
      const previous = localStorage.getItem("birthday-cake-atelier-v1");
      if(previous) state = normalizeDesign({ ...JSON.parse(previous), skin: "galaxy", plate: "galaxy" });
    }
  } catch { /* Browser storage is optional. */ }
  const recipient=getRecipient();
  if(recipient){
    let owner=null;try{owner=JSON.parse(localStorage.getItem(RECIPIENT_KEY)||'null');}catch{}
    const same=owner?.name===recipient.name&&owner?.year===recipient.celebrationYear&&owner?.age===recipient.birthdayAge;
    state=normalizeDesign({...state,age:recipient.birthdayAge,...(same?{}:{candles:'number',message:cakeGreeting(recipient),recipeName:''})});
  }
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6)); renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  container.append(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-5,5,5,-5,.1,120);
  scene.add(new THREE.HemisphereLight("#f1dfff", "#17122f", .85));
  const key = new THREE.DirectionalLight("#fff2e2", 1.25); key.position.set(3,7,6); scene.add(key);
  const fill = new THREE.DirectionalLight("#a2adff", .8); fill.position.set(-5,2,-3); scene.add(fill);
  const turntable = new THREE.Group(); turntable.rotation.y = -.15; scene.add(turntable);
  const effects = createGalaxyEffects(THREE, scene, camera, compact);
  const backdrop=createGalaxyBackdrop(THREE,compact,effects.time,effects.glyphs);renderer.autoClear=false;
  const timeline = new RemixTimeline();
  let model = null,outgoingModel=null,plateFadeTime=0, running = false, disposed = false, frame = 0;
  let arriving=true,arrivalTime=0;
  let editing = false, exploded = false, expansion = 0, automatic = true, autoRemix = false, nextRemix = 0;
  let held = false, lit = true, confirmed = false, wish = 0, time = 0, last = 0, queued = null, blessingAt=Infinity;
  let sceneMood='';
  let zoom = 1, tilt = .38, targetTilt = .38, viewHeight = 7, lookY = 2;
  let trayAnchor=null;
  let width = 1, height = 1, viewBottom = 130, viewTop = 140, pinchDistance = 0;
  const pointers = new Map(), labels = [], pendingExports = new Set();
  const point = new THREE.Vector3(), progress = $("studio-wish-progress");
  const swatches = $("studio-swatches"); swatches.replaceChildren();
  screen.querySelectorAll('[data-option]').forEach(group=>{
    const entries=CATALOG[group.dataset.option];if(!entries)return;group.replaceChildren();
    entries.forEach(([value,label])=>{const b=document.createElement('button');b.type='button';b.dataset.value=value;b.textContent=group.dataset.option==='candles'&&value==='number'&&recipient?`${recipient.birthdayAge}岁数字蜡烛`:label;group.append(b);});
  });
  const inspirations=$('inspiration-choices');inspirations.replaceChildren();
  Object.entries(MOODS).forEach(([id,profile])=>{
    const b=document.createElement('button');b.type='button';b.className='inspiration-choice';b.dataset.mood=id;
    b.style.setProperty('--mood-accent',profile.accent);b.style.setProperty('--mood-glow',profile.glow);
    ['a','b','c'].forEach((key,i)=>b.style.setProperty(`--mood-${key}`,profile.colors[i]));
    b.innerHTML='<span class="inspiration-swirl" aria-hidden="true"></span><strong></strong><small></small>';
    b.querySelector('strong').textContent=profile.label;b.querySelector('small').textContent=profile.note;inspirations.append(b);
  });
  SWATCHES.forEach((color, i) => {
    const b = document.createElement("button"); b.type="button"; b.dataset.color=color; b.style.setProperty("--swatch",color); b.setAttribute("aria-label",`第 ${i+1} 种蛋糕颜色 ${color}`); swatches.append(b);
  });
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state));if(recipient)localStorage.setItem(RECIPIENT_KEY,JSON.stringify({name:recipient.name,year:recipient.celebrationYear,age:recipient.birthdayAge})); $("studio-save-status").textContent="搭配已保存 · 留在这片星河里"; }
    catch { $("studio-save-status").textContent="当前无法自动保存，仍可组装和导出"; }
  }
  function sync() {
    $('studio-edit').setAttribute('aria-expanded',String(editing));$('lab-toggle').textContent=editing?'收起制作面板 ↑':'开始制作你的蛋糕 →';
    inspirations.querySelectorAll('[data-mood]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mood===state.mood)));
    screen.querySelectorAll("[data-option]").forEach(group => group.querySelectorAll("button").forEach(button => button.setAttribute("aria-pressed",String(button.dataset.value===String(state[group.dataset.option])))));
    selectedLayer=Math.min(selectedLayer,state.layers-1);
    const list=$("studio-layer-list");
    if(list.children.length!==state.layers) {
      list.replaceChildren(); for(let i=0;i<state.layers;i++){const b=document.createElement("button");b.type="button";b.dataset.layer=i;b.innerHTML=`<i aria-hidden="true"></i>第 ${i+1} 层`;list.append(b);}
    }
    [...list.children].forEach((b,i)=>{b.style.setProperty("--layer-color",state.colors[i]);b.setAttribute("aria-pressed",String(i===selectedLayer));});
    swatches.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.color===state.colors[selectedLayer])));
    $("studio-layer-color").value=state.colors[selectedLayer]; $("studio-cream-color").value=state.cream; $("studio-sprinkles").checked=state.sprinkles;
    $("studio-age-field").hidden=state.candles!=="number"; $("studio-age").value=state.age;
    if(document.activeElement!==$("studio-message"))$("studio-message").value=state.message;
    $("studio-random").disabled=timeline.busy||arriving; $("galaxy-random").disabled=timeline.busy||arriving;
    ['galaxy-explode','studio-auto','studio-auto-edit'].forEach(id=>$(id).disabled=arriving);
    ['studio-auto','studio-auto-edit'].forEach(id=>{$(id).setAttribute('aria-pressed',String(autoRemix));$(id).textContent=autoRemix?'Ⅱ 暂停随机':(id==='studio-auto'?'▷ 自动随机':'▷ 连续随机');});
    ['studio-explode','galaxy-explode'].forEach(id=>{$(id).setAttribute('aria-pressed',String(exploded));$(id).textContent=exploded?'合上 ↓':'拆开 ↑';});
    $("studio-wish").hidden=!confirmed||state.candles==="none"||!lit; $("studio-relight").hidden=!confirmed||lit||state.candles==="none";
    $('studio-letter').hidden=!confirmed||state.candles!=='none'&&lit;
    $('wish-letter-again').hidden=state.candles==='none';
    $("studio-confirm").hidden=confirmed; progress.hidden=!confirmed||state.candles==='none';
    screen.dataset.confirmed=String(confirmed);screen.dataset.mode=exploded?'open':'closed';
    const showRecipe=confirmed&&!editing&&!exploded&&!timeline.busy;
    $('recipe-card').hidden=!showRecipe;screen.classList.toggle('has-recipe',showRecipe);
    $('recipe-title').textContent=state.recipeName||suggestRecipeName(state);$('recipe-summary').textContent=recipeSummary();
  }
  function recipeSummary(){const name=(key,value)=>CATALOG[key].find(([id])=>id===value)?.[1]||'';return `${recipient?`${recipient.name}的${recipient.birthdayAge}岁生日 · `:''}${name('shape',state.shape)} · ${state.layers} 层 · ${name('skin',state.skin)} · ${MOODS[state.mood].label}`;}
  function labelTexture(text) {
    const c=document.createElement("canvas");c.width=1024;c.height=256;const ctx=c.getContext("2d");ctx.fillStyle="#80506b";ctx.textAlign="center";ctx.textBaseline="middle";
    const chars=Array.from(text), lines=chars.length>11?[chars.slice(0,11).join(""),chars.slice(11).join("")]:[text];
    ctx.font=`${lines.length>1?62:76}px "KaiTi","Microsoft YaHei",serif`;lines.forEach((line,i)=>ctx.fillText(line,512,lines.length===1?128:80+i*96,940));
    const texture=new THREE.CanvasTexture(c);texture.encoding=THREE.sRGBEncoding;return texture;
  }
  function resetWish() {blessingAt=Infinity;lit=true;held=false;wish=0;progress.value=0;model?.setLit(true);effects.setLit(Boolean(model?.flames.length));sync();}
  function showWishLetter(){
    if(!confirmed||exploded||timeline.busy)return;
    const letter=birthdayBlessing(recipient||{name:'今天的你',birthdayAge:state.age});
    $('wish-letter-title').textContent=letter.title;$('wish-letter-dedication').textContent=letter.dedication;$('wish-letter-closing').textContent=letter.closing;
    const copy=$('wish-letter-copy');copy.replaceChildren();letter.paragraphs.forEach(text=>{const p=document.createElement('p');p.textContent=text;copy.append(p);});
    const dialog=$('wish-letter-dialog');if(!dialog.open){dialog.showModal();dialog.scrollTop=0;$('wish-letter-title').focus({preventScroll:true});}
  }
  function bake(design, entrance = 1,keepPlate=false) {
    const builtAt=performance.now();
    const next = buildCakeModel(THREE,design,labelTexture,Math.random,{cosmic:true,texture:(style,color,top)=>galaxyTexture(THREE,style,color,top),animateSurface:(m,top)=>animateGalaxySurface(m,effects.time,top),addDust:effects.addDust,flame:effects.flame,release:effects.release});
    const old=model; model=next; turntable.add(model.root);
    if(outgoingModel){turntable.remove(outgoingModel.root);outgoingModel.dispose();outgoingModel=null;}
    if(old){if(keepPlate){old.keepPlateOnly();outgoingModel=old;plateFadeTime=0;}else{turntable.remove(old.root);old.dispose();}}
    model.setExplode(expansion,time);model.setEntrance(entrance);effects.setEnabled(effects.enabled,model);resetWish();
    if(sceneMood!==design.mood){const profile=MOODS[design.mood];effects.setMood(profile);backdrop.setMood(profile);screen.style.setProperty('--scene-glow',profile.glow);screen.style.setProperty('--scene-accent',profile.accent);sceneMood=design.mood;screen.dataset.mood=sceneMood;}
    $("part-labels").replaceChildren();labels.length=0;
    model.parts.filter(p=>p.group.name!=="祝福牌").forEach(p=>{const node=document.createElement("span");node.className="part-label";node.textContent=p.group.name;$("part-labels").append(node);labels.push({part:p,node});});
    screen.dataset.version=String(Number(screen.dataset.version||0)+1);
    screen.dataset.buildMs=(performance.now()-builtAt).toFixed(1);
  }
  function requestDesign(next) {
    // Keep the tray at the same screen position while a different number of
    // layers changes the camera's framing.
    trayAnchor??=(.04-lookY)*Math.cos(tilt)*2/viewHeight*zoom;
    confirmed=false;
    state=normalizeDesign(next);sync();save();resetWish();
    if(timeline.busy){queued=state;return;}
    timeline.begin(state,exploded,expansion);screen.dataset.motion="shuffling";sync();
  }
  function change(patch) {requestDesign({...state,...patch});}
  function randomize() {
    if(timeline.busy)return;
    let next=randomDesign(state);
    if(JSON.stringify(next)===JSON.stringify(state))next=normalizeDesign({...next,layers:state.layers%3+1});
    requestDesign(next);
  }
  function setEditing(value) {
    editing=value;held=false;editor.hidden=!value;screen.classList.toggle("is-editing",value);
    if(value){exploded=true;confirmed=false;autoRemix=false;resetWish();status.textContent="拆开随机会一直悬浮，喜欢了再手动合上";}
    else status.textContent=confirmed?"蛋糕已确认，准备许下你的心愿吧":(exploded?"部件保持拆开，点合上后再确认蛋糕":"合上随机会保持完整，满意后确认这份蛋糕");
    sync();$(value?"tab-layers":"studio-edit").focus({preventScroll:true});
  }
  function toggleOpen(){exploded=!exploded;confirmed=false;resetWish();sync();status.textContent=exploded?'部件已拆开，可以一直随机搭配':'正在合上，满意后点击确认蛋糕';}
  function confirmCake(){
    if(exploded||expansion>.02||timeline.busy||queued)return;
    confirmed=true;autoRemix=false;resetWish();setEditing(false);sync();
    status.textContent=state.candles==='none'?'这份蛋糕定好了，愿今天的你甜甜的 ♡':'这份蛋糕定好了，长按按钮或空格许愿吧 ♡';
    $(state.candles==='none'?'studio-edit':'studio-wish').focus({preventScroll:true});
  }
  function resize() {
    const rect=container.getBoundingClientRect();if(!rect.width||!rect.height)return;
    width=rect.width;height=rect.height;renderer.setSize(width,height);
  }
  function layoutCamera(dt) {
    viewTop=editing?80:(height<600?65:150);
    viewBottom=editing?editor.getBoundingClientRect().height+48:(compact?161:126);
    const usable=Math.max(100,height-viewTop-viewBottom), aspect=width/usable;
    const offset=Math.max(...model.parts.map(p=>p.offset));
    const h=model.topY+(state.candles==="none"?.9:2.55)+expansion*offset;
    const targetHeight=Math.max((h*Math.cos(tilt)+4.5*Math.sin(tilt))*1.12,6.9/aspect);
    const ease=1-Math.exp(-dt*4);
    viewHeight+=(targetHeight-viewHeight)*ease;lookY+=(h*.44-lookY)*ease;tilt+=(targetTilt-tilt)*ease;
    if(trayAnchor!==null)lookY=.04-trayAnchor*viewHeight/(2*zoom*Math.cos(tilt));
    camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;
    camera.zoom=zoom;camera.updateProjectionMatrix();camera.position.set(0,lookY+Math.sin(tilt)*13,Math.cos(tilt)*13);camera.lookAt(0,lookY,0);camera.updateMatrixWorld();
    renderer.setViewport(0,viewBottom,width,usable);
    point.set(0,.04,0).project(camera);screen.dataset.plateScreenY=(viewTop+(1-point.y)*usable/2).toFixed(2);
    labels.forEach(({part,node})=>{
      node.hidden=!editing||expansion<.15||timeline.busy||arriving;
      point.set(2.02,part.group.position.y+(part.group.name.includes("蜡烛")?.65:part.group.name.includes("装饰")?.2:.3),0).project(camera);
      node.style.left=`${Math.min(width-110,(point.x*.5+.5)*width)}px`;node.style.top=`${viewTop+(1-(point.y*.5+.5))*usable}px`;
    });
    const sorted=labels.filter(l=>!l.node.hidden).sort((a,b)=>parseFloat(a.node.style.top)-parseFloat(b.node.style.top));
    let lastY=viewTop+5;sorted.forEach(({node})=>{const y=Math.max(lastY,parseFloat(node.style.top));node.style.top=`${y}px`;lastY=y+22;});
    effects.setHeight(model.topY+1+expansion*offset*.68,model.root.position.y+(model.parts.find(p=>p.group.name==='蜡烛')?.group.position.y||model.topY)+.9);
  }
  function setAuto(value) {autoRemix=value;if(value){confirmed=false;held=false;}nextRemix=time+1;sync();status.textContent=value?(exploded?'拆开状态连续随机，部件会一直保持悬浮':'合上状态连续随机，蛋糕会保持完整换装'):"已暂停随机，留下你喜欢的这一份";}
  listen(editor,"click",e=>{
    const mood=e.target.closest('button[data-mood]');if(mood){const profile=MOODS[mood.dataset.mood];change({mood:mood.dataset.mood,colors:[...profile.colors],cream:profile.cream,skin:profile.skins[0]});}
    const b=e.target.closest("[data-option] button");if(b){const key=b.parentElement.dataset.option;change({[key]:key==="layers"?Number(b.dataset.value):b.dataset.value});}
    const tab=e.target.closest("[data-panel]");if(tab){screen.querySelectorAll("[data-panel]").forEach(b=>b.setAttribute("aria-pressed",String(b===tab)));screen.querySelectorAll(".studio-panel").forEach(panel=>{panel.hidden=panel.id!==`panel-${tab.dataset.panel}`;});}
  });
  listen($("studio-layer-list"),"click",e=>{const b=e.target.closest("[data-layer]");if(b){selectedLayer=Number(b.dataset.layer);sync();}});
  listen(swatches,"click",e=>{const b=e.target.closest("[data-color]");if(b){const colors=[...state.colors];colors[selectedLayer]=b.dataset.color;change({colors});}});
  listen($("studio-layer-color"),"input",e=>{const colors=[...state.colors];colors[selectedLayer]=e.target.value;change({colors});});
  listen($("studio-cream-color"),"input",e=>change({cream:e.target.value}));listen($("studio-sprinkles"),"change",e=>change({sprinkles:e.target.checked}));
  listen($("studio-age"),"change",e=>change({age:e.target.value}));listen($("studio-message"),"input",e=>change({message:e.target.value}));
  listen($("studio-edit"),"click",()=>setEditing(!editing));
  ['studio-done','studio-confirm'].forEach(id=>listen($(id),'click',confirmCake));
  ['studio-explode','galaxy-explode'].forEach(id=>listen($(id),'click',toggleOpen));
  ["studio-random","galaxy-random"].forEach(id=>listen($(id),"click",randomize));
  ['studio-auto','studio-auto-edit'].forEach(id=>listen($(id),'click',()=>setAuto(!autoRemix)));
  listen($("studio-rotate"),"click",()=>{automatic=!automatic;$("studio-rotate").setAttribute("aria-pressed",String(automatic));});
  listen($("studio-effects"),"click",()=>{effects.setEnabled(!effects.enabled,model);$("studio-effects").setAttribute("aria-pressed",String(effects.enabled));});
  listen($("studio-relight"),"click",()=>{resetWish();effects.burst();status.textContent="星光重新点亮，再许一个心愿吧";});
  const wishButton=$("studio-wish");
  listen(wishButton,"pointerdown",e=>{if(e.button!==0||!confirmed||!lit||timeline.busy||exploded)return;e.preventDefault();held=true;wishButton.setPointerCapture(e.pointerId);});
  ["pointerup","pointercancel","lostpointercapture"].forEach(event=>listen(wishButton,event,()=>{held=false;}));listen(wishButton,"contextmenu",e=>e.preventDefault());
  listen(document,"keydown",e=>{if(document.querySelector('dialog[open]')||!running||!confirmed||exploded||editing||timeline.busy||e.code!=="Space"||e.target.matches("input,textarea,select")||e.target.closest("button")&&e.target!==wishButton)return;e.preventDefault();held=true;});
  listen(document,"keyup",e=>{if(e.code==="Space")held=false;});
  listen(container,"pointerdown",e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});container.setPointerCapture(e.pointerId);});
  listen(container,"pointermove",e=>{
    const prev=pointers.get(e.pointerId);if(!prev)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const[a,b]=[...pointers.values()];const distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance)zoom=THREE.MathUtils.clamp(zoom*distance/pinchDistance,.65,1.65);pinchDistance=distance;}
    else{turntable.rotation.y+=(e.clientX-prev.x)*.008;targetTilt=THREE.MathUtils.clamp(targetTilt+(e.clientY-prev.y)*.003,.12,.85);}
  });
  ["pointerup","pointercancel","lostpointercapture"].forEach(event=>listen(container,event,e=>{pointers.delete(e.pointerId);pinchDistance=0;}));
  listen(container,"wheel",e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(-e.deltaY*.001),.65,1.65);},{passive:false});
  listen(window,"blur",()=>{held=false;pointers.clear();});
  const nameDialog=$('recipe-name-dialog');
  listen($('studio-letter'),'click',showWishLetter);
  listen($('wish-letter-close'),'click',()=>{$('wish-letter-dialog').close();$('studio-letter').focus({preventScroll:true});});
  listen($('wish-letter-again'),'click',()=>{$('wish-letter-dialog').close();resetWish();effects.burst();$('studio-wish').focus({preventScroll:true});status.textContent='星光重新点亮，再许一个心愿吧';});
  listen($('recipe-name-open'),'click',()=>{if(!confirmed||timeline.busy||exploded)return;$('recipe-name-input').value=state.recipeName||suggestRecipeName(state);nameDialog.showModal();$('recipe-name-input').focus();$('recipe-name-input').select();});
  listen($('recipe-name-cancel'),'click',()=>nameDialog.close());
  listen($('recipe-name-form'),'submit',e=>{
    e.preventDefault();if(!confirmed||timeline.busy||exploded){nameDialog.close();return;}
    state=normalizeDesign({...state,recipeName:cleanRecipeName($('recipe-name-input').value)});save();sync();nameDialog.close();status.textContent='这份喜欢有了名字，也有了属于你的纪念';
  });
  function renderFrame(){
    renderer.setViewport(0,0,width,height);renderer.clear();
    backdrop.render(renderer,width,height,effects.enabled);renderer.clearDepth();
    renderer.setViewport(0,viewBottom,width,Math.max(100,height-viewTop-viewBottom));renderer.render(scene,camera);
  }
  function exportImage(signed=false){
    const clear=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha();renderer.setClearColor("#080915",1);
    renderFrame();
    let image=renderer.domElement;
    if(signed){
      const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
      const scale=renderer.getPixelRatio();ctx.scale(scale,scale);const gradient=ctx.createLinearGradient(0,height-145,0,height);gradient.addColorStop(0,'#08091500');gradient.addColorStop(.4,'#080915ee');ctx.fillStyle=gradient;ctx.fillRect(0,height-145,width,145);
      ctx.textAlign='center';ctx.fillStyle='#ead3c5';ctx.font='24px "KaiTi","Microsoft YaHei",serif';ctx.fillText(state.recipeName||suggestRecipeName(state),width/2,height-68,width-50);ctx.fillStyle='#aa96b5';ctx.font='10px "Microsoft YaHei",sans-serif';ctx.fillText(recipeSummary(),width/2,height-42,width-40);ctx.fillStyle='#84708d';ctx.font='8px Georgia,serif';ctx.fillText('A RECIPE OF YOUR OWN · MADE WITH A LITTLE LOVE',width/2,height-20,width-35);image=c;
    }
    image.toBlob(blob=>{
      if(!blob||disposed)return;const url=URL.createObjectURL(blob);pendingExports.add(url);const a=document.createElement("a");a.href=url;a.download="星河里的生日蛋糕.png";document.body.append(a);a.click();a.remove();
      setTimeout(()=>{URL.revokeObjectURL(url);pendingExports.delete(url);},30000);status.textContent="这片星河已装进图片，请查看浏览器下载";
    },"image/png");
    renderer.setClearColor(clear,alpha);
  }
  listen($('studio-export'),'click',()=>exportImage(false));
  listen($('recipe-export'),'click',()=>{if(confirmed&&!timeline.busy&&!exploded)exportImage(true);});
  function tick(now) {
    if(!running||disposed)return;const dt=Math.min((now-last)/1000||1/60,.05);last=now;time+=dt;
    const result=timeline.step(dt);
    const wasArriving=arriving;
    if(result){
      if(result.swap)bake(result.design,0,true);
      model.setEntrance(result.entrance,result.entering,viewHeight/camera.zoom+model.topY+8);screen.dataset.reveal=result.entrance.toFixed(3);screen.dataset.motion=result.done?"idle":result.phase;
      if(result.done){sync();nextRemix=time+4.8;if(queued){const next=queued;queued=null;timeline.begin(next,exploded,expansion);sync();}else status.textContent=exploded?"部件保持拆开，继续随机或手动合上":"蛋糕保持合上，继续随机或确认这一份";}
    } else {
      if(arriving){arrivalTime+=dt;model.setEntrance(Math.min(1,arrivalTime/model.arrivalDuration),true,viewHeight/camera.zoom+model.topY+8);if(arrivalTime>=model.arrivalDuration){arriving=false;screen.dataset.motion='idle';$('studio-edit').disabled=false;sync();}}
      if(autoRemix&&time>=nextRemix){randomize();nextRemix=Infinity;}
    }
    if(outgoingModel){plateFadeTime+=dt;outgoingModel.fadePlate(1-plateFadeTime/.3);if(plateFadeTime>=.3){turntable.remove(outgoingModel.root);outgoingModel.dispose();outgoingModel=null;}}
    screen.dataset.flight=Math.max(0,...model.parts.filter(p=>p.group.visible).map(p=>p.arrivalOffset)).toFixed(3);
    screen.dataset.plateY=((model.parts.find(p=>p.dropRank===0)?.group.position.y??0)+model.root.position.y).toFixed(3);
    if(result||wasArriving||!screen.dataset.layers)screen.dataset.layers=JSON.stringify(model.parts.filter(p=>p.dropRank>0).map(p=>({name:p.group.name,rank:p.dropRank,offset:+p.arrivalOffset.toFixed(3),progress:+p.arrivalProgress.toFixed(3),visible:p.group.visible})));
    const target=exploded?1:0;expansion+=(target-expansion)*(1-Math.exp(-dt*5));
    const canConfirm=!arriving&&!exploded&&expansion<.02&&!timeline.busy&&!queued;
    ['studio-confirm','studio-done'].forEach(id=>{$(id).disabled=!canConfirm;$(id).title=exploded?'先手动合上蛋糕，再确认':timeline.busy?'换装中，稍等一下':'确认这份蛋糕后开启许愿';});
    model.setExplode(expansion,time);if(automatic&&!pointers.size)turntable.rotation.y+=dt*(timeline.busy?.18:.10);
    screen.dataset.expansion=expansion.toFixed(3);screen.dataset.auto=String(autoRemix);screen.dataset.motion??="idle";
    layoutCamera(dt);scene.updateMatrixWorld(true);effects.update(time);
    if(confirmed&&!exploded&&expansion<.02&&!editing&&!timeline.busy&&state.candles!=="none"&&lit){
      wish=THREE.MathUtils.clamp(wish+(held?48:-22)*dt,0,100);progress.value=wish;
      if(wish===100){lit=false;held=false;model.setLit(false);effects.setLit(false);autoRemix=false;effects.burst();blessingAt=time+.85;sync();status.textContent=recipient?`${recipient.name}，心愿已收好。还有一封祝福，想交给你 ♡`:"心愿已收好，愿你所愿，皆能如愿 ♡";}
    }
    if(time>=blessingAt&&!document.querySelector('dialog[open]')){blessingAt=Infinity;showWishLetter();}
    renderFrame();frame=requestAnimationFrame(tick);
  }
  function pause(){running=false;cancelAnimationFrame(frame);held=false;pointers.clear();}
  function resume(){if(disposed||running||document.hidden)return;running=true;last=performance.now();resize();frame=requestAnimationFrame(tick);}
  listen(document,"visibilitychange",()=>{if(document.hidden)pause();else if(!screen.hidden)resume();});
  listen(renderer.domElement,"webglcontextlost",e=>{e.preventDefault();pause();status.textContent="星河画面暂时中断，请返回爱心后刷新重试";});
  const observer=new ResizeObserver(resize);observer.observe(container);
  editor.hidden=true;screen.classList.remove("is-editing");sync();bake(state,0);resize();
  if(recipient)save();
  status.textContent=recipient?`${recipient.name}，欢迎来到你的${recipient.birthdayAge}岁生日星河`:"愿你的心愿，都在这片星河里闪闪发亮";
  return {resume,pause,dispose(){if(disposed)return;disposed=true;pause();if(nameDialog.open)nameDialog.close();if($('wish-letter-dialog').open)$('wish-letter-dialog').close();abort.abort();observer.disconnect();model?.dispose();outgoingModel?.dispose();effects.dispose();backdrop.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();pendingExports.forEach(url=>URL.revokeObjectURL(url));}};
}
