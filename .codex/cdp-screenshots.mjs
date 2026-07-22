import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9444;
const outDir = path.join(cwd, ".codex", "screenshots-cdp");
const userDataDir = path.join(cwd, ".codex", "chrome-cdp-profile");

await mkdir(outDir, { recursive: true });

const proc = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--disable-smooth-scrolling",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  "about:blank"
], { stdio: "ignore" });

async function readJson(url, attempts = 80) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError;
}

try {
  await readJson(`http://127.0.0.1:${port}/json/version`);
  const targets = await readJson(`http://127.0.0.1:${port}/json/list`);
  const target = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
  if (!target) throw new Error("No debuggable page target found");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const events = new Map();
  let id = 1;

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
      return;
    }
    if (message.method && events.has(message.method)) {
      for (const resolve of events.get(message.method).splice(0)) resolve(message);
    }
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  function command(method, params = {}) {
    const messageId = id++;
    ws.send(JSON.stringify({ id: messageId, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(messageId);
        reject(new Error(`Timed out: ${method}`));
      }, 10000);
      pending.set(messageId, (message) => {
        clearTimeout(timer);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result || {});
      });
    });
  }

  function waitEvent(method, timeout = 8000) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), timeout);
      const list = events.get(method) || [];
      list.push((message) => {
        clearTimeout(timer);
        resolve(message);
      });
      events.set(method, list);
    });
  }

  await command("Page.enable");
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false
  });

  async function navigate(url) {
    const loaded = waitEvent("Page.loadEventFired");
    await command("Page.navigate", { url });
    await loaded;
    await command("Runtime.evaluate", {
      expression: `
        (async () => {
          document.documentElement.style.scrollBehavior = "auto";
          document.body.style.scrollBehavior = "auto";
          if (document.fonts && document.fonts.ready) await document.fonts.ready;
          await new Promise((resolve) => setTimeout(resolve, 500));
          return true;
        })()
      `,
      awaitPromise: true
    });
  }

  async function getPositions() {
    const result = await command("Runtime.evaluate", {
      expression: `
        (() => {
          const ids = ["top", "diagnostico", "metodo", "entregas", "virada", "porque", "faq", "lead"];
          const values = {};
          for (const id of ids) {
            const el = document.getElementById(id);
            if (el) values[id] = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - 20));
          }
          const footer = document.querySelector("footer");
          if (footer) values.footer = Math.max(0, Math.round(footer.getBoundingClientRect().top + window.scrollY - 20));
          return values;
        })()
      `,
      returnByValue: true
    });
    return result.result.value;
  }

  async function capture(fileName, y) {
    await command("Runtime.evaluate", {
      expression: `window.scrollTo(0, ${Math.max(0, Math.round(y))});`
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const png = await command("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });
    await writeFile(path.join(outDir, fileName), Buffer.from(png.data, "base64"));
  }

  for (const slug of ["geral", "imobiliaria"]) {
    await navigate(`http://127.0.0.1:5001/${slug}`);
    const positions = await getPositions();
    for (const key of ["top", "metodo", "entregas", "virada", "porque", "faq", "footer"]) {
      await capture(`${slug}-${key}.png`, positions[key] || 0);
    }
  }

  ws.close();
} finally {
  proc.kill();
}
