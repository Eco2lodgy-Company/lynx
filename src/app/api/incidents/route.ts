import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/incidents
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    if (session.user.role === "CHEF_EQUIPE") {
        where.reporterId = session.user.id;
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
    const session = await auth();
    if (!session?.user || !["ADMIN", "CHEF_EQUIPE", "CONDUCTEUR"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { projectId, title, description, severity, location } = body;

        if (!projectId || !title) {
            return NextResponse.json({ error: "Projet et titre requis" }, { status: 400 });
        }

        const incident = await prisma.incident.create({
            data: {
                projectId,
                reporterId: session.user.id,
                title,
                description: description || null,
                severity: severity || "MOYENNE",
                location: location || null,
            },
            include: {
                reporter: { select: { id: true, firstName: true, lastName: true } },
                project: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json(incident, { status: 201 });
    } catch (error) {
        console.error("Error creating incident:", error);
        return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }
}
