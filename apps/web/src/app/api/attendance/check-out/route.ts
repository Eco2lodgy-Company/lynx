import { NextRequest, NextResponse } from "next/server";
import prisma from "@lynx/prisma";
import { auth } from "@/lib/auth";

// POST /api/attendance/check-out — Enregistre l'heure de départ
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    try {
        const { latitude, longitude, notes } = await req.json();
        const userId = session.user.id;
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Vérifier qu'un pointage d'arrivée existe pour aujourd'hui
        const existing = await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: startOfDay,
                },
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Aucun pointage d'arrivée enregistré pour aujourd'hui" },
                { status: 400 }
            );
        }

        if (existing.checkOut) {
            return NextResponse.json(
                { error: "Vous avez déjà enregistré votre départ aujourd'hui" },
                { status: 400 }
            );
        }

        const updated = await prisma.attendance.update({
            where: { id: existing.id },
            data: {
                checkOut: now,
                ...(latitude !== undefined && { latitude }),
                ...(longitude !== undefined && { longitude }),
                ...(notes && { notes }),
            },
            include: {
                user: { select: { firstName: true, lastName: true } },
                project: { select: { name: true } },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Attendance check-out error:", error);
        return NextResponse.json({ error: "Erreur lors du pointage de départ" }, { status: 500 });
    }
}
