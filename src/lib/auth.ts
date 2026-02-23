import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
    basePath: "/lynx/api/auth",
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
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role as string;
                token.id = user.id as string;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    cookies: {
        sessionToken: {
            name: `lynx-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/lynx",
                secure: process.env.NODE_ENV === "production",
            },
        },
        callbackUrl: {
            name: `lynx-auth.callback-url`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/lynx",
                secure: process.env.NODE_ENV === "production",
            },
        },
        csrfToken: {
            name: `lynx-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/lynx",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
});
