import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const userId = session.user.id;
    const isClient = session.user.role === "CLIENT";

    const feedbacks = await prisma.feedback.findMany({
        where: isClient ? { authorId: userId } : undefined,
        include: {
            project: { select: { id: true, name: true } },
            author: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(feedbacks);
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    try {
        const { subject, message, projectId, priority } = await req.json();
        if (!subject?.trim() || !message?.trim() || !projectId) {
            return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
        }

        const feedback = await prisma.feedback.create({
            data: {
                subject: subject.trim(),
                message: message.trim(),
                projectId,
                priority: priority || "NORMALE",
                status: "EN_ATTENTE",
                authorId: session.user.id,
            },
            include: { project: { select: { id: true, name: true } } },
        });

        return NextResponse.json(feedback, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
