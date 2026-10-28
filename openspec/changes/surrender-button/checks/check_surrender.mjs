/* Verifies the surrender control, its confirmation, and the surrender ending against the shipped
 * document, in a real Chromium page driven over the DevTools protocol.
 *
 *   node openspec/changes/surrender-button/checks/check_surrender.mjs [--file <html>] [--url <base>]
 *
 *   --file  serves that copy of the document instead of the API's, proxying the API calls to
 *           --url. This is how the negative controls run: the same check against a mutated copy.
 *   --url   the API base (default http://127.0.0.1:8000). With --file, also the proxy target.
 *
 * Exit codes: 0 = every assertion passed, 1 = an assertion failed, 2 = no Chromium binary,
 * 3 = the browser or the API could not be reached.
 */
import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const FILE = argOf("--file", null);
const API_BASE = argOf("--url", process.env.API_BASE || "http://127.0.0.1:8000");

const FAIL_RGB = "rgb(255, 42, 109)";
const PANEL_IDS = ["screen-start", "screen-wheel", "screen-question", "screen-winner"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const check = (name, ok, detail) => {
  if (!ok) failures.push(`${name}: ${detail}`);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
};

const BROWSERS = [
  process.env.CHROME_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

function findBrowser() {
  for (const candidate of BROWSERS) if (fs.existsSync(candidate)) return candidate;
  return null;
}

async function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForJson(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  return null;
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.exceptions = [];
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error("websocket failed"));
    });
    const cdp = new Cdp(ws);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && cdp.pending.has(msg.id)) {
        const { resolve, reject } = cdp.pending.get(msg.id);
        cdp.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
        return;
      }
      if (msg.method === "Runtime.exceptionThrown") {
        cdp.exceptions.push(msg.params.exceptionDetails);
      }
    };
    return cdp;
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`eval threw: ${res.exceptionDetails.exception?.description || "unknown"}`);
    }
    return res.result.value;
  }
}

function startProxy(htmlPath) {
  const server = http.createServer(async (req, res) => {
    if (req.url === "/" || req.url.startsWith("/index.html")) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(htmlPath));
      return;
    }
    try {
      const upstream = await fetch(`${API_BASE}${req.url}`);
      const body = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") || "application/json" });
      res.end(body);
    } catch (err) {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ detail: String(err) }));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

const PANEL_STATE = `(() => ({
  ids: [...document.querySelectorAll(".panel")].map(p => p.id),
  active: (document.querySelector(".panel.active") || {}).id || null,
  signals: {
    scoreboard: document.getElementById("scoreboard").childElementCount,
    surrenderRow: document.getElementById("surrender-wheel").childElementCount
  }
}))()`;

const MATCH_STATE = `(() => ({
  screen: (document.querySelector(".panel.active") || {}).id || null,
  turn,
  names: players.map(p => p.name),
  crowns: players.map(p => p.crowns.slice()),
  correct: players.map(p => p.correct),
  wrong: players.map(p => p.wrong),
  questionId: currentQuestion ? currentQuestion.id : null,
  questionText: document.getElementById("q-text").textContent,
  ariaNow: document.getElementById("q-timer").getAttribute("aria-valuenow"),
  answered
}))()`;

const WHEEL_CONTROLS = `(() => {
  const buttons = [...document.querySelectorAll("#surrender-wheel button")];
  return {
    names: players.map(p => p.name),
    controls: buttons.map(b => ({
      label: b.getAttribute("aria-label") || b.textContent.trim(),
      text: b.textContent.trim(),
      disabled: b.disabled
    }))
  };
})()`;

const QUESTION_CONTROLS = `(() => {
  const button = document.getElementById("surrender-question");
  return {
    activeName: players[turn].name,
    chip: document.getElementById("q-player").textContent,
    label: button.getAttribute("aria-label") || button.textContent.trim(),
    text: button.textContent.trim(),
    disabled: button.disabled,
    questionId: currentQuestion ? currentQuestion.id : null
  };
})()`;

