/* AT-9 - sector labels stay upright in the page frame. The machine form of test-plan.md SM-22.
   Usage:  node at9-upright-sector-labels.js <frontend\index.html> [categories.json] [--mutant]
   Exit 0 when every label's composed rotation, from its own transform and every ancestor's up to
   documentElement, is 0 degrees modulo 360 - at rest, after a real spin, and at a deliberately
   non-integral rotation - and every label is still inside its own sector's page-frame arc.
   Exit 1 on an assertion failure. Exit 2 when a control fails and the run cannot be trusted.

   The chain is read from the written markup and the rotation of every element on it is read from
   the written stylesheet and ADDED into each label's composed rotation, so a transform introduced
   above the wheel fails Layer 1 instead of dropping silently out of the reading. The printed
   chain is the arithmetic that was summed, not a claim about it.

   --mutant drops the wheel counter-rotation from the .seg-label rule in memory and reruns the
   same assertions. It exists to prove the assertions are not vacuous: the mutant must come out RED.

   No framework, no dependency, no test file, no server, no database, and no pixels. Whether the
   glyph is mirrored, inverted, or clipped is a rendered image and stays with MT-12. */
const fs = require('node:fs');
const vm = require('node:vm');

/* Written synchronously on purpose: process.exit() truncates buffered stdout on a pipe, which
   prints nothing at all and reads as a silent pass. */
const say = (...a) => fs.writeSync(1, a.join(' ') + '\n');
const sayErr = (...a) => fs.writeSync(2, a.join(' ') + '\n');

const htmlPath = process.argv[2];
const mutantMode = process.argv.includes('--mutant');
/* The categories argument is optional on purpose. Given, it is the API payload; omitted, fetch
   is made to reject and the page's own fallback list is what runs, which keeps the check
   self-contained - a fresh clone can reproduce it with no fixture file. */
const jsonArg = process.argv.slice(3).find((a) => a !== '--mutant');
if (!htmlPath) {
  sayErr('CONTROL FAILED - usage: node at9-upright-sector-labels.js <html> [categories.json] [--mutant]');
  process.exit(2);
}

const FRACTIONAL_DEG = 37.5;
const TOL = 0.5;

/* ---- the negative control: drop the wheel counter-rotation from the .seg-label rule --------
   The anchor must match EXACTLY ONCE. A mutation that never applied has to abort, not report a
   green. Counting is ordinal and nothing here compares by substring alone. */
const ANCHOR = 'rotate(calc(-1 * var(--wheel-rot)))';
const REPLACEMENT = '';

function countOrdinal(hay, needle) {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
  return n;
}

function applyMutation(src) {
  const n = countOrdinal(src, ANCHOR);
  if (n !== 1) {
    sayErr(`CONTROL FAILED - mutation anchor matched ${n} times, exactly 1 required: ${JSON.stringify(ANCHOR)}`);
    process.exit(2);
  }
  const out = src.split(ANCHOR).join(REPLACEMENT);
  if (out === src) { sayErr('CONTROL FAILED - the mutation changed nothing'); process.exit(2); }
  return out;
}

/* ---- extraction. AT-1 proved node --check can pass on an empty string, so markers are checked
   before anything is asserted: a wrong extraction must abort, not pass. */
const original = fs.readFileSync(htmlPath, 'utf8');
const blocks = [...original.matchAll(/<script(?![^>]*\bsrc=)[^>]*>(.*?)<\/script>/gs)];
if (blocks.length === 0) { sayErr('CONTROL FAILED - no inline <script> block found'); process.exit(2); }
const base = blocks.map((b) => b[1]).join('\n');
for (const m of ['TIMER_SECONDS', 'WIN_POINTS', 'categories', 'buildWheel', 'spinWheel']) {
  if (!base.includes(m)) { sayErr(`CONTROL FAILED - extracted script lacks ${m}; extraction is wrong, not the code`); process.exit(2); }
}

const html = mutantMode ? applyMutation(original) : original;
const script = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>(.*?)<\/script>/gs)].map((b) => b[1]).join('\n');

/* The epilogue is part of the script text and re-exports from inside the same scope, because a
   top-level let in a vm script does not land on the sandbox object. The spin is driven through the
   page's own spinWheel, so the rotation this check reads is the one the page wrote. */
const js = script + `
;globalThis.__at9 = {
  getCategories: () => categories,
  beginMatch: (a, b) => { $("name1").value = a; $("name2").value = b; beginMatch(); },
  spin: () => spinWheel()
};`;

