import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../../../../../frontend/index.html", import.meta.url), "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Debe existir un script inline");
const source = match[1];

// --- static guards -------------------------------------------------------------------
assert.equal((html.match(/class="panel[^"]*"/g) || []).length, 4, "deben existir exactamente cuatro paneles");
assert.ok(html.includes('id="case-overlay" class="case-overlay" hidden'), "el overlay debe arrancar oculto");
assert.ok(!html.includes('id="confetti"'), "el canvas unico ya no se llama confetti");
assert.ok(source.includes("target.dataset.effect"), "el resultado debe derivarse de la celda bajo el puntero");
assert.ok(!html.includes(".case-overlay.played .case-modal"), "el estado played no debe redimensionar el modal (movería la celda bajo el puntero)");

const EXPECTED_IDS = ["confetti", "fireworks", "gunfire", "fire", "lightning", "nuclear", "money", "flash"];
for (const id of EXPECTED_IDS) assert.ok(source.includes(`id: "${id}"`), `falta el efecto ${id}`);

// --- DOM stub ------------------------------------------------------------------------
// The cells are laid out with a 129px advance while each reports a 128px width: the exact
// box-model mismatch that made the old closed-form offset drift off the pointed cell. The
// shipped code measures the target cell's real position, so it must remain exact.
const CELL_W = 128;
const CELL_ADVANCE = 129;
const WIN_W = 640;

function makeClassList() {
  const set = new Set();
  return {
    add: c => set.add(c),
    remove: c => set.delete(c),
    toggle: c => (set.has(c) ? set.delete(c) : set.add(c)),
    contains: c => set.has(c),
  };
}

function makeEl() {
  const el = {
    children: [],
    style: {},
    dataset: {},
    classList: makeClassList(),
    hidden: false,
    textContent: "",
    innerHTML: "",
    append(...kids) { el.children.push(...kids); },
    appendChild(kid) { el.children.push(kid); return kid; },
    addEventListener() {},
    removeEventListener() {},
    focus() {},
    getBoundingClientRect() { return { left: (el.__pos || 0) * CELL_ADVANCE, width: CELL_W, height: 100 }; },
    querySelectorAll() { return []; },
  };
  Object.defineProperty(el, "childElementCount", { get() { return el.children.length; } });
  Object.defineProperty(el, "firstElementChild", { get() { return el.children[0] || null; } });
  // Layout metrics mirror the adversarial 129px advance; transforms never affect them.
  Object.defineProperty(el, "offsetLeft", { get() { return (el.__pos || 0) * CELL_ADVANCE; } });
  Object.defineProperty(el, "offsetWidth", { get() { return CELL_W; } });
  return el;
}

function makeButton() {
  const el = makeEl();
  el._handlers = {};
  el.addEventListener = (type, fn) => { el._handlers[type] = fn; };
  return el;
}

function makeContext() {
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop === "createRadialGradient" || prop === "createLinearGradient") return () => ({ addColorStop() {} });
      if (prop in target) return target[prop];
      return () => {};
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
  const canvas = { clientWidth: 800, clientHeight: 600, width: 0, height: 0, getContext: () => ctx };

  const overlay = makeEl();
  overlay.hidden = true;
  const result = { textContent: "" };
  const reel = makeEl();
  const baseAppend = reel.appendChild.bind(reel);
  reel.appendChild = kid => { kid.__pos = reel.children.length; return baseAppend(kid); };
  reel.parentElement = { clientWidth: WIN_W };
  const openBtn = makeButton();

  const byId = {
    fx: canvas,
    "case-reel": reel,
    "case-overlay": overlay,
    "case-result": result,
    "case-open": openBtn,
    "case-again": makeButton(),
    "case-close": makeButton(),
  };

  const document = {
    createElement: () => makeEl(),
    getElementById: id => byId[id] || makeEl(),
    querySelectorAll: () => [],
    querySelector: () => makeEl(),
    addEventListener() {},
    body: makeEl(),
  };

  const window = { devicePixelRatio: 1, matchMedia: () => ({ matches: true }) }; // reduced motion keeps the spin synchronous
  const context = {
    console, document, window,
    location: { search: "" },
    matchMedia: () => ({ matches: true }),
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    setTimeout, clearTimeout, setImmediate,
    Math, Set, Map,
  };
  return { context, overlay, result, openBtn, window, reel };
}

function run(script) {
  const env = makeContext();
  const executable = script.replace(/\n\s*init\(\);\s*$/, "");
  vm.runInNewContext(`${executable}\nwireCase();`, env.context, { filename: "frontend-script.js" });
  return env;
}

function pointerIndexFromOffset(transform) {
  const m = /translateX\((-?[\d.]+)px\)/.exec(transform || "");
  assert.ok(m, `la transformacion debe ser un translateX; obtenido=${transform}`);
  const offset = Number(m[1]);
  const pageX = WIN_W / 2;
  const raw = Math.floor((pageX - offset) / CELL_ADVANCE);
  return ((raw % EXPECTED_IDS.length) + EXPECTED_IDS.length) % EXPECTED_IDS.length;
}

// --- behavior ------------------------------------------------------------------------
const main = run(source);
assert.ok(main.window.__case, "window.__case debe existir");
const effects = [...main.window.__case.getEffects()];
assert.deepEqual(effects.map(e => e.id).sort(), [...EXPECTED_IDS].sort(), "los ids deben ser los ocho esperados");
assert.ok(effects.every(e => e.label && e.label.length > 0), "cada efecto necesita rotulo");

assert.equal(main.overlay.hidden, true, "el overlay debe arrancar oculto");
assert.equal(main.window.__case.getLandedId(), null, "sin girar no hay resultado");
main.openBtn._handlers.click();
assert.equal(main.overlay.hidden, false, "abrir la caja debe mostrar el overlay");
assert.ok(main.overlay.classList.contains("played"), "tras resolver, el overlay pasa a fase played");

const pointed = pointerIndexFromOffset(main.reel.style.transform);
const playedIndex = effects.findIndex(e => e.id === main.window.__case.getLandedId());
assert.ok(playedIndex >= 0, "el id aterrizado debe ser uno de los ocho");
assert.equal(pointed, playedIndex, `la celda bajo el puntero (${pointed}) debe ser el efecto que se juega (${playedIndex})`);
assert.ok(/^¡.+\!$/.test(main.result.textContent), `el resultado debe anunciar el efecto; obtenido=${main.result.textContent}`);

// --- mutation control: unlinking the played effect from the pointed cell must fail -----
const mutated = source.replace(
  "caseLanding = target.dataset.effect;",
  "caseLanding = CASE_EFFECTS[(index + 1) % count].id;",
);
assert.notEqual(mutated, source, "la mutacion debe aplicarse");
const mutant = run(mutated);
mutant.openBtn._handlers.click();
const mutantPointed = pointerIndexFromOffset(mutant.reel.style.transform);
const mutantEffects = [...mutant.window.__case.getEffects()];
const mutantPlayed = mutantEffects.findIndex(e => e.id === mutant.window.__case.getLandedId());
assert.notEqual(mutantPointed, mutantPlayed, "la mutacion debe romper la coincidencia (el check tiene dientes)");

console.log("VICTORY_CASE_CHECK_PASS", JSON.stringify({
  effects: effects.map(e => e.id),
  pointed,
  played: playedIndex,
  mutantPointed,
  mutantPlayed,
}));
