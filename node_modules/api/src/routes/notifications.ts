import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

// GET /api/notifications — get notifications for the current user
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/notifications — mark notifications as read
router.put("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { ids } = req.body;

    if (ids && Array.isArray(ids) && ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: user.id },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