/* ---- the stylesheet, read as written. SM-22 composes from the element's own transform and
   every ancestor's, so the harness needs the rules themselves rather than a copy of the maths. */
const styleRaw = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
if (!styleRaw) { sayErr('CONTROL FAILED - no <style> block found'); process.exit(2); }
/* Comments are stripped before the rules are read. A comment sits in the same buffer as the
   selector that follows it, so leaving them in would turn ".wheel" into "some prose .wheel" and
   the rule would go unread. */
const styleBlocks = styleRaw.replace(/\/\*[\s\S]*?\*\//g, ' ');
if (!styleBlocks.includes('.seg-label')) { sayErr('CONTROL FAILED - the stylesheet declares no .seg-label rule'); process.exit(2); }

/* A regex over "selector { body }" cannot survive a nested @media block, so the rules are read
   with a brace-depth walk. A nested rule is listed under its own selector, which is what a
   responsive override of .seg-label or .wheel should look like to this check. */
function parseRules(css) {
  const rules = [];
  let buf = '', i = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '{') {
      let depth = 1, j = i + 1;
      while (j < css.length && depth > 0) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
        j++;
      }
      rules.push({ selector: buf.trim(), body: css.slice(i + 1, j - 1) });
      buf = '';
      i = j;
      continue;
    }
    if (c === '}') { buf = ''; i++; continue; }
    buf += c;
    i++;
  }
  return rules;
}

const RULES = parseRules(styleBlocks);

function ruleFor(selector) {
  const hit = RULES.find((r) => r.selector === selector);
  return hit ? hit.body : null;
}

function declaration(rule, property) {
  if (rule === null) return null;
  const m = rule.match(new RegExp('(?:^|;)\\s*' + property + '\\s*:\\s*([^;]+)'));
  return m ? m[1].trim() : null;
}

const segRule = ruleFor('.seg-label');
const wheelRule = ruleFor('.wheel');
const labelTransform = declaration(segRule, 'transform');
const wheelTransform = declaration(wheelRule, 'transform');
if (!labelTransform) { sayErr('CONTROL FAILED - the .seg-label rule declares no transform'); process.exit(2); }
if (!wheelTransform) { sayErr('CONTROL FAILED - the .wheel rule declares no transform'); process.exit(2); }

/* The registered property is what makes the counter-rotation track the spin: an unregistered
   custom property does not transition, so the labels would lag a frame behind the wheel. */
