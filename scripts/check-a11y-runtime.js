/**
 * Runtime accessibility checks, in a real browser.
 *
 * Every other check in this repo is static, but the defects that matter most only
 * exist at runtime: a skip link that is not the first tab stop, focus that escapes
 * an open dialog, a focus ring that resolves to nothing. Those cannot be seen in
 * the source.
 *
 * Zero new dependencies by design: it drives headless Chrome over the DevTools
 * Protocol using the WebSocket client built into Node 18+, and uses the Chrome
 * already installed on the machine. No Puppeteer, no Playwright.
 *
 * Usage:
 *   node scripts/check-a11y-runtime.js [baseUrl]
 *   BASE_URL=http://localhost:4321 node scripts/check-a11y-runtime.js
 *
 * Start a server first (`npm run dev`, or `npm run preview` after a build).
 * Exits non-zero if any check fails, so it is safe to wire into a gate later.
 *
 * NOT part of `npm run lint` or CI yet — adding a required build step is a
 * pipeline decision, not this script's call.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE_URL = process.argv[2] || process.env.BASE_URL || "http://localhost:4321";
const CDP_PORT = Number(process.env.CDP_PORT || 9222);

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForCdp(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);

      if (res.ok) return true;
    } catch {
      // Not listening yet.
    }
    await sleep(250);
  }
  return false;
}

/** Minimal CDP session over the built-in WebSocket. */
async function connect() {
  const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
  const page = targets.find((t) => t.type === "page");

  if (!page) throw new Error("no page target available");

  const ws = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const eventWaiters = new Map();

  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);

    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);

      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      return;
    }
    if (msg.method && eventWaiters.has(msg.method)) {
      const waiters = eventWaiters.get(msg.method);

      eventWaiters.delete(msg.method);
      waiters.forEach((r) => r(msg.params));
    }
  });

  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const n = ++id;

      pending.set(n, { res, rej });
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  const waitForEvent = (method, timeoutMs = 60000) =>
    new Promise((res, rej) => {
      if (!eventWaiters.has(method)) eventWaiters.set(method, []);
      eventWaiters.get(method).push(res);
      setTimeout(() => rej(new Error(`timeout waiting for ${method}`)), timeoutMs);
    });

  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });

    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || "evaluate failed");
    }
    return r.result.value;
  };

  const goto = async (url, width, height) => {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 1025,
    });
    // Arm the listener BEFORE navigating: an in-flight evaluate is rejected when
    // navigation destroys the execution context.
    const loaded = waitForEvent("Page.loadEventFired");

    await send("Page.navigate", { url });
    await loaded;
    // Let client scripts that relocate DOM (the mobile drawer) settle.
    await evaluate(`new Promise(r => setTimeout(r, 1200))`);
  };

  const pressTab = async (shift = false) => {
    const base = {
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 9,
      key: "Tab",
      code: "Tab",
      modifiers: shift ? 8 : 0,
    };

    await send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...base });
    await send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
  };

  await send("Page.enable");
  await send("Runtime.enable");
  // Without focus emulation, :focus styles never match in headless.
  try {
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  } catch {
    // Older Chrome: focus checks will be skipped rather than reported wrong.
  }

  return { send, evaluate, goto, pressTab, close: () => ws.close() };
}

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "  PASS" : "  FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const FIRST_FOCUSABLE = `(() => {
  const sel = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]';
  const el = [...document.querySelectorAll(sel)].filter((e) => {
    if (e.tabIndex < 0) return false;
    const cs = getComputedStyle(e);
    if (cs.visibility === "hidden" || cs.display === "none") return false;
    if (e.closest("[inert]") || e.closest("[hidden]")) return false;
    return e.getClientRects().length > 0 || cs.position === "fixed";
  })[0];
  if (!el) return { none: true };
  return {
    isSkipLink: el.classList.contains("skip-link"),
    inMobileDrawer: !!el.closest(".mobile"),
    label: (el.getAttribute("aria-label") || el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40),
  };
})()`;

async function run() {
  const chrome = findChrome();

  if (!chrome) {
    console.error("Chrome not found. Set CHROME_PATH to the executable.");
    process.exit(2);
  }

  const profile = mkdtempSync(path.join(tmpdir(), "a11y-chrome-"));
  const proc = spawn(
    chrome,
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let session;

  try {
    if (!(await waitForCdp())) throw new Error("Chrome did not expose a CDP endpoint");
    session = await connect();

    console.log(`\nRuntime accessibility checks against ${BASE_URL}\n`);

    // 1. The skip link must be the first tab stop (WCAG 2.4.1). It was not:
    //    the mobile drawer is moved to the top of <body> by script and stayed
    //    display:flex at desktop, so its links came first.
    for (const width of [1280, 390]) {
      await session.goto(`${BASE_URL}/`, width, 900);
      const first = await session.evaluate(FIRST_FOCUSABLE);

      record(
        `first tab stop is the skip link @${width}px`,
        Boolean(first.isSkipLink),
        first.none ? "nothing focusable" : `got "${first.label}"${first.inMobileDrawer ? " (inside mobile drawer)" : ""}`
      );
    }

    // 2. An open dialog must contain Tab (WCAG 2.1.2). The popover API gives
    //    light-dismiss but no focus containment.
    await session.goto(`${BASE_URL}/`, 1280, 900);
    const opened = await session.evaluate(`(() => {
      const t = document.querySelector(".quick-actions-button");
      if (!t) return false;
      t.click();
      return true;
    })()`);

    if (!opened) {
      record("dialog traps focus", false, "quick-actions trigger not found");
    } else {
      await session.evaluate(`new Promise(r => setTimeout(r, 400))`);
      const count = await session.evaluate(`(() => {
        const p = document.querySelector(".quick-actions-modal");
        if (!p) return 0;
        return [...p.querySelectorAll("a[href],button:not([disabled]),[tabindex]")]
          .filter((e) => e.tabIndex >= 0 && e.getClientRects().length).length;
      })()`);
      let escapes = 0;

      for (let i = 0; i < count + 3; i++) {
        await session.pressTab(false);
        const inside = await session.evaluate(
          `!!document.activeElement?.closest(".modal-popover")`
        );

        if (!inside) escapes++;
      }
      record("dialog traps focus (Tab stays inside)", escapes === 0, `${escapes} escape(s) over ${count + 3} presses`);
    }

    // 3. Form fields must have a focus indicator that does not depend solely on a
    //    box-shadow, which any overflow-hidden ancestor can clip.
    await session.goto(`${BASE_URL}/inquiry/`, 1280, 900);
    // Reached by real Tab presses, not el.focus(). The indicator is now keyed to
    // :focus-visible, and a programmatic focus() does not match it on a <select> —
    // testing that way would report a pass the keyboard user never sees, and would
    // miss a select-only regression entirely.
    //
    // Anchored on the <select> specifically: it is the control A3 was raised about,
    // and the one where :focus-visible and :focus genuinely differ.
    await session.evaluate(`(() => {
      const s = document.querySelector("select:not([disabled])");
      if (!s) return false;
      // Park focus on the field before it, so one Tab lands on the select.
      const all = [...document.querySelectorAll("a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled])")]
        .filter((e) => e.tabIndex >= 0 && e.getClientRects().length);
      const i = all.indexOf(s);
      if (i > 0) all[i - 1].focus();
      return true;
    })()`);
    await session.pressTab(false);

    const focusStyles = await session.evaluate(`(() => {
      const el = document.activeElement;
      if (!el || el.tagName === "BODY") return { missing: true };
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        matchesFocusVisible: el.matches(":focus-visible"),
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        boxShadow: cs.boxShadow !== "none",
      };
    })()`);

    if (focusStyles.missing) {
      record("keyboard focus shows an indicator on form fields", false, "Tab reached nothing");
    } else {
      const hasOutline =
        focusStyles.outlineStyle !== "none" && parseFloat(focusStyles.outlineWidth) > 0;

      record(
        "keyboard focus shows an outline, not only a clippable shadow",
        hasOutline && focusStyles.matchesFocusVisible,
        `<${focusStyles.tag}> :focus-visible=${focusStyles.matchesFocusVisible}, outline: ${focusStyles.outlineStyle} ${focusStyles.outlineWidth}`
      );
    }
  } finally {
    session?.close();
    proc.kill();
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      // Chrome may still hold a handle on Windows; the temp dir is disposable.
    }
  }

  const failed = results.filter((r) => !r.pass);

  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed\n`
  );
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(`\nHarness error: ${err.message}`);
  process.exit(2);
});
