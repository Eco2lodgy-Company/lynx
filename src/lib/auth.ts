import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
    // basePath must match the INTERNAL path (after Next.js strips its own basePath /lynx).
    // Inside route handlers, request.nextUrl.pathname does NOT include /lynx.
    // Auth.js only sees /api/auth/session, so basePath must be /api/auth.
    basePath: "/api/auth",
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Mot de passe", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });

                if (!user || !user.isActive) {
                    return null;
                }

                const passwordMatch = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!passwordMatch) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`,
                    role: user.role,
                    image: user.avatar,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.role = user.role as string;
                token.id = user.id as string;
                token.picture = user.image as string;
            }
            if (trigger === "update" && session?.user?.image) {
                token.picture = session.user.image;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
                session.user.image = token.picture as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/lynx/login",
        error: "/lynx/login",
    },
    session: {
        strategy: "jwt",
    },
});
