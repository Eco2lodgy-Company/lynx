import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

// GET /api/validations — pending items for approval
router.get("/", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const projectId = req.query.projectId as string | undefined;
    const type = req.query.type || "logs";

    if (type === "incidents") {
      const where: any = { status: { in: ["OUVERT", "EN_COURS"] } };
      if (projectId) where.projectId = projectId;
      if (user.role === "CONDUCTEUR") {
        where.project = { supervisorId: user.id };
      }

      const incidents = await prisma.incident.findMany({
        where,
        include: {
          reporter: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
          comments: {
            include: { author: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
        orderBy: [{ severity: "desc" }, { date: "desc" }],
      });
      return res.status(200).json(incidents);
    }

    // Default: daily logs
    const where: any = { status: "SOUMIS" };
    if (projectId) where.projectId = projectId;
    if (user.role === "CONDUCTEUR") {
      where.project = { supervisorId: user.id };
    }

    const logs = await prisma.dailyLog.findMany({
      where,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { date: "desc" },
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching validations:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
