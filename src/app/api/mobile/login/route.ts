import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Veuillez fournir un email et un mot de passe." },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !user.isActive) {
            return NextResponse.json(
                { error: "Identifiants invalides ou compte inactif." },
                { status: 401 }
            );
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return NextResponse.json(
                { error: "Identifiants invalides ou compte inactif." },
                { status: 401 }
            );
        }

        // Generate JWT token
        const secret = process.env.NEXTAUTH_SECRET || "fallback_development_secret_only";
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        const token = jwt.sign(tokenPayload, secret, { expiresIn: "30d" });

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                role: user.role,
                image: user.avatar,
            }
        });

    } catch (error) {
        console.error("Mobile login error:", error);
        return NextResponse.json(
            { error: "Erreur serveur lors de la connexion." },
            { status: 500 }
        );
    }
}
