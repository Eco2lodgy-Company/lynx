import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CONDUCTEUR"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "daily";
    const dateParam = searchParams.get("date");
    const projectId = searchParams.get("projectId");
    const teamId = searchParams.get("teamId");

    const baseDate = dateParam ? parseISO(dateParam) : new Date();

    let gte: Date;
    let lt: Date;

    if (period === "daily") {
        gte = startOfDay(baseDate);
        lt = endOfDay(baseDate);
    } else if (period === "weekly") {
        gte = startOfWeek(baseDate, { weekStartsOn: 1 });
        lt = endOfWeek(baseDate, { weekStartsOn: 1 });
    } else {
        gte = startOfMonth(baseDate);
        lt = endOfMonth(baseDate);
    }

    try {
        let where: any = {
            date: { gte, lt }
        };

        if (projectId && projectId !== "all") {
            where.projectId = projectId;
        }

        if (teamId && teamId !== "all") {
            const teamMembers = await prisma.teamMember.findMany({
                where: { teamId },
                select: { userId: true }
            });
            const userIds = teamMembers.map(m => m.userId);
            where.userId = { in: userIds };
        }

        const reports = await prisma.attendance.findMany({
            where,
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
                project: { select: { id: true, name: true } },
                validatedBy: { select: { firstName: true, lastName: true } }
            },
            orderBy: [
                { date: "desc" },
                { user: { lastName: "asc" } }
            ]
        });

        return NextResponse.json(reports);
    } catch (error) {
        console.error("Attendance report fetch error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
