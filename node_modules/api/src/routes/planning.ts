import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

// GET /api/planning
// Aggregates Tasks, Deliveries, and FieldVisits for a unified timeline/list view
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const projectId = req.query.projectId as string | undefined;

    // Visibility mapping
    let projectFilter: any = {};
    if (user.role === "CONDUCTEUR") {
      projectFilter = { supervisorId: user.id };
    } else if (user.role === "CHEF_EQUIPE") {
      projectFilter = { projectTeams: { some: { team: { leaderId: user.id } } } };
    } else if (user.role === "OUVRIER") {
      projectFilter = { projectTeams: { some: { team: { members: { some: { userId: user.id } } } } } };
    } else if (user.role === "CLIENT") {
      projectFilter = { clientId: user.id };
    }

    // Specific project filter if provided
    const finalProjectFilter = projectId ? { id: projectId, ...projectFilter } : projectFilter;

    const [tasks, deliveries, visits] = await Promise.all([
      // Tasks
      prisma.task.findMany({
        where: { 
          project: finalProjectFilter,
          status: { not: "TERMINE" }
        },
        include: { project: { select: { name: true } } },
        orderBy: { dueDate: "asc" }
      }),
      // Deliveries
      prisma.delivery.findMany({
        where: { 
          project: finalProjectFilter,
          status: { not: "LIVRE" }
        },
        include: { project: { select: { name: true } } },
        orderBy: { plannedDate: "asc" }
      }),
      // Field Visits
      prisma.fieldVisit.findMany({
        where: { 
          project: finalProjectFilter,
          completedAt: null
        },
        include: { 
          project: { select: { name: true } },
          visitor: { select: { firstName: true, lastName: true } }
        },
        orderBy: { plannedAt: "asc" }
      })
    ]);

    // Transform into a unified format
    const unifiedPlanning = [
      ...tasks.map(t => ({
        id: t.id,
        type: 'TASK',
        title: t.title,
        date: t.dueDate,
        status: t.status,
        projectName: t.project.name,
        priority: t.priority,
      })),
      ...deliveries.map(d => ({
        id: d.id,
        type: 'DELIVERY',
        title: d.item,
        date: d.plannedDate,
        status: d.status,
        projectName: d.project.name,
        quantity: d.quantity,
        supplier: d.supplier,
      })),
      ...visits.map(v => ({
        id: v.id,
        type: 'VISIT',
        title: v.purpose,
        date: v.plannedAt,
        status: 'PLANIFIE',
        projectName: v.project.name,
        visitorName: `${v.visitor.firstName} ${v.visitor.lastName}`,
        notes: v.notes,
      }))
    ].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : Infinity;
      const dateB = b.date ? new Date(b.date).getTime() : Infinity;
      return dateA - dateB;
    });

    return res.status(200).json(unifiedPlanning);
  } catch (error) {
    console.error("Error fetching planning data:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
