import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";
import { notifyAdminsAndSupervisor } from "../utils/notifications";

const router = Router();

// GET /api/advance-requests
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const projectId = req.query.projectId as string | undefined;

    const where: any = {};
    if (projectId) where.projectId = projectId;

    if (user.role === "CHEF_EQUIPE") {
      where.userId = user.id;
    } else if (user.role === "CONDUCTEUR") {
      where.project = { supervisorId: user.id };
    }

    const requests = await prisma.advanceRequest.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching advance requests:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/advance-requests
router.post("/", authMiddleware, requireRole(["CHEF_EQUIPE", "ADMIN", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { amount, reason, projectId } = req.body;

    if (!amount || !reason || !projectId) {
      return res.status(400).json({ error: "Champs requis manquants" });
    }

    const request = await prisma.advanceRequest.create({
      data: {
        amount: parseFloat(amount),
        reason,
        projectId,
        userId: user.id
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } }
      }
    });

    // Notify Admins and Supervisor
    await notifyAdminsAndSupervisor({
      projectId,
      title: "💰 Nouvelle demande d'avance",
      message: `${request.user.firstName} demande ${amount}€ pour : ${reason}`,
      type: "ALERTE",
      link: `/admin/advances`,
      excludeUserId: user.id,
    });

    return res.status(201).json(request);
  } catch (error) {
    console.error("Error creating advance request:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/advance-requests/:id
router.put("/:id", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const request = await prisma.advanceRequest.update({
      where: { id },
      data: { status }
    });
    return res.status(200).json(request);
  } catch (error) {
    console.error("Error updating advance request:", error);
    return res.status(404).json({ error: "Demande introuvable" });
  }
});

// DELETE /api/advance-requests/:id
router.delete("/:id", authMiddleware, requireRole(["ADMIN"]), async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    await prisma.advanceRequest.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting advance request:", error);
    return res.status(404).json({ error: "Demande introuvable" });
  }
});

export default router;
