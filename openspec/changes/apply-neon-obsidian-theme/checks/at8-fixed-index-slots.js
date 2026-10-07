/* AT-8 - fixed index slots. The machine form of test-plan.md SM-17 clause 1.
   Usage:  node at8-fixed-index-slots.js <frontend\index.html> [--mutant[=pair|letter]]
   Exit 0 when the four tags read A,B,C,D in document order on two questions whose option
   texts differ, and correctness is decided by option TEXT rather than by slot.
   Exit 1 on an assertion failure. Exit 2 when a control fails and the run cannot be trusted.

   The picks go through the recorded card's own onclick handler, not through a direct
   pickAnswer call. A check that calls pickAnswer itself never runs the wiring it is meant to
   guard, and R10/S19's central clause - correctness is never decided by the option's letter -
   lives in that handler. Layers 3 and 4 assert the score and the reveal classes that follow
   the click.

   Two negative controls, each of which must come out RED:
     --mutant       the pre-amendment {text, letter} pair shuffle (task 8.3's prescribed mutant,
                    five coordinated inverses). Caught on Layer 1: the tags move with their texts.
     --mutant=letter the handler scores by the slot letter instead of the option text. Caught
                    on Layers 3 and 4, through the click: the answer's own card awards 0 points.

   No framework, no dependency, no test file, no server, no database. */
const fs = require('node:fs');
const vm = require('node:vm');

/* Written synchronously on purpose: process.exit() truncates buffered stdout on a pipe, which
   prints nothing at all and reads as a silent pass. */
const say = (...a) => fs.writeSync(1, a.join(' ') + '\n');
const sayErr = (...a) => fs.writeSync(2, a.join(' ') + '\n');

const htmlPath = process.argv[2];
const mutantArg = process.argv.slice(2).find((a) => a.startsWith('--mutant'));
const mutantName = mutantArg ? (mutantArg.includes('=') ? mutantArg.split('=')[1] : 'pair') : null;
if (!htmlPath) {
  sayErr('CONTROL FAILED - usage: node at8-fixed-index-slots.js <html> [--mutant[=pair|letter]]');
  process.exit(2);
}
if (mutantName !== null && mutantName !== 'pair' && mutantName !== 'letter') {
  sayErr(`CONTROL FAILED - unknown mutant ${JSON.stringify(mutantName)}; expected "pair" or "letter"`);
  process.exit(2);
}
const mutantMode = mutantName !== null;

/* ---- the pre-amendment pair shuffle, restored as the negative control --------------------
   Each anchor must match EXACTLY ONCE. A mutation that never applied has to abort, not report a
   green. Counting is ordinal, and no comparison here is substring-naive. */
const PAIR_MUTATION = [
  ['const texts = shuffle([q.option_a, q.option_b, q.option_c, q.option_d]);',
    'const texts = shuffle([{ t: q.option_a, k: "A" }, { t: q.option_b, k: "B" }, { t: q.option_c, k: "C" }, { t: q.option_d, k: "D" }]);'],
  ['texts.forEach((t, i) => {', 'texts.forEach((opt, i) => {'],
  ['key.textContent = OPTION_SLOTS[i];', 'key.textContent = opt.k;'],
  ['text.textContent = t;', 'text.textContent = opt.t;'],
  ['b.onclick = () => pickAnswer(b, t, q);', 'b.onclick = () => pickAnswer(b, opt.t, q);']
];

/* ---- letter-scoring, restored as the second negative control ----------------------------
   One inverse, on the handler itself: the card reports its slot letter where it used to report
   its option text. R10/S19 says correctness follows the text, so the click on the answer's own
   card must award nothing here. The pair shuffle above cannot catch this - it still scores by
   text - which is why the click path, and not pickAnswer, is what this check drives. */
const LETTER_MUTATION = [
  ['b.onclick = () => pickAnswer(b, t, q);', 'b.onclick = () => pickAnswer(b, OPTION_SLOTS[i], q);']
];

const MUTATIONS = { pair: PAIR_MUTATION, letter: LETTER_MUTATION };

function countOrdinal(hay, needle) {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
  return n;
}

function applyMutation(src, name) {
  let out = src;
  for (const [anchor, replacement] of MUTATIONS[name]) {
    const n = countOrdinal(out, anchor);
    if (n !== 1) {
      sayErr(`CONTROL FAILED - ${name} mutation anchor matched ${n} times, exactly 1 required: ${JSON.stringify(anchor)}`);
      process.exit(2);
    }
    out = out.split(anchor).join(replacement);
  }
  if (out === src) { sayErr(`CONTROL FAILED - the ${name} mutation changed nothing`); process.exit(2); }
  return out;
}

/* ---- extraction. AT-1 proved node --check can pass on an empty string, so the markers are
   checked before anything is asserted: a wrong extraction must abort, not pass. */
