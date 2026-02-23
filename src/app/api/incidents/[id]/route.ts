import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PUT /api/incidents/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CHEF_EQUIPE", "CONDUCTEUR"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await req.json();

        const updateData: Record<string, unknown> = {};
        if (body.title !== undefined) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.severity !== undefined) updateData.severity = body.severity;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.location !== undefined) updateData.location = body.location;
        if (body.resolution !== undefined) updateData.resolution = body.resolution;
        if (body.status === "RESOLU" || body.status === "FERME") {
            updateData.resolvedAt = new Date();
        }

        const incident = await prisma.incident.update({
            where: { id },
            data: updateData,
            include: {
                reporter: { select: { id: true, firstName: true, lastName: true } },
                project: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json(incident);
    } catch (error) {
        console.error("Error updating incident:", error);
        return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }
}

// DELETE /api/incidents/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CHEF_EQUIPE"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { id } = await params;
        await prisma.incident.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting incident:", error);
        return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
    }
}
