import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/projects — Liste des projets
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { role, id: userId } = session.user;

    let where = {};
    if (role === "CONDUCTEUR") {
        where = { supervisorId: userId };
    } else if (role === "CLIENT") {
        where = { clientId: userId };
    } else if (role === "CHEF_EQUIPE") {
        where = { projectTeams: { some: { team: { leaderId: userId } } } };
    } else if (role !== "ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const projects = await prisma.project.findMany({
        where,
        include: {
            supervisor: { select: { id: true, firstName: true, lastName: true } },
            client: { select: { id: true, firstName: true, lastName: true } },
            department: true,
            _count: { select: { tasks: true, phases: true, incidents: true, dailyLogs: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
}

// POST /api/projects — Créer un projet
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CONDUCTEUR"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const {
            name, description, address, latitude, longitude,
            status, priority, startDate, estimatedEndDate,
            budget, supervisorId, clientId, departmentId,
        } = body;

        if (!name) {
            return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
        }

        const project = await prisma.project.create({
            data: {
                name,
                description: description || null,
                address: address || null,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                status: status || "PLANIFIE",
                priority: priority || "NORMALE",
                startDate: startDate ? new Date(startDate) : null,
                estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
                budget: budget ? parseFloat(budget) : null,
                supervisorId: supervisorId || session.user.id,
                clientId: clientId || null,
                departmentId: departmentId || null,
            },
            include: {
                supervisor: { select: { id: true, firstName: true, lastName: true } },
                client: { select: { id: true, firstName: true, lastName: true } },
                department: true,
            },
        });

        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        console.error("Error creating project:", error);
        return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }
}