const original = fs.readFileSync(htmlPath, 'utf8');
const blocks = [...original.matchAll(/<script(?![^>]*\bsrc=)[^>]*>(.*?)<\/script>/gs)];
if (blocks.length === 0) { sayErr('CONTROL FAILED - no inline <script> block found'); process.exit(2); }
const base = blocks.map((b) => b[1]).join('\n');
for (const m of ['TIMER_SECONDS', 'WIN_POINTS', 'shuffle', 'renderQuestion', 'OPTION_SLOTS']) {
  if (!base.includes(m)) { sayErr(`CONTROL FAILED - extracted script lacks ${m}; extraction is wrong, not the code`); process.exit(2); }
}

const html = mutantMode ? applyMutation(original, mutantName) : original;
const script = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>(.*?)<\/script>/gs)].map((b) => b[1]).join('\n');

/* The epilogue lives inside the same scope because a top-level const in a vm script does not
   land on the sandbox object. It re-exports the real renderQuestion and pickAnswer rather than
   reimplementing them: the check must observe what the page does, not a copy of it. */
const js = script + `
;function __at8Slots() {
  return [...$("q-opts").children].map((b) => ({
    tag: b.children[0] ? b.children[0].textContent : null,
    text: b.children[1] ? b.children[1].textContent : null
  }));
}
;globalThis.__at8 = {
  beginMatch: (a, b) => { $("name1").value = a; $("name2").value = b; beginMatch(); },
  render: (q) => { renderQuestion(q); return __at8Slots(); },
  /* The click path. It resolves the recorded card and calls the handler the page itself
     assigned, so what is scored is the wiring under test and not an argument this harness
     chose. A card with no handler is reported rather than thrown, so the run fails on an
     assertion instead of dying on an uncaught error. */
  click: (i) => {
    const cards = [...$("q-opts").children];
    const card = cards[i];
    if (!card) return { ok: false, why: "no card at slot " + i };
    if (typeof card.onclick !== "function") return { ok: false, why: "the card at slot " + i + " carries no onclick handler" };
    return { ok: true, run: () => card.onclick() };
  },
  flagged: () => [...$("q-opts").children].map((b) => (b.classes || []).slice().join(",")),
  points: () => players[turn].points,
  settle: () => { clearTimeout(timerId); clearInterval(tickId); }
};`;

/* ---- the recording element stub, as in AT-7's harness, with three additions this check
   needs: a parent link, a classList that records what was added, and a querySelector that
   resolves span:last-child so finishQuestion can actually find the answer to reveal. The
   onclick handler needs none of those: assigning to it lands on the target as a plain own
   property, and the proxy's get trap hands it back, so card.onclick is the page's own
   function and not a stand-in. */
function recordingElement() {
  const el = function () {};
  el.style = { props: {}, setProperty(k, v) { this.props[k] = String(v); } };
  el.classes = [];
  el.classList = {
    add(k) { el.classes.push(k); if (!el.className.split(/\s+/).includes(k)) el.className = (el.className + ' ' + k).trim(); },
    remove(k) { el.classes = el.classes.filter((x) => x !== k); },
    toggle() {}, contains(k) { return el.classes.includes(k); }
  };
  el.children = [];
  el.parent = null;
  el.dataset = {};
  el.className = '';
  el.innerHTML = '';
  /* Assigning textContent is how the page clears a container before refilling it, so the setter
     has to empty children the way the real DOM does or every render stacks onto the last. */
  let own = '';
  Object.defineProperty(el, 'textContent', {
    get() { return own; },
    set(v) { own = String(v); if (own === '') el.children.length = 0; }
  });
  el.value = '';
  el.disabled = false;
  el.hidden = false;
  el.offsetWidth = 100;
  el.addEventListener = function () {};
  el.removeEventListener = function () {};
  el.setAttribute = function () {};
  el.getAttribute = function () { return null; };
  el.querySelector = function (sel) {
    if (sel === 'span:last-child' && el.children.length) return el.children[el.children.length - 1];
    return recordingElement();
  };
  el.querySelectorAll = function () { return []; };
  el.contains = function () { return false; };
  el.appendChild = function (c) { c.parent = el; el.children.push(c); return c; };
  el.append = function (...cs) { cs.forEach((c) => { c.parent = el; el.children.push(c); }); };
  const proxy = new Proxy(el, {
    get(t, p) {
      if (p in t) return t[p];
      if (typeof p === 'symbol') return undefined;
      return function () { return proxy; };
    }
  });
  return proxy;
}

