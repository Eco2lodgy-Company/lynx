import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

// GET /api/deliveries
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const projectId = req.query.projectId as string | undefined;

    const where: any = {};
    if (projectId) where.projectId = projectId;

    if (user.role === "CONDUCTEUR") {
      where.project = { supervisorId: user.id };
    } else if (user.role === "CHEF_EQUIPE" || user.role === "OUVRIER") {
      const teams = await prisma.projectTeam.findMany({
        where: { 
          team: { 
            OR: [
              { leaderId: user.id },
              { members: { some: { userId: user.id } } }
            ]
          } 
        },
        select: { projectId: true }
      });
      where.projectId = { in: teams.map(t => t.projectId) };
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        project: { select: { name: true } }
      },
      orderBy: { plannedDate: "asc" }
    });

    return res.status(200).json(deliveries);
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/deliveries
router.post("/", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"]), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { projectId, item, quantity, supplier, plannedDate, notes } = req.body;

    if (!projectId || !item || !plannedDate) {
      return res.status(400).json({ error: "Détails requis manquants" });
    }

    const delivery = await prisma.delivery.create({
      data: {
        projectId,
        item,
        quantity: quantity || null,
        supplier: supplier || null,
        plannedDate: new Date(plannedDate),
        notes: notes || null,
        status: user.role === "CHEF_EQUIPE" ? "URGENT" : "A_VENIR"
      },
      include: {
        project: { select: { name: true } }
      }
    });

    return res.status(201).json(delivery);
  } catch (error) {
    console.error("Error creating delivery:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