const DIALOG_STATE = `(() => {
  const overlay = document.getElementById("surrender-overlay");
  const dialog = overlay.querySelector('[role="dialog"]');
  const title = document.getElementById(dialog.getAttribute("aria-labelledby"));
  const controls = [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')];
  return {
    overlayHidden: overlay.hidden,
    overlayClass: overlay.className,
    role: dialog.getAttribute("role"),
    ariaModal: dialog.getAttribute("aria-modal"),
    labelledby: dialog.getAttribute("aria-labelledby"),
    title: title ? title.textContent.trim() : null,
    controlCount: controls.length,
    controlIds: controls.map(c => c.id),
    controlLabels: controls.map(c => c.getAttribute("aria-label") || c.textContent.trim()),
    activeId: document.activeElement ? document.activeElement.id : null,
    activeInside: dialog.contains(document.activeElement),
    activeIsConfirm: document.activeElement === document.getElementById("surrender-confirm"),
    dialogHasPanel: dialog.classList.contains("panel")
  };
})()`;

const VISUAL_TOKENS = `(() => {
  const read = (id) => {
    const el = document.getElementById(id);
    const s = getComputedStyle(el);
    return {
      color: s.color,
      borderColor: s.borderColor,
      background: s.backgroundColor,
      radii: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius],
      shadow: s.boxShadow
    };
  };
  return {
    question: read("surrender-question"),
    wheel: read("surrender-wheel").borderColor,
    wheelButtons: [...document.querySelectorAll("#surrender-wheel button")].map(b => {
      const s = getComputedStyle(b);
      return { borderColor: s.borderColor, color: s.color, background: s.backgroundColor, radius: s.borderTopLeftRadius, shadow: s.boxShadow };
    }),
    confirm: (() => {
      const s = getComputedStyle(document.getElementById("surrender-confirm"));
      return { color: s.color, borderColor: s.borderColor, background: s.backgroundColor, radius: s.borderTopLeftRadius, shadow: s.boxShadow };
    })()
  };
})()`;

const REFERENCE_SET = `(() => {
  const refs = [];
  document.querySelectorAll("[src]").forEach(el => refs.push(el.getAttribute("src")));
  document.querySelectorAll("[href]").forEach(el => refs.push(el.getAttribute("href")));
  const css = [...document.styleSheets].flatMap(sheet => {
    try { return [...sheet.cssRules].map(rule => rule.cssText); } catch { return []; }
  }).join(" ");
  return { refs: refs.filter(Boolean), hasImport: /@import/i.test(css), urls: [...css.matchAll(/url\\(([^)]+)\\)/gi)].map(m => m[1]) };
})()`;

const WINNER_STATE = `(() => {
  const cards = [...document.querySelectorAll("#w-podium .pcard")].map(card => ({
    name: card.querySelector(".pname").textContent,
    on: card.querySelectorAll(".cslot.on").length,
    total: card.querySelectorAll(".cslot").length,
    champ: card.classList.contains("champ")
  }));
  return {
    name: document.getElementById("w-name").textContent,
    ending: document.getElementById("w-ending").textContent,
    score: document.getElementById("w-score").textContent,
    hasCrownGlyph: !!document.querySelector("#w-crown svg"),
    cards,
    overlayHidden: document.getElementById("surrender-overlay").hidden,
    timerTransition: document.getElementById("tbar").style.transition,
    timerAnimations: document.getElementById("tbar").getAnimations().length,
    ariaNow: document.getElementById("q-timer").getAttribute("aria-valuenow"),
    optionDisabled: [...document.querySelectorAll("#q-opts .opt")].map(b => b.disabled)
  };
})()`;

function namedCount(controls, name) {
  return controls.filter(c => c.label.includes(name)).length;
}

function sameState(before, after, fields) {
  return fields.every(field => JSON.stringify(before[field]) === JSON.stringify(after[field]));
}

async function openSurrender(cdp, selector) {
  return cdp.eval(`(() => {
    const opener = document.querySelector(${JSON.stringify(selector)});
    window.__surrenderOpener = opener;
    opener.focus();
    opener.click();
    return document.activeElement && document.activeElement.id;
  })()`);
}

