import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/projects/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;
    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
            client: { select: { id: true, firstName: true, lastName: true, email: true } },
            department: true,
            phases: { orderBy: { order: "asc" } },
            tasks: { include: { assignments: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: { createdAt: "desc" } },
            projectTeams: { include: { team: { include: { leader: { select: { firstName: true, lastName: true } } } } } },
            _count: { select: { tasks: true, incidents: true, dailyLogs: true } },
        },
    });

    if (!project) {
        return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 });
    }

    return NextResponse.json(project);
}

// PUT /api/projects/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CONDUCTEUR"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await req.json();

        const updateData: Record<string, unknown> = {};
        const fields = [
            "name", "description", "address", "status", "priority", "supervisorId",
            "clientId", "departmentId",
        ];
        fields.forEach((f) => {
            if (body[f] !== undefined) updateData[f] = body[f] || null;
        });
        if (body.name) updateData.name = body.name;
        if (body.latitude !== undefined) updateData.latitude = body.latitude ? parseFloat(body.latitude) : null;
        if (body.longitude !== undefined) updateData.longitude = body.longitude ? parseFloat(body.longitude) : null;
        if (body.budget !== undefined) updateData.budget = body.budget ? parseFloat(body.budget) : null;
        if (body.progress !== undefined) updateData.progress = parseInt(body.progress);
        if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
        if (body.estimatedEndDate !== undefined) updateData.estimatedEndDate = body.estimatedEndDate ? new Date(body.estimatedEndDate) : null;
        if (body.actualEndDate !== undefined) updateData.actualEndDate = body.actualEndDate ? new Date(body.actualEndDate) : null;

        const project = await prisma.project.update({
            where: { id },
            data: updateData,
            include: {
                supervisor: { select: { id: true, firstName: true, lastName: true } },
                client: { select: { id: true, firstName: true, lastName: true } },
                department: true,
            },
        });

        return NextResponse.json(project);
    } catch (error) {
        console.error("Error updating project:", error);
        return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }
}

// DELETE /api/projects/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { id } = await params;
        await prisma.project.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting project:", error);
        return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
    }
}
