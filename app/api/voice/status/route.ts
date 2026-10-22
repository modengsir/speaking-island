import { apiKey, MODELS } from "@/lib/ming-server";
import { accessState } from "@/lib/server-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return Response.json({
    configured: Boolean(apiKey()),
    authenticated: accessState(request) === "allowed",
    provider: "Ant Ling",
    models: MODELS,
    modelscopeAvailable: false,
  }, { headers: { "Cache-Control": "no-store" } });
}
