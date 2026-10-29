import { CATALOG, COLOR_SETS, SWATCHES } from "./cake-catalog.js?v=1";
import { MOODS, recipeName } from "./cake-inspiration.js?v=1";
import { layerArrival,arrivalDuration } from './cake-arrival.js?v=2';
import { prepareCakeOpacity } from './cake-opacity.js?v=1';
export { SWATCHES };
export const DEFAULT_DESIGN = Object.freeze({ layers: 1, shape: "round", colors: ["#253db0", "#aa69d1", "#ed81b2"], skin: "galaxy", cream: "#fff3de", creamStyle: "pearls", topping: "stars", sprinkles: true, candles: "single", age: 18, plate: "galaxy", message: "", mood: "starlit", recipeName: "" });
const choices = Object.fromEntries(Object.entries(CATALOG).map(([key,items])=>[key,items.map(item=>item[0])]));
export function normalizeDesign(value = {}) {
  if (!value || typeof value !== "object") value = {};
  const color = (v, fallback) => /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
  const out = { ...DEFAULT_DESIGN, ...value };
  out.layers = Math.max(1, Math.min(3, Math.round(Number(value.layers) || DEFAULT_DESIGN.layers)));
  out.colors = DEFAULT_DESIGN.colors.map((fallback, i) => color(value.colors?.[i], fallback));
  out.cream = color(value.cream, DEFAULT_DESIGN.cream);
  Object.keys(choices).forEach(key => { if (!choices[key].includes(out[key])) out[key] = DEFAULT_DESIGN[key]; });
  out.age = Math.max(0, Math.min(999, Math.round(Number(value.age) || 0)));
  if (value.age == null) out.age = DEFAULT_DESIGN.age;
  out.sprinkles = typeof value.sprinkles === "boolean" ? value.sprinkles : true;
  out.message = typeof value.message === "string" ? Array.from(value.message).slice(0, 22).join("") : DEFAULT_DESIGN.message;
  out.mood=Object.hasOwn(MOODS,value.mood)?value.mood:'starlit';
  out.recipeName=recipeName(value.recipeName);
  // Store only recognized configuration fields.
  return Object.fromEntries(Object.keys(DEFAULT_DESIGN).map(key => [key, out[key]]));
}
export function randomDesign(previous, random = Math.random) {
  const pick = values => values[Math.floor(random() * values.length)];
  const mood=MOODS[previous?.mood], inspired=mood&&previous.mood!=='starlit';
  const palettes=inspired?[mood.colors,[mood.colors[1],mood.colors[2],mood.colors[0]],[mood.colors[2],mood.colors[0],mood.colors[1]]]:COLOR_SETS;
  return normalizeDesign({ ...previous, layers: pick([1,1,2,3]), shape: pick(choices.shape), colors: [...pick(palettes)], skin: pick(inspired?mood.skins:choices.skin), cream: inspired?mood.cream:pick(["#fff3de","#fff2f5","#eee8fb","#f4d1aa","#b8eadc","#ffc6dd"]), creamStyle: pick(choices.creamStyle.filter(v=>v!=="none")), topping: pick(choices.topping.filter(v=>v!=="none")), sprinkles: random()>.2, candles: pick(choices.candles.filter(v=>v!=="none")), plate: pick(choices.plate.filter(v=>v!=="none")) });
}

