import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

// GET /api/visits
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const projectId = req.query.projectId as string | undefined;

    let where: any = {};
    if (projectId) where.projectId = projectId;

    if (user.role === "CONDUCTEUR") {
      where.project = { supervisorId: user.id };
    } else if (user.role === "CHEF_EQUIPE") {
      where.project = { projectTeams: { some: { team: { leaderId: user.id } } } };
    }

    const visits = await prisma.fieldVisit.findMany({
      where,
      include: {
        project: { select: { name: true } },
        visitor: { select: { firstName: true, lastName: true } }
      },
      orderBy: { plannedAt: "asc" }
    });
    return res.status(200).json(visits);
  } catch (error) {
    console.error("Error fetching visits:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/visits
router.post("/", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { projectId, purpose, notes, plannedAt } = req.body;

    if (!projectId || !purpose || !plannedAt) {
      return res.status(400).json({ error: "Champs requis manquants" });
    }

    const visit = await prisma.fieldVisit.create({
      data: {
        projectId,
        purpose,
        notes,
        plannedAt: new Date(plannedAt),
        visitorId: user.id
      },
      include: {
        project: { select: { name: true } },
        visitor: { select: { firstName: true, lastName: true } }
      }
    });

    return res.status(201).json(visit);
  } catch (error) {
    console.error("Error creating visit:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
