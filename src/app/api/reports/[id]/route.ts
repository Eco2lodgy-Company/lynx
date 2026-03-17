import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CONDUCTEUR"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    try {
        const report = await prisma.report.update({
            where: { id },
            data: {
                ...(body.title && { title: body.title.trim() }),
                ...(body.status && { status: body.status }),
                ...(body.content !== undefined && { content: body.content }),
            },
            include: { project: { select: { id: true, name: true } } },
        });
        return NextResponse.json(report);
    } catch {
        return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthorizedUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;
    try {
        await prisma.report.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
    }
}
