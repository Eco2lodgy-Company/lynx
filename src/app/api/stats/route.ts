import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    const [
        allUsers,
        allProjects,
        allTasks,
        overdueTasks,
        allIncidents,
        criticalIncidents,
        resolvedIncidents,
        allLogs,
        validatedLogs,
        pendingLogs,
        attendanceToday,
    ] = await Promise.all([
        prisma.user.findMany({ select: { role: true, isActive: true } }),
        prisma.project.findMany({ select: { status: true, progress: true } }),
        prisma.task.findMany({ select: { status: true, dueDate: true } }),
        prisma.task.count({
            where: {
                status: { notIn: ["TERMINE", "ANNULE"] },
                dueDate: { lt: now },
            },
        }),
        prisma.incident.count(),
        prisma.incident.count({
            where: { severity: "CRITIQUE", status: { notIn: ["RESOLU", "FERME"] } },
        }),
        prisma.incident.count({ where: { status: { in: ["RESOLU", "FERME"] } } }),
        prisma.dailyLog.count(),
        prisma.dailyLog.count({ where: { status: "VALIDE" } }),
        prisma.dailyLog.count({ where: { status: "SOUMIS" } }),
        prisma.attendance.findMany({
            where: { date: { gte: startOfDay, lt: endOfDay } },
            select: { status: true },
        }),
    ]);

    // Users by role
    const byRole: Record<string, number> = {};
    let activeUsers = 0;
    for (const u of allUsers) {
        byRole[u.role] = (byRole[u.role] || 0) + 1;
        if (u.isActive) activeUsers++;
    }

    // Projects by status
    const byStatus: Record<string, number> = {};
    let totalProgress = 0;
    for (const p of allProjects) {
        byStatus[p.status] = (byStatus[p.status] || 0) + 1;
        totalProgress += p.progress;
    }
    const avgProgress = allProjects.length > 0 ? totalProgress / allProjects.length : 0;

    // Tasks
    const completedTasks = allTasks.filter((t) => t.status === "TERMINE").length;
    const inProgressTasks = allTasks.filter((t) => t.status === "EN_COURS").length;

    // Attendance
    const present = attendanceToday.filter((a) => a.status === "PRESENT").length;
    const absent = attendanceToday.filter((a) => a.status === "ABSENT").length;
    const late = attendanceToday.filter((a) => a.status === "RETARD").length;

    return NextResponse.json({
        users: { total: allUsers.length, byRole, active: activeUsers },
        projects: { total: allProjects.length, byStatus, avgProgress },
        tasks: { total: allTasks.length, completed: completedTasks, inProgress: inProgressTasks, overdue: overdueTasks },
        incidents: { total: allIncidents, open: allIncidents - resolvedIncidents, critical: criticalIncidents, resolved: resolvedIncidents },
        logs: { total: allLogs, validated: validatedLogs, pending: pendingLogs },
        attendance: { today: attendanceToday.length, present, absent, late },
    });
}
