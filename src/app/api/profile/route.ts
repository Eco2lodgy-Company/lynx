import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash, compare } from "bcryptjs";

export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    try {
        const body = await req.json();
        const { avatar, currentPassword, newPassword } = body;

        // Mise à jour de l'avatar
        if (avatar) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: { avatar },
            });
            return NextResponse.json({ success: true, message: "Avatar mis à jour" });
        }

        // Mise à jour du mot de passe
        if (currentPassword && newPassword) {
            const user = await prisma.user.findUnique({ where: { id: session.user.id } });
            if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

            const isValid = await compare(currentPassword, user.password);
            if (!isValid) return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });

            if (newPassword.length < 6) return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 6 caractères" }, { status: 400 });

            const hashedPassword = await hash(newPassword, 12);
            await prisma.user.update({
                where: { id: session.user.id },
                data: { password: hashedPassword },
            });
            return NextResponse.json({ success: true, message: "Mot de passe mis à jour" });
        }

        return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
