import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../../../../frontend/index.html", import.meta.url), "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Debe existir un script inline");
const source = match[1];
assert.ok(source.includes("buildWheel") && source.includes("beginMatch") && source.includes("categories"));
assert.ok(!source.includes("WIN_POINTS") && !source.includes("points"));
assert.equal((source.match(/kind: "crown"/g) || []).length, 2);
assert.ok(source.includes('const sectors = [...categories, { name: CROWN_SECTOR_NAME, kind: "crown" }'));
assert.ok(source.includes("const n = sectors.length"));
assert.ok(source.includes("usedQuestionIds"));
assert.ok(source.includes("MAX_JOKER_USES = 2"));
assert.ok(source.includes("eliminate-two") && source.includes("second-chance") && source.includes("auto-correct"));
assert.ok(source.includes("function resetMatchState()"));
assert.ok(!source.includes("/questions/category/${CROWN_SECTOR_NAME}"));

const elements = new Map();

async function runProbe(categoryPayload) {
  const createElement = () => ({
    append() {},
    appendChild() {},
    classList: { add() {}, toggle() {} },
    style: { setProperty() {} },
  });
  const context = {
    console,
    Math,
    Set,
    performance: { now: () => 0 },
    document: {
      createElement,
      getElementById: id => elements.get(id) || {
        addEventListener() {},
        appendChild() {},
        style: { setProperty() {} },
      },
      querySelectorAll: () => [],
    },
    fetch: () => Promise.resolve({ json: () => Promise.resolve(categoryPayload) }),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    setImmediate,
  };
  const executable = source.replace(/\n\s*init\(\);\s*$/, "");
  const probe = `${executable}
globalThis.__probe = {
  getCategories: () => categories,
  sectorCount: () => [...categories, { name: CROWN_SECTOR_NAME, kind: "crown" }].length,
  centers: () => [...Array(7)].map((_, index) => sectorCenterAngle(index, 7)),
  normalized: () => normalizeDegrees(-450),
  wheelIndex: () => sectorUnderPointer(0.1, 7),
};
init();
await new Promise(resolve => setImmediate(resolve));
await new Promise(resolve => setImmediate(resolve));
globalThis.probe = {
  categories: __probe.getCategories(),
  sectorCount: __probe.sectorCount(),
  centers: __probe.centers(),
  normalized: __probe.normalized(),
  wheelIndex: __probe.wheelIndex(),
};`;
  const execution = vm.runInNewContext(`(async () => {\n${probe}\n})()`, context);
  await execution;
  return context.probe;
}

const apiCategories = [
  { name: "arte" },
  { name: "historia" },
  { name: "deportes" },
  { name: "ciencia" },
  { name: "geografia" },
  { name: "entretenimiento" },
];
const probes = [
  ["api", await runProbe(apiCategories)],
  ["fallback", await runProbe([])],
];
for (const [name, probe] of probes) {
  assert.equal(
    probe.categories.length,
    6,
    `${name}: deben cargarse seis categorías; recibidas=${probe.categories.map(category => category.name).join(",")}`,
  );
  assert.equal(probe.sectorCount, 7);
  assert.equal(probe.centers.length, 7);
  assert.equal(probe.normalized, 270);
  assert.equal(probe.wheelIndex, 6);
}
console.log("FRONTEND_CHECK_PASS", Object.fromEntries(probes));