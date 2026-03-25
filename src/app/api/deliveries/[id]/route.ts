import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

// PUT /api/deliveries/[id] — Update delivery status
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await req.json();
        const { status, item, quantity, supplier, plannedDate, notes } = body;

        const updated = await prisma.delivery.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(item && { item }),
                ...(quantity !== undefined && { quantity }),
                ...(supplier !== undefined && { supplier }),
                ...(plannedDate && { plannedDate: new Date(plannedDate) }),
                ...(notes !== undefined && { notes }),
            },
            include: {
                project: { select: { name: true } }
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating delivery:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// DELETE /api/deliveries/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { id } = await params;
        await prisma.delivery.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting delivery:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
