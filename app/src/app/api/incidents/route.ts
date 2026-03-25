import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";
import { notifyAdminsAndSupervisor } from "@/lib/notifications";
import { logAudit, AuditActions } from "@/lib/audit";

// GET /api/incidents
export async function GET(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // --- Cleanup Logic (Phase 27) ---
    // Supprimer les incidents clos depuis plus de 14 jours
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    try {
        await prisma.incident.deleteMany({
            where: {
                status: { in: ["RESOLU", "FERME"] },
                resolvedAt: { lt: fourteenDaysAgo }
            }
        });
    } catch (e) {
        console.error("Incident cleanup error:", e);
    }
    // --------------------------------

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    if (user.role === "CHEF_EQUIPE") {
        where.reporterId = user.id;
    }

    const incidents = await prisma.incident.findMany({
        where,
        include: {
            reporter: { select: { id: true, firstName: true, lastName: true } },
            project: { select: { id: true, name: true } },
            comments: {
                include: {
                    author: { select: { id: true, firstName: true, lastName: true } }
                },
                orderBy: { createdAt: "asc" }
            },
            photos: {
                include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
                orderBy: { takenAt: "desc" },
            },
            _count: { select: { photos: true, comments: true } },
        },
        orderBy: { date: "desc" },
        take: 50,
    });

    return NextResponse.json(incidents);
}

// POST /api/incidents
export async function POST(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CHEF_EQUIPE", "CONDUCTEUR"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { projectId, title, description, severity, location, photoUrls } = body;

        if (!projectId || !title) {
            return NextResponse.json({ error: "Projet et titre requis" }, { status: 400 });
        }

        const incident = await prisma.incident.create({
            data: {
                projectId,
                reporterId: user.id,
                title,
                description: description || null,
                severity: severity || "MOYENNE",
                location: location || null,
                photos: photoUrls && photoUrls.length > 0 ? {
                    create: photoUrls.map((url: string) => ({
                        url,
                        projectId,
                        uploadedById: user.id
                    }))
                } : undefined
            },
            include: {
                reporter: { select: { id: true, firstName: true, lastName: true } },
                project: { select: { id: true, name: true } },
                photos: true
            },
        });

        // Auto-notify admins and supervisor
        const reporterName = `${incident.reporter.firstName} ${incident.reporter.lastName}`;
        const severityLabel = severity === "CRITIQUE" ? "🔴 CRITIQUE" : severity === "HAUTE" ? "🟠 HAUTE" : severity || "MOYENNE";

        await notifyAdminsAndSupervisor({
            projectId,
            title: `Nouvel incident [${severityLabel}]`,
            message: `${reporterName} a signalé : "${title}" — ${incident.project.name}`,
            type: "INCIDENT",
            link: `/conducteur/incidents`,
            excludeUserId: user.id,
        });

        // Audit trail
        await logAudit({
            userId: user.id,
            action: AuditActions.CREATE_INCIDENT,
            entity: "Incident",
            entityId: incident.id,
            details: {
                title,
                severity: severity || "MOYENNE",
                projectName: incident.project.name,
            },
        });

        return NextResponse.json(incident, { status: 201 });
    } catch (error) {
        console.error("Error creating incident:", error);
        return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }
}
