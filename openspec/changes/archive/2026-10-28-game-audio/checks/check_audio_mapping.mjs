/* Asserts the DOM-free rate mapping is monotonic, finite and positive at five samples, and that
 * it covers the whole spin.
 *
 *   node openspec/changes/game-audio/checks/check_audio_mapping.mjs [html]
 *
 * Exit codes: 0 = pass, 1 = an assertion failed, 2 = the mapping block could not be read.
 */
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2] || path.resolve("frontend/index.html");
const html = fs.readFileSync(file, "utf8");

const block = html.match(/\/\* audio-rate-mapping:start \*\/([\s\S]*?)\/\* audio-rate-mapping:end \*\//);
if (!block) {
  console.error("AUDIO_MAPPING_NO_BLOCK: the audio-rate-mapping markers are missing.");
  process.exit(2);
}

let interval;
try {
  interval = new Function(`${block[1]}\nreturn audioEventInterval;`)();
} catch (err) {
  console.error(`AUDIO_MAPPING_BAD_BLOCK: ${err.message}`);
  process.exit(2);
}

const spinMatch = html.match(/const\s+SPIN_MS\s*=\s*(\d+)\s*;/);
if (!spinMatch) {
  console.error("AUDIO_MAPPING_NO_SPIN_MS: SPIN_MS was not found.");
  process.exit(2);
}
const spinMs = Number(spinMatch[1]);
const duration = spinMs / 1000;

const failures = [];
const check = (name, ok, detail) => {
  if (!ok) failures.push(`${name}: ${detail}`);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
};

const samples = [0, 0.25, 0.5, 0.75, 1].map((p) => interval(p));
check(
  "the five samples are finite and positive",
  samples.every((v) => Number.isFinite(v) && v > 0),
  JSON.stringify(samples),
);
let monotonic = true;
for (let i = 1; i < samples.length; i++) if (samples[i] < samples[i - 1]) monotonic = false;
check("the interval increases monotonically", monotonic, JSON.stringify(samples));
check(
  "the 0% interval is smaller than the 100% interval",
  samples[0] < samples[samples.length - 1],
  `${samples[0]} vs ${samples[samples.length - 1]}`,
);

let t = 0;
let last = 0;
let clicks = 0;
while (t < duration && clicks < 100000) {
  last = t;
  t += interval(t / duration);
  clicks++;
}
const nextAfterLast = last + interval(last / duration);
check(
  "the mapping ends no earlier than the spin's duration",
  nextAfterLast >= duration,
  `next click at ${nextAfterLast.toFixed(4)}s against SPIN_MS ${duration}s`,
);
check("the last scheduled click falls inside the spin", last < duration, `last ${last.toFixed(4)}s`);

console.log(`\nsamples(ms): ${samples.map((v) => (v * 1000).toFixed(1)).join(", ")}`);
console.log(
  `SPIN_MS: ${spinMs}ms, clicks: ${clicks}, last: ${(last * 1000).toFixed(1)}ms, next: ${(
    nextAfterLast * 1000
  ).toFixed(1)}ms`,
);

if (failures.length) {
  console.error(`\nAUDIO_MAPPING_FAIL ${failures.length} assertion(s) failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAUDIO_MAPPING_PASS");
process.exit(0);
