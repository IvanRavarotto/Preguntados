/* Pins the louder wheel-spin mix and the no-asset rule.
 *
 *   node openspec/changes/improve-wheel-audio/checks/check_wheel_mix.mjs [file]
 *
 * The default file is `frontend/index.html`. It reads the shipped synthesis constants
 * rather than a copy, so a later edit that quiets or clips the spin fails here.
 *
 * Exit codes: 0 = every assertion passed, 1 = an assertion failed, 2 = file missing.
 */
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2] || path.resolve("frontend/index.html");
let source;
try {
  source = fs.readFileSync(file, "utf8");
} catch (error) {
  console.error(`WHEEL_MIX_ERROR: cannot read ${file}: ${error.message}`);
  process.exit(2);
}

const failures = [];
const check = (name, ok, detail) => {
  if (!ok) failures.push(`${name}: ${detail}`);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
};

const constant = (name) => {
  const match = source.match(new RegExp(`const ${name} = ([0-9.]+);`));
  return match ? Number(match[1]) : NaN;
};

const bus = constant("SPIN_BUS_GAIN");
const whir = constant("SPIN_WHIR_GAIN");
const click = constant("SPIN_CLICK_GAIN");
const thunk = constant("SPIN_THUNK_GAIN");

check("the four mix constants exist", [bus, whir, click, thunk].every(Number.isFinite), JSON.stringify({ bus, whir, click, thunk }));
check("the spin bus is at least 0.5", bus >= 0.5, `bus ${bus}`);
check("the ratchet click is at least 0.2", click >= 0.2, `click ${click}`);
check("the whir is at least 0.1", whir >= 0.1, `whir ${whir}`);
check("the spin is louder than the 0.18 correct cue", bus * (whir + click) > 0.18, `peak ${bus * (whir + click)}`);
check("the mix stays below the 0.35 clipping ceiling", bus * (whir + click + thunk) < 0.35, `peak ${bus * (whir + click + thunk)}`);

check(
  "the whir has a peaking body filter",
  /const body = ctx\.createBiquadFilter\(\);[\s\S]{0,200}body\.type = "peaking"/.test(source),
  "no peaking filter on the whir path",
);
check(
  "the spin schedules a settle thunk",
  /const thunkAt = now \+ Math\.max\(0\.1, duration - 0\.18\);/.test(source) &&
    /thunk\.frequency\.exponentialRampToValueAtTime\(70, thunkAt \+ 0\.16\)/.test(source),
  "no low thunk near the settle",
);
check(
  "the mix is exposed through the audio state",
  /mix: \{[\s\S]{0,200}bus: SPIN_BUS_GAIN/.test(source),
  "window.__audio does not expose the mix",
);
check(
  "the document loads no audio asset",
  !/<audio[\s>]/i.test(source) &&
    !/new\s+Audio\s*\(/.test(source) &&
    !/\.(mp3|wav|ogg|oga|m4a|aac|flac|weba)\b/i.test(source) &&
    !/data:audio\//i.test(source),
  "found an audio element, URL, or data URI",
);

if (failures.length) {
  console.error(`WHEEL_MIX_FAIL ${failures.length} assertion(s) failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("WHEEL_MIX_PASS");
