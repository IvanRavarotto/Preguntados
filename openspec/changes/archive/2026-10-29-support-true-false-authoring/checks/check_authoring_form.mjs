/* Verifies the start-screen authoring form for the true/false change.
 *
 *   node openspec/changes/support-true-false-authoring/checks/check_authoring_form.mjs [--url <base>]
 *
 * The default base is http://127.0.0.1:8001, a local API serving the working tree.
 * Submissions are intercepted in the page so the check never persists a question.
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

const INSTALL_HARNESS = `(() => {
  window.__qa = { payloads: [], respond: [201, { id: 999, category: "arte", confidence_score: 0.9 }], errors: [] };
  window.addEventListener("error", (event) => window.__qa.errors.push(String(event.message)));
  window.addEventListener("unhandledrejection", (event) => window.__qa.errors.push(String(event.reason)));
  const original = window.fetch;
  window.fetch = async (url, options) => {
    if (String(url).includes("/questions")) {
      window.__qa.payloads.push(JSON.parse(options.body));
      const [status, body] = window.__qa.respond;
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return original(url, options);
  };
  document.getElementById("authoring").open = true;
  return true;
})()`;

const INITIAL_STATE = `(() => {
  const visible = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      if (node.hidden || style.display === "none" || style.visibility === "hidden") return false;
      node = node.parentElement;
    }
    return !!(el.getClientRects().length);
  };
  const rows = ["a", "b", "c", "d"].map((letter) => {
    const row = letter === "c" || letter === "d" ? document.getElementById("option-row-" + letter) : null;
    return { letter, rowHidden: row ? row.hidden : false };
  });
  return {
    type: document.getElementById("q-type").value,
    a: document.getElementById("q-option-a").value,
    b: document.getElementById("q-option-b").value,
    readOnlyA: document.getElementById("q-option-a").readOnly,
    readOnlyB: document.getElementById("q-option-b").readOnly,
    visibleTextInputs: ["a", "b", "c", "d"].filter((letter) => visible(document.getElementById("q-option-" + letter))).length,
    visibleRadios: [...document.querySelectorAll('input[name="correct-option"]')].filter(visible).map((r) => r.value),
    checked: [...document.querySelectorAll('input[name="correct-option"]:checked')].map((r) => r.value),
    rows,
    hiddenC: document.getElementById("option-row-c").hidden,
    hiddenD: document.getElementById("option-row-d").hidden,
    optionC: document.getElementById("q-option-c").value,
    optionD: document.getElementById("q-option-d").value,
  };
})()`;

const STATUS = `(() => {
  const el = document.getElementById("authoring-status");
  return { text: el.textContent, className: el.className, hidden: el.hidden };
})()`;

const QA_STATE = `(() => ({
  payloads: window.__qa.payloads,
  errors: window.__qa.errors,
  type: document.getElementById("q-type").value,
  a: document.getElementById("q-option-a").value,
  b: document.getElementById("q-option-b").value,
  c: document.getElementById("q-option-c").value,
  d: document.getElementById("q-option-d").value,
  hiddenC: document.getElementById("option-row-c").hidden,
  hiddenD: document.getElementById("option-row-d").hidden,
  checked: [...document.querySelectorAll('input[name="correct-option"]:checked')].map((r) => r.value),
  status: (() => { const el = document.getElementById("authoring-status"); return { text: el.textContent, className: el.className, hidden: el.hidden }; })(),
}))()`;

async function setType(cdp, value) {
  await cdp.eval(`(() => {
    const select = document.getElementById("q-type");
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return select.value;
  })()`);
}

async function submit(cdp, respond) {
  await cdp.eval(`(() => {
    window.__qa.respond = ${JSON.stringify(respond)};
    document.getElementById("authoring-form").requestSubmit();
    return true;
  })()`);
  await sleep(400);
}

async function main() {
  const browser = findBrowser();
  if (!browser) {
    console.error("AUTHORING_CHECK_NO_BROWSER: no Chromium binary found. Set CHROME_PATH.");
    process.exit(2);
  }
  const api = await fetch(`${API_BASE}/categories`).catch(() => null);
  if (!api || !api.ok) {
    console.error(`AUTHORING_CHECK_NO_API: ${API_BASE} did not answer /categories.`);
    process.exit(3);
  }

  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "authoring-check-"));
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
    await cdp.send("Page.navigate", { url: `${API_BASE}/` });
    await sleep(1400);
    await cdp.eval(INSTALL_HARNESS);

    const initial = await cdp.eval(INITIAL_STATE);
    check("default type is multiple_choice", initial.type === "multiple_choice", `got ${initial.type}`);
    check("default shows four editable options", initial.visibleTextInputs === 4 && initial.visibleRadios.length === 4, JSON.stringify(initial));
    check("default A/B are editable", initial.readOnlyA === false && initial.readOnlyB === false, JSON.stringify(initial));

    await cdp.eval(`document.getElementById("correct-c").click()`);
    await setType(cdp, "true_false");
    const tf = await cdp.eval(INITIAL_STATE);
    check("true_false fixes A/B to Verdadero/Falso", tf.a === "Verdadero" && tf.b === "Falso", JSON.stringify(tf));
    check("true_false A/B are readOnly, not disabled", tf.readOnlyA === true && tf.readOnlyB === true, JSON.stringify(tf));
    check("true_false hides and clears C/D", tf.hiddenC === true && tf.hiddenD === true && tf.optionC === "" && tf.optionD === "", JSON.stringify(tf));
    check("true_false leaves only A/B visible and selectable", JSON.stringify(tf.visibleRadios) === JSON.stringify(["a", "b"]), JSON.stringify(tf));
    check("true_false clears a previously selected C/D radio", tf.checked.length === 0, JSON.stringify(tf.checked));

    await cdp.eval(`(() => {
      document.getElementById("q-question").value = "Verdadero o falso: el Aconcagua está en Mendoza.";
      document.getElementById("correct-b").click();
      return true;
    })()`);
    await submit(cdp, [201, { id: 999, category: "arte", confidence_score: 0.9 }]);
    const tfSaved = await cdp.eval(QA_STATE);
    const tfPayload = tfSaved.payloads[tfSaved.payloads.length - 1] || {};
    check("true_false payload carries the type", tfPayload.question_type === "true_false", JSON.stringify(tfPayload));
    check("true_false payload carries Verdadero/Falso", tfPayload.option_a === "Verdadero" && tfPayload.option_b === "Falso", JSON.stringify(tfPayload));
    check("true_false payload sends empty C/D", tfPayload.option_c === "" && tfPayload.option_d === "", JSON.stringify(tfPayload));
    check("true_false payload uses the checked radio", tfPayload.correct_answer === "Falso", JSON.stringify(tfPayload));
    check("success message names id, category and confidence", /#999/.test(tfSaved.status.text) && /Arte y Cultura/.test(tfSaved.status.text) && /90%/.test(tfSaved.status.text) && tfSaved.status.className === "auth-ok", JSON.stringify(tfSaved.status));
    check("success resets to multiple_choice with four rows", tfSaved.type === "multiple_choice" && tfSaved.hiddenC === false && tfSaved.hiddenD === false && tfSaved.a === "" && tfSaved.b === "" && tfSaved.checked.length === 0, JSON.stringify(tfSaved));

    await setType(cdp, "true_false");
    await cdp.eval(`(() => {
      document.getElementById("q-question").value = "Verdadero o falso: prueba de error.";
      document.getElementById("correct-a").click();
      return true;
    })()`);
    await submit(cdp, [400, { detail: "missing_fields" }]);
    const tfError = await cdp.eval(QA_STATE);
    check("true_false error copy says two options", /dos opciones/.test(tfError.status.text) && !/cuatro/.test(tfError.status.text) && tfError.status.className === "err", JSON.stringify(tfError.status));

    await setType(cdp, "multiple_choice");
    const mc = await cdp.eval(INITIAL_STATE);
    check("switching back restores four editable rows", mc.visibleTextInputs === 4 && mc.visibleRadios.length === 4 && mc.readOnlyA === false && mc.readOnlyB === false, JSON.stringify(mc));
    check("switching back clears the fixed labels", mc.a === "" && mc.b === "", JSON.stringify(mc));
    await cdp.eval(`(() => {
      document.getElementById("q-question").value = "Pregunta de prueba múltiple.";
      document.getElementById("q-option-a").value = "Uno";
      document.getElementById("q-option-b").value = "Dos";
      document.getElementById("q-option-c").value = "Tres";
      document.getElementById("q-option-d").value = "Cuatro";
      document.getElementById("correct-a").click();
      return true;
    })()`);
    await submit(cdp, [400, { detail: "missing_fields" }]);
    const mcError = await cdp.eval(QA_STATE);
    const mcPayload = mcError.payloads[mcError.payloads.length - 1] || {};
    check("multiple_choice payload keeps the four options and type", mcPayload.question_type === "multiple_choice" && mcPayload.option_c === "Tres" && mcPayload.option_d === "Cuatro", JSON.stringify(mcPayload));
    check("multiple_choice error copy says four options", /cuatro opciones/.test(mcError.status.text) && mcError.status.className === "err", JSON.stringify(mcError.status));

    check("no uncaught page exception", mcError.errors.length === 0, JSON.stringify(mcError.errors));

    const media = await cdp.eval(`(() => {
      const out = [];
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; }
        for (const rule of rules) {
          if (rule.type === CSSRule.MEDIA_RULE && /width/.test(rule.conditionText || rule.media.mediaText || "")) {
            out.push((rule.conditionText || rule.media.mediaText).replace(/\\s+/g, " "));
          }
        }
      }
      return out;
    })()`);
    const breakpoints = media.map((text) => (text.match(/(\d+)px/) || [])[1]).filter(Boolean).sort();
    check("media queries stay 640/768/1024", JSON.stringify(breakpoints) === JSON.stringify(["1024", "640", "768"]), JSON.stringify(media));

    await cdp.send("Page.navigate", { url: `${API_BASE}/` });
    await sleep(1200);
    await cdp.eval(`(() => {
      document.getElementById("name1").value = "Ana";
      document.getElementById("name2").value = "Beto";
      document.getElementById("start").click();
      return true;
    })()`);
    await sleep(900);
    const rendered = await cdp.eval(`(() => {
      renderQuestion({
        question: "Verdadero o falso: el Aconcagua está en Mendoza.",
        option_a: "Verdadero",
        option_b: "Falso",
        option_c: null,
        option_d: null,
        answer: "Verdadero",
        category: "arte"
      });
      const options = [...document.querySelectorAll("#q-opts .opt")];
      return { count: options.length, texts: options.map((option) => option.textContent.trim()) };
    })()`);
    check("an authored true/false question renders two options", rendered.count === 2, JSON.stringify(rendered));
    const renderedLabels = rendered.texts.map((text) => text.replace(/^[A-D]/, "")).sort();
    check("the rendered options are Verdadero and Falso", JSON.stringify(renderedLabels) === JSON.stringify(["Verdadero", "Falso"].sort()), JSON.stringify(rendered));

    for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1440, 900]]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 2,
        mobile: width < 768,
      });
      await cdp.send("Page.navigate", { url: `${API_BASE}/` });
      await sleep(1200);
      await cdp.eval(INSTALL_HARNESS);
      await setType(cdp, "true_false");
      const geometry = await cdp.eval(`(() => {
        const panel = document.getElementById("screen-start");
        const ids = ["q-type", "q-option-a", "q-option-b", "correct-a", "correct-b", "authoring-form"];
        const boxes = ids.map((id) => {
          const el = document.getElementById(id);
          const r = el.getBoundingClientRect();
          return { id, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) };
        });
        const submit = document.querySelector("#authoring-form .auth-submit").getBoundingClientRect();
        const reachable = boxes.every((b) => b.w > 0 && b.h > 0);
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          reachable,
          boxes,
          submit: { w: Math.round(submit.width), h: Math.round(submit.height) },
          panelScroll: panel.scrollHeight > panel.clientHeight + 1,
        };
      })()`);
      const fit = geometry.scrollWidth <= geometry.clientWidth + 1;
      check(`${width}x${height}: no horizontal overflow and controls rendered`, fit && geometry.reachable && geometry.submit.w > 0, JSON.stringify(geometry));
    }

    if (failures.length) {
      console.error(`AUTHORING_CHECK_FAIL ${failures.length} assertion(s) failed:\n- ${failures.join("\n- ")}`);
      await cleanup();
      process.exit(1);
    }
    console.log("AUTHORING_CHECK_PASS");
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error(`AUTHORING_CHECK_ERROR: ${error.message}`);
    await cleanup();
    process.exit(1);
  }
}

main();