async function waitForQuestion(cdp) {
  for (let i = 0; i < 120; i++) {
    const state = await cdp.eval(`(() => ({
      screen: (document.querySelector(".panel.active") || {}).id || null,
      options: document.querySelectorAll("#q-opts .opt").length,
      question: !!currentQuestion
    }))()`);
    if (state.screen === "screen-question" && state.options >= 2 && state.question) return true;
    await sleep(100);
  }
  return false;
}

async function main() {
  const browser = findBrowser();
  if (!browser) {
    console.error("CHROME_CHECK_NO_BROWSER: no Chromium binary found. Set CHROME_PATH.");
    process.exit(2);
  }

  const api = await fetch(`${API_BASE}/categories`).catch(() => null);
  if (!api || !api.ok) {
    console.error(`CHROME_CHECK_NO_API: the API at ${API_BASE} did not answer /categories.`);
    process.exit(3);
  }

  let proxy = null;
  let targetUrl = `${API_BASE}/`;
  if (FILE) {
    proxy = await startProxy(path.resolve(FILE));
    targetUrl = `http://127.0.0.1:${proxy.port}/`;
  }

  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "surrender-check-"));
  const child = spawn(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  const cleanup = async () => {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
    await sleep(400);
    try {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      /* the browser still holds a lock; the temp profile is disposable */
    }
    if (proxy) proxy.server.close();
  };

  try {
    const targets = await waitForJson(`http://127.0.0.1:${port}/json/list`);
    const page = targets && targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    if (!page) throw new Error("no page target");

    const cdp = await Cdp.connect(page.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send("Page.navigate", { url: targetUrl });
    await sleep(1600);

    /* --- static shell and dialog markup --- */
    const shell = await cdp.eval(PANEL_STATE);
    check(
      "the document keeps exactly four panels with the four expected ids",
      shell.ids.length === 4 && PANEL_IDS.every(id => shell.ids.includes(id)),
      `panels: ${JSON.stringify(shell.ids)}`,
    );

    const staticDialog = await cdp.eval(DIALOG_STATE);
    check("the dialog is not a fifth panel", !staticDialog.dialogHasPanel, `class: ${staticDialog.overlayClass}`);
    check("the dialog declares role=dialog", staticDialog.role === "dialog", `role: ${staticDialog.role}`);
    check("the dialog declares aria-modal=true", staticDialog.ariaModal === "true", `aria-modal: ${staticDialog.ariaModal}`);
    check(
      "the dialog's aria-labelledby points at its title",
      staticDialog.labelledby === "surrender-title" && staticDialog.title !== null,
      `labelledby: ${staticDialog.labelledby}, title: ${staticDialog.title}`,
    );
    check(
      "the dialog holds exactly two controls, confirm and cancel",
      staticDialog.controlCount === 2 &&
        staticDialog.controlIds.includes("surrender-cancel") &&
        staticDialog.controlIds.includes("surrender-confirm"),
      `controls: ${JSON.stringify(staticDialog.controlIds)}`,
    );
    check("the dialog starts hidden", staticDialog.overlayHidden === true, `hidden: ${staticDialog.overlayHidden}`);

    const references = await cdp.eval(REFERENCE_SET);
    const externalRefs = references.refs.filter(ref => /^https?:/i.test(ref) || ref.startsWith("//"));
    check(
      "the document makes no external reference",
      externalRefs.length === 0 && !references.hasImport && references.urls.length === 0,
      `external refs: ${JSON.stringify(externalRefs)}, @import: ${references.hasImport}, url(): ${JSON.stringify(references.urls)}`,
    );

    if (failures.length) {
      await cleanup();
      console.error(`\nSURRENDER_CHECK_FAIL ${failures.length} assertion(s) failed:\n- ${failures.join("\n- ")}`);
      process.exit(1);
    }

    /* --- wheel screen: one control per named player --- */
    await cdp.eval(`(() => {
      document.getElementById("name1").value = "Ana";
      document.getElementById("name2").value = "Beto";
      document.getElementById("start").click();
      return true;
    })()`);
    await sleep(500);

    const wheelState0 = await cdp.eval(MATCH_STATE);
    const wheel = await cdp.eval(WHEEL_CONTROLS);
    check(
      "the wheel screen carries one surrender control per player",
      wheel.controls.length === 2,
      `${wheel.controls.length} control(s): ${JSON.stringify(wheel.controls)}`,
    );
    check(
      "every wheel surrender control names the player it surrenders",
      wheel.names.every(name => namedCount(wheel.controls, name) === 1),
      `names ${JSON.stringify(wheel.names)} against ${JSON.stringify(wheel.controls.map(c => c.label))}`,
    );

    await openSurrender(cdp, "#surrender-wheel button:nth-child(1)");
    const wheelDialog = await cdp.eval(DIALOG_STATE);
    check(
      "the wheel dialog title names the player being surrendered",
      wheelDialog.title.includes(wheel.names[0]),
      `title ${wheelDialog.title} against ${wheel.names[0]}`,
    );
    check(
      "opening the dialog moves focus onto the cancel control",
      wheelDialog.activeInside && wheelDialog.activeId === "surrender-cancel" && !wheelDialog.activeIsConfirm,
      `focus: ${wheelDialog.activeId}, inside: ${wheelDialog.activeInside}, confirm: ${wheelDialog.activeIsConfirm}`,
    );

    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await sleep(150);
    const escapedState = await cdp.eval(`(() => ({
      hidden: document.getElementById("surrender-overlay").hidden,
      focusIsOpener: document.activeElement === window.__surrenderOpener,
      activeId: document.activeElement ? document.activeElement.id : null,
      state: ${MATCH_STATE}
    }))()`);
    check("Escape hides the dialog", escapedState.hidden === true, `hidden: ${escapedState.hidden}`);
    check("Escape restores focus to the control that opened it", escapedState.focusIsOpener === true, `focus: ${escapedState.activeId}`);
    check(
      "Escape leaves the wheel match untouched",
      sameState(wheelState0, escapedState.state, ["screen", "turn", "crowns", "questionId"]),
      `before ${JSON.stringify(wheelState0)}, after ${JSON.stringify(escapedState.state)}`,
    );

    await openSurrender(cdp, "#surrender-wheel button:nth-child(2)");
    const secondDialog = await cdp.eval(DIALOG_STATE);
    check(
      "the second wheel control names its own player",
      secondDialog.title.includes(wheel.names[1]),
      `title ${secondDialog.title} against ${wheel.names[1]}`,
    );
    await cdp.eval(`document.getElementById("surrender-cancel").click()`);
    await sleep(150);
    const cancelledWheel = await cdp.eval(`(() => ({
      hidden: document.getElementById("surrender-overlay").hidden,
      focusIsOpener: document.activeElement === window.__surrenderOpener,
      activeId: document.activeElement ? document.activeElement.id : null,
      state: ${MATCH_STATE}
    }))()`);
    check("the cancel control hides the dialog", cancelledWheel.hidden === true, `hidden: ${cancelledWheel.hidden}`);
    check("the cancel control restores focus to its opener", cancelledWheel.focusIsOpener === true, `focus: ${cancelledWheel.activeId}`);
    check(
      "cancelling leaves the wheel match untouched",
      sameState(wheelState0, cancelledWheel.state, ["screen", "turn", "crowns", "questionId"]),
      `before ${JSON.stringify(wheelState0)}, after ${JSON.stringify(cancelledWheel.state)}`,
    );

    /* --- question screen: the control belongs to the active player --- */
    await cdp.eval(`(() => {
      players[turn].crowns = ["arte", "ciencia"];
      players[1 - turn].crowns = [];
      renderScoreboard();
      return true;
    })()`);
    await cdp.eval(`window.__startCategory("arte")`);
    const questionAppeared = await waitForQuestion(cdp);
    check("a question is on screen", questionAppeared, "the question panel never became active with rendered options");

    const question = await cdp.eval(QUESTION_CONTROLS);
    check(
      "the question screen carries a surrender control for the active player",
      question.label.includes(question.activeName),
      `control ${question.label} against active player ${question.activeName}`,
    );
    check(
      "the question screen's chip also names the active player",
      question.chip.includes(question.activeName),
      `chip ${question.chip}`,
    );

    const questionState0 = await cdp.eval(MATCH_STATE);
    await openSurrender(cdp, "#surrender-question");
    const questionDialog = await cdp.eval(DIALOG_STATE);
    check(
      "the question dialog title names the active player",
      questionDialog.title.includes(questionState0.names[questionState0.turn]),
      `title ${questionDialog.title} against ${questionState0.names[questionState0.turn]}`,
    );
    check(
      "the question dialog focuses its cancel control, not its confirm control",
      questionDialog.activeInside && questionDialog.activeId === "surrender-cancel" && !questionDialog.activeIsConfirm,
      `focus: ${questionDialog.activeId}, inside: ${questionDialog.activeInside}, confirm: ${questionDialog.activeIsConfirm}`,
    );

    await cdp.eval(`document.getElementById("surrender-cancel").click()`);
    await sleep(150);
    const cancelledQuestion = await cdp.eval(`(() => ({
      hidden: document.getElementById("surrender-overlay").hidden,
      focusIsOpener: document.activeElement === window.__surrenderOpener,
      activeId: document.activeElement ? document.activeElement.id : null,
      state: ${MATCH_STATE},
      timerAnimations: document.getElementById("tbar").getAnimations().length
    }))()`);
    check("cancelling hides the question dialog", cancelledQuestion.hidden === true, `hidden: ${cancelledQuestion.hidden}`);
    check(
      "cancelling restores focus to the question control",
      cancelledQuestion.focusIsOpener === true,
      `focus: ${cancelledQuestion.activeId}`,
    );
    check(
      "cancelling leaves the question, turn and crowns untouched",
      sameState(questionState0, cancelledQuestion.state, ["screen", "turn", "crowns", "questionId"]),
      `before ${JSON.stringify(questionState0)}, after ${JSON.stringify(cancelledQuestion.state)}`,
    );
    check(
      "the countdown resumes after a cancel",
      cancelledQuestion.timerAnimations > 0,
      `running timer animations: ${cancelledQuestion.timerAnimations}`,
    );
    const ariaBefore = Number(cancelledQuestion.state.ariaNow);
    await sleep(1200);
    const ariaAfter = Number(await cdp.eval(`document.getElementById("q-timer").getAttribute("aria-valuenow")`));
    check("the clock keeps running after a cancel", ariaAfter < ariaBefore, `aria-valuenow ${ariaBefore} -> ${ariaAfter}`);

    /* --- visual tokens --- */
    const visual = await cdp.eval(VISUAL_TOKENS);
    const radii = [...visual.question.radii, visual.confirm.radius, ...visual.wheelButtons.map(b => b.radius)];
    const shadows = [visual.question.shadow, visual.confirm.shadow, ...visual.wheelButtons.map(b => b.shadow)];
    const zeroOffsetShadow = value =>
      value === "none" ||
      value.split(/,(?![^(]*\))/).every(layer => {
        const match = layer.match(/(?:rgba?\([^)]*\)\s+)?(-?[\d.]+)px\s+(-?[\d.]+)px/);
        return match && Number(match[1]) === 0 && Number(match[2]) === 0;
      });
    check(
      "the surrender controls use the failure accent",
      visual.question.borderColor === FAIL_RGB &&
        visual.wheelButtons.every(b => b.borderColor === FAIL_RGB) &&
        visual.confirm.background === FAIL_RGB,
      `question ${visual.question.borderColor}, wheel ${JSON.stringify(visual.wheelButtons.map(b => b.borderColor))}, confirm ${visual.confirm.background}`,
    );
    check(
      "every surrender radius stays inside the 0.25rem-0.5rem band",
      radii.every(value => parseFloat(value) >= 4 && parseFloat(value) <= 8),
      `radii: ${JSON.stringify(radii)}`,
    );
    check(
      "the surrender controls and the confirm control cast no offset drop shadow",
      shadows.every(zeroOffsetShadow),
      `shadows: ${JSON.stringify(shadows)}`,
    );

    /* --- confirm: the rival wins, crowns are preserved --- */
    const beforeSurrender = await cdp.eval(MATCH_STATE);
    await openSurrender(cdp, "#surrender-question");
    await cdp.eval(`document.getElementById("surrender-confirm").click()`);
    await sleep(250);

    const winner = await cdp.eval(WINNER_STATE);
    const afterSurrender = await cdp.eval(MATCH_STATE);
    const target = beforeSurrender.turn;
    const rival = 1 - target;
    check(
      "confirming ends the match on the winner screen",
      afterSurrender.screen === "screen-winner",
      `active screen: ${afterSurrender.screen}`,
    );
    check(
      "the rival is the winner",
      winner.name.includes(beforeSurrender.names[rival]),
      `winner text ${winner.name} against rival ${beforeSurrender.names[rival]}`,
    );
    check(
      "the winner screen states the surrender and names the surrendering player",
      /rendición/i.test(winner.ending) && winner.ending.includes(beforeSurrender.names[target]),
      `ending text: ${winner.ending}`,
    );
    check(
      "the surrender awards no crown and transfers none",
      JSON.stringify(afterSurrender.crowns) === JSON.stringify(beforeSurrender.crowns),
      `crowns before ${JSON.stringify(beforeSurrender.crowns)}, after ${JSON.stringify(afterSurrender.crowns)}`,
    );
    check(
      "both crown sets are shown on the podium",
      winner.cards.length === 2 &&
        winner.cards.find(c => c.name === beforeSurrender.names[target]).on === beforeSurrender.crowns[target].length &&
        winner.cards.find(c => c.name === beforeSurrender.names[rival]).on === beforeSurrender.crowns[rival].length,
      `podium: ${JSON.stringify(winner.cards)}`,
    );
    check("the winner screen still shows the crown glyph", winner.hasCrownGlyph === true, "the crown glyph is missing");
    check(
      "the countdown is stopped",
      winner.timerAnimations === 0 && winner.timerTransition === "none",
      `animations ${winner.timerAnimations}, transition ${winner.timerTransition}`,
    );
    await sleep(700);
    const ariaStopped = await cdp.eval(`document.getElementById("q-timer").getAttribute("aria-valuenow")`);
    check("the countdown no longer changes after the surrender", ariaStopped === winner.ariaNow, `aria-valuenow ${winner.ariaNow} -> ${ariaStopped}`);
    check(
      "the pending question is unanswerable after the surrender",
      winner.optionDisabled.length >= 2 && winner.optionDisabled.every(Boolean) && afterSurrender.answered === true,
      `options disabled: ${JSON.stringify(winner.optionDisabled)}, answered: ${afterSurrender.answered}`,
    );
    await cdp.eval(`document.querySelector("#q-opts .opt").click()`);
    await sleep(150);
    const afterPostAnswer = await cdp.eval(MATCH_STATE);
    check(
      "answering after the surrender awards nothing",
      JSON.stringify(afterPostAnswer.crowns) === JSON.stringify(beforeSurrender.crowns) &&
        afterPostAnswer.correct.every((value, i) => value === beforeSurrender.correct[i]) &&
        afterPostAnswer.wrong.every((value, i) => value === beforeSurrender.wrong[i]),
      `state after the post-surrender click: ${JSON.stringify(afterPostAnswer)}`,
    );

    const panelsAfter = await cdp.eval(PANEL_STATE);
    check(
      "the surrender dialog did not add a fifth panel",
      panelsAfter.ids.length === 4 && PANEL_IDS.every(id => panelsAfter.ids.includes(id)),
      `panels: ${JSON.stringify(panelsAfter.ids)}`,
    );

    /* --- rematch clears the match and returns to the name screen --- */
    await cdp.eval(`document.getElementById("rematch").click()`);
    await sleep(250);
    const rematch = await cdp.eval(`(() => ({
      screen: (document.querySelector(".panel.active") || {}).id || null,
      playerCount: players.length,
      scoreboardCards: document.getElementById("scoreboard").childElementCount,
      surrenderButtons: document.getElementById("surrender-wheel").childElementCount
    }))()`);
    check("rematch returns to the player-name screen", rematch.screen === "screen-start", `active screen: ${rematch.screen}`);
    check("rematch clears both crown sets", rematch.playerCount === 0, `players left: ${rematch.playerCount}`);
    check(
      "rematch clears the visible score state",
      rematch.scoreboardCards === 0 && rematch.surrenderButtons === 0,
      `scoreboard cards: ${rematch.scoreboardCards}, surrender controls: ${rematch.surrenderButtons}`,
    );

    /* --- the six-crown ending survives the refactor and reads differently --- */
    await cdp.eval(`(() => {
      document.getElementById("name1").value = "Ana";
      document.getElementById("name2").value = "Beto";
      document.getElementById("start").click();
      return true;
    })()`);
    await sleep(500);
    await cdp.eval(`window.__startCategory("arte")`);
    const sixCrownQuestion = await waitForQuestion(cdp);
    check("a fresh question is on screen for the six-crown control", sixCrownQuestion, "the question panel never became active");
    await cdp.eval(`(() => {
      players[turn].crowns = ["arte", "ciencia", "historia", "deportes", "geografia"];
      currentFlow = "crown-challenge";
      pendingChallengeCategory = "entretenimiento";
      resolveCorrect(currentQuestion);
      return true;
    })()`);
    await sleep(250);
    const sixCrownWinner = await cdp.eval(WINNER_STATE);
    const sixCrownState = await cdp.eval(MATCH_STATE);
    const sixCrownChamp = sixCrownWinner.cards.find(c => c.champ);
    check(
      "the six-crown winner screen keeps the winner name and format",
      /^¡.+ GANA!$/.test(sixCrownWinner.name) && sixCrownWinner.name.includes(sixCrownState.names[sixCrownState.turn]),
      `winner text ${sixCrownWinner.name}`,
    );
    check("the six-crown winner screen keeps the crown glyph", sixCrownWinner.hasCrownGlyph === true, "the crown glyph is missing");
    check(
      "the six-crown winner screen keeps the podium",
      sixCrownWinner.cards.length === 2 && !!sixCrownChamp && sixCrownChamp.on === 6,
      `podium: ${JSON.stringify(sixCrownWinner.cards)}`,
    );
    check(
      "the six-crown ending states that the winner completed the six crowns",
      /completó las seis coronas/i.test(sixCrownWinner.ending),
      `ending text: ${sixCrownWinner.ending}`,
    );
    check(
      "the two endings do not read identically",
      sixCrownWinner.ending !== winner.ending && !/rendición/i.test(sixCrownWinner.ending),
      `six-crown: ${sixCrownWinner.ending} / surrender: ${winner.ending}`,
    );

    const panelsFinal = await cdp.eval(PANEL_STATE);
    check(
      "the shell still has exactly the four panels at the end",
      panelsFinal.ids.length === 4 && PANEL_IDS.every(id => panelsFinal.ids.includes(id)),
      `panels: ${JSON.stringify(panelsFinal.ids)}`,
    );
    check(
      "the run raised no uncaught exception",
      cdp.exceptions.length === 0,
      `${cdp.exceptions.length} exception(s): ${JSON.stringify(cdp.exceptions.map(e => e.exception?.description || e.text))}`,
    );

    await cleanup();
    console.log(
      JSON.stringify(
        {
          wheel: wheel.controls,
          wheelDialog,
          escaped: escapedState,
          cancelledWheel,
          question,
          questionDialog,
          cancelledQuestion,
          winner: {
            name: winner.name,
            ending: winner.ending,
            crowns: beforeSurrender.crowns,
            target: beforeSurrender.names[target],
            rival: beforeSurrender.names[rival],
            podium: winner.cards
          },
          sixCrown: { name: sixCrownWinner.name, ending: sixCrownWinner.ending, podium: sixCrownWinner.cards },
          exceptions: cdp.exceptions.length,
        },
        null,
        2,
      ),
    );
    if (failures.length) {
      console.error(`\nSURRENDER_CHECK_FAIL ${failures.length} assertion(s) failed:\n- ${failures.join("\n- ")}`);
      process.exit(1);
    }
    console.log("\nSURRENDER_CHECK_PASS");
    process.exit(0);
  } catch (err) {
    await cleanup();
    console.error(`CHROME_CHECK_ERROR: ${err.message}`);
    process.exit(3);
  }
}

main();
