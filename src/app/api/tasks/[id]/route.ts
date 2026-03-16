import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

// PUT /api/tasks/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthorizedUser();
    if (!user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await req.json();

        const updateData: Record<string, unknown> = {};
        if (body.title !== undefined) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.status !== undefined) {
            if (!["ADMIN", "CONDUCTEUR"].includes(user.role)) {
                return NextResponse.json({ error: "Seul le conducteur peut changer le statut d'une tâche" }, { status: 403 });
            }
            updateData.status = body.status;
            if (body.status === "TERMINE") updateData.completedAt = new Date();
        }
        if (body.priority !== undefined) updateData.priority = body.priority;
        
        // Requirement 1: Only Conducteur/Admin can update progress
        if (body.progress !== undefined) {
            if (!["ADMIN", "CONDUCTEUR"].includes(user.role)) {
                return NextResponse.json({ error: "Seul le conducteur peut noter l'avancement" }, { status: 403 });
            }
            updateData.progress = parseFloat(body.progress);
        }

        if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
        if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;

        const task = await prisma.task.update({
            where: { id },
            data: updateData,
            include: {
                project: { select: { id: true, name: true } },
                assignments: {
                    include: { user: { select: { id: true, firstName: true, lastName: true } } },
                },
            },
        });

        return NextResponse.json(task);
    } catch (error) {
        console.error("Error updating task:", error);
        return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }
}

// DELETE /api/tasks/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CONDUCTEUR"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { id } = await params;
        await prisma.task.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting task:", error);
        return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
    }
}
