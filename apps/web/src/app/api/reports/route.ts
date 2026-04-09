import { NextRequest, NextResponse } from "next/server";
import prisma from "@lynx/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

export async function GET() {
    const user = await getAuthorizedUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // Filtrage par rôle
    const where: Record<string, unknown> = {};
    if (user.role === "CLIENT") {
        where.project = { clientId: user.id };
    } else if (user.role === "CONDUCTEUR") {
        where.project = { supervisorId: user.id };
    }
    // ADMIN : pas de filtre, voit tout

    const reports = await prisma.report.findMany({
        where,
        include: {
            project: { select: { id: true, name: true } },
            photos: {
                include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
                orderBy: { takenAt: "desc" },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reports);
}

export async function POST(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CONDUCTEUR"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { title, type, projectId, content, periodStart, periodEnd, pdfUrl } = await req.json();
        if (!title?.trim() || !projectId) {
            return NextResponse.json({ error: "Titre et projet requis" }, { status: 400 });
        }

        const report = await prisma.report.create({
            data: {
                title: title.trim(),
                type,
                projectId,
                content: content?.trim() || null,
                periodStart: periodStart ? new Date(periodStart) : null,
                periodEnd: periodEnd ? new Date(periodEnd) : null,
                pdfUrl: pdfUrl || null,
                status: "BROUILLON",
            },
            include: { project: { select: { id: true, name: true } } },
        });

        return NextResponse.json(report, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
