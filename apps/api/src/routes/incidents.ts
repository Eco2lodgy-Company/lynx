import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";
import multer from "multer";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/incidents
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    
    // --- Cleanup Logic (Phase 27) ---
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    try {
      await prisma.incident.deleteMany({
        where: {
          status: { in: ["RESOLU", "FERME"] },
          resolvedAt: { lt: fourteenDaysAgo }
        }
      });
    } catch (e) {
      console.error("Incident cleanup error:", e);
    }
    // --------------------------------

    const projectId = req.query.projectId as string | undefined;

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    if (user.role === "CHEF_EQUIPE") {
      where.reporterId = user.id;
    }

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        comments: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { createdAt: "asc" }
        },
        photos: {
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { takenAt: "desc" },
        },
        _count: { select: { photos: true, comments: true } },
      },
      orderBy: { date: "desc" },
      take: 50,
    });

    return res.status(200).json(incidents);
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/incidents
router.post("/", authMiddleware, requireRole(["ADMIN", "CHEF_EQUIPE", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { projectId, title, description, severity, location, photoUrls } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({ error: "Projet et titre requis" });
    }

    const incident = await prisma.incident.create({
      data: {
        projectId,
        reporterId: user.id,
        title,
        description: description || null,
        severity: severity || "MOYENNE",
        location: location || null,
        photos: photoUrls && photoUrls.length > 0 ? {
          create: photoUrls.map((url: string) => ({
            url,
            projectId,
            uploadedById: user.id
          }))
        } : undefined
      },
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        photos: true
      },
    });

    // TODO: Auto-notify admins and supervisor (migrate lib/notifications)
    // await notifyAdminsAndSupervisor(...)

    // TODO: Audit trail (migrate lib/audit)
    // await logAudit(...)

    return res.status(201).json(incident);
  } catch (error) {
    console.error("Error creating incident:", error);
    return res.status(500).json({ error: "Erreur lors de la création" });
  }
});

// PUT /api/incidents/:id
router.put("/:id", authMiddleware, requireRole(["ADMIN", "CHEF_EQUIPE", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const id = req.params.id;
    const body = req.body;

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.severity !== undefined) updateData.severity = body.severity;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.resolution !== undefined) updateData.resolution = body.resolution;
    
    if (body.status === "RESOLU" || body.status === "FERME") {
      updateData.resolvedAt = new Date();
    }

    const incident = await prisma.incident.update({
      where: { id },
      data: updateData,
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return res.status(200).json(incident);
  } catch (error) {
    console.error("Error updating incident:", error);
    return res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

// DELETE /api/incidents/:id
router.delete("/:id", authMiddleware, requireRole(["ADMIN", "CHEF_EQUIPE"]), async (req: AuthRequest, res: any) => {
  try {
    const id = req.params.id;
    await prisma.incident.delete({ where: { id } });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting incident:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

// --- Photos Sub-routes ---

// GET /api/incidents/:id/photos
router.get("/:id/photos", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const photos = await prisma.photo.findMany({
      where: { incidentId: id },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { takenAt: "desc" },
    });
    return res.status(200).json(photos);
  } catch (error) {
    console.error("Error fetching incident photos:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/incidents/:id/photos
router.post("/:id/photos", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"]), upload.single("photo"), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { caption, latitude, longitude, takenAt } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "Aucune photo fournie" });

    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) return res.status(404).json({ error: "Incident introuvable" });

    const relDir = `/uploads/photos/incidents/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, "0")}`;
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
        incidentId: id,
        uploadedById: user.id,
        projectId: incident.projectId,
      },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    return res.status(201).json(photo);
  } catch (error) {
    console.error("Error uploading incident photo:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/incidents/:id/photos
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
    console.error("Error updating incident photo:", error);
    return res.status(500).json({ error: "Mise à jour impossible" });
  }
});

// DELETE /api/incidents/:id/photos
router.delete("/:id/photos", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"]), async (req: AuthRequest, res: any) => {
  try {
    const { photoId } = req.body;
    if (!photoId) return res.status(400).json({ error: "photoId requis" });

    await prisma.photo.delete({ where: { id: photoId } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting incident photo:", error);
    return res.status(404).json({ error: "Photo introuvable" });
  }
});

export default router;