// Entire cake is generated from geometry. No downloaded cake models or textures.
export function buildCakeModel(THREE, input, labelTexture = null, random = Math.random, options = {}) {
  const design = normalizeDesign(input);
  const root = new THREE.Group(), parts = [], flames = [], ownedTextures = new Set();
  const materials = new Map(), geometries = new Map();
  const cream = material(design.cream), gold = material("#d6ab62", .5, .45);
  if(options.cosmic){cream.emissive=new THREE.Color(design.cream).convertSRGBToLinear();cream.emissiveIntensity=.12;}
  function skin(color, top = false, forceGalaxy = false) {
    if(design.skin==='chocolate'&&!forceGalaxy)return material(top?'#704737':'#493026',.32,.05);
    if (!options.texture || design.skin === "velvet"&&!forceGalaxy) {
      const m = material(color, .36, .12); m.emissive = new THREE.Color(color).convertSRGBToLinear(); m.emissiveIntensity = options.cosmic ? .32 : 0; return m;
    }
    const texture = options.texture(forceGalaxy?'galaxy':design.skin, color, top); ownedTextures.add(texture);
    const m=new THREE.MeshStandardMaterial({ color: "#ffffff", map: texture, emissiveMap: texture, emissive: "#ffffff", emissiveIntensity: top?1.05:1.18, roughness: .25, metalness: .12 });
    options.animateSurface?.(m,top);return m;
  }
  function material(color, roughness = .65, metalness = 0) {
    const key = `${color}/${roughness}/${metalness}`;
    if (!materials.has(key)) {
      const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      m.color.convertSRGBToLinear(); materials.set(key, m);
    }
    return materials.get(key);
  }
  function shared(key, make) { if (!geometries.has(key)) geometries.set(key, make()); return geometries.get(key); }
  function mesh(geometry, mat, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function sphere(parent, radius, mat, x, y, z) {
    const m = mesh(shared("sphere", () => new THREE.SphereGeometry(1, 14, 10)), mat, parent, x, y, z); m.scale.setScalar(radius); return m;
  }
  function part(name, y, order) {
    const g = new THREE.Group(); g.name = name; g.position.y = y; root.add(g); parts.push({ group: g, y, offset: order * .5 }); return g;
  }
  function lathe(radius, height, bevel = .06) {
    const g = new THREE.LatheGeometry([
      new THREE.Vector2(0, 0), new THREE.Vector2(radius - bevel, 0), new THREE.Vector2(radius - .015, .025),
      new THREE.Vector2(radius, bevel), new THREE.Vector2(radius, height - bevel), new THREE.Vector2(radius - .02, height - .018),
      new THREE.Vector2(radius - bevel, height), new THREE.Vector2(0, height)
    ], 64);
    const p=g.attributes.position, uv=g.attributes.uv;
    for(let i=0;i<p.count;i++)uv.setY(i,p.getY(i)/height);
    return g;
  }
  function boundary(r, a) {
    if(r===0)return [0,0];
    if(design.shape==="round")return [r*Math.cos(a),r*Math.sin(a)];
    if(design.shape==='square'){const rr=r*.82/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)));return [rr*Math.cos(a),rr*Math.sin(a)];}
    if(design.shape==='hexagon'){const rr=r*Math.cos(Math.PI/6)/Math.cos((a+Math.PI/6)%(Math.PI/3)-Math.PI/6);return [rr*Math.cos(a),rr*Math.sin(a)];}
    if(design.shape==='flower'){const rr=r*(.88+.12*Math.cos(a*6));return [rr*Math.cos(a),rr*Math.sin(a)];}
    if(design.shape==='star'){
      const turn=((a%(Math.PI*2))+Math.PI*2)%(Math.PI*2),i=Math.floor(turn/(Math.PI/5)),a1=i*Math.PI/5,a2=(i+1)*Math.PI/5,r1=i%2?r*.5:r,r2=i%2?r:r*.5;
      const x1=Math.cos(a1)*r1,z1=Math.sin(a1)*r1,x2=Math.cos(a2)*r2,z2=Math.sin(a2)*r2;
      const rr=(x1*z2-z1*x2)/(Math.cos(turn)*(z2-z1)-Math.sin(turn)*(x2-x1));return [rr*Math.cos(turn),rr*Math.sin(turn)];
    }
    return [r*Math.sin(a)**3,-r*(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a)+3)/17];
  }
  function shell(r, h) {
    if(design.shape==="round")return lathe(r,h);
    const shape=new THREE.Shape();
    for(let i=0;i<=96;i++){const[x,z]=boundary(r,i/96*Math.PI*2);if(!i)shape.moveTo(x,-z);else shape.lineTo(x,-z);}
    const bevel=Math.min(.04,h*.2);const g=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.005,h-bevel*2),steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:bevel,bevelThickness:bevel,curveSegments:16});g.rotateX(-Math.PI/2);g.translate(0,bevel,0);
    const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    for(let i=0;i<p.count;i++) {const x=p.getX(i),y=p.getY(i),z=p.getZ(i);uv.setXY(i,Math.abs(n.getY(i))>.8?x/(2*r)+.5:Math.atan2(z,x)/(Math.PI*2)+.5,Math.abs(n.getY(i))>.8?z/(2*r)+.5:y/h);}
    return g;
  }
  if (design.plate !== "none") {
    const plate = part("底盘", .04, 0);
    let plateMat=design.plate==='rose'?material('#d398a6',.22,.7):design.plate==='gold'||design.plate==='hexagon'?gold:design.plate==='galaxy'?skin('#314aab',false,true):material('#f2e9df',.28);
    if(design.plate==='crystal')plateMat=new THREE.MeshPhysicalMaterial({color:'#b2d6f4',transparent:true,opacity:.48,roughness:.1,metalness:.15,clearcoat:1,side:THREE.DoubleSide});
    let plateGeo=design.plate==='hexagon'?new THREE.CylinderGeometry(2.37,2.37,.12,6):lathe(2.28,.12);
    if(design.plate==='hexagon')plateGeo.translate(0,.06,0);
    if(design.plate==='petal'){
      const p=plateGeo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),factor=1+.055*Math.cos(a*14);p.setX(i,x*factor);p.setZ(i,z*factor);}plateGeo.computeVertexNormals();
    }
    mesh(plateGeo,plateMat,plate);
    if(design.plate==="galaxy"&&options.cosmic)mesh(new THREE.CylinderGeometry(2.24,2.24,.009,80),skin("#314aab",true,true),plate,0,.124,0);
    if(design.plate!=='hexagon'){const ring=mesh(new THREE.TorusGeometry(2.18,.018,8,96),design.plate==='rose'?plateMat:gold,plate,0,.13,0);ring.rotation.x=Math.PI/2;}
    if(design.plate==='pedestal'){
      mesh(new THREE.CylinderGeometry(.26,.45,.48,32),plateMat,plate,0,-.2,0);mesh(lathe(1.05,.09),gold,plate,0,-.5,0);
    }
  }
  const base = design.plate === "none" ? .04 : .2;
  const radius = design.layers === 1 ? 1.65 : design.layers === 2 ? 1.83 : 2;
  const layerHeight = design.layers === 1 ? 1.4 : .86;
  const topY = base + design.layers * layerHeight;
  const topRadius = radius - (design.layers - 1) * .34;
  function rosette(parent, x, y, z, scale = 1) {
    const geometry = shared("rosette", () => {
      const g = new THREE.SphereGeometry(1, 20, 12);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
        const a = Math.atan2(pz, px), h = (py + 1) / 2;
        const ripple = 1 + .18 * Math.cos(a * 6 + h * 5);
        const taper = (1 - h * .55) * .19;
        p.setXYZ(i, px * taper * ripple + h * h * .055, h * .32, pz * taper * ripple);
      }
      g.computeVertexNormals(); return g;
    });
    const m = mesh(geometry, cream, parent, x, y, z); m.scale.setScalar(scale); return m;
  }
  function dripBand(r) {
    const vertices = [], indices = [], n = 160;
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2;
      const dip = .07 + Math.pow((Math.sin(a * 11) + 1) / 2, 3) * (.13 + .09 * (Math.cos(a * 3) + 1));
      const [x,z]=boundary(r+.025,a);vertices.push(x,.86,z,x,.78-dip,z);
      if (i < n) { const j = i * 2; indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(indices); g.computeVertexNormals(); return g;
  }
  function sprinkles(parent, r, y, number) {
    const geo = shared("sprinkle", () => new THREE.CylinderGeometry(.018, .018, .12, 6));
    const instanced = new THREE.InstancedMesh(geo, material("#ffffff", .5), number);
    const dummy = new THREE.Object3D(), c = new THREE.Color();
    const shades = ["#e9a2b8", "#ecd18e", "#9dbfb1", "#b6aad6", "#c5796f"];
    for (let i = 0; i < number; i++) {
      const a = random() * Math.PI * 2, rr = Math.sqrt(random()) * (r - .14), [x,z]=boundary(rr,a);
      dummy.position.set(x, y + .035, z); dummy.rotation.set(Math.PI / 2, random() * Math.PI, random() * Math.PI); dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix); instanced.setColorAt(i, c.set(shades[i % shades.length]));
    }
    instanced.castShadow = true; parent.add(instanced);
  }
  for (let i = 0; i < design.layers; i++) {
    const r = radius - i * .34;
    const layerRoot = part(`第${i + 1}层`, base + i * layerHeight, i * 1.5);
    const layer = new THREE.Group(); layer.scale.y = layerHeight / .86; layerRoot.add(layer);
    const body = mesh(shell(r, .83), options.cosmic ? skin(design.colors[i]) : material(design.colors[i], .75), layer);
    body.userData.layer = i;
    if (options.cosmic) {
      mesh(design.shape==="round"?new THREE.CylinderGeometry(r-.02,r-.02,.018,64):shell(r-.015,.018), skin(design.colors[i], true), layer, 0, .83, 0);
      options.addDust?.(layer, r, .84, boundary);
    }
    // Fine embossed seam gives the sponge a soft, handmade silhouette.
    if(design.shape==="round"){const seam = mesh(new THREE.TorusGeometry(r + .002, .012, 6, 96), material(design.colors[i]), layer, 0, .18, 0); seam.rotation.x = Math.PI / 2;}
    if (design.creamStyle !== "none") {
      const frosting = part(`第${i + 1}层奶油`, base + i * layerHeight + layerHeight - .86, i * 1.5 + .55);
      if (options.cosmic) {
        if(design.shape==="round"){const rim=mesh(new THREE.TorusGeometry(r-.04,.047,8,96),cream,frosting,0,.83,0);rim.rotation.x=Math.PI/2;}
        else {const points=Array.from({length:97},(_,i)=>{const[x,z]=boundary(r-.04,i/96*Math.PI*2);return new THREE.Vector3(x,.83,z);});mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),120,.045,8,false),cream,frosting);}
      } else mesh(lathe(r + .012, .06, .02), cream, frosting, 0, .79, 0);
      if (design.creamStyle === "drip"||design.creamStyle==='chocolate') mesh(dripBand(r), design.creamStyle==='chocolate'?material('#593444',.3):cream, frosting);
      else if(design.creamStyle==='ribbon'||design.creamStyle==='braid') {
        for(let strand=0;strand<(design.creamStyle==='braid'?2:1);strand++) {
          const points=Array.from({length:161},(_,j)=>{const a=j/160*Math.PI*2,[x,z]=boundary(r+.025,a);return new THREE.Vector3(x,.57+Math.sin(a*(design.creamStyle==='braid'?12:8)+strand*Math.PI)*.13,z);});
          mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),200,.033,6,false),strand?material('#e6aacd'):cream,frosting);
        }
      }
      else {
        const n = Math.round(r * (design.creamStyle === "pearls" ? 19 : 12));
        for (let j = 0; j < n; j++) {
          const a = j / n * Math.PI * 2, [x,z]=boundary(r-.11,a);
          if (design.creamStyle === "rosettes") rosette(frosting, x, .82, z, .85);
          else sphere(frosting, .085, cream, x, .88, z);
        }
      }
    }
    if (design.sprinkles) sprinkles(layer, r, .84, i === design.layers - 1 ? 95 : 40);
  }
  function shapeGeometry(kind) {
    return shared(kind, () => {
      const s = new THREE.Shape();
      if (kind === "heart") {
        s.moveTo(0, -.2); s.bezierCurveTo(-.1, -.1, -.42, .1, -.3, .3); s.bezierCurveTo(-.23, .44, -.06, .43, 0, .29); s.bezierCurveTo(.06, .43, .23, .44, .3, .3); s.bezierCurveTo(.42, .1, .1, -.1, 0, -.2);
      } else if(kind==='moon') {
        s.moveTo(.13,.3);s.bezierCurveTo(-.4,.31,-.4,-.31,.13,-.3);s.bezierCurveTo(-.13,-.16,-.13,.16,.13,.3);
      } else {
        for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .16 : .35; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (!i) s.moveTo(x, y); else s.lineTo(x, y); } s.closePath();
      }
      return new THREE.ExtrudeGeometry(s, { depth: .075, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .025, bevelThickness: .025, curveSegments: 12 });
    });
  }
  function strawberry(parent, x, z, angle) {
    const g = new THREE.Group(); g.position.set(x, .03, z); g.rotation.set(0, angle, .13); parent.add(g);
    const fruit = mesh(shared("strawberry", () => new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(.15, .035), new THREE.Vector2(.23, .16), new THREE.Vector2(.21, .32), new THREE.Vector2(.13, .45), new THREE.Vector2(.035, .54), new THREE.Vector2(0, .55)], 20)), material("#c84d63", .44), g);
    const seeds = new THREE.InstancedMesh(shared("seed", () => new THREE.SphereGeometry(1, 5, 4)), material("#efc27e"), 22);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 22; i++) {
      const a = i * 2.39996, h = .07 + (i / 22) * .39, rr = .235 * Math.sin((h / .58) * Math.PI) + .015;
      dummy.position.set(Math.cos(a) * rr, h, Math.sin(a) * rr); dummy.scale.set(.014, .026, .014); dummy.rotation.set(0, -a, .1); dummy.updateMatrix(); seeds.setMatrixAt(i, dummy.matrix);
    }
    g.add(seeds);
    // Small green crown; fruit itself is a smooth tapered surface.
    for (let i = 0; i < 5; i++) {
      const leaf = mesh(shared("leaf", () => new THREE.SphereGeometry(1, 8, 5)), material("#719578"), g);
      const a = i / 5 * Math.PI * 2; leaf.scale.set(.055, .018, .13); leaf.position.set(.07 * Math.sin(a), .052, .07 * Math.cos(a)); leaf.rotation.y = a;
    }
    return fruit;
  }
  const decorations = part("顶部装饰", topY, design.layers * 1.5 + .5);
  const sweets=['#e9a6c6','#b2a1df','#8fcfc1','#edc884','#86b7da','#efaaa2'];
  function curvedStem(parent,points,mat=gold,r=.015){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,r,6,false),mat,parent);}
  function sweet(type,parent,x,z,angle,index){
    const g=new THREE.Group();g.position.set(x,.02,z);g.rotation.y=angle;parent.add(g);const tint=material(sweets[index%sweets.length],.34);
    if(type==='cherries'){
      sphere(g,.135,material('#bb365e',.18),-.09,.14,0);sphere(g,.135,material('#d34b63',.2),.12,.14,.015);
      curvedStem(g,[[-.09,.25,0],[-.06,.45,0],[.03,.56,0]],material('#7d9465'));
      curvedStem(g,[[.12,.25,.015],[.14,.43,0],[.03,.56,0]],material('#7d9465'));
    }else if(type==='macarons'){
      const geo=shared('macaron-shell',()=>new THREE.SphereGeometry(1,18,10));
      for(const y of [.1,.24])mesh(geo,tint,g,0,y,0).scale.set(.23,.09,.23);
      mesh(shared('macaron-fill',()=>new THREE.CylinderGeometry(.218,.218,.065,24)),cream,g,0,.17,0);
    }else if(type==='flowers'){
      for(let j=0;j<6;j++){const a=j/6*Math.PI*2;const petal=sphere(g,1,tint,Math.cos(a)*.15,.1,Math.sin(a)*.15);petal.scale.set(.15,.045,.08);petal.rotation.y=-a;}
      sphere(g,.07,gold,0,.15,0);
    }else if(type==='butterflies'){
      for(const sign of [-1,1])for(const row of [-1,1]){
        const wing=sphere(g,1,row===1?tint:material('#bcb1ed'),sign*.14,.15,row*.1);wing.scale.set(.17,.035,.13);wing.rotation.z=sign*.4;wing.rotation.y=sign*row*.3;
      }
      mesh(shared('butterfly-body',()=>new THREE.CylinderGeometry(.022,.03,.3,8)),gold,g,0,.15,0).rotation.x=Math.PI/2;
      for(const sign of [-1,1])curvedStem(g,[[0,.15,-.12],[sign*.04,.2,-.2],[sign*.08,.21,-.22]],gold,.009);
    }else if(type==='chocolate'){
      const tile=mesh(shared('chocolate-tile',()=>new THREE.BoxGeometry(.29,.38,.085)),material('#633b3a',.3),g,0,.22,0);tile.rotation.z=.15;
      for(const y of [.12,.24])mesh(shared('chocolate-ridge',()=>new THREE.BoxGeometry(.25,.014,.01)),material('#98615b'),g,0,y,.049);
    }else if(type==='balls'){
      sphere(g,.17,tint,0,.17,0);sphere(g,.085,gold,.12,.07,.13);
    }else if(type==='snowflakes'){
      const flake=new THREE.Group();flake.position.y=.3;g.add(flake);
      for(let j=0;j<6;j++){
        const a=j/6*Math.PI*2,branch=new THREE.Group();branch.rotation.z=a;flake.add(branch);
        curvedStem(branch,[[0,0,0],[0,.3,0]],cream,.014);
        for(const sign of [-1,1])curvedStem(branch,[[0,.19,0],[sign*.085,.26,0]],cream,.012);
      }
    }else if(type==='crown'){
      mesh(new THREE.CylinderGeometry(.5,.5,.17,32,1,true),gold,g,0,.12,0);
      for(let j=0;j<7;j++){const a=j/7*Math.PI*2;mesh(shared('crown-point',()=>new THREE.ConeGeometry(.11,.32,4)),gold,g,Math.cos(a)*.46,.32,Math.sin(a)*.46);sphere(g,.055,tint,Math.cos(a)*.46,.5,Math.sin(a)*.46);}
    }
  }
  if (design.topping !== "none") {
    const n = design.topping==='crown'?1:design.topping === "blueberry" ? 12 : 6;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + .25, r = n===1?0:topRadius * .67, [x,z]=boundary(r,a);
      const type = design.topping === "mixed" ? ["strawberry", "blueberry", "stars","macarons","flowers","hearts"][i % 6] : design.topping;
      if (type === "strawberry") strawberry(decorations, x, z, a);
      else if (type === "blueberry") {
        const berry = sphere(decorations, .14, material("#59608d", .38), x, .15, z); berry.scale.y *= .92;
        const crown = mesh(shared("berry-crown", () => new THREE.TorusGeometry(.045, .01, 5, 10)), material("#8d8dab"), decorations, x, .275, z); crown.rotation.x = Math.PI / 2;
      } else if(['hearts','stars','moons'].includes(type)) {
        const candy = mesh(shapeGeometry(type === "hearts" ? "heart" : type==='moons'?'moon':"star"), type === "hearts" ? material("#df7f9f", .3) : gold, decorations, x, .32, z);
        candy.rotation.set(-.1, a * .3, -.2 + (i % 3) * .2); candy.scale.setScalar(.8);
      } else sweet(type,decorations,x,z,a,i);
    }
  }
  const lights = part("蜡烛", topY, design.layers * 1.5 + 1.9);
  function flame(x, y, z) {
    if (options.flame) { flames.push(options.flame(lights, x, y, z,design.candles)); return; }
    const geometry = shared("flame", () => new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(.065, .025), new THREE.Vector2(.105, .13), new THREE.Vector2(.075, .27), new THREE.Vector2(.025, .38), new THREE.Vector2(0, .45)], 16));
    const outerMaterial = new THREE.MeshBasicMaterial({ color: "#ffa344", transparent: true, opacity: .88, toneMapped: false }); outerMaterial.color.convertSRGBToLinear();
    const innerMaterial = new THREE.MeshBasicMaterial({ color: "#fff6cd", toneMapped: false }); innerMaterial.color.convertSRGBToLinear();
    const outer = mesh(geometry, outerMaterial, lights, x, y - .21, z);
    const inner = mesh(geometry, innerMaterial, lights, x, y - .205, z + .035);
    inner.scale.set(.48, .66, .48); outer.castShadow = false; inner.castShadow = false; flames.push(outer, inner);
  }
  function candle(x, z, height, color) {
    const wax=material(color,.24,.08),r=design.candles==='single'?.105:.085;
    mesh(lathe(r,height,.025),wax,lights,x,.04,z);
    // A continuous gilded spiral replaces the old stack of horizontal rings.
    const turns=design.candles==='spiral'?8:4;
    const points=Array.from({length:100},(_,i)=>{const t=i/99,a=t*Math.PI*2*turns;return new THREE.Vector3(x+Math.cos(a)*(r+.002),.075+t*(height-.075),z+Math.sin(a)*(r+.002));});
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),120,design.candles==='spiral'?.016:.009,6,false),design.candles==='spiral'?material('#f8c4df',.25):gold,lights);
    const lip=mesh(new THREE.TorusGeometry(r*.73,.017,8,24),material('#fff1dc',.28),lights,x,height+.04,z);lip.rotation.x=Math.PI/2;
    for(let i=0;i<3;i++){const a=i*2.3;const drip=sphere(lights,1,wax,x+Math.cos(a)*r,height+.009-i*.018,z+Math.sin(a)*r);drip.scale.set(.024,.055+i*.012,.024);}
    const cuff=mesh(new THREE.TorusGeometry(r+.002,.015,8,24),gold,lights,x,.08,z);cuff.rotation.x=Math.PI/2;
    wick(x,height+.065,z);flame(x,height+.28,z);
  }
  function wick(x,y,z){mesh(shared('wick',()=>new THREE.CylinderGeometry(.012,.014,.09,8)),material('#42323f'),lights,x,y,z);}
  if (design.candles === "single") candle(0, 0, .95, "#d792b2");
  if (design.candles === "three") [[-.42, .12], [.42, .12], [0, -.4]].forEach(([x, z], i) => candle(x, z, .88 + i * .1, ["#d792b2", "#b3a2d0", "#93b5ab"][i]));
  if(design.candles==='rainbow')for(let i=0;i<5;i++){const a=i/5*Math.PI*2;candle(Math.cos(a)*.38,Math.sin(a)*.38,.78+i*.045,sweets[i]);}
  if(design.candles==='spiral'){
    candle(0,0,1.1,'#b49bd8');
  }
  if(design.candles==='heart'||design.candles==='star'){
    const kind=design.candles==='heart'?'heart':'star';
    mesh(new THREE.CylinderGeometry(.035,.045,.5,12),gold,lights,0,.25,0);
    const rim=mesh(shapeGeometry(kind),gold,lights,0,.67,-.035);rim.scale.setScalar(1.5);
    const badge=mesh(shapeGeometry(kind),material(kind==='heart'?'#f397bf':'#ffe19a',.22,.08),lights,0,.67,.055);badge.scale.set(1.3,1.3,.8);
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2;sphere(lights,.025,cream,Math.sin(a)*.21,.82+Math.cos(a)*.17,.17);}
    const gem=mesh(shapeGeometry(kind==='heart'?'star':'heart'),material(kind==='heart'?'#ffe1a6':'#edabc9',.2),lights,0,.78,.17);gem.scale.setScalar(.3);
    const top=kind==='heart'?1.25:1.22;wick(0,top,0);flame(0,top+.215,0);
  }
  if(design.candles==='sparkler'){
    mesh(new THREE.CylinderGeometry(.018,.024,1.15,12),gold,lights,0,.58,0);
    mesh(lathe(.047,.42,.015),material('#a18bc8',.25,.35),lights,0,.06,0);
    for(let i=0;i<4;i++){const ring=mesh(new THREE.TorusGeometry(.048,.009,6,16),gold,lights,0,.09+i*.1,0);ring.rotation.x=Math.PI/2;}
    mesh(new THREE.CylinderGeometry(.039,.026,.49,10),material('#e4d6bb',.6,.25),lights,0,.92,0);
    sphere(lights,.045,material('#fff2b5'),0,1.17,0);flame(0,1.36,0);
  }
  if (design.candles === "number") {
    // Rounded tube strokes produce real, rotatable 3D numeral candles.
    const digits = {
      0: [[.15,.1],[-.17,.1],[-.26,.35],[-.24,.78],[0,.94],[.25,.77],[.26,.34],[.15,.1]],
      1: [[-.2,.68],[.03,.91],[.03,.1]], 2: [[-.24,.72],[-.13,.92],[.14,.9],[.25,.7],[.08,.48],[-.23,.12],[.25,.12]],
      3: [[-.23,.83],[.05,.94],[.25,.77],[.05,.54],[-.03,.52],[.25,.33],[.12,.1],[-.2,.12]],
      4: [[.15,.1],[.15,.91],[-.25,.36],[.3,.36]], 5: [[.25,.9],[-.22,.9],[-.22,.54],[.12,.53],[.25,.3],[.1,.1],[-.22,.15]],
      6: [[.22,.86],[-.1,.9],[-.26,.54],[-.23,.2],[.05,.1],[.25,.26],[.13,.5],[-.2,.5]],
      7: [[-.25,.9],[.27,.9],[-.08,.1]], 8: [[0,.52],[-.23,.73],[0,.94],[.23,.73],[0,.52],[-.25,.29],[0,.08],[.25,.29],[0,.52]],
      9: [[.22,.53],[-.05,.48],[-.25,.7],[-.12,.92],[.15,.87],[.25,.6],[.09,.13],[-.2,.12]]
    };
    const text = String(design.age);
    Array.from(text).forEach((d, i) => {
      const offset = (i - (text.length - 1) / 2) * .73;
      const path = new THREE.CatmullRomCurve3(digits[d].map(([x, y]) => new THREE.Vector3(x + offset, y + .15, 0)), false, "centripetal");
      mesh(new THREE.TubeGeometry(path,72,.102,10,false),gold,lights);
      const wax=mesh(new THREE.TubeGeometry(path,72,.074,10,false),material(i%2?'#bfade8':'#f4b9d0',.23,.05),lights);wax.position.z=.067;
      // Pearl flecks and a small star give the numerals a confectionery finish.
      for(let j=0;j<12;j++){const p=path.getPointAt((j+.5)/12);sphere(lights,.018,cream,p.x,p.y,p.z+.143);}
      const star=mesh(shapeGeometry('star'),gold,lights,offset+.21,.34,.14);star.scale.setScalar(.22);
      mesh(shared("number-stick", () => new THREE.CylinderGeometry(.025, .025, .27, 6)), gold, lights, offset, .05, 0);
      const highest=digits[d].reduce((a,b)=>a[1]>b[1]?a:b);wick(offset+highest[0],highest[1]+.23,0);flame(offset+highest[0],highest[1]+.445,0);
    });
  }
  if (design.message.trim()) {
    const plaque = part("祝福牌", base + .38, .5);
    const board = new THREE.Shape(), w = 1.7, h = .5, r = .08;
    board.moveTo(-w / 2 + r, -h / 2); board.lineTo(w / 2 - r, -h / 2); board.quadraticCurveTo(w/2, -h/2, w/2, -h/2+r); board.lineTo(w/2,h/2-r); board.quadraticCurveTo(w/2,h/2,w/2-r,h/2); board.lineTo(-w/2+r,h/2); board.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r); board.lineTo(-w/2,-h/2+r); board.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
    mesh(new THREE.ExtrudeGeometry(board, { depth: .045, bevelEnabled: true, bevelSegments: 2, bevelSize: .015, bevelThickness: .015, steps: 1 }), material("#fff3de", .4), plaque, 0, 0, radius + .025);
    if (labelTexture) {
      const texture = labelTexture(design.message); ownedTextures.add(texture);
      mesh(new THREE.PlaneGeometry(w - .12, h - .05), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }), plaque, 0, 0, radius + .091);
    }
  }
  const opacity=prepareCakeOpacity(parts);
  parts.forEach(p=>{const layer=/^第(\d+)层/.exec(p.group.name);p.dropRank=p.group.name==='底盘'?0:layer?Number(layer[1]):p.group.name==='顶部装饰'?design.layers+1:p.group.name==='蜡烛'?design.layers+2:1;p.arrivalOffset=0;});
  let destroyed = false;
  return {
    root, parts, flames, topY,arrivalDuration:arrivalDuration(design.layers),
    setExplode(amount, time = 0) { parts.forEach((p, i) => { p.group.position.y = p.y + p.offset * amount + p.arrivalOffset + (p.dropRank===0?0:Math.sin(time * 1.6 + i * 1.3) * amount * .045); }); },
    setEntrance(amount,entering=true,distance=10) {
      root.position.y=0;opacity.body(entering?1:amount);
      opacity.plate(entering?Math.min(1,amount*arrivalDuration(design.layers)/.3):1);
      parts.forEach(p=>{const sample=entering?layerArrival(amount,p.dropRank,design.layers,distance):{offset:0,visible:amount>0||p.dropRank===0,progress:1};
        p.arrivalOffset=sample.offset;p.arrivalProgress=sample.progress;p.group.visible=sample.visible;
      });
    },
    keepPlateOnly(){parts.forEach(p=>{p.group.visible=p.dropRank===0;p.arrivalOffset=0;});root.position.y=0;opacity.plate(1);},
    fadePlate:opacity.plate,
    setLit(lit) { flames.forEach(f => { f.visible = lit; }); },
    animateFlames(time) { flames.forEach((f, i) => { f.rotation.z = Math.sin(time * 8 + i) * .07; }); },
    dispose() {
      if (destroyed) return; destroyed = true;
      const gs = new Set(), ms = new Set();
      root.traverse(o => { if (o.geometry) gs.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => ms.add(m)); });
      gs.forEach(g => g.dispose()); ms.forEach(m => m.dispose()); ownedTextures.forEach(t => t.dispose());
      options.release?.(root);
      root.clear();
    }
  };
}
