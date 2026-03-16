import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

// GET /api/users — Liste des utilisateurs
export async function GET() {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CONDUCTEUR"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
        include: { department: true },
        orderBy: { createdAt: "desc" },
    });

    // Remove passwords from response
    const safeUsers = users.map((user) => {
        const { password, ...safeUser } = user;
        return safeUser;
    });
    return NextResponse.json(safeUsers);
}

// POST /api/users — Créer un utilisateur
export async function POST(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CONDUCTEUR"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { email, password: rawPassword, firstName, lastName, phone, role, departmentId } = body;

        if (!email || !rawPassword || !firstName || !lastName || !role) {
            return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: "Cet email existe déjà" }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(rawPassword, 12);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phone: phone || null,
                role,
                departmentId: departmentId || null,
            },
            include: { department: true },
        });

        const { password, ...safeUser } = user;
        return NextResponse.json(safeUser, { status: 201 });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }
}
