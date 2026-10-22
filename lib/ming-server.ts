import { accessState, sameOrigin } from "@/lib/server-access";
export const MODELS = { asr: "Ming-3.0-asr-tiny", understanding: "Ming-3.0-audio-flash", tts: "Ming-3.0-tts" };
const API = "https://api.ant-ling.com/v1";
export function apiKey(): string | undefined { return process.env.MING_API_KEY?.trim(); }
export function fail(message: string, status = 400, code = "invalid_request") {
  return Response.json({ error: message, code }, { status, headers: { "Cache-Control": "no-store" } });
}
const buckets = new Map<string, { count: number; until: number }>();
export async function authorize(request: Request): Promise<Response | null> {
  if (!sameOrigin(request)) return fail("请从应用页面发起请求。", 403);
  const access = accessState(request);
  if (access === "production_locked") return fail("部署者需要配置家长访问口令，才能开启在线语音。", 503, "access_not_configured");
  if (access !== "allowed") return fail("请使用家长访问口令后再进行语音练习。", 401, "unauthorized");
  if (!apiKey()) return fail("语音服务还未开通，请先玩图卡模式。", 503, "not_configured");
  const now = Date.now();
  for (const [key, value] of buckets) if (value.until < now) buckets.delete(key);
  const b = buckets.get("family") ?? { count: 0, until: now + 60_000 };
  if (++b.count > 20) return fail("休息一下，稍后再试。", 429, "rate_limit");
  buckets.set("family", b);
  return null;
}
export async function mingFetch(path: string, init: RequestInit, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(40_000);
  const signals = signal ? AbortSignal.any([timeout, signal]) : timeout;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey()}`);
  const response = await fetch(`${API}${path}`, { ...init, headers, signal: signals });
  if (!response.ok) {
    // Only transport metadata: never log recordings, transcripts, headers or provider bodies.
    console.warn("ming_provider_error", { path, status: response.status });
    // Provider bodies can include account details; never relay them to the browser.
    await response.body?.cancel();
    throw new Error(response.status === 401 || response.status === 403 ? "provider_auth" : response.status === 429 ? "provider_busy" : "provider_error");
  }
  return response;
}
export function providerError(error: unknown) {
  const key = error instanceof Error ? error.message : "";
  if (key === "provider_auth") return fail("语音服务权限需要家长检查，请先玩图卡。", 502, key);
  if (key === "provider_busy") return fail("百灵语音服务暂时限流，请稍等片刻再试。", 429, key);
  if (error instanceof Error && error.name === "TimeoutError") return fail("语音服务响应超时，请稍后再试。", 504, "provider_timeout");
  return fail("小熊的语音暂时没有连上，请稍后再试，或使用图卡。", 502, "provider_unavailable");
}
export function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export function wavDuration(bytes: Uint8Array): number | null {
  if (bytes.length < 44 || bytes.length > 600_000) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (i: number, n: number) => String.fromCharCode(...bytes.subarray(i, i + n));
  if (tag(0, 4) !== "RIFF" || tag(8, 4) !== "WAVE") return null;
  let rate = 0, data = 0;
  for (let p = 12; p + 8 <= bytes.length;) {
    const size = view.getUint32(p + 4, true);
    if (p + 8 + size > bytes.length) return null;
    if (tag(p, 4) === "fmt ") {
      if (size < 16 || view.getUint16(p + 8, true) !== 1 || view.getUint16(p + 10, true) !== 1 || view.getUint16(p + 22, true) !== 16) return null;
      const sampleRate = view.getUint32(p + 12, true);
      rate = view.getUint32(p + 16, true);
      if (sampleRate !== 16000 || rate !== 32000) return null;
    }
    if (tag(p, 4) === "data") data = size;
    p += 8 + size + (size % 2);
  }
  return rate && data ? data / rate : null;
}
