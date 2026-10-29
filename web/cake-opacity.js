// Only the tray gets separate materials, so its crossfade cannot dim cake trim
// that happens to share the same gold/cream material. No custom reveal shaders.
export function prepareCakeOpacity(parts){
  const plate=parts.find(p=>p.group.name==='底盘');
  if(plate){const copies=new Map();plate.group.traverse(o=>{
    if(!o.material)return;
    const copy=m=>{if(!copies.has(m)){const c=m.clone();c.onBeforeCompile=m.onBeforeCompile;c.customProgramCacheKey=m.customProgramCacheKey;copies.set(m,c);}return copies.get(m);};
    o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
  });}
  function entries(groups){
    const unique=new Set();groups.forEach(p=>p.group.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>unique.add(m));}));
    return [...unique].map(m=>({m,opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,shaderOpacity:m.uniforms?.opacity?.value,appearance:m.uniforms?.appearance?.value}));
  }
  const body=entries(parts.filter(p=>p!==plate)),tray=entries(plate?[plate]:[]);
  function fade(list,amount){const a=Math.max(0,Math.min(1,amount));list.forEach(({m,opacity,transparent,depthWrite,shaderOpacity,appearance})=>{
    m.opacity=opacity*a;m.transparent=a<.999||transparent;m.depthWrite=a<.999?false:depthWrite;
    if(shaderOpacity!==undefined)m.uniforms.opacity.value=shaderOpacity*a;
    if(appearance!==undefined)m.uniforms.appearance.value=appearance*a;
  });}
  return {body:a=>fade(body,a),plate:a=>fade(tray,a)};
}
