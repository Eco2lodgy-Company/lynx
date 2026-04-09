import { NextRequest, NextResponse } from "next/server";
import prisma from "@lynx/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

// GET /api/daily-logs
export async function GET(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    // Req 5: Client only sees validated daily logs from their own projects
    if (user.role === "CLIENT") {
        where.status = "VALIDE";
        where.project = { clientId: user.id };
    } else if (user.role === "CHEF_EQUIPE") {
        where.authorId = user.id;
    }

    const logs = await prisma.dailyLog.findMany({
        where,
        include: {
            author: { select: { id: true, firstName: true, lastName: true } },
            project: { select: { id: true, name: true } },
            photos: {
                include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
                orderBy: { takenAt: "desc" },
            },
        },
        orderBy: { date: "desc" },
        take: 50,
    });

    return NextResponse.json(logs);
}

// POST /api/daily-logs
export async function POST(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CHEF_EQUIPE", "CONDUCTEUR"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const {
            projectId, date, weather, temperature,
            summary, workCompleted, issues, materialsUsed,
            status, photoUrls,
        } = body;

        if (!projectId || !date || !summary) {
            return NextResponse.json({ error: "Projet, date et résumé requis" }, { status: 400 });
        }

        const logDate = new Date(date);
        logDate.setHours(0, 0, 0, 0);

        const log = await prisma.dailyLog.create({
            data: {
                projectId,
                authorId: user.id,
                date: logDate,
                weather: weather || null,
                temperature: temperature ? parseFloat(temperature) : null,
                summary,
                workCompleted: workCompleted || null,
                issues: issues || null,
                materials: materialsUsed || null,
                status: status || "BROUILLON",
                photos: photoUrls && photoUrls.length > 0 ? {
                    create: photoUrls.map((url: string) => ({
                        url,
                        uploadedById: user.id
                    }))
                } : undefined,
            },
            include: {
                author: { select: { id: true, firstName: true, lastName: true } },
                project: { select: { id: true, name: true } },
                photos: true,
            },
        });

        return NextResponse.json(log, { status: 201 });
    } catch (error) {
        console.error("Error creating daily log:", error);
        return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }
}
