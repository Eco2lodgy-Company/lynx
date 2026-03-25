import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

// GET /api/tasks
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const projectId = req.query.projectId as string | undefined;

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;

    if (user.role === "OUVRIER" || user.role === "CHEF_EQUIPE") {
      where.assignments = { some: { userId: user.id } };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        phase: { select: { id: true, name: true } },
        assignments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        _count: { select: { comments: true, subTasks: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/tasks
router.post("/", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"]), async (req: AuthRequest, res: any) => {
  try {
    const { projectId, phaseId, title, description, priority, startDate, dueDate, assigneeIds } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({ error: "Projet et titre requis" });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        phaseId: phaseId || null,
        title,
        description: description || null,
        priority: priority || "NORMALE",
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignments: assigneeIds?.length
          ? { create: assigneeIds.map((uid: string) => ({ userId: uid })) }
          : undefined,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    return res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    return res.status(500).json({ error: "Erreur lors de la création" });
  }
});

// PUT /api/tasks/:id
router.put("/:id", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const id = req.params.id;
    const body = req.body;

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    
    if (body.status !== undefined) {
      if (!["ADMIN", "CONDUCTEUR"].includes(user.role)) {
        return res.status(403).json({ error: "Seul le conducteur peut changer le statut d'une tâche" });
      }
      updateData.status = body.status;
      if (body.status === "TERMINE") updateData.completedAt = new Date();
    }
    
    if (body.priority !== undefined) updateData.priority = body.priority;

    // Requirement 1: Only Conducteur/Admin can update progress
    if (body.progress !== undefined) {
      if (!["ADMIN", "CONDUCTEUR"].includes(user.role)) {
        return res.status(403).json({ error: "Seul le conducteur peut noter l'avancement" });
      }
      updateData.progress = parseFloat(body.progress);
    }

    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        assignments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    return res.status(200).json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const id = req.params.id;
    await prisma.task.delete({ where: { id } });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

export default router;
