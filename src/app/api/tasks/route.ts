import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/tasks
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    if (session.user.role === "OUVRIER") {
        where.assignments = { some: { userId: session.user.id } };
    } else if (session.user.role === "CHEF_EQUIPE") {
        // Chef sees tasks on projects where they lead a team
        const teams = await prisma.projectTeam.findMany({
            where: { team: { leaderId: session.user.id } },
            select: { projectId: true },
        });
        where.projectId = { in: teams.map((t) => t.projectId) };
    }

    const tasks = await prisma.task.findMany({
        where,
        include: {
            project: { select: { id: true, name: true } },
            phase: { select: { id: true, name: true } },
            assignments: {
                include: { user: { select: { id: true, firstName: true, lastName: true } } },
            },
            _count: { select: { comments: true, subTasks: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    return NextResponse.json(tasks);
}

// POST /api/tasks
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { projectId, phaseId, title, description, priority, startDate, dueDate, assigneeIds } = body;

        if (!projectId || !title) {
            return NextResponse.json({ error: "Projet et titre requis" }, { status: 400 });
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                phaseId: phaseId || null,
                title,
                description: description || null,
                priority: priority || "NORMALE",
                startDate: startDate ? new Date(startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                assignments: assigneeIds?.length
                    ? { create: assigneeIds.map((uid: string) => ({ userId: uid })) }
                    : undefined,
            },
            include: {
                project: { select: { id: true, name: true } },
                assignments: {
                    include: { user: { select: { id: true, firstName: true, lastName: true } } },
                },
            },
        });

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error("Error creating task:", error);
        return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }
}
