/* Measures the layout at the phone, tablet and desktop viewports the delta names, and fails when
 * a panel clips content it cannot scroll to.
 *
 *   node openspec/changes/mobile-layout-overflow/checks/check_layout.mjs [--file <html>] [--url <base>]
 *
 *   --file  serves that copy of the document instead of the API's, proxying the API calls to
 *           --url. This is how the negative controls run.
 *   --url   the API base (default http://127.0.0.1:8000).
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

const VIEWPORTS = [
  [320, 568],
  [360, 640],
  [390, 844],
  [414, 896],
  [768, 1024],
  [844, 390],
  [1440, 900],
  [1920, 1080],
];

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
      res.writeHead(upstream.status, {
        "content-type": upstream.headers.get("content-type") || "application/json",
      });
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

const MEASURE = `(() => {
  const measure = (id) => {
    const p = document.getElementById(id);
    if (!p) return null;
    const rect = p.getBoundingClientRect();
    let maxBottom = -Infinity;
    let deepest = null;
    for (const el of p.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (r.bottom > maxBottom) { maxBottom = r.bottom; deepest = el; }
    }
    return {
      id,
      panelBottom: Math.round(rect.bottom),
      scrollH: p.scrollHeight,
      clientH: p.clientHeight,
      scrollable: p.scrollHeight > p.clientHeight + 1,
      overflow: Math.round(Math.max(0, maxBottom - window.innerHeight)),
      deepest: deepest ? (deepest.id || deepest.className || deepest.tagName) : null,
      deepestBottom: Math.round(maxBottom)
    };
  };
  const active = [...document.querySelectorAll(".panel.active")].map(p => p.id);
  const bodyOverflow = getComputedStyle(document.body).overflow;
  const panelPosition = getComputedStyle(document.querySelector(".panel")).position;
  const panels = [...document.querySelectorAll(".panel")].map(p => p.id);
  return {
    active,
    bodyOverflow,
    panelPosition,
    panels,
    docScroll: document.documentElement.scrollHeight,
    innerH: window.innerHeight,
    measurements: ["screen-start", "screen-wheel", "screen-question", "screen-winner"].map(measure)
  };
})()`;

const QUESTION_DETAIL = `(() => {
  const q = document.getElementById("q-text");
  const opts = [...document.querySelectorAll("#q-opts .opt")];
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; };
  const rows = [...new Set(opts.map(o => box(o).y))];
  return {
    fontSize: parseFloat(getComputedStyle(q).fontSize),
    optionCount: opts.length,
    optionRows: rows.length,
    options: opts.map(box),
    feedback: (() => { const el = document.getElementById("q-feedback"); return { hidden: el.hidden, box: box(el) }; })(),
    next: (() => { const el = document.getElementById("q-next"); return { hidden: el.hidden, box: box(el) }; })()
  };
})()`;

const WHEEL_DETAIL = `(() => {
  const wheel = document.getElementById("wheel");
  const wr = wheel.getBoundingClientRect();
  const labels = [...document.querySelectorAll(".seg-label")].map(el => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, right: r.right, bottom: r.bottom, text: el.textContent.trim() };
  });
  const overlaps = [];
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i], b = labels[j];
      if (a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom) overlaps.push([i, j]);
    }
  }
  const outside = labels.filter(l => l.x < wr.left - 0.5 || l.right > wr.right + 0.5 || l.y < wr.top - 0.5 || l.bottom > wr.bottom + 0.5).length;
  const spin = document.getElementById("spin").getBoundingClientRect();
  return {
    wheel: { x: Math.round(wr.left), y: Math.round(wr.top), w: Math.round(wr.width), h: Math.round(wr.height) },
    labelCount: labels.length,
    overlaps,
    outside,
    spin: { x: Math.round(spin.left), y: Math.round(spin.top), w: Math.round(spin.width), h: Math.round(spin.height), bottom: Math.round(spin.bottom) }
  };
})()`;

const START_DETAIL = `(() => {
  const details = document.querySelector("#screen-start details");
  if (details) details.open = true;
  const form = document.querySelector("#screen-start form");
  const submit = form ? form.querySelector('button[type="submit"], button:not([type])') : null;
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; };
  const panel = document.getElementById("screen-start");
  return {
    submit: box(submit),
    form: box(form),
    scrollH: panel.scrollHeight,
    clientH: panel.clientHeight,
    scrollable: panel.scrollHeight > panel.clientHeight + 1,
    innerH: window.innerHeight
  };
})()`;

const MEDIA_QUERIES = `(() => {
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
})()`;

async function main() {
  const browser = findBrowser();
  if (!browser) {
    console.error("LAYOUT_CHECK_NO_BROWSER: no Chromium binary found. Set CHROME_PATH.");
    process.exit(2);
  }

  const api = await fetch(`${API_BASE}/categories`).catch(() => null);
  if (!api || !api.ok) {
    console.error(`LAYOUT_CHECK_NO_API: the API at ${API_BASE} did not answer /categories.`);
    process.exit(3);
  }

  let proxy = null;
  let targetUrl = `${API_BASE}/`;
  if (FILE) {
    proxy = await startProxy(path.resolve(FILE));
    targetUrl = `http://127.0.0.1:${proxy.port}/`;
  }

  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "layout-check-"));
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

    const report = [];

    for (const [width, height] of VIEWPORTS) {
      const label = `${width}x${height}`;
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 2,
        mobile: width < 768,
      });
      await cdp.send("Page.navigate", { url: targetUrl });
      await sleep(1400);

      const startDetail = await cdp.eval(START_DETAIL);
      const start = await cdp.eval(MEASURE);

      await cdp.eval(`(() => {
        document.getElementById("name1").value = "Ana";
        document.getElementById("name2").value = "Beto";
        document.getElementById("start").click();
        return true;
      })()`);
      await sleep(800);
      const wheel = await cdp.eval(MEASURE);
      const wheelDetail = await cdp.eval(WHEEL_DETAIL);

      await cdp.eval(`document.getElementById("spin").click()`);
      await sleep(6500);
      const question = await cdp.eval(MEASURE);
      const questionDetail = await cdp.eval(QUESTION_DETAIL);

      const media = await cdp.eval(MEDIA_QUERIES);

      report.push({ viewport: label, start, wheel, question, startDetail, wheelDetail, questionDetail, media });

      /* --- the shell --- */
      check(
        `${label}: exactly one panel is active`,
        start.active.length === 1,
        `active panels: ${JSON.stringify(start.active)}`,
      );
      check(
        `${label}: the panel ids are unchanged`,
        JSON.stringify(start.panels) === JSON.stringify(["screen-start", "screen-wheel", "screen-question", "screen-winner"]),
        `panels: ${JSON.stringify(start.panels)}`,
      );
      check(`${label}: the document does not scroll`, start.docScroll <= start.innerH + 1, `scrollHeight ${start.docScroll} > ${start.innerH}`);
      check(`${label}: body keeps overflow hidden`, start.bodyOverflow === "hidden", `overflow: ${start.bodyOverflow}`);
      check(`${label}: the panel container stays fixed`, start.panelPosition === "fixed", `position: ${start.panelPosition}`);

      for (const phase of [start, wheel, question]) {
        for (const m of phase.measurements) {
          if (!m) continue;
          const clipped = m.overflow > 0 && !m.scrollable;
          check(
            `${label}: ${m.id} clips nothing it cannot scroll to`,
            !clipped,
            `overflow ${m.overflow}px on ${m.deepest} with scrollHeight ${m.scrollH} and clientHeight ${m.clientH}`,
          );
        }
      }

      /* --- the start screen --- */
      check(
        `${label}: the authoring form's submit control is reachable`,
        !!startDetail.submit && startDetail.submit.bottom <= startDetail.innerH + 1,
        `submit control bottom ${startDetail.submit ? startDetail.submit.bottom : "n/a"} against a ${startDetail.innerH}px viewport`,
      );

      /* --- the question screen --- */
      check(
        `${label}: the question text renders at 18px or larger`,
        questionDetail.fontSize >= 18,
        `font-size ${questionDetail.fontSize}px`,
      );
      check(
        `${label}: the options stack in one column below 768px`,
        width >= 768 || questionDetail.optionRows >= 4,
        `the four options occupy ${questionDetail.optionRows} rows`,
      );
      const reachable = (box) => box && box.bottom <= height + 1;
      check(
        `${label}: the options are on screen`,
        questionDetail.options.every(reachable),
        `option bottoms: ${JSON.stringify(questionDetail.options.map((o) => o.bottom))}`,
      );
      check(
        `${label}: the feedback strip and the next control are on screen`,
        reachable(questionDetail.next.box) && reachable(questionDetail.feedback.box),
        `next ${JSON.stringify(questionDetail.next.box)}, feedback ${JSON.stringify(questionDetail.feedback.box)}`,
      );

      /* --- the wheel screen --- */
      check(
        `${label}: the wheel is fully on screen`,
        wheelDetail.wheel.x >= 0 && wheelDetail.wheel.y >= 0 && wheelDetail.wheel.bottom <= height + 1 && wheelDetail.wheel.x + wheelDetail.wheel.w <= width + 1,
        `wheel ${JSON.stringify(wheelDetail.wheel)}`,
      );
      check(
        `${label}: the spin control is fully on screen`,
        wheelDetail.spin.bottom <= height + 1 && wheelDetail.spin.x >= 0 && wheelDetail.spin.x + wheelDetail.spin.w <= width + 1,
        `spin ${JSON.stringify(wheelDetail.spin)}`,
      );
      check(`${label}: the wheel has seven sector labels`, wheelDetail.labelCount === 7, `${wheelDetail.labelCount} labels`);
      check(
        `${label}: no sector label overlaps another`,
        wheelDetail.overlaps.length === 0,
        `overlapping pairs: ${JSON.stringify(wheelDetail.overlaps)}`,
      );
      check(
        `${label}: no sector label crosses the wheel's rim`,
        wheelDetail.outside === 0,
        `${wheelDetail.outside} labels outside the wheel`,
      );
    }

    const media = [...new Set(report.flatMap((r) => r.media))].sort();
    check(
      "the declared breakpoints are unchanged",
      media.length === 3 && media.some((m) => m.includes("768")) && media.some((m) => m.includes("1024")) && media.some((m) => m.includes("640")),
      `the stylesheet declares ${JSON.stringify(media)}`,
    );

    await cleanup();
    fs.writeFileSync(path.join(os.tmpdir(), "layout-report.json"), JSON.stringify(report, null, 2));
    console.log(`\nThe full per-viewport report is in ${path.join(os.tmpdir(), "layout-report.json")}`);
    if (failures.length) {
      console.error(`\nLAYOUT_CHECK_FAIL ${failures.length} assertion(s) failed:\n- ${failures.join("\n- ")}`);
      process.exit(1);
    }
    console.log("\nLAYOUT_CHECK_PASS");
    process.exit(0);
  } catch (err) {
    await cleanup();
    console.error(`LAYOUT_CHECK_ERROR: ${err.message}`);
    process.exit(3);
  }
}

main();
