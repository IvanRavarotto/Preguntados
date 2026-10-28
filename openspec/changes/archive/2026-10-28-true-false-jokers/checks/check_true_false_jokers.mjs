/* Verifies the shipped `jokerFitsQuestion` rule for true/false questions.
 *
 *   node openspec/changes/true-false-jokers/checks/check_true_false_jokers.mjs [file]
 *
 * The default file is `frontend/index.html`. The function is extracted from the shipped
 * document and evaluated with a minimal `$("q-opts")` stub, so the check pins the same
 * source the browser runs rather than a copy.
 *
 * Exit codes: 0 = every case passed, 1 = a case failed, 2 = the function or file is missing.
 */
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2] || path.resolve("frontend/index.html");
let source;
try {
  source = fs.readFileSync(file, "utf8");
} catch (error) {
  console.error(`TRUE_FALSE_JOKERS_ERROR: cannot read ${file}: ${error.message}`);
  process.exit(2);
}

const match = source.match(/function jokerFitsQuestion\(type\) \{[\s\S]*?\n  \}/);
if (!match) {
  console.error("TRUE_FALSE_JOKERS_ERROR: jokerFitsQuestion not found");
  process.exit(2);
}

let optionCount = 2;
const $ = () => ({ children: { length: optionCount } });
const jokerFitsQuestion = eval(`(${match[0].replace("function jokerFitsQuestion", "function")})`);

const cases = [
  [2, "eliminate-two", false],
  [2, "second-chance", false],
  [2, "select-correct", true],
  [2, "auto-correct", true],
  [2, "seleccionar-correcta", true],
  [4, "eliminate-two", true],
  [4, "second-chance", true],
  [4, "select-correct", true],
  [4, "auto-correct", true],
];

const failures = [];
for (const [count, type, expected] of cases) {
  optionCount = count;
  const actual = jokerFitsQuestion(type);
  if (actual !== expected) {
    failures.push(`${count} options, ${type}: got ${actual}, expected ${expected}`);
  }
}

if (failures.length) {
  console.error(`TRUE_FALSE_JOKERS_FAIL ${failures.length} case(s) failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("TRUE_FALSE_JOKERS_PASS");
