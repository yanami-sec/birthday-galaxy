// Keep standard lighting while advecting the actual nebula samples on the GPU.
// The shared virtual clock pauses with the experience; no per-frame texture uploads.
export function animateGalaxySurface(material,clock,top=false){
  material.onBeforeCompile=shader=>{
    shader.uniforms.galaxyTime=clock;
    shader.fragmentShader=`uniform float galaxyTime;
    vec2 galaxyFlow(vec2 uv){
      float t=galaxyTime;
      ${top?`vec2 p=uv-.5;float r=length(p);float a=.065*t+.12*sin(r*13.-t*.24);float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*p+.5;`:
        `return vec2(uv.x+t*.016+sin(uv.y*8.+t*.27)*.027,clamp(uv.y+sin(uv.x*6.283+t*.22)*.035,.005,.995));`}
    }
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
      vec4 texelColor=texture2D(map,galaxyFlow(vUv));texelColor=mapTexelToLinear(texelColor);diffuseColor*=texelColor;
      #endif`).replace('#include <emissivemap_fragment>',`#ifdef USE_EMISSIVEMAP
      vec3 nebula=emissiveMapTexelToLinear(texture2D(emissiveMap,galaxyFlow(vUv))).rgb;
      float shimmer=.9+.1*sin(galaxyTime*1.3+vUv.x*41.+vUv.y*29.);totalEmissiveRadiance*=nebula*shimmer;
      #endif`);
  };
  material.customProgramCacheKey=()=>`galaxy-flow-${top?'cap':'side'}-1`;
  material.userData.animatedGalaxy=true;
  return material;
}
