import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PUT /api/daily-logs/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CHEF_EQUIPE", "CONDUCTEUR"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await req.json();

        const updateData: Record<string, unknown> = {};
        if (body.weather !== undefined) updateData.weather = body.weather;
        if (body.temperature !== undefined) updateData.temperature = body.temperature ? parseFloat(body.temperature) : null;
        if (body.summary !== undefined) updateData.summary = body.summary;
        if (body.workCompleted !== undefined) updateData.workCompleted = body.workCompleted;
        if (body.issues !== undefined) updateData.issues = body.issues;
        if (body.materialsUsed !== undefined) updateData.materials = body.materialsUsed;
        if (body.status !== undefined) updateData.status = body.status;

        const log = await prisma.dailyLog.update({
            where: { id },
            data: updateData,
            include: {
                author: { select: { id: true, firstName: true, lastName: true } },
                project: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json(log);
    } catch (error) {
        console.error("Error updating daily log:", error);
        return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }
}

// DELETE /api/daily-logs/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CHEF_EQUIPE"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { id } = await params;
        await prisma.dailyLog.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting daily log:", error);
        return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
    }
}
