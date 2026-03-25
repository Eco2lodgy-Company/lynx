import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

// GET /api/projects — Liste des projets
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { role, id: userId } = user;

    let where: any = {};
    if (role === "CONDUCTEUR") {
      where = { supervisorId: userId };
    } else if (role === "CLIENT") {
      where = { clientId: userId };
    } else if (role === "CHEF_EQUIPE") {
      where = { projectTeams: { some: { team: { leaderId: userId } } } };
    } else if (role === "OUVRIER") {
      where = { projectTeams: { some: { team: { members: { some: { userId } } } } } };
    } else if (role !== "ADMIN") {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
        department: true,
        _count: { select: { tasks: true, phases: true, incidents: true, dailyLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/projects — Créer un projet
router.post("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    if (!["ADMIN", "CONDUCTEUR"].includes(user.role)) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const {
      name, description, address, latitude, longitude,
      status, priority, startDate, estimatedEndDate,
      budget, supervisorId, clientId, departmentId,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Le nom est requis" });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        address: address || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        status: status || "PLANIFIE",
        priority: priority || "NORMALE",
        startDate: startDate ? new Date(startDate) : null,
        estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
        budget: budget ? parseFloat(budget) : null,
        supervisorId: supervisorId || user.id,
        clientId: clientId || null,
        departmentId: departmentId || null,
      },
      include: {
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
        department: true,
      },
    });

    return res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    return res.status(500).json({ error: "Erreur lors de la création" });
  }
});

// GET /api/projects/:id
router.get("/:id", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const id = req.params.id;

    if (user.role !== "ADMIN") {
      const isAuthorized = await prisma.project.findFirst({
        where: {
          id,
          OR: [
            { supervisorId: user.id },
            { clientId: user.id },
            { projectTeams: { some: { team: { leaderId: user.id } } } },
            { projectTeams: { some: { team: { members: { some: { userId: user.id } } } } } },
          ],
        },
      });

      if (!isAuthorized) {
        return res.status(403).json({ error: "Accès refusé" });
      }
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        department: true,
        phases: { orderBy: { order: "asc" } },
        tasks: {
          include: { assignments: { include: { user: { select: { firstName: true, lastName: true } } } } },
          orderBy: { createdAt: "desc" },
        },
        projectTeams: {
          include: { team: { include: { leader: { select: { firstName: true, lastName: true } } } } },
        },
        _count: { select: { tasks: true, incidents: true, dailyLogs: true } },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    return res.status(200).json(project);
  } catch (error) {
    console.error("Error fetching project details:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/projects/:id
router.put("/:id", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    if (!["ADMIN", "CONDUCTEUR"].includes(user.role)) {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const id = req.params.id;
    const body = req.body;

    const updateData: Record<string, unknown> = {};
    const fields = [
      "name", "description", "address", "status", "priority", "supervisorId",
      "clientId", "departmentId",
    ];

    fields.forEach((f) => {
      if (body[f] !== undefined) updateData[f] = body[f] || null;
    });

    if (body.name) updateData.name = body.name;
    if (body.latitude !== undefined) updateData.latitude = body.latitude ? parseFloat(body.latitude) : null;
    if (body.longitude !== undefined) updateData.longitude = body.longitude ? parseFloat(body.longitude) : null;
    if (body.budget !== undefined) updateData.budget = body.budget ? parseFloat(body.budget) : null;
    if (body.progress !== undefined) updateData.progress = parseInt(body.progress);
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.estimatedEndDate !== undefined) updateData.estimatedEndDate = body.estimatedEndDate ? new Date(body.estimatedEndDate) : null;
    if (body.actualEndDate !== undefined) updateData.actualEndDate = body.actualEndDate ? new Date(body.actualEndDate) : null;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
        department: true,
      },
    });

    return res.status(200).json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    return res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

// DELETE /api/projects/:id
router.delete("/:id", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    if (user.role !== "ADMIN") {
      return res.status(403).json({ error: "Non autorisé" });
    }

    const id = req.params.id;
    await prisma.project.delete({ where: { id } });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

export default router;
