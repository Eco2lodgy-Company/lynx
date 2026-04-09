import { NextRequest, NextResponse } from "next/server";
import prisma from "@lynx/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

// GET /api/messages?conversationId=...
export async function GET(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    if (user.role === "OUVRIER") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
        return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
    }

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId, userId: user.id } }
    });

    if (!membership && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
        where: { conversationId },
        include: {
            author: { select: { id: true, firstName: true, lastName: true, role: true } }
        },
        orderBy: { createdAt: "asc" },
        take: 100
    });

    return NextResponse.json(messages);
}

// POST /api/messages
export async function POST(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    if (user.role === "OUVRIER") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    try {
        const { conversationId, content, attachments } = await req.json();

        if (!conversationId || (!content?.trim() && !attachments?.length)) {
            return NextResponse.json({ error: "Contenu ou pièce jointe requis" }, { status: 400 });
        }

        // Verify membership
        const membership = await prisma.conversationMember.findUnique({
            where: { conversationId_userId: { conversationId, userId: user.id } }
        });

        if (!membership && user.role !== "ADMIN") {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        const message = await prisma.message.create({
            data: {
                conversationId,
                content: content?.trim() || "",
                attachments: attachments ? JSON.stringify(attachments) : null,
                authorId: user.id
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

        // --- Sync image attachments to Photo table (for unified gallery) ---
        if (attachments?.length) {
            const conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
                select: { projectId: true }
            });

            if (conversation?.projectId) {
                const imageAttachments = attachments.filter((att: any) => {
                    const url: string = att.url || '';
                    const type: string = att.type || '';
                    return type.startsWith('image') || /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif)$/i.test(url);
                });

                if (imageAttachments.length > 0) {
                    await prisma.photo.createMany({
                        data: imageAttachments.map((att: any) => ({
                            url: att.url,
                            caption: content?.trim() || "Photo partagée en discussion",
                            projectId: conversation.projectId!,
                            uploadedById: user.id,
                            takenAt: new Date(),
                        })),
                    });
                }
            }
        }

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error("Error creating message:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
