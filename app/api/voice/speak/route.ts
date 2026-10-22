import { authorize, fail, mingFetch, MODELS, providerError } from "@/lib/ming-server";
import { SPEECH, type SpeechId } from "@/lib/lesson";
// Fixed phrases only: children cannot turn this endpoint into arbitrary speech generation.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = await authorize(request); if (denied) return denied;
  if (Number(request.headers.get("content-length")) > 1024) return fail("请求太长。", 413);
  try {
    const body = await request.text(); if (body.length > 1024) return fail("请求太长。", 413);
    let parsed: { phrase?: unknown };
    try { parsed = JSON.parse(body); } catch { return fail("请求格式无效。"); }
    const { phrase } = parsed ?? {};
    if (typeof phrase !== "string" || !Object.hasOwn(SPEECH, phrase)) return fail("请选择关卡中的句子。");
    const response = await mingFetch("/audio/speech", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODELS.tts, input: SPEECH[phrase as SpeechId], voice: "UK_Charlotte", instructions: "Speak warmly and clearly, like a friendly storybook guide speaking to a young English learner. Use gentle, natural pauses.", response_format: "mp3", speed: 0.85 }),
    }, request.signal);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 2_000_000 || bytes.byteLength < 100) return fail("语音输出异常，请重试。", 502);
    return new Response(bytes, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=3600", "X-Voice-Model": MODELS.tts } });
  } catch (error) { return providerError(error); }
}
