/* Verifies the validate-then-save authoring flow with a stubbed AI verdict.
 *
 *   node openspec/changes/restore-gemini-question-validation/checks/check_ai_authoring.mjs [--url <base>]
 *
 * The default base is http://127.0.0.1:8001, an API serving the working tree.
 * `/questions/validate` and `/questions` are intercepted in the page, so the
 * check never calls Gemini and never persists a question.
 *
 * Exit codes: 0 = every assertion passed, 1 = an assertion failed, 2 = no Chromium,
 * 3 = the API could not be reached.
 */
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
const API_BASE = argOf("--url", process.env.API_BASE || "http://127.0.0.1:8001");

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
].filter(Boolean);
const findBrowser = () => BROWSERS.find((candidate) => fs.existsSync(candidate)) || null;

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

const HARNESS = `(() => {
  window.__qa = {
    validate: null,
    save: null,
    validateCalls: [],
    saveCalls: [],
    errors: []
  };
  window.addEventListener("error", (event) => window.__qa.errors.push(String(event.message)));
  window.addEventListener("unhandledrejection", (event) => window.__qa.errors.push(String(event.reason)));
  const original = window.fetch;
  const respond = ([status, body]) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
  window.fetch = async (url, options) => {
    const target = String(url);
    if (target.includes("/questions/validate")) {
      window.__qa.validateCalls.push(JSON.parse(options.body));
      return respond(window.__qa.validate);
    }
    if (target.endsWith("/questions")) {
      window.__qa.saveCalls.push(JSON.parse(options.body));
      return respond(window.__qa.save);
    }
    return original(url, options);
  };
  document.getElementById("authoring").open = true;
  return true;
})()`;

const STATE = `(() => {
  const status = document.getElementById("authoring-status");
  return {
    submitControls: document.querySelectorAll("#authoring-form .auth-submit").length,
    validateCalls: window.__qa.validateCalls,
    saveCalls: window.__qa.saveCalls,
    errors: window.__qa.errors,
    statusText: status.textContent,
    statusClass: status.className,
    statusHidden: status.hidden,
    type: document.getElementById("q-type").value,
    question: document.getElementById("q-question").value,
    optionA: document.getElementById("q-option-a").value,
    optionB: document.getElementById("q-option-b").value,
    optionC: document.getElementById("q-option-c").value,
    optionD: document.getElementById("q-option-d").value,
    checked: [...document.querySelectorAll('input[name="correct-option"]:checked')].map((r) => r.value),
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
})()`;

