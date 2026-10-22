import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { accessState, passwordChallenge } from "./lib/server-access";

export function proxy(request: NextRequest) {
  if (accessState(request) === "password_required") return passwordChallenge();
  return NextResponse.next();
}

// Public illustrations and fixed demo clips contain no user data.
export const config = { matcher: ["/", "/api/voice/:path*"] };
