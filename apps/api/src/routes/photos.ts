import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

// GET /api/photos
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const isClient = user.role === "CLIENT";
    const isAdmin = user.role === "ADMIN";
    const isConducteur = user.role === "CONDUCTEUR";

    let photoWhere: any = {};
    let feedbackWhere: any = {};

    if (isClient) {
      photoWhere = {
        project: { clientId: user.id },
        OR: [{ dailyLog: { status: "VALIDE" } }, { report: { status: "PUBLIE" } }],
      };
      feedbackWhere = {
        imageUrl: { not: null },
        feedback: { project: { clientId: user.id } },
      };
    } else if (isConducteur) {
      const projectFilter = { supervisorId: user.id };
      photoWhere = { project: projectFilter };
      feedbackWhere = {
        imageUrl: { not: null },
        feedback: { project: projectFilter },
      };
    } else if (isAdmin) {
      photoWhere = {};
      feedbackWhere = { imageUrl: { not: null } };
    } else {
      const workerFilter = {
        OR: [
          { projectTeams: { some: { team: { leaderId: user.id } } } },
          { projectTeams: { some: { team: { members: { some: { userId: user.id } } } } } },
        ],
      };
      photoWhere = { project: workerFilter };
      feedbackWhere = {
        imageUrl: { not: null },
        feedback: { project: workerFilter },
      };
    }

    // 1. Fetch report photos
    const reportPhotos = await prisma.photo.findMany({
      where: photoWhere,
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch feedback reply photos
    const feedbackPhotos = await prisma.feedbackReply.findMany({
      where: feedbackWhere,
      include: {
        feedback: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Unify results
    const normalizedReportPhotos = reportPhotos.map((p: any) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      latitude: p.latitude,
      longitude: p.longitude,
      takenAt: p.takenAt?.toISOString() || p.createdAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
      project: p.project,
      source: "REPORT",
    }));

    const normalizedFeedbackPhotos = feedbackPhotos.map((p: any) => ({
      id: p.id,
      url: p.imageUrl!,
      caption: p.content || "Image partagée dans la discussion",
      latitude: null,
      longitude: null,
      takenAt: p.createdAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
      project: p.feedback.project,
      source: "MESSAGE",
    }));

    const allPhotos = [...normalizedReportPhotos, ...normalizedFeedbackPhotos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.status(200).json(allPhotos);
  } catch (error) {
    console.error("Error fetching photos:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/photos
router.post("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { url, caption, projectId, latitude, longitude, takenAt } = req.body;

    if (!url?.trim() || !projectId) {
      return res.status(400).json({ error: "URL et projet requis" });
    }

    const photo = await prisma.photo.create({
      data: {
        url: url.trim(),
        caption: caption?.trim() || null,
        projectId,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        takenAt: takenAt ? new Date(takenAt) : undefined,
        uploadedById: user.id,
      },
      include: { project: { select: { id: true, name: true } } },
    });

    return res.status(201).json(photo);
  } catch (error) {
    console.error("Error creating photo:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
