import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

// POST /api/comments
router.post("/", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"]), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { content, taskId, dailyLogId, incidentId } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: "Contenu requis" });
    }
    if (!taskId && !dailyLogId && !incidentId) {
      return res.status(400).json({ error: "Cible requise (tâche, journal ou incident)" });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        authorId: user.id,
        taskId: taskId || null,
        dailyLogId: dailyLogId || null,
        incidentId: incidentId || null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return res.status(201).json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    return res.status(500).json({ error: "Erreur lors de la création" });
  }
});

export default router;
