import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/comments
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { content, taskId, dailyLogId, incidentId } = body;

        if (!content?.trim()) {
            return NextResponse.json({ error: "Contenu requis" }, { status: 400 });
        }
        if (!taskId && !dailyLogId && !incidentId) {
            return NextResponse.json({ error: "Cible requise (tâche, journal ou incident)" }, { status: 400 });
        }

        const comment = await prisma.comment.create({
            data: {
                content: content.trim(),
                authorId: session.user.id,
                taskId: taskId || null,
                dailyLogId: dailyLogId || null,
                incidentId: incidentId || null,
            },
            include: {
                author: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        return NextResponse.json(comment, { status: 201 });
    } catch (error) {
        console.error("Error creating comment:", error);
        return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }
}
