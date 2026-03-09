import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/conversations
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const conversations = await prisma.conversation.findMany({
        where: {
            members: { some: { userId: session.user.id } }
        },
        include: {
            project: { select: { id: true, name: true } },
            members: {
                include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } }
            },
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { author: { select: { firstName: true } } }
            }
        },
        orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json(conversations);
}

// POST /api/conversations (Créer un canal de projet ou discussion directe)
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    try {
        const { name, projectId, participantIds } = await req.json();
        
        // Ensure the current user is included
        const uniqueParticipants = Array.from(new Set([...(participantIds || []), session.user.id]));

        const conversation = await prisma.conversation.create({
            data: {
                name: name || null,
                projectId: projectId || null,
                members: {
                    create: uniqueParticipants.map((uid: string) => ({ userId: uid }))
                }
            },
            include: {
                members: {
                    include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } }
                }
            }
        });

        return NextResponse.json(conversation, { status: 201 });
    } catch (error) {
        console.error("Error creating conversation:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
