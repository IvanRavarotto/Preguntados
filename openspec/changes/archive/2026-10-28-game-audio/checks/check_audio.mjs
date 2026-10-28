/* Opens the served game in headless Chromium and asserts the synthesised audio contract: a
 * context is created from the spin gesture, one graph lives during the spin and none outlives it,
 * a second spin leaves exactly one graph, the three cues are distinguishable and each fires once,
 * no audio asset is requested, and no exception escapes.
 *
 *   node openspec/changes/game-audio/checks/check_audio.mjs [--url <base>]
 *
 * Exit codes: 0 = pass, 1 = an assertion failed, 2 = no Chromium binary, 3 = browser/API error.
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
const API_BASE = argOf("--url", process.env.API_BASE || "http://127.0.0.1:8000");
const HTML = path.resolve(argOf("--file", "frontend/index.html"));

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
    this.listeners = new Map();
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
      } else if (msg.method) {
        const list = cdp.listeners.get(msg.method) || [];
        for (const fn of list) fn(msg.params);
      }
    };
    return cdp;
  }
  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
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

const AUDIO_ASSET = /\.(mp3|wav|ogg|oga|m4a|aac|flac|weba)(\?|#|$)/i;

async function main() {
  const browser = findBrowser();
  if (!browser) {
    console.error("AUDIO_CHECK_NO_BROWSER: no Chromium binary found. Set CHROME_PATH.");
    process.exit(2);
  }

  const documentText = fs.readFileSync(HTML, "utf8");
  const requests = [];
  const exceptions = [];

  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "audio-check-"));
  const child = spawn(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--mute-audio",
      "--autoplay-policy=no-user-gesture-required",
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
    await cdp.send("Network.enable");

    cdp.on("Network.requestWillBeSent", (params) => requests.push(params.request.url));
    cdp.on("Runtime.exceptionThrown", (params) =>
      exceptions.push(params.exceptionDetails?.exception?.description || "unknown exception"),
    );

    await cdp.send("Page.navigate", { url: `${API_BASE}/` });
    await sleep(1500);

    /* --- the asset constraint --- */
    check("the document has no <audio> element", !/<audio[\s>]/i.test(documentText), "found <audio");
    check("the document makes no new Audio(...) call", !/new\s+Audio\s*\(/.test(documentText), "found new Audio(");
    check(
      "the document references no audio file",
      !/\.(mp3|wav|ogg|oga|m4a|aac|flac|weba)\b/i.test(documentText) && !/data:audio\//i.test(documentText),
      "found an audio URL or data-URI",
    );

    /* --- the three cue hooks are wired to the real outcome paths --- */
    check(
      "resolveCorrect fires the correct cue",
      /function\s+resolveCorrect[\s\S]{0,160}playCue\("correct"\)/.test(documentText),
      "no playCue(\"correct\") inside resolveCorrect",
    );
    check(
      "resolveFailure fires the incorrect and timeout cues",
      /function\s+resolveFailure[\s\S]{0,200}playCue\(state\s*===\s*"timeout"\s*\?\s*"timeout"\s*:\s*"incorrect"\)/.test(
        documentText,
      ),
      "no timeout/incorrect cue selection inside resolveFailure",
    );

    /* --- drive a match to the wheel screen --- */
    await cdp.eval(`(() => {
      document.getElementById("name1").value = "Ana";
      document.getElementById("name2").value = "Beto";
      document.getElementById("start").click();
      return true;
    })()`);
    await sleep(500);

    /* --- the context is created from the spin gesture and one graph lives --- */
    await cdp.eval(`document.getElementById("spin").click()`);
    await sleep(500);
    const during = await cdp.eval(`window.__audio.getState()`);
    check("an audio context exists after the spin gesture", during.context !== null, `context: ${during.context}`);
    check("the spin graph is started inside the click handler", during.nodes > 0, `nodes: ${during.nodes}`);
    check("exactly one graph is live during the spin", during.liveGraphs === 1, `liveGraphs: ${during.liveGraphs}`);

    await sleep(2000);
    const mid = await cdp.eval(`window.__audio.getState()`);
    check("the graph is still the only one mid-spin", mid.liveGraphs === 1, `liveGraphs: ${mid.liveGraphs}`);

    /* --- the graph stops within 200ms of the wheel settling --- */
    await sleep(2400);
    const settled = await cdp.eval(`window.__audio.getState()`);
    check("no graph outlives the spin", settled.liveGraphs === 0, `liveGraphs: ${settled.liveGraphs}`);
    check("the graph is torn down to zero nodes", settled.nodes === 0, `nodes: ${settled.nodes}`);

    /* --- a second spin leaves exactly one live graph --- */
    await cdp.eval(`(() => {
      const spin = document.getElementById("spin");
      spin.disabled = false;
      spin.click();
      return true;
    })()`);
    await sleep(400);
    const second = await cdp.eval(`window.__audio.getState()`);
    check("a second spin leaves exactly one live graph", second.liveGraphs === 1, `liveGraphs: ${second.liveGraphs}`);

    /* --- the three cues are distinguishable and each fires once --- */
    const cues = await cdp.eval(`(() => {
      const before = window.__audio.getState().cueCounts;
      window.__audio.playCue("correct");
      window.__audio.playCue("incorrect");
      window.__audio.playCue("timeout");
      return { before, after: window.__audio.getState() };
    })()`);
    const counts = cues.after.cueCounts;
    check(
      "each outcome starts exactly one cue",
      counts.correct - cues.before.correct === 1 &&
        counts.incorrect - cues.before.incorrect === 1 &&
        counts.timeout - cues.before.timeout === 1,
      JSON.stringify({ before: cues.before, after: counts }),
    );
    const params = ["correct", "incorrect", "timeout"].map((kind) => {
      const entry = [...cues.after.cues].reverse().find((cue) => cue.kind === kind);
      return entry ? JSON.stringify(entry.params) : `missing:${kind}`;
    });
    check(
      "the three cues differ in their synthesis parameters",
      new Set(params).size === 3,
      JSON.stringify(params),
    );

    /* --- no audio request over the run and no uncaught exception --- */
    const audioRequests = requests.filter((url) => AUDIO_ASSET.test(url) || /^data:audio\//i.test(url));
    check("no audio asset is requested", audioRequests.length === 0, JSON.stringify(audioRequests));
    check("no exception escapes into the game flow", exceptions.length === 0, JSON.stringify(exceptions));

    await cleanup();
    if (failures.length) {
      console.error(`\nAUDIO_CHECK_FAIL ${failures.length} assertion(s) failed:\n- ${failures.join("\n- ")}`);
      process.exit(1);
    }
    console.log("\nAUDIO_CHECK_PASS");
    process.exit(0);
  } catch (err) {
    await cleanup();
    console.error(`AUDIO_CHECK_ERROR: ${err.message}`);
    process.exit(3);
  }
}

main();
