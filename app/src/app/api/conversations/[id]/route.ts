import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/conversations/:id — Fetch a single conversation with all messages
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id } = await params;

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: id, userId: session.user.id } }
    });

    if (!membership && session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
            project: { select: { id: true, name: true } },
            members: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, role: true, avatar: true } }
                }
            },
            messages: {
                orderBy: { createdAt: "asc" },
                take: 100,
                include: {
                    author: { select: { id: true, firstName: true, lastName: true, role: true } }
                }
            }
        }
    });

    if (!conversation) {
        return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    return NextResponse.json(conversation);
}
