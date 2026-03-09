import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/messages?conversationId=...
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
        return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
    }

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId, userId: session.user.id } }
    });

    if (!membership && session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
        where: { conversationId },
        include: {
            author: { select: { id: true, firstName: true, lastName: true, role: true } }
        },
        orderBy: { createdAt: "asc" },
        take: 100 // limit to last 100
    });

    return NextResponse.json(messages);
}

// POST /api/messages (Req 9: Envoi de message avec fichiers/photos)
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    try {
        const { conversationId, content, attachments } = await req.json();

        if (!conversationId || (!content?.trim() && !attachments?.length)) {
            return NextResponse.json({ error: "Contenu ou pièce jointe requis" }, { status: 400 });
        }

        // Verify membership
        const membership = await prisma.conversationMember.findUnique({
            where: { conversationId_userId: { conversationId, userId: session.user.id } }
        });

        if (!membership && session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        const message = await prisma.message.create({
            data: {
                conversationId,
                content: content?.trim() || "",
                attachments: attachments ? JSON.stringify(attachments) : null,
                authorId: session.user.id
            },
            include: {
                author: { select: { id: true, firstName: true, lastName: true, role: true } }
            }
        });

        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
        });

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error("Error creating message:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
