/* Source-read check for add-turn-change-notice.
 *
 *   node openspec/changes/add-turn-change-notice/checks/check_turn_notice.mjs [file]
 *   node openspec/changes/add-turn-change-notice/checks/check_turn_notice.mjs --self-test
 *
 * Exit codes: 0 = pass, 1 = assertion failed, 2 = cannot read file.
 */
import fs from "node:fs";
import path from "node:path";

const SELF_TEST = process.argv.includes("--self-test");
const file = process.argv.find((arg, idx) => idx >= 2 && arg !== "--self-test") || path.resolve("frontend/index.html");

function readSource(target) {
  try {
    return fs.readFileSync(target, "utf8");
  } catch (error) {
    console.error(`TURN_NOTICE_ERROR: cannot read ${target}: ${error.message}`);
    process.exit(2);
  }
}

/* Returns the brace-balanced block that opens after `marker`, or null. */
function bracedBlock(source, marker) {
  const at = source.indexOf(marker);
  if (at === -1) return null;
  const open = source.indexOf("{", at);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return null;
}

function runChecks(source, label = "real", verbose = true) {
  const failures = [];
  const check = (name, ok, detail) => {
    if (!ok) failures.push(`${name}: ${detail}`);
    if (verbose) console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
  };

  check("TURN_NOTICE_SECONDS = 5 exists", /const TURN_NOTICE_SECONDS = 5;/.test(source), "missing");
  check("TURN_NOTICE_MS derived from TURN_NOTICE_SECONDS", /const TURN_NOTICE_MS = TURN_NOTICE_SECONDS \* 1000;/.test(source), "missing derivation");
  check("notice timeout uses TURN_NOTICE_MS", /turnNoticeId\s*=\s*setTimeout\([\s\S]*?TURN_NOTICE_MS\s*\)/.test(source), "missing TURN_NOTICE_MS in timeout");
  check("bar transition interpolates TURN_NOTICE_SECONDS", /width \$\{TURN_NOTICE_SECONDS\}s linear/.test(source), "missing interpolation");

  check("#turn-notice exists with hidden", /id="turn-notice"[^>]*\bhidden\b/.test(source), "missing");
  check("exactly one id=\"q-next\"", (source.match(/id="q-next"/g) || []).length === 1, "count");
  const noticeStart = source.indexOf('<div id="turn-notice"');
  const nextButtonStart = source.indexOf('<button class="btn next-btn"');
  const noticeMarkup = noticeStart !== -1 && nextButtonStart !== -1 ? source.slice(noticeStart, nextButtonStart) : "";
  check("#turn-notice contains no <button>, <a>, or <input>", noticeMarkup !== "" && !/<(button|a|input)\b/i.test(noticeMarkup), "control found inside notice");
  check("exactly four elements with class panel", (source.match(/class="panel(?:\s|")/g) || []).length === 4, "count");

  const showFeedbackBody = bracedBlock(source, "function showFeedback(state, q)");
  const okBlock = bracedBlock(source, 'if (state === "ok")');
  check("showFeedback branches on state", showFeedbackBody !== null && okBlock !== null, "missing showFeedback ok branch");
  check("ok branch does not start the notice", okBlock !== null && !okBlock.includes("startTurnNotice"), "ok branch calls startTurnNotice");
  check("failure branch starts the notice", showFeedbackBody !== null && showFeedbackBody.includes("startTurnNotice()"), "missing startTurnNotice in showFeedback");

  const nextTurnBody = bracedBlock(source, "function nextTurn()");
  check("nextTurn clears the notice before branches", nextTurnBody !== null && /clearTurnNotice\(\);\s*if \(crownPending\)/.test(nextTurnBody), "missing clearTurnNotice at the top of nextTurn");
  check("resetMatchState calls clearTurnNotice()", (bracedBlock(source, "function resetMatchState()") || "").includes("clearTurnNotice()"), "missing");
  check("confirmSurrender calls clearTurnNotice()", (bracedBlock(source, "function confirmSurrender()") || "").includes("clearTurnNotice()"), "missing");
  check("finishMatch calls clearTurnNotice()", (bracedBlock(source, "function finishMatch(winner, loser, surrendered)") || "").includes("clearTurnNotice()"), "missing");

  check("#q-next still binds to nextTurn", /\$\("q-next"\)\.addEventListener\("click", nextTurn\)/.test(source), "missing binding");
  check("feedback strip still writes Respuesta correcta", /Respuesta correcta: \$\{q\.answer\}/.test(source), "missing");
  check("TIMER_SECONDS = 20 is unchanged", /const TIMER_SECONDS = 20;/.test(source), "missing");

  check("no new notice request", !/fetch\([^)]*(turnNotice|turn-notice)/.test(source), "new fetch found");
  check("no <script src=", !/<script[^>]+src=/.test(source), "script src found");
  check("no @import", !/@import/.test(source), "import found");
  check("no external url(", !/url\(\s*https?:\/\//.test(source), "external url found");
  check("no audio element", !/<audio[\s>]/i.test(source), "audio element found");
  check("no audio asset extension", !/\.(mp3|wav|ogg|oga|m4a|aac|flac|weba)\b/.test(source), "asset found");

  return failures;
}

function expectRed(name, source, expected) {
  const failures = runChecks(source, name, false);
  const red = expected.every((assertion) => failures.some((failure) => failure.startsWith(`${assertion}:`)));
  console.log(`${red ? "RED" : "GREEN"}  mutant: ${name} -> ${expected.join(", ")}`);
  return red;
}

function run() {
  const realSource = readSource(file);

  if (SELF_TEST) {
    const realFailures = runChecks(realSource, "real", false);
    if (realFailures.length) {
      console.error(`REAL_FAIL ${realFailures.length} assertion(s) failed:\n- ${realFailures.join("\n- ")}`);
      process.exit(1);
    }
    console.log("REAL_PASS");

    const literalDuration = realSource
      .replace("}, TURN_NOTICE_MS);", "}, 5000);")
      .replace("width ${TURN_NOTICE_SECONDS}s linear", "width 4s linear");
    const missingClear = realSource.replace(/function nextTurn\(\) \{\s*clearTurnNotice\(\);/, "function nextTurn() {");
    const noticeOnCorrect = realSource.replace(
      'if (state === "ok") {\n      clearTurnNotice();',
      'if (state === "ok") {\n      startTurnNotice();\n      clearTurnNotice();'
    );

    const red = [
      expectRed("literal duration", literalDuration, [
        "notice timeout uses TURN_NOTICE_MS",
        "bar transition interpolates TURN_NOTICE_SECONDS",
      ]),
      expectRed("missing clear in nextTurn", missingClear, ["nextTurn clears the notice before branches"]),
      expectRed("notice on correct answer", noticeOnCorrect, ["ok branch does not start the notice"]),
    ];

    if (!red.every(Boolean)) {
      console.error("SELF_TEST_FAIL: not all mutants went red for the expected assertion");
      process.exit(1);
    }
    console.log("SELF_TEST_PASS");
    process.exit(0);
  }

  const failures = runChecks(realSource);
  if (failures.length) {
    console.error(`TURN_NOTICE_FAIL ${failures.length} assertion(s) failed:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log("TURN_NOTICE_PASS");
  process.exit(0);
}

run();
