import { NextResponse } from "next/server";

/**
 * Auth.js v5 sometimes redirects to /api/auth/error when an
 * authentication error occurs. This specific route handler intercepts
 * that request (taking priority over the [...nextauth] catch-all) and
 * redirects the user cleanly to the login page.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const error = searchParams.get("error") || "Unknown";
    return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
    );
}
