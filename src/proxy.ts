import { NextRequest, NextResponse } from "next/server";

import { hasPermission, homeForRole, routePermission } from "@/lib/permissions";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

const publicWebhookPrefixes = [
  "/api/webhooks/meta",
  "/api/webhooks/whatsapp",
  "/api/webhooks/ticimax",
  "/api/webhooks/parasut",
];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/_next") || path === "/favicon.ico" || publicWebhookPrefixes.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.AUTH_SECRET || "iceberry-development-secret-change-me",
  );

  if (path === "/login") {
    if (session) return NextResponse.redirect(new URL(homeForRole(session.role), request.url));
    return NextResponse.next();
  }

  if (!session) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(path)}`, request.url));

  const permission = routePermission(path);
  if (permission && !hasPermission(session.role, permission)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
