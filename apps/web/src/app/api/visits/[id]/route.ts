import { NextRequest, NextResponse } from "next/server";
import prisma from "@lynx/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

// PUT /api/visits/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CONDUCTEUR"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await req.json();
        const { purpose, notes, plannedAt, completedAt } = body;

        const updated = await prisma.fieldVisit.update({
            where: { id },
            data: {
                ...(purpose && { purpose }),
                ...(notes !== undefined && { notes }),
                ...(plannedAt && { plannedAt: new Date(plannedAt) }),
                ...(completedAt && { completedAt: new Date(completedAt) })
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating visit:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// DELETE /api/visits/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CONDUCTEUR"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { id } = await params;
        await prisma.fieldVisit.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting visit:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
