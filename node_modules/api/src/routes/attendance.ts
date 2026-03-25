import { Router } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import prisma from "@lynx/prisma";

const router = Router();

// GET /api/attendance — Liste des pointages
router.get("/", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const dateStr = req.query.date as string | undefined;
    const now = new Date();
    const todayStr = (dateStr ? new Date(dateStr) : now).toISOString().split("T")[0];
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    const where: any = {
      date: { gte: startOfDay, lt: endOfDay },
    };
    if (user.role === "OUVRIER") {
      where.userId = user.id;
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/attendance/check-in
router.post("/check-in", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { latitude, longitude, projectId, notes } = req.body;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existing = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: startOfDay,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: "Vous avez déjà pointé aujourd'hui" });
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId: user.id,
        date: startOfDay,
        checkIn: now,
        latitude: latitude || null,
        longitude: longitude || null,
        projectId: projectId || null,
        status: "EN_ATTENTE",
        notes: notes || null,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } }
      }
    });

    return res.status(201).json(attendance);
  } catch (error) {
    console.error("Attendance check-in error:", error);
    return res.status(500).json({ error: "Erreur lors du pointage" });
  }
});

// POST /api/attendance/check-out
router.post("/check-out", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { latitude, longitude, notes } = req.body;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existing = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: startOfDay,
        },
      },
    });

    if (!existing) {
      return res.status(400).json({ error: "Aucun pointage d'arrivée enregistré pour aujourd'hui" });
    }

    if (existing.checkOut) {
      return res.status(400).json({ error: "Vous avez déjà enregistré votre départ aujourd'hui" });
    }

    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: now,
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(notes && { notes }),
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } },
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Attendance check-out error:", error);
    return res.status(500).json({ error: "Erreur lors du pointage de départ" });
  }
});

