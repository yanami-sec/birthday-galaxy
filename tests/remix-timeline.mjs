import assert from 'node:assert/strict';
import { RemixTimeline } from '../web/remix-timeline.js';
for(const open of [false,true]){
  const timeline=new RemixTimeline();timeline.begin({layers:3},open,open?1:0);let swaps=0,done=false;
  for(let i=0;i<100&&timeline.busy;i++){
    const sample=timeline.step(.025);if(sample.swap)swaps++;
    assert.equal(sample.expansion,open?1:0,'Randomization must not open or close the cake');
    assert.ok(sample.entrance>=0&&sample.entrance<=1);if(sample.done){done=true;assert.equal(sample.entrance,1);}
  }
  assert.equal(swaps,1);assert.ok(done);assert.equal(timeline.step(1),null);
}
const paused=new RemixTimeline();paused.begin({},true,1);paused.step(.2);const before=paused.job.elapsed;paused.step(0);assert.equal(paused.job.elapsed,before);
console.log('Random modes: closed remains closed; open remains open; one animated swap; pause passed');
