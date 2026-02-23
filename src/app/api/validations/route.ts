import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/validations — journaux soumis en attente de validation
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CONDUCTEUR"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const type = searchParams.get("type") || "logs"; // logs | incidents

    if (type === "incidents") {
        const where: Record<string, unknown> = { status: { in: ["OUVERT", "EN_COURS"] } };
        if (projectId) where.projectId = projectId;
        if (session.user.role === "CONDUCTEUR") {
            where.project = { supervisorId: session.user.id };
        }

        const incidents = await prisma.incident.findMany({
            where,
            include: {
                reporter: { select: { id: true, firstName: true, lastName: true } },
                project: { select: { id: true, name: true } },
                comments: {
                    include: { author: { select: { firstName: true, lastName: true } } },
                    orderBy: { createdAt: "desc" },
                    take: 3,
                },
            },
            orderBy: [{ severity: "desc" }, { date: "desc" }],
        });
        return NextResponse.json(incidents);
    }

    // Default: daily logs
    const where: Record<string, unknown> = { status: "SOUMIS" };
    if (projectId) where.projectId = projectId;
    if (session.user.role === "CONDUCTEUR") {
        where.project = { supervisorId: session.user.id };
    }

    const logs = await prisma.dailyLog.findMany({
        where,
        include: {
            author: { select: { id: true, firstName: true, lastName: true } },
            project: { select: { id: true, name: true } },
            comments: {
                include: { author: { select: { firstName: true, lastName: true } } },
                orderBy: { createdAt: "desc" },
                take: 3,
            },
        },
        orderBy: { date: "desc" },
    });

    return NextResponse.json(logs);
}
