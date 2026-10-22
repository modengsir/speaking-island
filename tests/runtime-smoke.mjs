import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

// This check never uses a real API key or sends audio to a provider.
let passed = 0;
async function freePort() {
  const server = createServer(); server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}
async function withServer(password, check) {
  const port = await freePort(), base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", APP_PASSWORD: password, MING_API_KEY: "", APP_ORIGIN: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", data => { logs = (logs + data.toString()).slice(-6000); });
  child.stderr.on("data", data => { logs = (logs + data.toString()).slice(-6000); });
  child.on("error", error => { logs = error.message; });
  try {
    let ready = false;
    for (let n = 0; n < 100; n++) {
      if (child.exitCode !== null) throw new Error(`Preview exited: ${logs}`);
      try { const response = await fetch(base, { signal: AbortSignal.timeout(500) }); await response.arrayBuffer(); ready = true; break; } catch { await delay(100); }
    }
    if (!ready) throw new Error(`Preview failed to start: ${logs}`);
    await check(base);
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const kill = setTimeout(() => child.kill("SIGKILL"), 2000); kill.unref();
      await exited; clearTimeout(kill);
    }
  }
}
function equal(actual, expected) { assert.equal(actual, expected); passed++; }
async function jsonResponse(base, pathname, options = {}) {
  const response = await fetch(base + pathname, options);
  return [response, await response.json()];
}

await withServer("", async base => {
  const page = await fetch(base); equal(page.status, 200);
  assert.match(await page.text(), /开口小岛/); passed++;
  const [response, status] = await jsonResponse(base, "/api/voice/status");
  equal(response.status, 200); equal(status.configured, false); equal(status.authenticated, false);
  for (const endpoint of ["listen", "speak"]) {
    const [response, result] = await jsonResponse(base, "/api/voice/" + endpoint, { method: "POST" });
    equal(response.status, 503); equal(result.code, "access_not_configured");
  }
  const crossOrigin = await fetch(base + "/api/voice/listen", { method: "POST", headers: { Origin: "https://example.invalid" } });
  equal(crossOrigin.status, 403); await crossOrigin.arrayBuffer();
  const manifest = JSON.parse(await readFile("public/media/voice/v2/manifest.json", "utf8"));
  for (const clip of manifest) {
    const response = await fetch(base + clip.file); equal(response.status, 200);
    equal((await response.arrayBuffer()).byteLength, clip.bytes);
  }
  for (const asset of ["/favicon.svg", "/fonts/island-title-black.ttf", "/media/mimi-bear-v2.png", "/media/picnic-background-v2.png", "/media/connection-check-pear.wav"]) {
    const response = await fetch(base + asset); equal(response.status, 200); await response.arrayBuffer();
  }
});

await withServer(randomUUID(), async base => {
  // The server password is intentionally unknown in this unauthenticated pass.
  for (const pathname of ["/", "/api/voice/status", "/api/voice/listen", "/api/voice/speak"]) {
    const response = await fetch(base + pathname, { method: pathname.endsWith("listen") || pathname.endsWith("speak") ? "POST" : "GET" });
    equal(response.status, 401); assert.match(response.headers.get("www-authenticate"), /^Basic /); passed++; await response.arrayBuffer();
  }
});

const testPassword = randomUUID();
await withServer(testPassword, async base => {
  const authorization = "Basic " + Buffer.from("parent:" + testPassword).toString("base64");
  const wrong = await fetch(base, { headers: { authorization: "Basic " + Buffer.from("parent:wrong").toString("base64") } });
  equal(wrong.status, 401); await wrong.arrayBuffer();
  const page = await fetch(base, { headers: { authorization } }); equal(page.status, 200); await page.arrayBuffer();
  const [response, status] = await jsonResponse(base, "/api/voice/status", { headers: { authorization } });
  equal(response.status, 200); equal(status.configured, false); equal(status.authenticated, true);
  for (const endpoint of ["listen", "speak"]) {
    const [response, result] = await jsonResponse(base, "/api/voice/" + endpoint, { method: "POST", headers: { authorization } });
    equal(response.status, 503); equal(result.code, "not_configured");
  }
});
console.log(`Runtime smoke passed: ${passed} checks. No provider calls or real credentials used.`);
