// Small vector paths rasterized locally: generous margins preserve the entire silhouette.
export function createStarlightAtlas(THREE){
  const c=document.createElement('canvas');c.width=768;c.height=96;const ctx=c.getContext('2d');
  for(let cell=0;cell<8;cell++){
    ctx.save();ctx.translate(cell*96+48,48);ctx.fillStyle='#fff';ctx.strokeStyle='#fff';ctx.lineWidth=2;
    ctx.shadowColor='#ffffff70';ctx.shadowBlur=5;ctx.beginPath();
    if(cell===0){
      ctx.moveTo(0,30);ctx.bezierCurveTo(-9,20,-34,3,-31,-13);ctx.bezierCurveTo(-28,-32,-8,-34,0,-18);ctx.bezierCurveTo(8,-34,28,-32,31,-13);ctx.bezierCurveTo(34,3,9,20,0,30);
    }else if(cell===1||cell===2||cell===6){
      const points=cell===1?4:cell===2?5:6;
      for(let i=0;i<points*2;i++){const a=-Math.PI/2+i*Math.PI/points,r=i%2?(cell===1?6:14):33,x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();
    }else if(cell===3){
      ctx.moveTo(13,-30);ctx.bezierCurveTo(-35,-28,-35,28,13,30);ctx.bezierCurveTo(-13,15,-13,-15,13,-30);
    }else if(cell===4){ctx.moveTo(0,-33);ctx.lineTo(20,0);ctx.lineTo(0,33);ctx.lineTo(-20,0);ctx.closePath();
    }else if(cell===5){
      ctx.moveTo(0,0);ctx.bezierCurveTo(-33,-40,-42,-11,-14,10);ctx.bezierCurveTo(-37,35,-1,32,0,7);ctx.bezierCurveTo(1,32,37,35,14,10);ctx.bezierCurveTo(42,-11,33,-40,0,0);
    }else{ctx.arc(0,0,17,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(0,0,35,10,-.4,0,Math.PI*2);ctx.stroke();ctx.restore();continue;}
    ctx.fill();ctx.restore();
  }
  const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;return t;
}
