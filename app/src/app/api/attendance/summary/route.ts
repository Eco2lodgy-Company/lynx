import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/attendance/summary?userId=...&startDate=...&endDate=...
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (!userId || !startDateStr || !endDateStr) {
        return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    try {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);

        const records = await prisma.attendance.findMany({
            where: {
                userId,
                date: { gte: startDate, lte: endDate },
                status: "VALIDE"
            },
            orderBy: { date: "asc" }
        });

        const summary = records.map(record => {
            let durationHours = 0;
            if (record.checkIn && record.checkOut) {
                const diffMs = record.checkOut.getTime() - record.checkIn.getTime();
                durationHours = Math.max(0, diffMs / (1000 * 60 * 60));
            }

            return {
                date: record.date.toISOString().split("T")[0],
                checkIn: record.checkIn?.toISOString(),
                checkOut: record.checkOut?.toISOString(),
                durationHours: parseFloat(durationHours.toFixed(2)),
                status: record.status
            };
        });

        const totalHours = summary.reduce((acc, curr) => acc + curr.durationHours, 0);

        return NextResponse.json({
            userId,
            totalHours: parseFloat(totalHours.toFixed(2)),
            daysCount: records.length,
            records: summary
        });
    } catch (error) {
        console.error("Error generating attendance summary:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
