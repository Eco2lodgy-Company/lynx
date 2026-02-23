import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    try {
        const { latitude, longitude, projectId, notes } = await req.json();
        const userId = session.user.id;
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Vérifier si un pointage existe déjà pour aujourd'hui
        const existing = await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: startOfDay,
                },
            },
        });

        if (existing) {
            return NextResponse.json({ error: "Vous avez déjà pointé aujourd'hui" }, { status: 400 });
        }

        const attendance = await prisma.attendance.create({
            data: {
                userId,
                date: startOfDay,
                checkIn: now,
                latitude: latitude || null,
                longitude: longitude || null,
                projectId: projectId || null,
                status: "EN_ATTENTE", // Soumis, attend validation du chef d'équipe
                notes: notes || null,
            },
            include: {
                user: { select: { firstName: true, lastName: true } },
                project: { select: { name: true } }
            }
        });

        return NextResponse.json(attendance, { status: 201 });
    } catch (error) {
        console.error("Attendance check-in error:", error);
        return NextResponse.json({ error: "Erreur lors du pointage" }, { status: 500 });
    }
}