const BY_ID = new Map();
function makeDocument() {
  return {
    getElementById: (id) => {
      if (!BY_ID.has(id)) BY_ID.set(id, recordingElement());
      return BY_ID.get(id);
    },
    querySelector: () => recordingElement(),
    querySelectorAll: () => [],
    createElement: () => recordingElement(),
    addEventListener: function () {},
    body: recordingElement(),
    documentElement: recordingElement()
  };
}

/* A seeded Math.random, so the permutation this run observes is the one every future run
   observes. mulberry32 rather than a plain LCG: an LCG's low bits repeat within a few draws,
   which made three consecutive renders produce the same permutation and left the controls
   below with nothing to compare. The controls still assert what they need rather than trusting
   the generator. */
function seededMath(seed) {
  const m = Object.create(Math);
  let s = seed >>> 0;
  m.random = function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /* Discard the first draws: mulberry32's opening values left the very first shuffle the
     identity, which the non-identity control correctly refused. The control is what guarantees
     the permutation is real; this only keeps the guarantee from being an accident of the seed. */
  for (let i = 0; i < 7; i++) m.random();
  return m;
}

function boot() {
  const sandbox = {
    console, document: makeDocument(), Math: seededMath(20260930),
    setTimeout, clearTimeout, setInterval, clearInterval, setImmediate,
    performance: { now: () => 0 },
    fetch: () => Promise.reject(new Error('AT-8 needs no API'))
  };
  vm.createContext(sandbox);
  try { vm.runInContext(js, sandbox, { filename: 'preguntados-inline.js' }); }
  catch (e) { sayErr('CONTROL FAILED - the extracted script did not run: ' + e.message); process.exit(2); }
  return sandbox;
}

/* Two questions with four distinct option texts each, and a stored answer that is NOT the first
   option, so a check that only ever looked at slot A would be caught. */
const Q1 = {
  id: 1, category: 'arte', question: 'Pintor de La Gioconda',
  option_a: 'Miguel Angel', option_b: 'Rafael', option_c: 'Leonardo da Vinci', option_d: 'Caravaggio',
  answer: 'Leonardo da Vinci'
};
const Q2 = {
  id: 2, category: 'ciencia', question: 'Unidad de fuerza',
  option_a: 'Joule', option_b: 'Pascal', option_c: 'Watt', option_d: 'Newton',
  answer: 'Newton'
};
const Q3 = {
  id: 3, category: 'deportes', question: 'Tenis: numero de jugadores por equipo',
  option_a: 'Uno', option_b: 'Dos', option_c: 'Tres', option_d: 'Cuatro',
  answer: 'Dos'
};
const WANT = ['A', 'B', 'C', 'D'];

let bad = 0;
const fail = (layer, detail) => { bad++; say(`  [FAIL] ${layer}: ${detail}`); };

say(`AT-8 fixed index slots  file=${htmlPath}  mode=${mutantMode ? 'MUTANT (' + mutantName + ')' : 'positive'}`);

const api = boot().__at8;
if (!api) { sayErr('CONTROL FAILED - the epilogue did not export'); process.exit(2); }
api.beginMatch('Ana', 'Beto');

const first = api.render(Q1);
const second = api.render(Q2);
api.settle();

/* CONTROL 1: four cards were found, before any letter is asserted. A check that enumerates
   nothing passes by enumerating nothing. */
say(`  CONTROL: cards q1=${first.length} q2=${second.length} (exactly 4 required)`);
if (first.length !== 4 || second.length !== 4) fail('control', `expected 4 rendered cards, saw ${first.length} and ${second.length}`);

/* CONTROL 2: the seed must actually permute. Without this, an implementation that stopped
   shuffling would read A,B,C,D twice and pass. */
const stored1 = [Q1.option_a, Q1.option_b, Q1.option_c, Q1.option_d];
const orderChanged = first.map((c) => c.text).join('|') !== stored1.join('|');
say(`  CONTROL: seeded shuffle permuted the texts = ${orderChanged}`);
if (!orderChanged) fail('control', 'the seeded permutation is the identity, so nothing was shuffled');

/* CONTROL 3: the two questions' option texts are not identical, so reading A,B,C,D twice means
   the tags are fixed slots rather than an accident of two equal questions. */
const textsDiffer = JSON.stringify(first.map((c) => c.text)) !== JSON.stringify(second.map((c) => c.text));
say(`  CONTROL: q1 and q2 option texts differ = ${textsDiffer}`);
if (!textsDiffer) fail('control', 'both questions rendered the same four texts, so a fixed tag set proves nothing');

/* LAYER 1: the tags. Exactly A,B,C,D, one each, in document order, on BOTH questions. */
[['q1', first], ['q2', second]].forEach(([which, reading]) => {
  const got = reading.map((c) => c.tag);
  const ok = got.length === WANT.length && got.every((t, i) => t === WANT[i]);
  if (!ok) fail(`Layer 1 ${which}`, `tags read [${got.join(', ')}], expected [A, B, C, D] in document order`);
});

