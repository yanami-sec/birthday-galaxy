export function createCardInteraction({cards,stage,getNodes,getPositions,getCardSize,position,onStatus}){
  const dialog=document.getElementById('card-reader'),resetButton=document.getElementById('reset-cards');
  let ready=false,drag=null,selected=null,top=64,offsets=new WeakMap();
  const suppressClick=new WeakMap();
  function offsetFor(node){if(!offsets.has(node))offsets.set(node,{x:0,y:0});return offsets.get(node);}
  function pauseHeartbeat(){cards.classList.toggle('interacting',Boolean(drag)||dialog.open);}
  function updateReset(){resetButton.disabled=!getNodes().some(node=>{const p=offsetFor(node);return node.hidden||Math.abs(p.x)>.1||Math.abs(p.y)>.1;});}
  function place(node,x,y){
    const index=Number(node.dataset.cardIndex),base=getPositions()[index];if(!base)return;
    const {width,height}=getCardSize(),p=offsetFor(node);
    p.x=Math.max(width/2-base[0],Math.min(stage.clientWidth-width/2-base[0],x));
    p.y=Math.max(height/2-base[1],Math.min(stage.clientHeight-height/2-base[1],y));
    position(node,index);updateReset();
  }
  function restore(node){offsets.set(node,{x:0,y:0});node.hidden=false;node.style.zIndex=Number(node.dataset.cardIndex)+1;position(node,Number(node.dataset.cardIndex));updateReset();}
  function finish(event){
    if(!drag||event&&event.pointerId!==drag.id)return;const previous=drag;drag=null;
    if(previous.moved)suppressClick.set(previous.node,performance.now()+450);
    previous.node.classList.remove('dragging');
    if(previous.node.hasPointerCapture(previous.id))previous.node.releasePointerCapture(previous.id);
    pauseHeartbeat();updateReset();
  }
  function read(node){
    if(!ready||node.hidden||dialog.open)return;
    selected=node;node.style.zIndex=++top;node.focus({preventScroll:true});
    for(const key of ['--paper-top','--paper-bottom','--accent'])dialog.style.setProperty(key,node.style.getPropertyValue(key));
    document.getElementById('card-reader-title').textContent=`第 ${Number(node.dataset.cardIndex)+1} 份生日心意`;
    document.getElementById('card-reader-message').textContent=node.querySelector('.card-message').textContent;
    dialog.showModal();pauseHeartbeat();document.getElementById('card-reader-close').focus({preventScroll:true});
  }
  cards.addEventListener('pointerdown',event=>{
    const node=event.target.closest('.wish-card');
    if(!ready||!node||event.target.closest('button')||event.button!==0||drag||dialog.open)return;
    event.preventDefault();const p=offsetFor(node);const rect=cards.getBoundingClientRect();
    drag={node,id:event.pointerId,startX:event.clientX,startY:event.clientY,x:p.x,y:p.y,scaleX:rect.width/stage.clientWidth,scaleY:rect.height/stage.clientHeight,moved:false};
    node.style.zIndex=++top;node.focus({preventScroll:true});node.setPointerCapture(event.pointerId);pauseHeartbeat();
  });
  cards.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const dx=(event.clientX-drag.startX)/drag.scaleX,dy=(event.clientY-drag.startY)/drag.scaleY;
    if(Math.hypot(dx,dy)>5){drag.moved=true;drag.node.classList.add('dragging');}
    if(drag.moved){event.preventDefault();place(drag.node,drag.x+dx,drag.y+dy);}
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])cards.addEventListener(event,finish);
  cards.addEventListener('click',event=>{
    const node=event.target.closest('.wish-card');if(!ready||!node)return;
    if(event.target.closest('.card-close')){event.stopPropagation();node.hidden=true;updateReset();return;}
    if(performance.now()<(suppressClick.get(node)||0))return;read(node);
  });
  cards.addEventListener('keydown',event=>{
    const node=event.target.closest('.wish-card');if(!ready||!node||event.target!==node)return;
    if(event.key==='Enter'||event.key===' '){event.preventDefault();read(node);return;}
    const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},direction=directions[event.key];
    if(direction){event.preventDefault();const p=offsetFor(node),step=event.shiftKey?40:16;node.style.zIndex=++top;place(node,p.x+direction[0]*step,p.y+direction[1]*step);}
    if(event.key==='Home'){event.preventDefault();restore(node);}
  });
  document.getElementById('card-reader-close').addEventListener('click',()=>dialog.close());
  document.getElementById('card-reader-return').addEventListener('click',()=>{if(selected)restore(selected);dialog.close();});
  dialog.addEventListener('close',()=>{const previous=selected;selected=null;pauseHeartbeat();if(previous?.isConnected&&!previous.hidden&&!previous.closest('[hidden]'))previous.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  function reset(){finish();if(dialog.open)dialog.close();getNodes().forEach(restore);top=64;updateReset();}
  resetButton.addEventListener('click',()=>{reset();onStatus('卡片已回到爱心里，再拖出一份心意看看吧 ♡');});
  return {offsetFor,reset,
    register(node,index){node.dataset.cardIndex=index;node.tabIndex=ready?0:-1;node.setAttribute('role','group');node.setAttribute('aria-roledescription','可拖动的祝福卡片');node.setAttribute('aria-label',`${node.querySelector('.card-message').textContent}。按回车阅读，方向键移动。`);node.setAttribute('aria-haspopup','dialog');node.querySelector('.card-close').disabled=!ready;},
    setReady(value){ready=value;cards.classList.toggle('is-interactive',value);resetButton.hidden=!value;getNodes().forEach(node=>{node.tabIndex=value?0:-1;node.querySelector('.card-close').disabled=!value;});updateReset();},
    relayout(){getNodes().forEach(node=>{const p=offsetFor(node);place(node,p.x,p.y);});}
  };
}
