import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

export async function GET() {
    const user = await getAuthorizedUser();
    if (!user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    // Define visibility filter for projects
    let projectFilter: Record<string, unknown> = {};
    if (user.role === "CONDUCTEUR") {
        projectFilter = { supervisorId: user.id };
    } else if (user.role === "CLIENT") {
        projectFilter = { clientId: user.id };
    } else if (user.role === "CHEF_EQUIPE") {
        projectFilter = { projectTeams: { some: { team: { leaderId: user.id } } } };
    } else if (user.role === "OUVRIER") {
        projectFilter = { projectTeams: { some: { team: { members: { some: { userId: user.id } } } } } };
    }

    const [
        allUsers,
        allProjects,
        allTasks,
        allIncidents,
        allLogs,
        attendanceToday,
    ] = await Promise.all([
        prisma.user.findMany({ select: { id: true, role: true, isActive: true } }),
        prisma.project.findMany({ 
            where: projectFilter,
            select: { id: true, name: true, status: true, progress: true } 
        }),
        prisma.task.findMany({ 
            where: { project: projectFilter },
            select: { status: true, dueDate: true } 
        }),
        prisma.incident.findMany({
            where: { project: projectFilter },
            select: { status: true, severity: true }
        }),
        prisma.dailyLog.findMany({
            where: { project: projectFilter },
            select: { status: true }
        }),
        prisma.attendance.findMany({
            where: { 
                date: { gte: startOfDay, lt: endOfDay },
                ...(user.role === "ADMIN" ? {} : { OR: [{ userId: user.id }, { project: projectFilter }] })
            },
            select: { status: true, userId: true, checkIn: true },
        }),
    ]);

    // Dashboard stats calculation based on StatsData interface expected by frontend

    // 1. Users
    const usersByRole = allUsers.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // 2. Projects
    const projectsByStatus = allProjects.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const avgProgress = allProjects.length > 0 ? allProjects.reduce((acc, p) => acc + p.progress, 0) / allProjects.length : 0;

    // 3. Tasks
    const tasksCompleted = allTasks.filter(t => t.status === "TERMINE").length;
    const tasksInProgress = allTasks.filter(t => t.status === "EN_COURS").length;
    const tasksOverdue = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "TERMINE").length;

    // 4. Incidents
    const incidentsOpen = allIncidents.filter(i => i.status === "OUVERT" || i.status === "EN_COURS").length;
    const incidentsCritical = allIncidents.filter(i => i.severity === "CRITIQUE").length;
    const incidentsResolved = allIncidents.filter(i => i.status === "RESOLU").length;

    // 5. Logs
    const logsValidated = allLogs.filter(l => l.status === "VALIDE").length;
    const logsPending = allLogs.filter(l => l.status === "SOUMIS").length;

    // 6. Attendance
    const attendancePresent = attendanceToday.filter(a => a.status === "VALIDE" && a.checkIn).length;
    const attendanceAbsent = allUsers.filter(u => u.isActive && !attendanceToday.some(a => a.userId === u.id)).length; 

    // 7. Project Health (List of projects with their stats) - Optimized with maps
    const incidentCountsByProject: Record<string, number> = {};
    const taskCountsByProject: Record<string, number> = {};

    allIncidents.forEach(i => {
        const pid = (i as any).projectId;
        if (pid) incidentCountsByProject[pid] = (incidentCountsByProject[pid] || 0) + 1;
    });

    allTasks.forEach(t => {
        const pid = (t as any).projectId;
        if (pid) taskCountsByProject[pid] = (taskCountsByProject[pid] || 0) + 1;
    });

    const projectHealth = allProjects.map(p => {
        return {
            id: p.id,
            name: p.name,
            progress: p.progress,
            incidents: incidentCountsByProject[p.id] || 0,
            tasks: taskCountsByProject[p.id] || 0
        };
    });

    return NextResponse.json({
        users: { 
            total: allUsers.length, 
            byRole: usersByRole, 
            active: allUsers.filter(u => u.isActive).length 
        },
        projects: { 
            total: allProjects.length, 
            byStatus: projectsByStatus, 
            avgProgress 
        },
        tasks: { 
            total: allTasks.length, 
            completed: tasksCompleted, 
            inProgress: tasksInProgress, 
            overdue: tasksOverdue 
        },
        incidents: { 
            total: allIncidents.length, 
            open: incidentsOpen, 
            critical: incidentsCritical, 
            resolved: incidentsResolved 
        },
        logs: { 
            total: allLogs.length, 
            validated: logsValidated, 
            pending: logsPending 
        },
        attendance: { 
            today: allUsers.length, // total possible 
            present: attendancePresent, 
            absent: attendanceAbsent, 
            late: 0 
        },
        projectHealth
    });
}
