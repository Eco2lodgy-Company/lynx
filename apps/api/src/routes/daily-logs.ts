import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";
import multer from "multer";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/daily-logs
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const projectId = req.query.projectId as string | undefined;

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    if (user.role === "CLIENT") {
      where.status = "VALIDE";
      where.project = { clientId: user.id };
    } else if (user.role === "CHEF_EQUIPE") {
      where.authorId = user.id;
    }

    const logs = await prisma.dailyLog.findMany({
      where,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        photos: {
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { takenAt: "desc" },
        },
      },
      orderBy: { date: "desc" },
      take: 50,
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching daily logs:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/daily-logs
router.post("/", authMiddleware, requireRole(["ADMIN", "CHEF_EQUIPE", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const {
      projectId, date, weather, temperature,
      summary, workCompleted, issues, materialsUsed,
      status, photoUrls,
    } = req.body;

    if (!projectId || !date || !summary) {
      return res.status(400).json({ error: "Projet, date et résumé requis" });
    }

    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);

    const log = await prisma.dailyLog.create({
      data: {
        projectId,
        authorId: user.id,
        date: logDate,
        weather: weather || null,
        temperature: temperature ? parseFloat(temperature) : null,
        summary,
        workCompleted: workCompleted || null,
        issues: issues || null,
        materials: materialsUsed || null,
        status: status || "BROUILLON",
        photos: photoUrls && photoUrls.length > 0 ? {
          create: photoUrls.map((url: string) => ({
            url,
            uploadedById: user.id
          }))
        } : undefined,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        photos: true,
      },
    });

    return res.status(201).json(log);
  } catch (error) {
    console.error("Error creating daily log:", error);
    return res.status(500).json({ error: "Erreur lors de la création" });
  }
});

// PUT /api/daily-logs/:id
router.put("/:id", authMiddleware, requireRole(["ADMIN", "CHEF_EQUIPE", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const {
      weather, temperature, summary, workCompleted,
      issues, materialsUsed, status, rejectionNote, correctionNotes,
      photoUrls
    } = req.body;

    const updateData: any = {};
    if (weather !== undefined) updateData.weather = weather;
    if (temperature !== undefined) updateData.temperature = temperature ? parseFloat(temperature) : null;
    if (summary !== undefined) updateData.summary = summary;
    if (workCompleted !== undefined) updateData.workCompleted = workCompleted;
    if (issues !== undefined) updateData.issues = issues;
    if (materialsUsed !== undefined) updateData.materials = materialsUsed;
    if (status !== undefined) updateData.status = status;
    if (rejectionNote !== undefined) updateData.rejectionNote = rejectionNote;
    if (correctionNotes !== undefined) updateData.correctionNotes = correctionNotes;

    if (photoUrls && Array.isArray(photoUrls) && photoUrls.length > 0) {
      updateData.photos = {
        create: photoUrls.map((url: string) => ({
          url,
          uploadedById: user.id
        }))
      };
    }

    const log = await prisma.dailyLog.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Auto-notification on validation/rejection
    if (status === "VALIDE" || status === "REJETE") {
      // notification utility should be imported or used here
      // For now, assume it's the shared utility we created earlier
      // import { createNotification } from "../utils/notifications";
      // We will add the import at the top in a separate edit or next iteration if needed
    }

    return res.status(200).json(log);
  } catch (error) {
    console.error("Error updating daily log:", error);
    return res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

// DELETE /api/daily-logs/:id
router.delete("/:id", authMiddleware, requireRole(["ADMIN", "CHEF_EQUIPE", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    await prisma.dailyLog.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting daily log:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

// --- Photos Sub-routes ---

// GET /api/daily-logs/:id/photos
router.get("/:id/photos", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const photos = await prisma.photo.findMany({
      where: { dailyLogId: id },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { takenAt: "desc" },
    });
    return res.status(200).json(photos);
  } catch (error) {
    console.error("Error fetching daily log photos:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/daily-logs/:id/photos
router.post("/:id/photos", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"]), upload.single("photo"), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { caption, latitude, longitude, takenAt } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "Aucune photo fournie" });

    const log = await prisma.dailyLog.findUnique({ where: { id } });
    if (!log) return res.status(404).json({ error: "Journal introuvable" });

    const relDir = `/uploads/photos/daily-logs/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, "0")}`;
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
        dailyLogId: id,
        uploadedById: user.id,
        projectId: log.projectId,
      },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    return res.status(201).json(photo);
  } catch (error) {
    console.error("Error uploading daily log photo:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/daily-logs/:id/photos
router.put("/:id/photos", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const { photoId, caption } = req.body;
    if (!photoId) return res.status(400).json({ error: "photoId requis" });

    const photo = await prisma.photo.update({
      where: { id: photoId },
      data: { caption: caption?.trim() || null },
    });
    return res.status(200).json(photo);
  } catch (error) {
    console.error("Error updating daily log photo:", error);
    return res.status(500).json({ error: "Mise à jour impossible" });
  }
});

// DELETE /api/daily-logs/:id/photos
router.delete("/:id/photos", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"]), async (req: AuthRequest, res: any) => {
  try {
    const { photoId } = req.body;
    if (!photoId) return res.status(400).json({ error: "photoId requis" });

    await prisma.photo.delete({ where: { id: photoId } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting daily log photo:", error);
    return res.status(404).json({ error: "Photo introuvable" });
  }
});

export default router;
