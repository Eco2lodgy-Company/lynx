import { NextRequest, NextResponse } from "next/server";
import prisma from "@lynx/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

// GET /api/deliveries
export async function GET(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: any = {};
    if (projectId) where.projectId = projectId;

    if (user.role === "CONDUCTEUR") {
        where.project = { supervisorId: user.id };
    } else if (user.role === "CHEF_EQUIPE" || user.role === "OUVRIER") {
        // Users see deliveries for their assigned projects
        const teams = await prisma.projectTeam.findMany({
            where: { 
                team: { 
                    OR: [
                        { leaderId: user.id },
                        { members: { some: { userId: user.id } } }
                    ]
                } 
            },
            select: { projectId: true }
        });
        where.projectId = { in: teams.map(t => t.projectId) };
    }

    const deliveries = await prisma.delivery.findMany({
        where,
        include: {
            project: { select: { name: true } }
        },
        orderBy: { plannedDate: "asc" }
    });

    return NextResponse.json(deliveries);
}

// POST /api/deliveries (Req 8)
export async function POST(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { projectId, item, quantity, supplier, plannedDate, notes } = body;

        if (!projectId || !item || !plannedDate) {
            return NextResponse.json({ error: "Détails requis manquants" }, { status: 400 });
        }

        const delivery = await prisma.delivery.create({
            data: {
                projectId,
                item,
                quantity: quantity || null,
                supplier: supplier || null,
                plannedDate: new Date(plannedDate),
                notes: notes || null,
                status: user.role === "CHEF_EQUIPE" ? "URGENT" : "A_VENIR" // All Chef requests are treated as urgent signals
            },
            include: {
                project: { select: { name: true } }
            }
        });

        return NextResponse.json(delivery, { status: 201 });
    } catch (error) {
        console.error("Error creating delivery:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
