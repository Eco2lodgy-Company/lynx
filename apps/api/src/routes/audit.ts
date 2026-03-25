import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

// GET /api/audit — Admin-only audit trail
router.get("/", authMiddleware, requireRole(["ADMIN"]), async (req: AuthRequest, res: any) => {
  try {
    const entity = req.query.entity as string | undefined;
    const userId = req.query.userId as string | undefined;
    const limit = parseInt((req.query.limit as string) || "50");

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
