import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || !["ADMIN", "CONDUCTEUR"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    try {
        const { status } = await req.json();
        const request = await prisma.advanceRequest.update({
            where: { id },
            data: { status }
        });
        return NextResponse.json(request);
    } catch (err) {
        console.error("PUT /api/advance-requests/[id] Error:", err);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || !["ADMIN"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    try {
        await prisma.advanceRequest.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/advance-requests/[id] Error:", err);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
