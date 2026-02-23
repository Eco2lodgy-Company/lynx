import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Intercepts /api/auth/error before Auth.js catch-all can return a 400.
 * Reads Nginx proxy headers to construct the correct public redirect URL.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const error = searchParams.get("error") || "Unknown";

    // Behind Nginx, request.url is the internal localhost URL.
    // We must use the forwarded headers to get the real public domain.
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "alphatek.fr";

    const loginUrl = `${proto}://${host}/lynx/login?error=${encodeURIComponent(error)}`;
    return NextResponse.redirect(loginUrl, { status: 302 });
}
