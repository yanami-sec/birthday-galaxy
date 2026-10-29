const clamp=value=>Math.max(0,Math.min(1,value));
// A short downward flight, followed by a small upward rebound, without rescaling
// the cake or adding per-material fragment work.
export function arrivalOffset(progress,distance=10){
  const p=clamp(progress);
  if(p===1)return 0;
  if(p<.78)return distance*Math.pow(1-p/.78,3);
  return .12*Math.sin((p-.78)/.22*Math.PI);
}
const layerDelay=.24;
export function arrivalDuration(layers){return .66+layerDelay*(layers+1);}
export function layerArrival(progress,rank,layers,distance=10){
  if(rank===0)return {progress:1,offset:0,visible:true};
  if(progress>=1)return {progress:1,offset:0,visible:true};
  const local=clamp((clamp(progress)*arrivalDuration(layers)-(rank-1)*layerDelay)/.66);
  return {progress:local,offset:arrivalOffset(local,distance),visible:local>0};
}
