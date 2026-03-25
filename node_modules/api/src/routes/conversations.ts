import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

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
  project.projectTeams.forEach((pt: any) => {
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
  for (const pt of project.projectTeams as any[]) {
    if (pt.team.leaderId) chantierMemberIds.add(pt.team.leaderId);
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
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    
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
      }

      if (user.role !== "OUVRIER") {
        for (const p of userProjects) {
          await syncProjectChannels(p.id);
        }
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

    return res.status(200).json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/conversations
router.post("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { name, projectId, participantIds } = req.body;
    
    if (projectId) {
      await syncProjectChannels(projectId);
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

    return res.status(201).json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/conversations/:id
router.get("/:id", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: id, userId: user.id } }
    });

    if (!membership && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Accès refusé" });
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
      return res.status(404).json({ error: "Conversation introuvable" });
    }

    return res.status(200).json(conversation);
  } catch (error) {
    console.error("Error fetching conversation details:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
