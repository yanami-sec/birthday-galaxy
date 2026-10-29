import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { DEFAULT_DESIGN, normalizeDesign, randomDesign, buildCakeModel } from "../web/workshop-model.js";
import { CATALOG } from '../web/cake-catalog.js';
const require = createRequire(import.meta.url);
const THREE = require("../web/vendor/three-r128.min.js");
const invalid = normalizeDesign({ layers: 500, colors: ["javascript:bad"], creamStyle: "invalid", age: -8, message: "字".repeat(50), unknown: true });
assert.equal(invalid.layers, 3); assert.equal(invalid.age, 0); assert.equal(invalid.message.length, 22);
assert.equal(invalid.colors[0], DEFAULT_DESIGN.colors[0]); assert.equal(invalid.creamStyle, DEFAULT_DESIGN.creamStyle); assert.equal("unknown" in invalid, false);
assert.deepEqual(normalizeDesign(null), normalizeDesign());
const configs = [];
for (const layers of [1, 2, 3]) for (const creamStyle of ["none", "drip", "pearls", "rosettes"]) {
  configs.push({ ...DEFAULT_DESIGN, layers, creamStyle, candles: "number", age: 80, topping: "mixed" });
}
for (const age of [0,1,2,3,4,5,6,7,8,9,18,22,99,126,999]) configs.push({ ...DEFAULT_DESIGN, candles: "number", age });
for (const topping of ["none", "strawberry", "blueberry", "stars", "hearts"]) configs.push({ ...DEFAULT_DESIGN, topping, candles: "none", plate: "none", message: "" });
for (let i = 0; i < 15; i++) configs.push(randomDesign(DEFAULT_DESIGN));
for (const layers of [1,2,3]) for(const creamStyle of ['drip','pearls','rosettes']) configs.push({...DEFAULT_DESIGN,layers,creamStyle,shape:'heart'});
for(const [key,items] of Object.entries(CATALOG))for(const [value] of items)configs.push({...DEFAULT_DESIGN,[key]:value});
for(const [shape] of CATALOG.shape)for(const [creamStyle] of CATALOG.creamStyle)configs.push({...DEFAULT_DESIGN,shape,creamStyle,topping:'crown'});
let checkedVertices = 0;
for (const config of configs) {
  const model = buildCakeModel(THREE, config);
  const bounds = new THREE.Box3().setFromObject(model.root); assert.ok(Number.isFinite(bounds.max.y)); assert.ok(bounds.max.y > bounds.min.y);
  const geometries = new Set(), materials = new Set();
  model.root.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) materials.add(o.material);
    if (o.isInstancedMesh) for (const value of o.instanceMatrix.array) assert.ok(Number.isFinite(value));
  });
  for (const geometry of geometries) {
    for (const attribute of Object.values(geometry.attributes)) for (const value of attribute.array) assert.ok(Number.isFinite(value), `Nonfinite geometry in ${JSON.stringify(config)}`);
    const count = geometry.attributes.position.count; checkedVertices += count;
    if (geometry.index) for (const index of geometry.index.array) assert.ok(index < count && index >= 0);
  }
  model.setExplode(1); const exploded = new THREE.Box3().setFromObject(model.root); assert.ok(exploded.max.y >= bounds.max.y);
  model.setExplode(0); const assembled = new THREE.Box3().setFromObject(model.root); assert.ok(Math.abs(assembled.max.y - bounds.max.y) < 1e-6);
  model.setLit(false); assert.ok(model.flames.every(f => !f.visible)); model.setLit(true);
  assert.equal(model.flames.length === 0, config.candles === "none");
  let disposedGeometries = 0, disposedMaterials = 0;
  geometries.forEach(g => g.addEventListener("dispose", () => disposedGeometries++)); materials.forEach(m => m.addEventListener("dispose", () => disposedMaterials++));
  model.dispose(); model.dispose(); assert.equal(disposedGeometries, geometries.size); assert.equal(disposedMaterials, materials.size);
}
console.log(JSON.stringify({ passed: true, combinations: configs.length, checkedVertices }));
