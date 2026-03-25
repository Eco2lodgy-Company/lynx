import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user || !["CHEF_EQUIPE", "ADMIN", "CONDUCTEUR"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const now = new Date();
    const todayStr = (dateStr ? new Date(dateStr) : now).toISOString().split("T")[0];
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    try {
        let where: any = {
            date: { gte: startOfDay, lt: endOfDay },
        };

        // Si c'est un chef d'équipe, on filtre par son équipe
        if (session.user.role === "CHEF_EQUIPE") {
            const team = await prisma.team.findFirst({
                where: { leaderId: session.user.id },
            });

            if (!team) {
                return NextResponse.json({ error: "Vous ne dirigez aucune équipe" }, { status: 404 });
            }

            const memberIds = (await prisma.teamMember.findMany({
                where: { teamId: team.id },
                select: { userId: true }
            })).map(m => m.userId);

            where.userId = { in: memberIds };
        }

        const stats = await prisma.attendance.findMany({
            where,
            include: {
                user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                project: { select: { id: true, name: true } },
                validatedBy: { select: { firstName: true, lastName: true } }
            },
            orderBy: { checkIn: "asc" }
        });

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Team attendance fetch error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
