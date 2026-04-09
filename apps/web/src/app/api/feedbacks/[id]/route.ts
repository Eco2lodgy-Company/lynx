import { NextRequest, NextResponse } from "next/server";
import prisma from "@lynx/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthorizedUser();
    if (!user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const feedback = await prisma.feedback.findUnique({
            where: { id },
            include: {
                project: { select: { id: true, name: true } },
                author: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
        });

        if (!feedback) {
            return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
        }

        return NextResponse.json(feedback);
    } catch (error) {
        console.error("Error fetching feedback:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthorizedUser();
    if (!user || !["ADMIN", "CONDUCTEUR"].includes(user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await req.json();
        const { status } = body;

        const feedback = await prisma.feedback.update({
            where: { id },
            data: { status },
            include: {
                project: { select: { id: true, name: true } },
                author: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        return NextResponse.json(feedback);
    } catch (error) {
        console.error("Error updating feedback:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