/* LAYER 2: the four texts are that question's four options, each exactly once. A tag set of
   A,B,C,D over a duplicated or dropped option would still read correctly. */
[[Q1, 'q1', first], [Q2, 'q2', second]].forEach(([q, which, reading]) => {
  const want = [q.option_a, q.option_b, q.option_c, q.option_d].slice().sort();
  const got = reading.map((c) => c.text).slice().sort();
  const ok = got.length === 4 && got.every((t, i) => t === want[i]);
  if (!ok) fail(`Layer 2 ${which}`, `rendered texts [${got.join(' | ')}] are not the question's four options`);
});

/* CONTROL 4, then LAYER 3: the same question is rendered three times and the stored answer's own
   card is CLICKED each time, wherever the text landed. Correctness that followed the slot instead of
   the text would award or withhold points according to the position, and the three renders
   disagree on that position. The control requires the answer to have visited at least two
   different slots, so a build that was accidentally right for one slot cannot pass. */
const renders = [];
const answerSlots = [];
for (let i = 0; i < 3; i++) {
  /* Render and click in the same step. The grid is refilled on every render, so a click made
     against a stored earlier reading would land on a different question's cards. */
  const r = api.render(Q1);
  api.settle();
  renders.push(r);
  const slot = r.findIndex((c) => c.text === Q1.answer);
  answerSlots.push(slot);
  if (slot < 0) { fail(`Layer 3 render ${i + 1}`, 'the stored answer was not among the rendered options'); continue; }
  const before = api.points();
  const click = api.click(slot);
  if (!click.ok) { fail(`Layer 3 render ${i + 1}`, click.why); continue; }
  click.run();
  const after = api.points();
  const flagged = api.flagged();
  const scored = after - before === 1;
  const revealed = flagged.some((f) => f.includes('right'));
  const notWrong = !flagged[slot].includes('wrong');
  /* The summary line is printed only when the three assertions above hold. A check whose own
     output says "+1 point" on a run it just failed is worse than one that prints nothing. */
  const ok3 = scored && revealed && notWrong;
  if (!scored) fail(`Layer 3 render ${i + 1}`, `clicking the card carrying the stored answer from slot ${slot} awarded ${after - before} points, 1 required`);
  if (!revealed) fail(`Layer 3 render ${i + 1}`, 'no card was revealed as the correct one');
  if (!notWrong) fail(`Layer 3 render ${i + 1}`, `the clicked card was marked wrong: ${JSON.stringify(flagged[slot])}`);
  if (ok3) say(`  Layer 3 render ${i + 1}  clicked the answer's card in slot ${slot} -> +1 point, that card revealed right`);
}
say(`  CONTROL: the stored answer "${Q1.answer}" occupied slots [${answerSlots.join(', ')}] over three renders of the same question`);
if (new Set(answerSlots).size < 2) fail('control', 'the stored answer only ever landed in one slot, so text and slot cannot be told apart');

/* LAYER 4: a different text awards nothing, on a question whose answer is neither the first nor
   the last option. Guards the same requirement from the other side, so a build that awarded a
   point for any click could not satisfy Layer 3 alone. The wrong card is CLICKED as well, and
   the reveal is read the same way. */
const fourth = api.render(Q3);
api.settle();
const before4 = api.points();
const wrongSlot = fourth.findIndex((c) => c.text !== Q3.answer);
if (wrongSlot < 0) fail('Layer 4', 'no wrong option was rendered');
else {
  const click4 = api.click(wrongSlot);
  if (!click4.ok) fail('Layer 4', click4.why);
  else {
    click4.run();
    const after4 = api.points();
    const flagged4 = api.flagged();
    const noPoint = after4 === before4;
    const markedWrong = flagged4[wrongSlot].includes('wrong');
    const answerShown = flagged4.some((f) => f.includes('right'));
    if (!noPoint) fail('Layer 4', `clicking a wrong text awarded ${after4 - before4} points, 0 required`);
    if (!markedWrong) fail('Layer 4', `the clicked wrong card was not marked wrong: ${JSON.stringify(flagged4[wrongSlot])}`);
    if (!answerShown) fail('Layer 4', 'the correct card was not revealed after a wrong click');
    if (noPoint && markedWrong && answerShown) {
      say(`  Layer 4  clicked the wrong card in slot ${wrongSlot} -> 0 points, that card wrong and the answer revealed right`);
    }
  }
}
api.settle();

say(`  RESULT: ${bad === 0 ? 'fixed slots, texts intact, correctness decided by the clicked card\'s text - PASS' : 'ASSERTION FAILED'}`);
say(`  process exitCode = ${bad === 0 ? 0 : 1}`);
process.exitCode = bad === 0 ? 0 : 1;