async function openForm(cdp, { type = "multiple_choice" } = {}) {
  await cdp.send("Page.navigate", { url: `${API_BASE}/` });
  await sleep(1200);
  await cdp.eval(HARNESS);
  if (type === "true_false") {
    await cdp.eval(`(() => {
      const select = document.getElementById("q-type");
      select.value = "true_false";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);
  }
}

async function fillAndSubmit(cdp, { type = "multiple_choice", validate, save }) {
  await cdp.eval(`(() => {
    window.__qa.validate = ${JSON.stringify(validate)};
    window.__qa.save = ${JSON.stringify(save)};
    document.getElementById("q-question").value = "Pregunta de prueba ${type}";
    if (${JSON.stringify(type)} === "true_false") {
      document.getElementById("correct-b").click();
    } else {
      document.getElementById("q-option-a").value = "Uno";
      document.getElementById("q-option-b").value = "Dos";
      document.getElementById("q-option-c").value = "Tres";
      document.getElementById("q-option-d").value = "Cuatro";
      document.getElementById("correct-a").click();
    }
    document.getElementById("authoring-form").requestSubmit();
    return true;
  })()`);
  await sleep(450);
  return cdp.eval(STATE);
}

async function main() {
  const browser = findBrowser();
  if (!browser) {
    console.error("AI_AUTHORING_CHECK_NO_BROWSER: no Chromium binary found. Set CHROME_PATH.");
    process.exit(2);
  }
  const api = await fetch(`${API_BASE}/categories`).catch(() => null);
  if (!api || !api.ok) {
    console.error(`AI_AUTHORING_CHECK_NO_API: ${API_BASE} did not answer /categories.`);
    process.exit(3);
  }

  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ai-authoring-check-"));
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
      /* disposable profile */
    }
  };

  try {
    const targets = await waitForJson(`http://127.0.0.1:${port}/json/list`);
    const page = targets && targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    if (!page) throw new Error("no page target");
    const cdp = await Cdp.connect(page.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    const valid = [200, { plausible: true, status: "valid", reasons: [] }];
    const saved = [201, { id: 999, category: "arte", confidence_score: 0.9 }];

    await openForm(cdp);
    let state = await cdp.eval(STATE);
    check("one submit control", state.submitControls === 1, JSON.stringify(state));

    state = await fillAndSubmit(cdp, { validate: valid, save: saved });
    check("valid: validate then save", state.validateCalls.length === 1 && state.saveCalls.length === 1, JSON.stringify(state));
    check("valid: no verification note", /Pregunta agregada \(#999\) en Arte y Cultura \(90% de confianza\)\.$/.test(state.statusText), JSON.stringify(state.statusText));
    check("valid: payload includes the type", state.validateCalls[0].question_type === "multiple_choice", JSON.stringify(state.validateCalls));
    check("valid: form resets to multiple_choice", state.type === "multiple_choice" && state.question === "" && state.checked.length === 0, JSON.stringify(state));

    await openForm(cdp);
    state = await fillAndSubmit(cdp, {
      validate: [200, { plausible: false, status: "implausible", reasons: ["La respuesta marcada es incorrecta."] }],
      save: saved,
    });
    check("implausible: no save", state.saveCalls.length === 0, JSON.stringify(state));
    check("implausible: shows the reason", /La IA marcó la pregunta como implausible: La respuesta marcada es incorrecta\./.test(state.statusText) && state.statusClass === "err", JSON.stringify(state.statusText));
    check("implausible: keeps the input", state.question !== "" && state.checked.length === 1, JSON.stringify(state));

    await openForm(cdp);
    state = await fillAndSubmit(cdp, {
      validate: [200, { plausible: false, status: "uncertain", reasons: ["La pregunta es ambigua."] }],
      save: saved,
    });
    check("uncertain: saves with a note", state.saveCalls.length === 1 && /La IA no pudo confirmarla\. Motivos: La pregunta es ambigua\./.test(state.statusText), JSON.stringify(state));

    await openForm(cdp);
    state = await fillAndSubmit(cdp, {
      validate: [502, { detail: "ai_provider_error" }],
      save: saved,
    });
    check("502: saves with the unverified note", state.saveCalls.length === 1 && /No se pudo verificar con IA; se guardó igual\./.test(state.statusText), JSON.stringify(state));

    await openForm(cdp);
    state = await fillAndSubmit(cdp, {
      validate: [503, { detail: "gemini_api_key_missing" }],
      save: saved,
    });
    check("503: saves with the unverified note", state.saveCalls.length === 1 && /No se pudo verificar con IA; se guardó igual\./.test(state.statusText), JSON.stringify(state));

    await openForm(cdp);
    state = await fillAndSubmit(cdp, { validate: [400, { detail: "missing_fields" }], save: saved });
    check("400: no save and the four-option message", state.saveCalls.length === 0 && /cuatro opciones/.test(state.statusText), JSON.stringify(state));

    await openForm(cdp);
    state = await fillAndSubmit(cdp, { validate: [409, { detail: "duplicate_question" }], save: saved });
    check("409: no save and the duplicate message", state.saveCalls.length === 0 && /Ya existe una pregunta igual\./.test(state.statusText), JSON.stringify(state));

    await openForm(cdp, { type: "true_false" });
    state = await fillAndSubmit(cdp, { type: "true_false", validate: valid, save: saved });
    const tfPayload = state.validateCalls[0] || {};
    check("true_false: validates before saving", state.validateCalls.length === 1 && state.saveCalls.length === 1, JSON.stringify(state));
    check("true_false: payload keeps the two fixed options", tfPayload.question_type === "true_false" && tfPayload.option_a === "Verdadero" && tfPayload.option_b === "Falso" && tfPayload.option_c === "" && tfPayload.option_d === "", JSON.stringify(tfPayload));
    check("true_false: answer comes from the radio", tfPayload.correct_answer === "Falso", JSON.stringify(tfPayload));

    await openForm(cdp, { type: "true_false" });
    state = await fillAndSubmit(cdp, { type: "true_false", validate: [400, { detail: "missing_fields" }], save: saved });
    check("true_false: 400 error copy says two options", state.saveCalls.length === 0 && /dos opciones/.test(state.statusText) && !/cuatro/.test(state.statusText), JSON.stringify(state));
    check("no uncaught page exception", state.errors.length === 0, JSON.stringify(state.errors));

    for (const [width, height] of [[320, 568], [390, 844], [1440, 900]]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 2,
        mobile: width < 768,
      });
      await openForm(cdp, { type: "true_false" });
      state = await fillAndSubmit(cdp, {
        type: "true_false",
        validate: [200, { plausible: false, status: "uncertain", reasons: ["La pregunta es ambigua."] }],
        save: saved,
      });
      check(`${width}x${height}: no horizontal overflow and the note renders`, !state.overflowX && state.statusHidden === false && state.statusText.length > 0, JSON.stringify(state));
    }

    if (failures.length) {
      console.error(`AI_AUTHORING_CHECK_FAIL ${failures.length} assertion(s) failed:\n- ${failures.join("\n- ")}`);
      await cleanup();
      process.exit(1);
    }
    console.log("AI_AUTHORING_CHECK_PASS");
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error(`AI_AUTHORING_CHECK_ERROR: ${error.message}`);
    await cleanup();
    process.exit(1);
  }
}

main();
