import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";
import multer from "multer";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/feedbacks
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const isClient = user.role === "CLIENT";

    const feedbacks = await prisma.feedback.findMany({
      where: isClient ? { authorId: user.id } : undefined,
      include: {
        project: { select: { id: true, name: true } },
        author: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(feedbacks);
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/feedbacks
router.post("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { subject, message, projectId, priority } = req.body;
    
    if (!subject?.trim() || !message?.trim() || !projectId) {
      return res.status(400).json({ error: "Champs requis manquants" });
    }

    const feedback = await prisma.feedback.create({
      data: {
        subject: subject.trim(),
        message: message.trim(),
        projectId,
        priority: priority || "NORMALE",
        status: "EN_ATTENTE",
        authorId: user.id,
      },
      include: { project: { select: { id: true, name: true } } },
    });

    return res.status(201).json(feedback);
  } catch (error) {
    console.error("Error creating feedback:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// --- Replies Sub-routes ---

// GET /api/feedbacks/:id/replies
router.get("/:id/replies", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const replies = await prisma.feedbackReply.findMany({
      where: { feedbackId: id },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true, avatar: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return res.status(200).json(replies);
  } catch (error) {
    console.error("Error fetching feedback replies:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/feedbacks/:id/replies
router.post("/:id/replies", authMiddleware, upload.single("photo"), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { content } = req.body;
    const file = req.file;

    if (!content && !file) {
      return res.status(400).json({ error: "Contenu ou image requis" });
    }

    let imageUrl: string | null = null;
    if (file) {
      const relDir = `/uploads/chat/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, "0")}`;
      const uploadDir = join(process.cwd(), "public", relDir);
      await mkdir(uploadDir, { recursive: true });

      const ext = file.originalname.split(".").pop() || "jpg";
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = join(uploadDir, uniqueName);
      await writeFile(filePath, file.buffer);
      imageUrl = `${relDir}/${uniqueName}`;
    }

    const reply = await prisma.feedbackReply.create({
      data: {
        content: content || "",
        imageUrl,
        feedbackId: id,
        authorId: user.id,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true, avatar: true },
        },
      },
    });

    // Update feedback status if replied by Admin or Conducteur
    if (user.role === "ADMIN" || user.role === "CONDUCTEUR") {
      await prisma.feedback.update({
        where: { id },
        data: { status: "EN_COURS" }
      });
    }

    return res.status(201).json(reply);
  } catch (error) {
    console.error("Error creating feedback reply:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
