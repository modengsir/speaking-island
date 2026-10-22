import { timingSafeEqual } from "node:crypto";

export type AccessEnvironment = { NODE_ENV?: string; APP_PASSWORD?: string };
export type AccessState = "allowed" | "password_required" | "production_locked";

// A shared family/demo password replaces platform-specific sign-in in this export.
// Production never enables paid API calls without an explicit access password.
export function accessState(request: Request, environment: AccessEnvironment = process.env): AccessState {
  const password = environment.APP_PASSWORD ?? "";
  if (password) {
    const authorization = request.headers.get("authorization") ?? "";
    if (authorization.length > 4096 || !/^Basic /i.test(authorization)) return "password_required";
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const actual = Buffer.from(decoded, "utf8"), expected = Buffer.from(`parent:${password}`, "utf8");
    return actual.length === expected.length && timingSafeEqual(actual, expected) ? "allowed" : "password_required";
  }
  const host = new URL(request.url).hostname;
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(host);
  return environment.NODE_ENV !== "production" && loopback ? "allowed" : "production_locked";
}

export function passwordChallenge(): Response {
  return new Response("请使用家长访问口令。用户名：parent。", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Speaking Island", charset="UTF-8"',
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

// An explicit external origin supports HTTPS reverse proxies without trusting
// arbitrary client-supplied forwarded headers. CLI clients may omit Origin.
export function sameOrigin(request: Request, configuredOrigin = process.env.APP_ORIGIN): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const expected = configuredOrigin?.trim() ? new URL(configuredOrigin.trim()).origin : new URL(request.url).origin;
    return origin === expected;
  } catch {
    return false;
  }
}
