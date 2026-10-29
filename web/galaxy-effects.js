import { createStarlightAtlas } from './starlight-atlas.js?v=1';
export function createGalaxyEffects(THREE, scene, camera, compact) {
  const time = { value: 0 }, drift={value:0}, ratio = { value: Math.min(devicePixelRatio || 1, 1.6) };
  const glyphs=createStarlightAtlas(THREE);
  const fades=new Map();let pace=1,targetPace=1,lastEffectTime=0;
  const world = new THREE.Group(); scene.add(world);
  const billboards = new Set();
  const candleLight=new THREE.PointLight('#ffbd6b',1.35,5);scene.add(candleLight);let candleLit=true;
  const warm = ["#fff2c4", "#ffd275", "#fff8e9", "#b1a1ff", "#89d4ff"];
  const candy = ["#ffc553", "#ff77bd", "#46d8ce", "#4ebdff", "#b19cff", "#fff4bb"];
  const auraColor={value:new THREE.Color('#947fe3')};
  const aura=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{time,color:auraColor},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform float time;uniform vec3 color;void main(){vec2 p=(vUv-.5)*2.;float haze=exp(-dot(p,p)*3.8)*.14;float edge=exp(-pow(length(p*vec2(1.,1.2))-.52,2.)*16.)*.035;gl_FragColor=vec4(color,(haze+edge)*(.93+.07*sin(time*.5)));}`
  }));aura.frustumCulled=false;world.add(aura);
  function pointMaterial(motion, opacity = 1) {
    return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { time, drift, ratio, glyphs:{value:glyphs}, opacity: { value: opacity }, height: { value: 3 }, burstAt: { value: -100 } },
      vertexShader: `attribute float size; attribute float seed; attribute float kind; varying vec3 vColor; varying float vKind; varying float vSeed; varying float vAlpha; uniform float time; uniform float drift; uniform float ratio; uniform float height; uniform float burstAt;
        void main(){vec3 p=position; float a=seed*6.2831853; float alpha=1.;
        ${motion === "orbit" ? `a+=drift*(.10+seed*.06); float ring=floor(kind); float r=position.x; float tilt=ring<.5?sin(a)*.1:(ring<1.5?cos(a)*.95+sin(a)*.45:-cos(a)*1.05+sin(a)*.5); p=vec3(cos(a)*r, position.y*height+tilt, sin(a)*r*.68);` : ""}
        ${motion === "confetti" ? `a+=drift*(.07+seed*.05); p.x=cos(a)*position.x; p.z=sin(a)*position.x*.72; p.y=position.y*height+sin(drift*.55+seed*30.)*.18;` : ""}
        ${motion === "fountain" ? `float age=fract(seed+time*(.6+position.y*.3)); float r=age*(.3+position.x*.55); a+=position.z*8.+time*.6; p=vec3(cos(a)*r,age*(1.6+seed*.8),sin(a)*r); alpha=pow(1.-age,1.1);` : ""}
        ${motion === "burst" ? `float age=max(0.,time-burstAt); p=position*(1.+age*2.8); p.y-=age*age*.65; alpha=max(0.,1.-age/1.5);` : ""}
        vec4 mv=modelViewMatrix*vec4(p,1.); float twinkle=.58+.42*sin(time*(1.4+seed*3.)+seed*60.);
        gl_PointSize=clamp(size*ratio*10./max(2.,-mv.z),1.,46.); gl_Position=projectionMatrix*mv; vColor=color; vKind=kind;vSeed=seed; vAlpha=alpha*(kind>5.?.72+.28*twinkle:twinkle); }`,
      fragmentShader: `varying vec3 vColor; varying float vKind;varying float vSeed; varying float vAlpha; uniform float opacity;uniform sampler2D glyphs;uniform float time;
        void main(){vec2 p=gl_PointCoord-.5; float r=length(p); if(vKind<6.5&&r>.5)discard; float glow=exp(-r*r*20.); float core=1.-smoothstep(.05,.26,r);
        float cross=pow(max(0.,1.-abs(p.x)*10.),5.)*max(0.,1.-abs(p.y)*2.)+pow(max(0.,1.-abs(p.y)*10.),5.)*max(0.,1.-abs(p.x)*2.);
        float alpha=vKind>5.?(1.-smoothstep(.23,.49,r))*.65:glow*.55+core*.65+cross*.45;
        vec3 ink=vColor*(1.+core*.35);
        if(vKind<-.5){alpha=exp(-r*r*20.)*.48+exp(-r*r*65.)*.19;ink=vColor;}
        if(vKind>6.5){float cell=floor(vKind+.1)-7.;float angle=vKind<7.5?0.:sin(time*.22+vSeed*19.)*.24;float c=cos(angle),s=sin(angle);vec2 uv=mat2(c,-s,s,c)*p+.5;
          if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))discard;
          alpha=texture2D(glyphs,vec2((cell+uv.x)/8.,1.-uv.y)).a*.72;ink=mix(vColor,vec3(1.),max(0.,-p.y)*.35);
        }gl_FragColor=vec4(ink,alpha*vAlpha*opacity); }`
    });
  }
  function cloud(number, palette, make, motion, parent = world) {
    const pos = [], colors = [], sizes = [], seeds = [], kinds = [];
    const color = new THREE.Color();
    for (let i = 0; i < number; i++) {
      const p = make(i, number); pos.push(p[0], p[1], p[2]);
      color.set(palette[i % palette.length]); colors.push(color.r, color.g, color.b); sizes.push(p[3]); kinds.push(p[4] || 0); seeds.push(Math.random());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1)); g.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 1)); g.setAttribute("kind", new THREE.Float32BufferAttribute(kinds, 1));
    const m = pointMaterial(motion);if(motion==='confetti')m.blending=THREE.NormalBlending;
    const p = new THREE.Points(g, m); p.frustumCulled = false; parent.add(p); p.userData.cosmic = true; return p;
  }
  cloud(compact ? 550 : 1000, ["#a18bbd", "#8f9dca", "#b9b0c8"], () => [(Math.random()-.5)*65, (Math.random()-.4)*40, -12-Math.random()*35, 1+Math.random()*5, 0], "static");
  const orbit = cloud(compact ? 2100 : 3600, warm, i => {
    const ring = i % 3; return [2.4 + ring * .33 + Math.random()*.06, [.02,.42,.73][ring], 0, .8+Math.random()*3.7, ring];
  }, "orbit");
  const confetti = cloud(compact ? 105 : 175, candy, () => [2.05+Math.random()*1.7, -.08+Math.random()*1.1, 0, 4+Math.random()*9, 6], "confetti");
  const hearts = cloud(compact?26:44,["#ff9aca","#d4aeff","#ffd2dc","#f9b9d4"],()=>[2.3+Math.random()*1.5,-.08+Math.random()*1.2,0,25+Math.random()*15,7],"confetti");
  const charms=cloud(compact?64:112,['#ffdb9e','#b9c9ff','#c8b2eb','#a6e6df','#f1c9df'],i=>[2.25+Math.random()*1.65,-.06+Math.random()*1.15,0,19+Math.random()*17,8+i%7],'confetti');
  const mist=cloud(compact?260:480,['#e5deff','#c5dfff','#efd4f2','#cfbfff','#b4d9f0'],()=>[1.75+Math.random()*2.1,-.1+Math.random()*1.17,0,10+Math.random()*24,-1],'confetti');mist.material.blending=THREE.AdditiveBlending;
  const burst = cloud(compact ? 100 : 200, warm, () => { const a = Math.random()*Math.PI*2, r=.3+Math.random()*1.2; return [r*Math.cos(a), .5+Math.random()*2, r*Math.sin(a), 3+Math.random()*6, 0]; }, "burst");
  function addDust(parent, radius, height, boundary = (r,a)=>[r*Math.cos(a),r*Math.sin(a)]) {
    return cloud(compact ? 650 : 1300, ["#fff2bb", "#8ecaff", "#e3b2ff", "#fff3ed"], (i, n) => {
      const a = Math.random()*Math.PI*2;
      if (i < n*.6) {const[x,z]=boundary(radius+.016,a);return [x,Math.random()*height,z,.6+Math.random()*2.2,0];}
      const r = Math.sqrt(Math.random())*radius,[x,z]=boundary(r,a);return [x,height+.017,z,.6+Math.random()*2.4,0];
    }, "static", parent);
  }
  const flameVertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  function flame(parent, x, y, z, variant) {
    const group = new THREE.Group(); group.position.set(x, y-.21, z); parent.add(group);
    const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { time,appearance:{value:1} }, vertexShader: flameVertex,
      fragmentShader: `varying vec2 vUv; uniform float time;uniform float appearance; void main(){vec2 p=vUv; float y=p.y; float wobble=sin(y*13.-time*8.)*.035*y+sin(time*5.)*.02;
        float x=(p.x-.5-wobble); float width=(.22+.12*sin(y*3.14))*pow(max(.01,1.-y),.72);
        float f=exp(-pow(x/max(.012,width),2.)*1.55)*smoothstep(0.,.12,y)*smoothstep(1.,.48,y);
        float core=exp(-pow(x/max(.01,width*.4),2.)*2.)*smoothstep(.78,.15,y);
        vec3 color=mix(vec3(1.,.18,.015),vec3(1.,.65,.08),f); color=mix(color,vec3(1.,.96,.72),core);
        float halo=exp(-x*x*23.-pow(y-.35,2.)*6.)*.19;
        gl_FragColor=vec4(color*(1.+core*1.8),min(1.,f+halo)*appearance); }`
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.4), material); plane.position.y=.52; group.add(plane); plane.userData.flameBillboard = true; billboards.add(plane);
    if(variant==='sparkler'){plane.scale.set(.4,.4,1);plane.position.y=.1;}
    const count=variant==='rainbow'?(compact?70:130):variant==='sparkler'?(compact?320:650):(compact?220:480);
    const sparks = cloud(count, ["#ffce66","#fff2c4","#ffdf8a","#fff8e9"], () => [Math.random(),Math.random(),Math.random(),1.7+Math.random()*5.5,0], "fountain", group); sparks.position.y=variant==='sparkler'?.1:.5;sparks.material.uniforms.opacity.value=1.25;
    return group;
  }
  const worldQ = new THREE.Quaternion();
  let enabled = true;
  function tintCloud(points,palette){
    const attribute=points.geometry.attributes.color,target=new Float32Array(attribute.array.length),c=new THREE.Color();
    for(let i=0;i<attribute.count;i++){c.set(palette[i%palette.length]);target.set([c.r,c.g,c.b],i*3);}
    fades.set(points,{from:attribute.array.slice(),target,start:time.value});
  }
  return {
    time, glyphs,addDust, flame,
    setLit(value){candleLit=value;},
    setMood(profile){targetPace=profile.pace;tintCloud(orbit,profile.orbit);tintCloud(confetti,profile.lights);tintCloud(hearts,profile.hearts);tintCloud(charms,profile.orbit);tintCloud(mist,profile.orbit);auraColor.value.set(profile.colors[1]);},
    setHeight(h,candleY=h-.1) { [orbit,confetti,hearts,charms,mist].forEach(points=>points.material.uniforms.height.value=h);candleLight.position.set(0,candleY,0);aura.position.set(0,h*.32,-1.6);aura.scale.set(7.5,Math.max(4,h*1.1),1); },
    burst() { burst.material.uniforms.burstAt.value = time.value; },
    setEnabled(value, model) { enabled = value; world.visible = value; model?.root.traverse(o => { if(o.userData.cosmic) o.visible=value; }); },
    update(t) {
      const dt=Math.max(0,Math.min(.1,t-lastEffectTime));lastEffectTime=t;pace+=(targetPace-pace)*(1-Math.exp(-dt*3));drift.value+=dt*pace;
      time.value=t;
      fades.forEach((fade,points)=>{const progress=Math.min(1,(t-fade.start)/1.2),mix=progress*progress*(3-2*progress),a=points.geometry.attributes.color;for(let i=0;i<a.array.length;i++)a.array[i]=fade.from[i]+(fade.target[i]-fade.from[i])*mix;a.needsUpdate=true;if(progress===1)fades.delete(points);});
      billboards.forEach(plane => { plane.parent.getWorldQuaternion(worldQ); plane.quaternion.copy(worldQ.invert()).multiply(camera.quaternion); });
      aura.quaternion.copy(camera.quaternion);
      candleLight.intensity=candleLit?1.35+Math.sin(t*9)*.15:0;
    },
    release(root) { root.traverse(o => { if(o.userData.flameBillboard) billboards.delete(o); }); },
    dispose() { world.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });glyphs.dispose();scene.remove(candleLight); scene.remove(world); billboards.clear();fades.clear(); },
    get enabled() { return enabled; }
  };
}

const nebulaCanvases=new Map();
function canvasTexture(THREE,canvas){const t=new THREE.CanvasTexture(canvas);t.encoding=THREE.sRGBEncoding;t.wrapS=THREE.RepeatWrapping;t.anisotropy=4;return t;}
export function galaxyTexture(THREE, style, color, top = false) {
  const cacheKey=`${style}/${color}/${top}`;
  if(nebulaCanvases.has(cacheKey)){const cached=nebulaCanvases.get(cacheKey);nebulaCanvases.delete(cacheKey);nebulaCanvases.set(cacheKey,cached);return canvasTexture(THREE,cached);}
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = top ? 512 : 256;
  const ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
  ctx.fillStyle = style === "marble" ? color : style==='aurora'?'#082d38':"#07102b";ctx.fillRect(0,0,w,h);
  if(style==='rainbow'||style==='ombre'){
    const gradient=ctx.createLinearGradient(0,0,0,h),shades=style==='rainbow'?['#f69bc2','#f0bf80','#c7da93','#91d0cd','#9caae5','#c38ddb']:[color,'#c994c8','#6d4f91','#242044'];
    shades.forEach((shade,i)=>gradient.addColorStop(i/(shades.length-1),shade));ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  }
  const palette = style==='aurora'?[color,'#34d9bd','#57a9c8','#9b6dd1']:style==='rainbow'?['#ffc0cf','#d8a6f2','#aee3d5']:style==='ombre'?[color,'#cb9acf','#875b9b']:[color,"#2d3cb0","#9255ca","#4a80d4","#d68aa9"];
  // Layers of translucent nebulae, followed by fine stars and a swirling core.
  let seed = parseInt(color.slice(1),16) + (top ? 31 : 0);
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<(style==='rainbow'||style==='ombre'?25:85);i++) {
    const x=random()*w, band=h*.5+Math.sin(x/w*Math.PI*2)*h*.2, y=band+(random()-.5)*h*.65, r=25+random()*90;
    for(const shift of [-w,0,w]) {const xx=x+shift;const gradient=ctx.createRadialGradient(xx,y,0,xx,y,r); gradient.addColorStop(0,palette[i%palette.length]+(style==="marble"?"85":"70")); gradient.addColorStop(1,"#00000000");ctx.fillStyle=gradient;ctx.fillRect(xx-r,y-r,r*2,r*2);}
  }
  if(top) {
    ctx.save();ctx.translate(w/2,h/2);ctx.globalCompositeOperation="screen";
    const core=ctx.createRadialGradient(0,0,0,0,0,210);core.addColorStop(0,"#ffd18bcc");core.addColorStop(.15,"#f1ae9e99");core.addColorStop(.45,"#a96bc980");core.addColorStop(.8,"#613ca340");core.addColorStop(1,"#7764c400");ctx.fillStyle=core;ctx.fillRect(-220,-220,440,440);
    for(let i=0;i<3800;i++) {
      const r=Math.sqrt(random())*220,a=(i%3)*Math.PI*2/3+r*.025+(random()-.5)*.6;
      ctx.globalAlpha=.12+random()*.4;ctx.fillStyle=["#e9b4e8","#b29eff","#f1ca8d"][i%3];ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,.35+random()*.8,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<(top?2600:1000);i++) {
    const x=random()*w,y=random()*h,s=random()>.97?1.5:.3+random()*.65;
    ctx.globalAlpha=.2+random()*.8;ctx.fillStyle=i%4===0?"#ffe6a4":"#dce6ff";ctx.beginPath();ctx.arc(x,y,s,0,Math.PI*2);ctx.fill();
    if(s>1.4){ctx.globalAlpha=.45;ctx.fillRect(x-3,y-.3,6,.6);ctx.fillRect(x-.3,y-3,.6,6);}
  }
  nebulaCanvases.set(cacheKey,canvas);if(nebulaCanvases.size>24)nebulaCanvases.delete(nebulaCanvases.keys().next().value);
  return canvasTexture(THREE,canvas);
}
