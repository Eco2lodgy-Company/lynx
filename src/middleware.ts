import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const userRole = req.auth?.user?.role;

    const isLoginPage = nextUrl.pathname === "/login";
    const isApiRoute = nextUrl.pathname.startsWith("/api");
    const isPublicRoute = nextUrl.pathname === "/" || isLoginPage;

    // Laisser passer les routes API
    if (isApiRoute) {
        return NextResponse.next();
    }

    // Rediriger vers le dashboard si déjà connecté et sur la page login
    if (isLoginPage && isLoggedIn && userRole) {
        const redirectMap: Record<string, string> = {
            ADMIN: "/admin/dashboard",
            CONDUCTEUR: "/conducteur/dashboard",
            CHEF_EQUIPE: "/chef-equipe/dashboard",
            CLIENT: "/client/dashboard",
            OUVRIER: "/ouvrier/dashboard",
        };
        const redirect = redirectMap[userRole] || "/login";
        return NextResponse.redirect(new URL(redirect, nextUrl));
    }

    // Rediriger vers login si non connecté et route protégée
    if (!isLoggedIn && !isPublicRoute) {
        return NextResponse.redirect(new URL("/login", nextUrl));
    }

    // Vérification des accès par rôle
    if (isLoggedIn && userRole) {
        const roleRoutes: Record<string, string[]> = {
            ADMIN: ["/admin"],
            CONDUCTEUR: ["/conducteur"],
            CHEF_EQUIPE: ["/chef-equipe"],
            CLIENT: ["/client"],
            OUVRIER: ["/ouvrier"],
        };

        const allowedPrefixes = roleRoutes[userRole] || [];
        const isDashboardRoute = nextUrl.pathname.startsWith("/admin") ||
            nextUrl.pathname.startsWith("/conducteur") ||
            nextUrl.pathname.startsWith("/chef-equipe") ||
            nextUrl.pathname.startsWith("/client") ||
            nextUrl.pathname.startsWith("/ouvrier");

        if (isDashboardRoute) {
            const hasAccess = allowedPrefixes.some((prefix) =>
                nextUrl.pathname.startsWith(prefix)
            );

            if (!hasAccess) {
                const redirectMap: Record<string, string> = {
                    ADMIN: "/admin/dashboard",
                    CONDUCTEUR: "/conducteur/dashboard",
                    CHEF_EQUIPE: "/chef-equipe/dashboard",
                    CLIENT: "/client/dashboard",
                    OUVRIER: "/ouvrier/dashboard",
                };
                return NextResponse.redirect(new URL(redirectMap[userRole] || "/login", nextUrl));
            }
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon.svg|images|uploads).*)"],
};