const propertyBlock = styleBlocks.match(/@property\s+--wheel-rot\s*\{([^{}]*)\}/);
if (!propertyBlock) { sayErr('CONTROL FAILED - @property --wheel-rot is not registered'); process.exit(2); }
const propBody = propertyBlock[1];
if (!/inherits\s*:\s*true/.test(propBody)) { sayErr('CONTROL FAILED - @property --wheel-rot does not declare inherits: true'); process.exit(2); }
if (!/syntax\s*:\s*["']<angle>["']/.test(propBody)) { sayErr('CONTROL FAILED - @property --wheel-rot does not declare syntax: "<angle>"'); process.exit(2); }
if (!/initial-value\s*:/.test(propBody)) { sayErr('CONTROL FAILED - @property --wheel-rot declares no initial-value'); process.exit(2); }

/* ---- transform algebra, reproduced from the written declaration ----------------------------
   Terms are split at top level, each rotate() is evaluated with the two custom properties
   substituted, and orientation is the plain sum of those angles. Translations contribute no
   angle. The placement angle is the rotation immediately preceding the radial translate(0, L),
   which is what puts the label at its sector's angle. */
function splitTerms(decl) {
  const terms = [];
  let depth = 0, start = 0;
  for (let i = 0; i < decl.length; i++) {
    const c = decl[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && /\s/.test(c)) {
      const t = decl.slice(start, i).trim();
      if (t) terms.push(t);
      start = i + 1;
    }
  }
  const tail = decl.slice(start).trim();
  if (tail) terms.push(tail);
  return terms;
}

function stripCalc(expr) {
  let out = expr;
  for (let guard = 0; guard < 32 && out.includes('calc('); guard++) {
    const i = out.indexOf('calc(');
    let depth = 0, j = i + 5;
    for (; j < out.length; j++) {
      if (out[j] === '(') depth++;
      else if (out[j] === ')') { if (depth === 0) break; depth--; }
    }
    if (j >= out.length) break;
    out = out.slice(0, i) + out.slice(i + 5, j) + out.slice(j + 1);
  }
  return out;
}

function angle(expr, A, W) {
  const substituted = stripCalc(expr)
    .replace(/var\(\s*--a\s*\)/g, String(A))
    .replace(/var\(\s*--wheel-rot\s*\)/g, String(W))
    .replace(/deg\b/gi, '')
    .trim();
  if (!/^[-+*/(). 0-9]+$/.test(substituted)) {
    throw new Error(`AT-9 CONTROL: cannot evaluate the angle expression ${JSON.stringify(expr)} -> ${JSON.stringify(substituted)}`);
  }
  try {
    return vm.runInNewContext('(' + substituted + ')', { A, W });
  } catch (e) {
    throw new Error(`AT-9 CONTROL: angle expression ${JSON.stringify(expr)} became ${JSON.stringify(substituted)}: ${e.message}`);
  }
}

/* Returns the label's own orientation contribution and the angle it is placed at. */
function labelGeometry(decl, A, W) {
  const terms = splitTerms(decl);
  const rotations = [];
  terms.forEach((t, i) => {
    if (/^rotate\(/i.test(t)) rotations.push({ index: i, value: angle(t.slice(7, -1), A, W) });
  });
  if (!rotations.length) throw new Error('AT-9 CONTROL: the .seg-label transform declares no rotate() term');
  const net = rotations.reduce((sum, r) => sum + r.value, 0);
  const radialIndex = terms.findIndex((t) => /^translate\(\s*0(px)?\s*,/i.test(t));
  if (radialIndex < 0) throw new Error('AT-9 CONTROL: the .seg-label transform has no radial translate(0, L)');
  const preceding = rotations.filter((r) => r.index < radialIndex).pop();
  if (!preceding) throw new Error('AT-9 CONTROL: no rotate() precedes the radial translate, so the placement angle is unreadable');
  return { net, placement: preceding.value };
}

function wheelOwnRotation(W) {
  const terms = splitTerms(wheelTransform);
  let sum = 0;
  terms.forEach((t) => { if (/^rotate\(/i.test(t)) sum += angle(t.slice(7, -1), 0, W); });
  return sum;
}

/* ---- the ancestor chain, read from the written markup --------------------------------------
   A label is a child of #wheel, so the elements whose rotation reaches it without passing
   through the wheel's own transform are the chain ABOVE #wheel, up to and including the
   documentElement. The walk is over the markup, not over the recording stub: the stub's
   getElementById answers with a fresh element whose parent is null, so a walk of it would
   return an empty chain and look clean. */
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function attributeValue(attrs, name) {
  const m = new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s"\'>]+))', 'i').exec(attrs);
  if (!m) return null;
  return m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3]);
}

function elementFor(tag, attrs) {
  const cls = attributeValue(attrs, 'class');
  return { tag, id: attributeValue(attrs, 'id'), classes: cls ? cls.split(/\s+/).filter(Boolean) : [] };
}

function describeElement(el) {
  const parts = [el.tag];
  if (el.id) parts.push('#' + el.id);
  el.classes.forEach((c) => parts.push('.' + c));
  return parts.join('');
}

function ancestorsOf(id) {
  const bodyMatch = /<body([^>]*)>([\s\S]*)<\/body>/i.exec(html);
  const htmlMatch = /<html([^>]*)>/i.exec(html);
  if (!bodyMatch) { sayErr('CONTROL FAILED - the document has no <body>, so the ancestor walk cannot run'); process.exit(2); }
  /* Script and comment bodies hold text that looks like markup, and a tag found inside either
     would put a phantom element on the chain. */
  const markup = bodyMatch[2].replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  /* The walk covers the body's CONTENTS, so body itself has to be seeded onto the stack or the
     chain stops one element short of it. */
  const stack = [elementFor('body', bodyMatch[1] || '')];
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/g;
  let m;
  while ((m = tagRe.exec(markup))) {
    const tag = m[2].toLowerCase();
    if (m[1] === '/') {
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    const el = elementFor(tag, m[3] || '');
    if (el.id === id) {
      const chain = stack.slice();
      if (htmlMatch) chain.unshift(elementFor('html', htmlMatch[1] || ''));
      return chain;
    }
    if (!VOID_TAGS.has(tag) && m[4] !== '/') stack.push(el);
  }
  return null;
}

const ANCESTORS = ancestorsOf('wheel');
if (!ANCESTORS) { sayErr('CONTROL FAILED - #wheel is not in the written markup, so the ancestor walk cannot run'); process.exit(2); }
if (ANCESTORS.length < 2 || ANCESTORS[0].tag !== 'html') {
  sayErr(`CONTROL FAILED - the ancestor walk read ${ANCESTORS.length} element(s) and did not reach the documentElement`);
  process.exit(2);
}

/* ---- which rules can reach an element on that chain ---------------------------------------
   Conservative by construction, because the failure being guarded is a transform quietly
   dropping OUT of the reading. A rule's rightmost compound decides; a pseudo-element is skipped,
   because its box is a child of the element and never a wrapper of the element's own children,
   so it cannot rotate a label; a pseudo-class, a combinator, or an attribute gate makes the rule
   "can apply" rather than "cannot", because a rotate behind :hover is still a rotate.

   A class the page's own script puts on an ELEMENT THAT ALREADY EXISTS counts as satisfied even
   when the markup does not carry it, which is what makes `.panel.active` - and the animation it
   starts - part of the reading. Only classList transitions qualify: a `className =` assignment
   creates a NEW element as some element's child and so cannot put a class on the chain's own
   elements, while `classList.toggle` over the panels genuinely can. The set is scanned out of the
   extracted script, not typed in. */
const STATE_CLASSES = new Set();
for (const m of script.matchAll(/classList\.(?:add|remove|toggle)\(\s*[`'"]([A-Za-z][\w-]*)[`'"]/g)) STATE_CLASSES.add(m[1]);

function rightmostCompound(selector) {
  return selector.trim().split(/\s+|[>+~]/).filter(Boolean).pop() || '';
}

function compoundApplies(compound, el) {
  if (compound.includes('::')) return 'skip';
  const bare = compound.replace(/::?[A-Za-z-]+(\([^)]*\))?/g, '');
  const tokens = bare.match(/[*.#]?[A-Za-z0-9_-]+|\[[^\]]*\]/g);
  if (!tokens) return bare.length === compound.length ? 'no' : 'yes';
  for (const t of tokens) {
    if (t === '*') continue;
    if (t[0] === '#') { if (el.id !== t.slice(1)) return 'no'; continue; }
    if (t[0] === '.') {
      if (el.classes.includes(t.slice(1))) continue;
      if (STATE_CLASSES.has(t.slice(1))) continue;
      return 'no';
    }
    /* An attribute gate and a bare pseudo-class cannot be decided here, so the rule is let in.
       The cost is a false alarm on a rotate that is never active; the benefit is that no rotate
       can hide behind a selector this matcher does not fully understand. */
    if (t[0] === '[' || t[0] === ':') return 'yes';
    if (el.tag !== t.toLowerCase()) return 'no';
  }
  return 'yes';
}

function rulesFor(el) {
  const hits = [];
  for (const rule of RULES) {
    if (rule.selector.startsWith('@')) continue;
    let applies = false;
    for (const part of rule.selector.split(',')) {
      const verdict = compoundApplies(rightmostCompound(part), el);
      if (verdict === 'skip') { applies = false; break; }
      if (verdict === 'yes') { applies = true; break; }
    }
    if (applies) hits.push(rule);
  }
  return hits;
}

/* ---- the angle a declaration list contributes ----------------------------------------------
   Only rotate() terms count, at any depth: a translate, a scale and a brightness move or resize
   without turning the glyph, so they contribute 0 and saying so is more useful than refusing to
   answer. Anything this cannot read exactly - a matrix, a 3D rotate, a skew, or a reference to
   one of the two dynamic properties the check reads elsewhere - aborts rather than being counted
   as zero. */
const UNREADABLE_ANGLE = /\b(matrix3d|matrix|rotate3d|skew[XY]?)\s*\(/i;

function splitDeclarations(bodyText) {
  return bodyText.split(';').map((s) => s.trim()).filter(Boolean).map((s) => {
    const i = s.indexOf(':');
    return { property: s.slice(0, i).trim().toLowerCase(), value: s.slice(i + 1).trim() };
  }).filter((d) => d.property);
}

function rotateSum(value, where) {
  if (UNREADABLE_ANGLE.test(value) || /var\(\s*--(a|wheel-rot)\s*\)/.test(value)) {
    sayErr(`CONTROL FAILED - ${where} declares a rotation this check cannot read exactly: ${JSON.stringify(value)}`);
    process.exit(2);
  }
  let total = 0;
  const re = /rotate\(/gi;
  let m;
  while ((m = re.exec(value))) {
    /* depth starts at 1 because the match already consumed the opening paren of rotate(. */
    let depth = 1, j = m.index + m[0].length;
    for (; j < value.length; j++) {
      if (value[j] === '(') depth++;
      else if (value[j] === ')') { depth--; if (depth === 0) break; }
    }
    if (j >= value.length) { sayErr(`CONTROL FAILED - ${where} has an unbalanced rotate( in ${JSON.stringify(value)}`); process.exit(2); }
    total += angle(value.slice(m.index + m[0].length, j), 0, 0);
    re.lastIndex = j + 1;
  }
  return total;
}

/* The chain reading rests entirely on rotateSum, so the function is pinned against values the
   file itself supplies: an angle it must read, an angle it must refuse to invent, and a sum of
   two. The first version of this function started its paren depth at 0 while the match had
   already consumed the opening paren, so every rotate( read as unbalanced and the check aborted;
   these three cases are what make that class of defect impossible to reintroduce silently. */
for (const [expr, want] of [['rotate(90deg)', 90], ['scale(2)', 0], ['rotate(10deg) rotate(5deg)', 15], ['rotate(calc(-1 * 37.5deg))', -37.5]]) {
  const got = rotateSum(expr, 'the rotateSum self-check');
  if (Math.abs(got - want) > 1e-9) {
    sayErr(`CONTROL FAILED - rotateSum(${JSON.stringify(expr)}) returned ${got}, ${want} required`);
    process.exit(2);
  }
}

const ANGLE_PROPERTIES = new Set(['transform', 'translate', 'rotate', 'scale', 'filter', 'backdrop-filter', 'perspective', 'offset', 'offset-rotate']);

function declaredRotation(bodyText, where) {
  let total = 0;
  for (const d of splitDeclarations(bodyText)) {
    if (ANGLE_PROPERTIES.has(d.property)) total += rotateSum(d.value, where + ' ' + d.property);
  }
  return total;
}

const ANIMATION_KEYWORDS = new Set(['none', 'normal', 'forwards', 'backwards', 'both', 'infinite', 'alternate',
  'reverse', 'running', 'paused', 'ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end',
  'initial', 'inherit', 'unset', 'revert']);

/* @keyframes, read as rotations. Every stop in the list is SUMMED rather than sampled, because
   the question being answered is whether a rotate is reachable from above the wheel at all, and
   the answer is the same whether the list is sampled or summed - a single stop carrying a rotate
   fails this control either way. A keyframe transform of scale() contributes 0, which is why
   .panel.active's panelIn animation does not move a label off upright. The summed figure is
   therefore a reachability test and not a physical angle of any one instant. */
const KEYFRAME_ROTATION = {};
for (const rule of RULES) {
  const km = /^@keyframes\s+([\w-]+)$/.exec(rule.selector.trim());
  if (!km) continue;
  let total = 0;
  for (const step of parseRules(rule.body)) {
    if (!/^(from|to|\d+(\.\d+)?%)$/.test(step.selector)) continue;
    total += declaredRotation(step.body, `@keyframes ${km[1]} ${step.selector}`);
  }
  KEYFRAME_ROTATION[km[1]] = total;
}

function animationRotation(bodyText, where) {
  let total = 0;
  for (const d of splitDeclarations(bodyText)) {
    if (d.property !== 'animation' && d.property !== 'animation-name') continue;
    /* Function arguments carry spaces, so cubic-bezier(0.24, 0.9, ...) is folded away first and
       only whole tokens are left to classify. */
    const tokens = d.value.replace(/[A-Za-z-]+\([^()]*\)/g, ' ').trim().split(/\s+/).filter(Boolean);
    for (const tok of tokens) {
      if (ANIMATION_KEYWORDS.has(tok) || /^-?[\d.]+(m?s|%|fr)$/i.test(tok)) continue;
      if (Object.prototype.hasOwnProperty.call(KEYFRAME_ROTATION, tok)) { total += KEYFRAME_ROTATION[tok]; continue; }
      sayErr(`CONTROL FAILED - ${where} names an animation ${JSON.stringify(tok)} that is not a @keyframes block in this stylesheet`);
      process.exit(2);
    }
  }
  return total;
}

/* The reading: for each element above #wheel, the rotation its own rules and its animation
   contribute, summed. The total is ADDED to every label's composed rotation below, so a
   transform on .wheel-wrap, on #screen-wheel, on body or on html fails Layer 1 rather than
   vanishing from the arithmetic. */
const ANCESTOR_READINGS = ANCESTORS.map((el) => {
  const rules = rulesFor(el);
  let rotation = 0;
  const sources = [];
  for (const rule of rules) {
    const where = `${describeElement(el)} { ${rule.selector} }`;
    rotation += declaredRotation(rule.body, where);
    rotation += animationRotation(rule.body, where);
    sources.push(rule.selector);
  }
  return { el, rules: sources, rotation };
});
const ANCESTOR_TOTAL = ANCESTOR_READINGS.reduce((sum, r) => sum + r.rotation, 0);

/* Without this the walk could match nothing and report a clean 0, which is the exact shape of
   the vacuous reading it exists to replace. */
const ANCESTOR_RULES_MATCHED = ANCESTOR_READINGS.reduce((n, r) => n + r.rules.length, 0);
if (ANCESTOR_RULES_MATCHED < 1) {
  sayErr('CONTROL FAILED - no stylesheet rule reached any element on the ancestor chain, so the chain reading is vacuous');
  process.exit(2);
}

const mod360 = (d) => ((d % 360) + 360) % 360;
const spanOf = (n) => 360 / n;

/* ---- the recording element stub, as in AT-7's harness, with the parent link this check needs */
function recordingElement() {
  const el = function () {};
  /* The proxy is what callers hold, so parent links have to store the proxy and not the raw
     target, or a parent comparison against a getElementById result is always false. */
  let proxy = null;
  el.style = { props: {}, setProperty(k, v) { this.props[k] = String(v); } };
  el.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
  el.children = [];
  el.parent = null;
  el.dataset = {};
  el.className = '';
  el.textContent = '';
  el.innerHTML = '';
  el.value = '';
  el.disabled = false;
  el.hidden = false;
  el.offsetWidth = 100;
  el.addEventListener = function () {};
  el.removeEventListener = function () {};
  el.appendChild = function (c) { c.parent = proxy; el.children.push(c); return c; };
  el.append = function (...cs) { cs.forEach((c) => { c.parent = proxy; el.children.push(c); }); };
  el.setAttribute = function () {};
  el.getAttribute = function () { return null; };
  el.querySelector = function () { return recordingElement(); };
  el.querySelectorAll = function () { return []; };
  el.contains = function () { return false; };
  proxy = new Proxy(el, {
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
  for (let i = 0; i < 7; i++) m.random();
  return m;
}

/* init() populates categories through fetch().then().then().catch(), which settles across
   macrotasks; the spin is then driven through the real spinWheel so the rotation the check reads
   is the one the page wrote, not one the harness chose. A null payload makes fetch reject, so
   the page's own fallback list is what runs - that is the self-contained mode, and it is a mode
   the page really has rather than a list this harness supplies. */
function boot(payload) {
  return new Promise((resolve, reject) => {
    let fetchCalls = 0;
    const sandbox = {
      console, document: makeDocument(), Math: seededMath(20260930),
      setTimeout: () => 0, clearTimeout, setInterval: () => 0, clearInterval, setImmediate,
      performance: { now: () => 0 },
      fetch: () => {
        fetchCalls++;
        return payload === null
          ? Promise.reject(new Error('AT-9 drives the fallback path'))
          : Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
      }
    };
    vm.createContext(sandbox);
    try { vm.runInContext(js, sandbox, { filename: 'preguntados-inline.js' }); }
    catch (e) { reject(e); return; }
    setImmediate(() => setImmediate(() => resolve({ sandbox, wheel: BY_ID.get('wheel'), fetchCalls: () => fetchCalls })));
  });
}

let bad = 0;
const fail = (layer, detail) => { bad++; say(`  [FAIL] ${layer}: ${detail}`); };

(async () => {
  let payload = null;
  let categorySource = 'FALLBACK - fetch rejects and the page derives its own six categories';
  if (jsonArg) {
    if (!fs.existsSync(jsonArg)) { sayErr(`CONTROL FAILED - categories file not found: ${jsonArg}`); process.exit(2); }
    payload = JSON.parse(fs.readFileSync(jsonArg, 'utf8'));
    categorySource = 'API payload from ' + jsonArg;
  }
  say(`AT-9 upright sector labels  file=${htmlPath}  mode=${mutantMode ? 'MUTANT (wheel counter-rotation dropped)' : 'positive'}`);
  say(`  categories: ${categorySource}`);
  say(`  stylesheet: .seg-label transform = ${labelTransform}`);
  say(`  stylesheet: .wheel transform = ${wheelTransform}`);

  const { sandbox, wheel, fetchCalls } = await boot(payload);
  const api = sandbox.__at9;
  if (!api) { sayErr('CONTROL FAILED - the epilogue did not export'); process.exit(2); }
  const categories = api.getCategories();
  if (!Array.isArray(categories) || categories.length !== 6) {
    sayErr(`CONTROL FAILED - expected 6 categories after init, saw ${categories && categories.length}`);
    process.exit(2);
  }
  /* Six categories can only exist if init asked for them and the answer - real or fallback -
     arrived, so the fetch count is the control on which path actually ran. */
  say(`  CONTROL: /categories fetches = ${fetchCalls()} (1 required: the list is built from a response, never from this harness)`);
  if (fetchCalls() < 1) { sayErr('CONTROL FAILED - init never called fetch, so the six categories did not come from the page'); process.exit(2); }
  if (!wheel) { sayErr('CONTROL FAILED - #wheel was never created'); process.exit(2); }

  const labels = wheel.children.filter((e) => e.className === 'seg-label');
  const n = categories.length;

  /* CONTROL 1: six labels were found, and every one of them is a child of the wheel. The
     containment half of SM-22 is meaningless for a label the wheel does not carry. */
  say(`  CONTROL: labels found = ${labels.length} (exactly 6 required)`);
  if (labels.length !== 6) { sayErr('CONTROL FAILED - the wheel did not render six .seg-label children'); process.exit(2); }
  labels.forEach((l, i) => { if (l.parent !== wheel) fail('control', `label ${i} is not a child of #wheel`); });

  /* CONTROL 2, the chain the composition actually walks. Every element above #wheel, read from
     the markup, with the rotation its own rules and its animation contribute. The total is added
     into every label's composed rotation below, so a non-zero figure here is a Layer 1 failure
     and not a remark. The figures are computed from the written stylesheet; the rule lists are
     printed so the sum can be checked by hand. */
  say(`  CONTROL: ancestor chain above #wheel, ${ANCESTOR_READINGS.length} elements, each one's rotation added to the reading below (state classes read as satisfiable: ${[...STATE_CLASSES].sort().join(', ') || 'none'}):`);
  ANCESTOR_READINGS.forEach((r) => {
    say(`    ${describeElement(r.el).padEnd(30)} ${r.rotation.toFixed(6).padStart(12)}deg   from ${r.rules.length} rule(s): ${r.rules.join(' | ') || '(none)'}`);
  });
  say(`  CONTROL: unread rotation above #wheel = ${ANCESTOR_TOTAL.toFixed(6)}deg, and ${ANCESTOR_RULES_MATCHED} rules reached the chain`);

  const readings = [];

  function readMoment(label, W) {
    const rawA = label.style && label.style.props ? label.style.props['--a'] : undefined;
    if (rawA === undefined) throw new Error('AT-9 CONTROL: a label carries no recorded --a');
    const A = parseFloat(String(rawA));
    const own = labelGeometry(labelTransform, A, W);
    const wheelOwn = wheelOwnRotation(W);
    const composed = own.net + wheelOwn + ANCESTOR_TOTAL;
    return { A, ownNet: own.net, wheelOwn, ancestors: ANCESTOR_TOTAL, composed, placement: own.placement };
  }

  /* MOMENT 1: at rest, with the wheel's own rotation at its stylesheet default. */
  const atRest = wheelOwnRotation(parseFloat(declaration(wheelRule, '--wheel-rot') || '0'));
  if (Math.abs(atRest) > TOL) { sayErr(`CONTROL FAILED - the wheel is not at rest, it reads ${atRest}deg`); process.exit(2); }
  labels.forEach((l, i) => readings.push({ moment: 'at rest', i, ...readMoment(l, 0) }));

  /* MOMENT 2: after a real spin, through the page's own spinWheel, reading the rotation the
     page actually wrote. The transition string is not asserted here because this harness has no
     clock; SM-22 and MT-2 cover the animation, and what is asserted is the settled geometry. */
  api.beginMatch('Ana', 'Beto');
  api.spin();
  const written = String(wheel.style.transform || '');
  const propW = wheel.style.props ? wheel.style.props['--wheel-rot'] : undefined;
  if (typeof propW !== 'string') { sayErr('CONTROL FAILED - the spin wrote no --wheel-rot custom property'); process.exit(2); }
  const spunW = parseFloat(String(written).replace(/[^\d.+-]/g, ''));
  const propWNum = parseFloat(propW);
  if (Math.abs(spunW - propWNum) > 1e-6) {
    fail('control', `the spin wrote transform rotate(${spunW}deg) and --wheel-rot ${propWNum}deg, and those disagree`);
  }
  say(`  spin wrote: #wheel.style.transform = ${written}  and  --wheel-rot = ${propW}`);
  labels.forEach((l, i) => readings.push({ moment: 'post-spin', i, ...readMoment(l, spunW) }));

  /* CONTROL 2, the one SM-22 insists on: the wheel must actually have turned. A reading where
     the two moments agree means the tester forgot to rotate, and the counter-rotation could be
     any constant at all. */
  say(`  CONTROL: wheel rotation at rest = ${atRest}deg, after the spin = ${mod360(spunW)}deg, differ = ${Math.abs(mod360(spunW) - atRest) > TOL}`);
  if (!(Math.abs(mod360(spunW) - atRest) > TOL)) {
    fail('control', 'the wheel did not turn between the two moments, so this reading proves nothing');
  }

  /* MOMENT 3: a deliberately non-integral rotation, applied the way a real spin would leave it.
     A counter-rotation that rounded, snapped to whole turns, or matched only the accumulated
     whole-turn values a real spin produces cannot pass this. */
  wheel.style.transform = `rotate(${FRACTIONAL_DEG}deg)`;
  wheel.style.setProperty('--wheel-rot', `${FRACTIONAL_DEG}deg`);
  labels.forEach((l, i) => readings.push({ moment: 'non-integral', i, ...readMoment(l, FRACTIONAL_DEG) }));

  /* LAYER 1: composed rotation is upright in the page frame, 0 degrees modulo 360, for every
     label at every moment. */
  for (const r of readings) {
    const off = Math.min(mod360(r.composed), 360 - mod360(r.composed));
    if (off > TOL) {
      fail(`Layer 1 ${r.moment} label ${r.i}`, `composed rotation is ${r.composed}deg, ${off.toFixed(3)}deg off upright`);
    }
  }

  /* LAYER 2: containment. Both sides are taken in the PAGE frame, so both carry the wheel's
     rotation and the rotation the chain above #wheel contributes. A label's placement angle is
     local to the wheel, so it picks up the wheel's rotation; the sector it belongs to is painted
     in the wheel's local frame too, so its page-frame arc is the same local arc carried by the
     same rotation. The offset within the arc is therefore rotation-independent, which is the
     honest consequence of the label riding on the wheel, and adding the shared rotation to both
     sides is what keeps the printed page-frame angles true. What this half catches is a placement
     angle that is not derived from the label's own sector index. The other half - a label that
     kept its upright rotation by leaving the wheel entirely - is caught by CONTROL 1 above,
     which asserts every label is a child of #wheel. */
  for (const moment of ['at rest', 'post-spin', 'non-integral']) {
    const group = readings.filter((r) => r.moment === moment);
    for (const r of group) {
      const carried = r.wheelOwn + r.ancestors;
      const pagePlacement = mod360(r.placement + carried);
      const pageArcStart = mod360(r.i * spanOf(n) + carried);
      const offset = mod360(pagePlacement - pageArcStart);
      if (offset >= spanOf(n)) {
        fail(`Layer 2 ${moment} label ${r.i}`,
          `page-frame placement ${pagePlacement}deg sits ${offset.toFixed(3)}deg into its own arc [${pageArcStart}deg, ${pageArcStart + spanOf(n)}deg), which is ${spanOf(n)}deg wide`);
      }
    }
  }

  /* LAYER 3: the text is present, so an empty label cannot pass as upright. */
  labels.forEach((l, i) => {
    const m = /<span class="lb">([^<]*)<\/span>/.exec(String(l.innerHTML));
    const got = m ? m[1] : null;
    if (got !== categories[i].label) fail(`Layer 3 label ${i}`, `label reads ${JSON.stringify(got)}, categories[${i}].label is ${JSON.stringify(categories[i].label)}`);
  });

  for (const moment of ['at rest', 'post-spin', 'non-integral']) {
    const group = readings.filter((r) => r.moment === moment);
    const worst = group.reduce((m, r) => Math.max(m, Math.min(mod360(r.composed), 360 - mod360(r.composed))), 0);
    say(`  ${moment.padEnd(13)} composed rotation of six labels: max ${worst.toFixed(6)}deg off upright`);
  }
  say(`  RESULT: ${bad === 0 ? 'six labels upright at every moment and inside their own arcs - PASS' : 'ASSERTION FAILED'}`);
  say(`  process exitCode = ${bad === 0 ? 0 : 1}`);
  process.exitCode = bad === 0 ? 0 : 1;
})().catch((e) => { sayErr('CONTROL FAILED - ' + e.message); process.exit(2); });