// POST /api/attendance/validate
router.post("/validate", authMiddleware, requireRole(["ADMIN", "CHEF_EQUIPE", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { attendanceIds } = req.body;

    if (!Array.isArray(attendanceIds)) {
      return res.status(400).json({ error: "Liste d'IDs invalide" });
    }

    const result = await prisma.attendance.updateMany({
      where: {
        id: { in: attendanceIds },
        status: "EN_ATTENTE"
      },
      data: {
        status: "VALIDE",
        // validatedById: user.id, // Assuming validatedById exists in schema
        updatedAt: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      count: result.count,
      validatedBy: `${user.firstName} ${user.lastName}`
    });
  } catch (error) {
    console.error("Attendance validation error:", error);
    return res.status(500).json({ error: "Erreur lors de la validation" });
  }
});

// POST /api/attendance/scan
router.post("/scan", authMiddleware, requireRole(["CHEF_EQUIPE"]), async (req: AuthRequest, res: any) => {
  try {
    const sender = req.user!;
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ error: "QR Token requis" });

    const worker = await prisma.user.findUnique({ where: { qrToken } });
    if (!worker) return res.status(404).json({ error: "Ouvrier non trouvé" });

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId: worker.id, date: todayDate } },
    });

    if (existing) {
      return res.status(200).json({
        success: false,
        message: "Pointage déjà effectué aujourd'hui",
        worker: { firstName: worker.firstName, lastName: worker.lastName }
      });
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId: worker.id,
        date: todayDate,
        checkIn: today,
        status: "PRESENT",
        notes: `Pointé par QR Code par ${sender.firstName} ${sender.lastName}`,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Présence confirmée pour ${worker.firstName} ${worker.lastName}`,
      worker: { firstName: worker.firstName, lastName: worker.lastName },
      attendance,
    });
  } catch (error) {
    console.error("Scan error:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/attendance/transmit
router.post("/transmit", authMiddleware, requireRole(["CHEF_EQUIPE"]), async (req: AuthRequest, res: any) => {
  try {
    const sender = req.user!;
    const { date, attendanceIds } = req.body;
    if (!attendanceIds || !Array.isArray(attendanceIds) || attendanceIds.length === 0) {
      return res.status(400).json({ error: "Aucun pointage à transmettre" });
    }

    const attendances = await prisma.attendance.findMany({
      where: { id: { in: attendanceIds } },
      include: { project: true } as any
    });

    const projectIds = Array.from(new Set(attendances.map((a: any) => a.projectId).filter(Boolean))) as string[];
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { supervisorId: true }
    });

    const conductorIds = Array.from(new Set(projects.map(p => p.supervisorId).filter(Boolean))) as string[];
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    const adminIds = admins.map(a => a.id);
    const recipients = Array.from(new Set([...conductorIds, ...adminIds]));

    const title = "Pointage journalier transmis";
    const message = `${sender.firstName} ${sender.lastName} a transmis le pointage pour le ${new Date(date).toLocaleDateString('fr-FR')}. ${attendances.length} pointages enregistrés.`;

    const notificationsData = recipients.map(userId => ({
      userId,
      title,
      message,
      type: "VALIDATION",
      link: `/admin/attendance?date=${date}`,
      isRead: false
    }));

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({ data: notificationsData });
    }

    return res.status(200).json({ success: true, message: "Pointage transmis avec succès." });
  } catch (error) {
    console.error("Transmission error:", error);
    return res.status(500).json({ error: "Erreur lors de la transmission" });
  }
});

// GET /api/attendance/summary
router.get("/summary", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"]), async (req: AuthRequest, res: any) => {
  try {
    const { userId, startDate: startDateStr, endDate: endDateStr } = req.query as any;
    if (!userId || !startDateStr || !endDateStr) return res.status(400).json({ error: "Paramètres manquants" });

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const records = await prisma.attendance.findMany({
      where: { userId, date: { gte: startDate, lte: endDate }, status: "VALIDE" },
      orderBy: { date: "asc" }
    });

    const summary = records.map(record => {
      let durationHours = 0;
      if (record.checkIn && record.checkOut) {
        const diffMs = record.checkOut.getTime() - record.checkIn.getTime();
        durationHours = Math.max(0, diffMs / (1000 * 60 * 60));
      }
      return {
        date: record.date.toISOString().split("T")[0],
        checkIn: record.checkIn?.toISOString(),
        checkOut: record.checkOut?.toISOString(),
        durationHours: parseFloat(durationHours.toFixed(2)),
        status: record.status
      };
    });

    const totalHours = summary.reduce((acc, curr) => acc + curr.durationHours, 0);

    return res.status(200).json({
      userId,
      totalHours: parseFloat(totalHours.toFixed(2)),
      daysCount: records.length,
      records: summary
    });
  } catch (error) {
    console.error("Summary error:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/attendance/team-today
router.get("/team-today", authMiddleware, requireRole(["CHEF_EQUIPE", "ADMIN", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const user = req.user!;
    const { date: dateStr } = req.query as any;
    const now = new Date();
    const todayStr = (dateStr ? new Date(dateStr) : now).toISOString().split("T")[0];
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    let where: any = { date: { gte: startOfDay, lt: endOfDay } };

    if (user.role === "CHEF_EQUIPE") {
      const team = await prisma.team.findFirst({ where: { leaderId: user.id } });
      if (!team) return res.status(404).json({ error: "Vous ne dirigez aucune équipe" });
      const memberIds = (await prisma.teamMember.findMany({ where: { teamId: team.id }, select: { userId: true } })).map(m => m.userId);
      where.userId = { in: memberIds };
    }

    const stats = await prisma.attendance.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        project: { select: { id: true, name: true } },
        validatedBy: { select: { firstName: true, lastName: true } }
      },
      orderBy: { checkIn: "asc" }
    });

    return res.status(200).json(stats);
  } catch (error) {
    console.error("Team-today error:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/attendance/report
router.get("/report", authMiddleware, requireRole(["ADMIN", "CONDUCTEUR"]), async (req: AuthRequest, res: any) => {
  try {
    const { period = "daily", date: dateParam, projectId, teamId } = req.query as any;
    const baseDate = dateParam ? new Date(dateParam) : new Date();

    let gte: Date;
    let lt: Date;

    const { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require("date-fns");
    if (period === "daily") {
      gte = startOfDay(baseDate);
      lt = endOfDay(baseDate);
    } else if (period === "weekly") {
      gte = startOfWeek(baseDate, { weekStartsOn: 1 });
      lt = endOfWeek(baseDate, { weekStartsOn: 1 });
    } else {
      gte = startOfMonth(baseDate);
      lt = endOfMonth(baseDate);
    }

    let where: any = { date: { gte, lt } };
    if (projectId && projectId !== "all") where.projectId = projectId;
    if (teamId && teamId !== "all") {
      const teamMembers = await prisma.teamMember.findMany({ where: { teamId }, select: { userId: true } });
      where.userId = { in: teamMembers.map(m => m.userId) };
    }

    const reports = await prisma.attendance.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        validatedBy: { select: { firstName: true, lastName: true } }
      },
      orderBy: [{ date: "desc" }, { user: { lastName: "asc" } }]
    });

    return res.status(200).json(reports);
  } catch (error) {
    console.error("Report error:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
