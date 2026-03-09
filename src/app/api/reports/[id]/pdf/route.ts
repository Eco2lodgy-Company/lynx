import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/reports/[id]/pdf — Generate a PDF for a report
 * Returns a JSON with the generated text content (client-side PDF rendering)
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    const report = await prisma.report.findUnique({
        where: { id },
        include: {
            project: {
                select: {
                    name: true,
                    address: true,
                    supervisor: { select: { firstName: true, lastName: true } },
                    client: { select: { firstName: true, lastName: true } },
                },
            },
            photos: {
                select: { url: true, caption: true, takenAt: true },
                orderBy: { takenAt: "asc" },
            },
        },
    });

    if (!report) {
        return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
    }

    // If the user is a client, only allow access to published reports
    if (session.user.role === "CLIENT" && report.status !== "PUBLIE") {
        return NextResponse.json({ error: "Rapport non publié" }, { status: 403 });
    }

    // Fetch related daily logs for the report period
    let dailyLogs: Array<{
        date: Date;
        summary: string | null;
        workCompleted: string | null;
        weather: string | null;
        author: { firstName: string; lastName: string };
    }> = [];

    if (report.periodStart && report.periodEnd) {
        dailyLogs = await prisma.dailyLog.findMany({
            where: {
                projectId: report.projectId,
                status: "VALIDE",
                date: {
                    gte: report.periodStart,
                    lte: report.periodEnd,
                },
            },
            select: {
                date: true,
                summary: true,
                workCompleted: true,
                weather: true,
                author: { select: { firstName: true, lastName: true } },
            },
            orderBy: { date: "asc" },
        });
    }

    // Build PDF data payload for client-side rendering
    const pdfData = {
        title: report.title,
        type: report.type,
        status: report.status,
        project: {
            name: report.project.name,
            address: report.project.address,
            supervisor: report.project.supervisor
                ? `${report.project.supervisor.firstName} ${report.project.supervisor.lastName}`
                : null,
            client: report.project.client
                ? `${report.project.client.firstName} ${report.project.client.lastName}`
                : null,
        },
        period: {
            start: report.periodStart?.toISOString(),
            end: report.periodEnd?.toISOString(),
        },
        content: report.content,
        photos: report.photos.map((p) => ({
            url: p.url,
            caption: p.caption,
            takenAt: p.takenAt.toISOString(),
        })),
        dailyLogs: dailyLogs.map((log) => ({
            date: log.date.toISOString(),
            summary: log.summary,
            workCompleted: log.workCompleted,
            weather: log.weather,
            author: `${log.author.firstName} ${log.author.lastName}`,
        })),
        generatedAt: new Date().toISOString(),
        generatedBy: session.user.name || "Utilisateur",
    };

    return NextResponse.json(pdfData);
}
