// A screen-space sky keeps the galaxy present on wide monitors and during disassembly.
export function createGalaxyBackdrop(THREE, compact, clock, glyphs) {
  const scene=new THREE.Scene(),camera=new THREE.Camera();
  const uniforms={time:clock,resolution:{value:new THREE.Vector2(1,1)},tint:{value:new THREE.Color('#8060bc')},accent:{value:new THREE.Color('#61a8db')}};
  const haze=new THREE.ShaderMaterial({depthWrite:false,depthTest:false,uniforms,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`varying vec2 vUv;uniform float time;uniform vec2 resolution;uniform vec3 tint;uniform vec3 accent;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
    float cloud(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=noise(p)*a;p=p*2.04+7.1;a*=.5;}return n;}
    void main(){vec2 p=vUv;float aspect=resolution.x/resolution.y;vec2 q=vec2(p.x*aspect,p.y);
      float t=time*.012;float n=cloud(q*3.+vec2(t,-t*.4));float lace=cloud(q*7.+n*2.+vec2(-t,t*.5));
      float ribbon=exp(-pow((p.y-.45-sin(p.x*5.+n*2.)*.2)*3.5,2.));
      float side=.3+.7*smoothstep(.1,.4,abs(p.x-.5));float mist=pow(n*lace,1.1)*ribbon*side;
      vec3 color=vec3(.012,.016,.039)+mix(tint,accent,lace)*mist*.62;
      // Long, infrequent meteors; the bright head travels with its fading trail.
      for(int i=0;i<4;i++){float k=float(i),age=mod(time+k*5.7,19.);vec2 origin=vec2(.18+k*.22,.87-k*.12);vec2 head=origin+vec2(-.085,-.052)*age;
        vec2 d=(p-head)*vec2(aspect,1.);vec2 direction=normalize(vec2(.085*aspect,.052));float along=dot(d,direction);float across=abs(d.x*direction.y-d.y*direction.x);
        float trail=exp(-across*1800.)*exp(-max(0.,along)*21.)*step(0.,along)*(1.-smoothstep(2.6,3.8,age))*smoothstep(0.,.35,age);color+=vec3(.56,.7,1.)*trail*.7;
      }gl_FragColor=vec4(color,1.);
    }`});
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(2,2),haze);scene.add(plane);
  let seed=6372;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const pos=[],sizes=[],kinds=[],phases=[],colors=[],palette=['#a4baff','#ecc2e3','#d4c9ff','#8ce3e0','#ffe1a9'];
  const count=compact?360:1050,ratio=Math.min(devicePixelRatio||1,1.6);
  for(let i=0;i<count;i++){
    let x=random(),y=.06+random()*.86;const glyph=i%19===0;
    // Larger motifs stay to the sides, leaving a quiet silhouette around the cake.
    if(glyph)x=i%2?random()*.27:.73+random()*.27;
    pos.push(x*2-1,y*2-1,0);sizes.push((glyph?11+random()*15:.8+random()*2.8)*ratio);kinds.push(glyph?1+(i%7):0);phases.push(random()*100);
    const c=new THREE.Color(palette[i%palette.length]);colors.push(c.r,c.g,c.b);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('size',new THREE.Float32BufferAttribute(sizes,1));geometry.setAttribute('kind',new THREE.Float32BufferAttribute(kinds,1));geometry.setAttribute('phase',new THREE.Float32BufferAttribute(phases,1));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const material=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:clock,glyphs:{value:glyphs}},
    vertexShader:`attribute float size;attribute float kind;attribute float phase;attribute vec3 color;uniform float time;varying float vKind;varying float vAlpha;varying vec3 vColor;void main(){vec3 p=position;p.x+=sin(time*.035+phase)*.012;p.y+=cos(time*.045+phase)*.014;gl_Position=vec4(p,1.);gl_PointSize=size;vKind=kind;vColor=color;vAlpha=.28+.5*pow(.5+.5*sin(time*(.6+fract(phase))+phase),3.);}`,
    fragmentShader:`varying float vKind;varying float vAlpha;varying vec3 vColor;uniform sampler2D glyphs;void main(){vec2 p=gl_PointCoord-.5;float r=length(p),a=0.;if(vKind<.5){a=exp(-r*r*30.)+exp(-r*r*130.);}
    else if(vKind<1.5){a=exp(-abs(abs(p.x)+abs(p.y)-.31)*65.);}
    else if(vKind<2.5){a=pow(max(0.,1.-abs(p.x)*18.),3.)*max(0.,1.-abs(p.y)*2.2)+pow(max(0.,1.-abs(p.y)*18.),3.)*max(0.,1.-abs(p.x)*2.2);}
    else if(vKind<3.5){a=(1.-smoothstep(.31,.38,r))*(1.-smoothstep(.24,.31,length(p-vec2(.13,-.06))));}
    else if(vKind<4.5){a=texture2D(glyphs,vec2(gl_PointCoord.x/8.,1.-gl_PointCoord.y)).a*.75;}
    else if(vKind<5.5){float angle=atan(p.y,p.x);float edge=.25+.1*cos(angle*5.);a=exp(-abs(r-edge)*70.);}
    else if(vKind<6.5){vec2 q=vec2(p.x*.85-p.y*.52,p.x*.52+p.y*.85);float ring=length(vec2(q.x,q.y*2.7));a=(1.-smoothstep(.14,.18,r))*.5+exp(-abs(ring-.36)*65.);}
    else {float angle=atan(p.y,p.x);float edge=.3*cos(.523599)/cos(mod(angle+.523599,1.047198)-.523599);a=exp(-abs(r-edge)*70.);}
    gl_FragColor=vec4(vColor,a*vAlpha*.65);}`});
  const stars=new THREE.Points(geometry,material);stars.frustumCulled=false;scene.add(stars);
  // Two fine constellations drawn only in the far margins.
  const paths=[[[.07,.58],[.13,.69],[.22,.63],[.17,.48],[.24,.36]],[[.8,.66],[.87,.75],[.94,.6],[.86,.49],[.93,.36]]];
  const lines=[];paths.forEach(path=>path.slice(1).forEach((p,i)=>lines.push(path[i][0]*2-1,path[i][1]*2-1,0,p[0]*2-1,p[1]*2-1,0)));
  const lineGeo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
  const lineMat=new THREE.LineBasicMaterial({color:'#9a9cda',transparent:true,opacity:compact?.07:.14,depthTest:false,depthWrite:false});const constellation=new THREE.LineSegments(lineGeo,lineMat);scene.add(constellation);
  const nodes=paths.flat().flatMap(([x,y])=>[x*2-1,y*2-1,0]);const nodeGeo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(nodes,3));
  const nodeMat=new THREE.PointsMaterial({color:'#c4bded',size:compact?2:3,sizeAttenuation:false,transparent:true,opacity:.55,depthTest:false,depthWrite:false});const anchors=new THREE.Points(nodeGeo,nodeMat);anchors.frustumCulled=false;scene.add(anchors);
  let targetTint=uniforms.tint.value.clone(),targetAccent=uniforms.accent.value.clone();
  return {setMood(profile){targetTint.set(profile.colors[1]);targetAccent.set(profile.accent);},
    render(renderer,w,h,enabled){uniforms.resolution.value.set(w,h);uniforms.tint.value.lerp(targetTint,.015);uniforms.accent.value.lerp(targetAccent,.015);stars.visible=constellation.visible=anchors.visible=enabled;plane.visible=enabled;renderer.render(scene,camera);},
    dispose(){scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});scene.clear();}};
}
