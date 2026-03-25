import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

// GET /api/teams — Liste des équipes
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        leader: { select: { id: true, firstName: true, lastName: true, role: true } },
        department: { select: { id: true, name: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });

    return res.status(200).json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/teams — Créer une équipe
router.post("/", authMiddleware, requireRole(["ADMIN"]), async (req: AuthRequest, res: any) => {
  try {
    const { name, description, leaderId, departmentId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Nom requis" });

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        leaderId: leaderId || null,
        departmentId: departmentId || null,
      },
    });

    return res.status(201).json(team);
  } catch (error) {
    console.error("Error creating team:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/teams/:id
router.put("/:id", authMiddleware, requireRole(["ADMIN"]), async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const { name, description, leaderId, departmentId } = req.body;

    const team = await prisma.team.update({
      where: { id },
      data: {
        name: name?.trim(),
        description: description?.trim() || null,
        leaderId: leaderId || null,
        departmentId: departmentId || null,
      },
    });
    return res.status(200).json(team);
  } catch (error) {
    console.error("Error updating team:", error);
    return res.status(404).json({ error: "Équipe introuvable" });
  }
});

// DELETE /api/teams/:id
router.delete("/:id", authMiddleware, requireRole(["ADMIN"]), async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    await prisma.team.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting team:", error);
    return res.status(404).json({ error: "Équipe introuvable" });
  }
});

export default router;
