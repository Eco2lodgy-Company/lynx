import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";
import multer from "multer";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/reports — Liste des rapports
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    
    const where: Record<string, unknown> = {};
    if (user.role === "CLIENT") {
      where.project = { clientId: user.id };
    } else if (user.role === "CONDUCTEUR") {
      where.project = { supervisorId: user.id };
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        photos: {
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { takenAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/reports — Créer un rapport
router.post("/", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const { title, type, projectId, content, periodStart, periodEnd, pdfUrl } = req.body;
    if (!title?.trim() || !projectId) {
      return res.status(400).json({ error: "Titre et projet requis" });
    }

    const report = await prisma.report.create({
      data: {
        title: title.trim(),
        type,
        projectId,
        content: content?.trim() || null,
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        pdfUrl: pdfUrl || null,
        status: "BROUILLON",
      },
      include: { project: { select: { id: true, name: true } } },
    });

    return res.status(201).json(report);
  } catch (error) {
    console.error("Error creating report:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/reports/:id/pdf
router.get("/:id/pdf", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            name: true,
            address: true,
            supervisor: { select: { firstName: true, lastName: true } },
            client: { select: { firstName: true, lastName: true } },
          },
        },
        photos: {
          select: { url: true, caption: true, takenAt: true },
          orderBy: { takenAt: "asc" },
        },
      },
    });

    if (!report) return res.status(404).json({ error: "Rapport introuvable" });

    if (user.role === "CLIENT" && report.status !== "PUBLIE") {
      return res.status(403).json({ error: "Rapport non publié" });
    }

    let dailyLogs: any[] = [];
    if (report.periodStart && report.periodEnd) {
      dailyLogs = await prisma.dailyLog.findMany({
        where: {
          projectId: report.projectId,
          status: "VALIDE",
          date: { gte: report.periodStart, lte: report.periodEnd },
        },
        include: {
          author: { select: { firstName: true, lastName: true } },
          comments: {
            include: { author: { select: { firstName: true, role: true } } },
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { date: "asc" },
      });
    }

    const pdfData = {
      title: report.title,
      type: report.type,
      status: report.status,
      project: {
        name: report.project.name,
        address: report.project.address,
        supervisor: report.project.supervisor ? `${report.project.supervisor.firstName} ${report.project.supervisor.lastName}` : null,
        client: report.project.client ? `${report.project.client.firstName} ${report.project.client.lastName}` : null,
      },
      period: { start: report.periodStart?.toISOString(), end: report.periodEnd?.toISOString() },
      content: report.content,
      photos: report.photos.map((p) => ({ url: p.url, caption: p.caption, takenAt: p.takenAt.toISOString() })),
      dailyLogs: dailyLogs.map((log) => ({
        date: log.date.toISOString(),
        summary: log.summary,
        workCompleted: log.workCompleted,
        weather: log.weather,
        issues: log.issues,
        materials: log.materials,
        correctionNotes: log.correctionNotes,
        author: `${log.author.firstName} ${log.author.lastName}`,
        comments: log.comments.map((c: any) => ({
          content: c.content,
          createdAt: c.createdAt.toISOString(),
          author: `${c.author.firstName} (${c.author.role})`,
        }))
      })),
      generatedAt: new Date().toISOString(),
      generatedBy: `${user.firstName} ${user.lastName}`,
    };

    return res.status(200).json(pdfData);
  } catch (error) {
    console.error("Error generating report PDF data:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/reports/:id/photos
router.get("/:id/photos", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const photos = await prisma.photo.findMany({
      where: { reportId: id },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { takenAt: "desc" },
    });
    return res.status(200).json(photos);
  } catch (error) {
    console.error("Error fetching report photos:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/reports/:id/photos
router.post("/:id/photos", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"]), upload.single("photo"), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { caption, latitude, longitude, takenAt } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "Aucune photo fournie" });

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return res.status(404).json({ error: "Rapport introuvable" });

    const relDir = `/uploads/photos/reports/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, "0")}`;
    const uploadDir = join(process.cwd(), "public", relDir);
    await mkdir(uploadDir, { recursive: true });

    const ext = file.originalname.split(".").pop() || "jpg";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = join(uploadDir, uniqueName);
    await writeFile(filePath, file.buffer);

    const url = `${relDir}/${uniqueName}`;

    const photo = await prisma.photo.create({
      data: {
        url,
        caption: caption?.trim() || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        takenAt: takenAt ? new Date(takenAt) : new Date(),
        reportId: id,
        uploadedById: user.id,
      },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    return res.status(201).json(photo);
  } catch (error) {
    console.error("Error uploading report photo:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/reports/:id/photos
router.delete("/:id/photos", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const { photoId } = req.body;
    if (!photoId) return res.status(400).json({ error: "photoId requis" });

    await prisma.photo.delete({ where: { id: photoId } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting report photo:", error);
    return res.status(404).json({ error: "Photo introuvable" });
  }
});

export default router;
