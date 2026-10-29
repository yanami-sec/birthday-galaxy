import assert from 'node:assert/strict';
import { MOODS, recipeName, suggestRecipeName } from '../web/cake-inspiration.js';
import { DEFAULT_DESIGN, normalizeDesign, randomDesign } from '../web/workshop-model.js';
assert.equal(normalizeDesign({mood:'__proto__'}).mood,'starlit');
assert.equal(recipeName('  晚风\n来信  '),'晚风 来信');
assert.equal(recipeName('甜'.repeat(50)).length,18);
assert.equal(recipeName(null),'');assert.equal(suggestRecipeName(null),MOODS.starlit.title);
for(const [id,profile] of Object.entries(MOODS)){
  assert.ok(profile.title);assert.ok(profile.colors.length===3);assert.ok(profile.pace>0);
  const initial=normalizeDesign({...DEFAULT_DESIGN,mood:id,recipeName:'今天的专属配方'});
  for(let i=0;i<25;i++){
    const next=randomDesign(initial);
    assert.equal(next.mood,id);assert.equal(next.recipeName,'今天的专属配方');
    if(id!=='starlit'){
      assert.deepEqual([...next.colors].sort(),[...profile.colors].sort());assert.ok(profile.skins.includes(next.skin));assert.equal(next.cream,profile.cream);
    }
  }
}
console.log('Mood recipes, consistent random colors, metadata normalization and naming passed');
