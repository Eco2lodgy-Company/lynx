import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

// GET /api/planning
// Aggregates Tasks, Deliveries, and FieldVisits for a unified timeline/list view
export async function GET(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    // Visibility mapping
    let projectFilter: any = {};
    if (user.role === "CONDUCTEUR") {
        projectFilter = { supervisorId: user.id };
    } else if (user.role === "CHEF_EQUIPE") {
        projectFilter = { projectTeams: { some: { team: { leaderId: user.id } } } };
    } else if (user.role === "OUVRIER") {
        projectFilter = { projectTeams: { some: { team: { members: { some: { userId: user.id } } } } } };
    } else if (user.role === "CLIENT") {
        projectFilter = { clientId: user.id };
    }

    // Specific project filter if provided
    const finalProjectFilter = projectId ? { id: projectId, ...projectFilter } : projectFilter;

    try {
        const [tasks, deliveries, visits] = await Promise.all([
            // Tasks
            prisma.task.findMany({
                where: { 
                    project: finalProjectFilter,
                    status: { not: "TERMINE" }
                },
                include: { project: { select: { name: true } } },
                orderBy: { dueDate: "asc" }
            }),
            // Deliveries
            prisma.delivery.findMany({
                where: { 
                    project: finalProjectFilter,
                    status: { not: "LIVRE" }
                },
                include: { project: { select: { name: true } } },
                orderBy: { plannedDate: "asc" }
            }),
            // Field Visits
            prisma.fieldVisit.findMany({
                where: { 
                    project: finalProjectFilter,
                    completedAt: null
                },
                include: { 
                    project: { select: { name: true } },
                    visitor: { select: { firstName: true, lastName: true } }
                },
                orderBy: { plannedAt: "asc" }
            })
        ]);

        // Transform into a unified format
        const unifiedPlanning = [
            ...tasks.map(t => ({
                id: t.id,
                type: 'TASK',
                title: t.title,
                date: t.dueDate,
                status: t.status,
                projectName: t.project.name,
                priority: t.priority,
            })),
            ...deliveries.map(d => ({
                id: d.id,
                type: 'DELIVERY',
                title: d.item,
                date: d.plannedDate,
                status: d.status,
                projectName: d.project.name,
                quantity: d.quantity,
                supplier: d.supplier,
            })),
            ...visits.map(v => ({
                id: v.id,
                type: 'VISIT',
                title: v.purpose,
                date: v.plannedAt,
                status: 'PLANIFIE',
                projectName: v.project.name,
                visitorName: `${v.visitor.firstName} ${v.visitor.lastName}`,
                notes: v.notes,
            }))
        ].sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : Infinity;
            const dateB = b.date ? new Date(b.date).getTime() : Infinity;
            return dateA - dateB;
        });

        return NextResponse.json(unifiedPlanning);
    } catch (error) {
        console.error("Error fetching planning data:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
