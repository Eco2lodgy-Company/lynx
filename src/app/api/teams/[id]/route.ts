import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;
    const { name, description, leaderId, departmentId } = await req.json();

    try {
        const team = await prisma.team.update({
            where: { id },
            data: {
                name: name?.trim(),
                description: description?.trim() || null,
                leaderId: leaderId || null,
                departmentId: departmentId || null,
            },
        });
        return NextResponse.json(team);
    } catch {
        return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;
    try {
        await prisma.team.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });
    }
}
