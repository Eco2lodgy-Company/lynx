import { NextRequest, NextResponse } from "next/server";
import prisma from "@lynx/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

// Helper to ensure mandatory channels exist for a project
async function syncProjectChannels(projectId: string) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            supervisor: true,
            client: true,
            projectTeams: { include: { team: { include: { leader: true } } } }
        }
    });

    if (!project) return;

    const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true } });
    const adminIds = admins.map(a => a.id);
    
    // 1. Canal Interne (Chef + Conducteur + Admin)
    const internalMemberIds = new Set([...adminIds]);
    if (project.supervisorId) internalMemberIds.add(project.supervisorId);
    project.projectTeams.forEach(pt => {
        if (pt.team.leaderId) internalMemberIds.add(pt.team.leaderId);
    });

    const internalName = `Interne - ${project.name}`;
    let internalConv = await prisma.conversation.findFirst({
        where: { projectId, name: internalName }
    });

    if (!internalConv) {
        internalConv = await prisma.conversation.create({
            data: {
                name: internalName,
                projectId,
                members: { create: Array.from(internalMemberIds).map(uid => ({ userId: uid })) }
            }
        });
    } else {
        // Sync members
        for (const uid of internalMemberIds) {
            await prisma.conversationMember.upsert({
                where: { conversationId_userId: { conversationId: internalConv.id, userId: uid } },
                create: { conversationId: internalConv.id, userId: uid },
                update: {}
            });
        }
    }

    // 2. Canal Client (Client + Conducteur + Admin)
    if (project.clientId) {
        const clientMemberIds = new Set([...adminIds, project.clientId]);
        if (project.supervisorId) clientMemberIds.add(project.supervisorId);

        const clientName = `Client - ${project.name}`;
        const clientConv = await prisma.conversation.findFirst({
            where: { projectId, name: clientName }
        });

        if (!clientConv) {
            await prisma.conversation.create({
                data: {
                    name: clientName,
                    projectId,
                    members: { create: Array.from(clientMemberIds).map(uid => ({ userId: uid })) }
                }
            });
        } else {
            for (const uid of clientMemberIds) {
                await prisma.conversationMember.upsert({
                    where: { conversationId_userId: { conversationId: clientConv.id, userId: uid } },
                    create: { conversationId: clientConv.id, userId: uid },
                    update: {}
                });
            }
        }
    }

    // 3. Canal Chantier (Chef d'équipe + Conducteur + Admin)
    const chantierMemberIds = new Set([...adminIds]);
    if (project.supervisorId) chantierMemberIds.add(project.supervisorId);
    for (const pt of project.projectTeams) {
        if (pt.team.leaderId) chantierMemberIds.add(pt.team.leaderId);
        // Workers are EXCLUDED per recent requirements
    }

    const chantierName = `Chantier - ${project.name}`;
    let chantierConv = await prisma.conversation.findFirst({
        where: { projectId, name: chantierName }
    });

    if (!chantierConv) {
        chantierConv = await prisma.conversation.create({
            data: {
                name: chantierName,
                projectId,
                members: { create: Array.from(chantierMemberIds).map(uid => ({ userId: uid })) }
            }
        });
    } else {
        for (const uid of chantierMemberIds) {
            await prisma.conversationMember.upsert({
                where: { conversationId_userId: { conversationId: chantierConv.id, userId: uid } },
                create: { conversationId: chantierConv.id, userId: uid },
                update: {}
            });
        }
    }
}

// GET /api/conversations
export async function GET() {
    const user = await getAuthorizedUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // Auto-sync channels for projects the user is involved in
    try {
        let userProjects: { id: string }[] = [];
        if (user.role === "ADMIN") {
            userProjects = await prisma.project.findMany({ select: { id: true } });
        } else if (user.role === "CONDUCTEUR") {
            userProjects = await prisma.project.findMany({ where: { supervisorId: user.id }, select: { id: true } });
        } else if (user.role === "CLIENT") {
            userProjects = await prisma.project.findMany({ where: { clientId: user.id }, select: { id: true } });
        } else if (user.role === "CHEF_EQUIPE") {
            userProjects = await prisma.project.findMany({ 
                where: { projectTeams: { some: { team: { leaderId: user.id } } } },
                select: { id: true } 
            });
        } else if (user.role === "OUVRIER") {
            // Workers have NO access to messaging per recent requirements
            return NextResponse.json([]);
        }

        for (const p of userProjects) {
            await syncProjectChannels(p.id);
        }
    } catch (e) {
        console.error("Sync error:", e);
    }

    const conversations = await prisma.conversation.findMany({
        where: {
            members: { some: { userId: user.id } }
        },
        include: {
            project: { select: { id: true, name: true } },
            members: {
                include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } }
            },
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { author: { select: { id: true, firstName: true } } }
            }
        },
        orderBy: { updatedAt: "desc" }
    });

    return NextResponse.json(conversations);
}

// POST /api/conversations
export async function POST(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    try {
        const { name, projectId, participantIds } = await req.json();
        
        if (projectId) {
            await syncProjectChannels(projectId);
            // If it's a project channel creation request, we might already have it or just synced it.
            // Return one of the mandatory ones if that's what was requested?
            // Actually, for now, let's just proceed with custom group creation if needed, 
            // but the auto-sync handles the mandatory ones.
        }

        const uniqueParticipants = Array.from(new Set([...(participantIds || []), user.id]));

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
