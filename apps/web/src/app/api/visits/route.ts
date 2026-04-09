import { NextRequest, NextResponse } from "next/server";
import prisma from "@lynx/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

// GET /api/visits
export async function GET(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    let where: any = {};
    if (projectId) where.projectId = projectId;

    if (user.role === "CONDUCTEUR") {
        where.project = { supervisorId: user.id };
    } else if (user.role === "CHEF_EQUIPE") {
        where.project = { projectTeams: { some: { team: { leaderId: user.id } } } };
    }

    try {
        const visits = await prisma.fieldVisit.findMany({
            where,
            include: {
                project: { select: { name: true } },
                visitor: { select: { firstName: true, lastName: true } }
            },
            orderBy: { plannedAt: "asc" }
        });
        return NextResponse.json(visits);
    } catch (error) {
        console.error("Error fetching visits:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// POST /api/visits
export async function POST(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CONDUCTEUR"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { projectId, purpose, notes, plannedAt } = body;

        if (!projectId || !purpose || !plannedAt) {
            return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
        }

        const visit = await prisma.fieldVisit.create({
            data: {
                projectId,
                purpose,
                notes,
                plannedAt: new Date(plannedAt),
                visitorId: user.id
            },
            include: {
                project: { select: { name: true } },
                visitor: { select: { firstName: true, lastName: true } }
            }
        });

        return NextResponse.json(visit, { status: 201 });
    } catch (error) {
        console.error("Error creating visit:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
