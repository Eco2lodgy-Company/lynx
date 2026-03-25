import { auth } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { headers } from "next/headers";

/**
 * Universal helper to get the current user, supporting both:
 * 1. NextAuth Session (Browser cookies)
 * 2. JWT Bearer Token (Mobile app)
 */
export async function getAuthorizedUser() {
    // 1. Check for NextAuth session (Cookies)
    const session = await auth();
    if (session?.user) {
        return session.user;
    }

    // 2. Check for Authorization header (Mobile JWT)
    const headersList = await headers();
    const authHeader = headersList.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        
        try {
            const secret = process.env.NEXTAUTH_SECRET || "fallback_development_secret_only";
            const decoded = jwt.verify(token, secret) as any;
            
            if (decoded && decoded.id) {
                return {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role,
                };
            }
        } catch (error) {
            console.error("JWT verification failed:", error);
            return null;
        }
    }

    return null;
}
