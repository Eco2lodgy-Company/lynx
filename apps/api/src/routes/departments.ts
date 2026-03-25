import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

// GET /api/departments
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { users: true, teams: true },
        },
      },
    });

    return res.status(200).json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/departments
router.post("/", authMiddleware, requireRole(["ADMIN"]), async (req: AuthRequest, res: any) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: "Nom requis" });
    }

    const dept = await prisma.department.create({
      data: { name: name.trim(), description: description?.trim() || null },
      include: { _count: { select: { users: true, teams: true } } },
    });

    return res.status(201).json(dept);
  } catch (error) {
    console.error("Error creating department:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
