import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "@lynx/prisma";
import { io } from "../index";

const router = Router();

// GET /api/messages?conversationId=...
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    if (user.role === "OUVRIER") {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const conversationId = req.query.conversationId as string;
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId requis" });
    }

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.id } },
    });

    if (!membership && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/messages
router.post("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    if (user.role === "OUVRIER") {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const { conversationId, content, attachments } = req.body;

    if (!conversationId || (!content?.trim() && !attachments?.length)) {
      return res.status(400).json({ error: "Contenu ou pièce jointe requis" });
    }

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.id } },
    });

    if (!membership && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        content: content?.trim() || "",
        attachments: attachments ? JSON.stringify(attachments) : null,
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // --- Sync image attachments to Photo table ---
    if (attachments?.length) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { projectId: true },
      });

      if (conversation?.projectId) {
        const imageAttachments = attachments.filter((att: any) => {
          const url: string = att.url || "";
          const type: string = att.type || "";
          return (
            type.startsWith("image") ||
            /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif)$/i.test(url)
          );
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

    // 🔥 Emit Socket.io event to all users in the specific room
    io.to(conversationId).emit("newMessage", message);

    return res.status(201).json(message);
  } catch (error) {
    console.error("Error creating message:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
