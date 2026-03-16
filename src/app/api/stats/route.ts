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
    let projectFilter: any = {};
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
        allProjects,
        allTasks,
        allIncidents,
        allLogs,
        attendanceToday,
    ] = await Promise.all([
        prisma.project.findMany({ 
            where: projectFilter,
            select: { id: true, status: true, progress: true } 
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
            select: { status: true, userId: true },
        }),
    ]);

    // Dashboard stats calculation
    const activeProjects = allProjects.filter(p => !["TERMINE", "ANNULE"].includes(p.status)).length;
    const completedTasks = allTasks.filter(t => t.status === "TERMINE").length;
    const pendingValidations = allLogs.filter(l => l.status === "SOUMIS").length;
    const recentIncidents = allIncidents.filter(i => i.status === "OUVERT").length;

    // Project Health Tracking
    const projectHealth = allProjects.map(p => {
        const pTasks = allTasks.filter(t => t.status !== "TERMINE"); // Simplified for now
        const pIncidents = allIncidents.filter(i => i.status === "OUVERT");
        
        return {
            id: p.id,
            status: p.status,
            incidents: pIncidents.length,
            tasks: pTasks.length,
            progress: p.progress
        };
    });

    return NextResponse.json({
        activeProjects,
        pendingValidations,
        recentIncidents,
        completedTasks,
        projectHealth,
        avgProgress: allProjects.length > 0 ? allProjects.reduce((acc, p) => acc + p.progress, 0) / allProjects.length : 0,
        counts: {
            projects: allProjects.length,
            tasks: allTasks.length,
            incidents: allIncidents.length,
            logs: allLogs.length,
            attendance: attendanceToday.length
        }
    });
}
