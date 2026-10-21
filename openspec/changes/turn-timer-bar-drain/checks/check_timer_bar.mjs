/* Verifies the turn timer bar against the shipped document.
 *
 *   node openspec/changes/turn-timer-bar-drain/checks/check_timer_bar.mjs [--file <html>] [--url <base>]
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

const READ_BAR = `(() => {
  const bar = document.getElementById("tbar");
  const track = document.getElementById("q-timer");
  if (!bar || !track) return null;
  const rect = bar.getBoundingClientRect();
  const anims = bar.getAnimations().map(a => ({ type: a.constructor.name, prop: a.transitionProperty || null }));
  return {
    width: rect.width,
    trackWidth: track.getBoundingClientRect().width,
    background: getComputedStyle(bar).backgroundColor,
    transitionProperty: getComputedStyle(bar).transitionProperty,
    anims,
    ariaNow: track.getAttribute("aria-valuenow"),
    questionActive: document.getElementById("screen-question").classList.contains("active")
  };
})()`;

const hexToRgb = (hex) => {
  const m = /^#([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "timer-bar-check-"));
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
    await sleep(1500);

    const source = await cdp.eval(`document.documentElement.outerHTML`);

    await cdp.eval(`(() => {
      document.getElementById("name1").value = "Ana";
      document.getElementById("name2").value = "Beto";
      document.getElementById("start").click();
      return true;
    })()`);
    await sleep(400);
    await cdp.eval(`document.getElementById("spin").click()`);

    let appeared = null;
    for (let i = 0; i < 120; i++) {
      const bar = await cdp.eval(READ_BAR);
      if (bar && bar.questionActive && bar.width > 0) {
        appeared = bar;
        break;
      }
      await sleep(100);
    }

    check("the question screen appears", !!appeared, "the question panel never became active with a visible bar");
    if (!appeared) {
      await cleanup();
      process.exit(1);
    }

    check(
      "the bar has a running width transition",
      appeared.anims.some((a) => a.prop === "width"),
      `no width transition among ${JSON.stringify(appeared.anims)}`,
    );
    check("the bar starts wider than empty", appeared.width > 1, `rendered width ${appeared.width}px`);
    check(
      "the bar's colour is the category accent while the turn is healthy",
      appeared.background === hexToRgb(await cdp.eval(`getComputedStyle(document.getElementById("screen-question")).getPropertyValue("--accent")`)),
      `bar background ${appeared.background}`,
    );

    const first = await cdp.eval(READ_BAR);
    await sleep(1200);
    const second = await cdp.eval(READ_BAR);
    check("the bar drains across the countdown", second.width < first.width, `${first.width}px -> ${second.width}px`);
    check(
      "the published remaining time decreases",
      Number(second.ariaNow) < Number(first.ariaNow),
      `aria-valuenow ${first.ariaNow} -> ${second.ariaNow}`,
    );
    check(
      "the published remaining time stays within the turn",
      Number(second.ariaNow) >= 0 && Number(second.ariaNow) <= 20,
      `aria-valuenow ${second.ariaNow}`,
    );

    await sleep(14800);
    const late = await cdp.eval(READ_BAR);
    check(
      "the bar shifts to the failure accent below a fifth of the turn",
      late.background === "rgb(255, 42, 109)",
      `bar background ${late.background} with aria-valuenow ${late.ariaNow}`,
    );

    const hasReadout = await cdp.eval(`!!document.getElementById("tnum")`);
    check("the question screen carries no numeric countdown", hasReadout === false, "#tnum is still in the document");

    const thresholdIsProportional = /TIMER_URGENT_RATIO\s*=\s*0\.2/.test(source) && /ratio\s*<\s*TIMER_URGENT_RATIO/.test(source);
    check("the urgency threshold is a proportion of the timer", thresholdIsProportional, "the threshold is not read from TIMER_URGENT_RATIO");

    await cleanup();
    console.log(
      JSON.stringify(
        {
          samples: {
            atQuestion: appeared,
            afterOneSecond: first,
            afterTwoSeconds: second,
            belowFifth: late,
          },
        },
        null,
        2,
      ),
    );
    if (failures.length) {
      console.error(`\nTIMER_BAR_CHECK_FAIL ${failures.length} assertion(s) failed:\n- ${failures.join("\n- ")}`);
      process.exit(1);
    }
    console.log("\nTIMER_BAR_CHECK_PASS");
    process.exit(0);
  } catch (err) {
    await cleanup();
    console.error(`CHROME_CHECK_ERROR: ${err.message}`);
    process.exit(3);
  }
}

main();
