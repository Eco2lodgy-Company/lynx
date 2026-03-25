import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
    FolderKanban,
    Users,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    Clock,
    FileText,
    Activity,
} from "lucide-react";

export const metadata = { title: "Tableau de bord Admin" };

async function getStats() {
    const [
        totalUsers,
        totalProjects,
        activeProjects,
        openIncidents,
        totalTasks,
        completedTasks,
        recentLogs,
        pendingValidations,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.project.count(),
        prisma.project.count({ where: { status: "EN_COURS" } }),
        prisma.incident.count({ where: { status: "OUVERT" } }),
        prisma.task.count(),
        prisma.task.count({ where: { status: "TERMINE" } }),
        prisma.dailyLog.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: { author: true, project: true },
        }),
        prisma.dailyLog.count({ where: { status: "SOUMIS" } }),
    ]);

    return {
        totalUsers,
        totalProjects,
        activeProjects,
        openIncidents,
        totalTasks,
        completedTasks,
        recentLogs,
        pendingValidations,
        taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
}

export default async function AdminDashboard() {
    const session = await auth();
    const stats = await getStats();

    const kpis = [
        {
            label: "Projets actifs",
            value: stats.activeProjects,
            total: stats.totalProjects,
            icon: <FolderKanban className="w-6 h-6" />,
            color: "text-amber-400",
            bgColor: "bg-amber-500/10",
        },
        {
            label: "Utilisateurs",
            value: stats.totalUsers,
            icon: <Users className="w-6 h-6" />,
            color: "text-blue-400",
            bgColor: "bg-blue-500/10",
        },
        {
            label: "Incidents ouverts",
            value: stats.openIncidents,
            icon: <AlertTriangle className="w-6 h-6" />,
            color: stats.openIncidents > 0 ? "text-red-400" : "text-emerald-400",
            bgColor: stats.openIncidents > 0 ? "bg-red-500/10" : "bg-emerald-500/10",
        },
        {
            label: "Tâches complétées",
            value: `${stats.taskCompletionRate}%`,
            icon: <CheckCircle2 className="w-6 h-6" />,
            color: "text-emerald-400",
            bgColor: "bg-emerald-500/10",
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">
                    Panneau d&apos;administration
                </p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    Bienvenue, {session?.user?.name?.split(" ")[0]}
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    Vue d&apos;ensemble de vos chantiers et opérations
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div
                        key={kpi.label}
                        className="card animate-fade-in group cursor-default"
                        style={{ animationDelay: `${(i + 1) * 0.1}s` }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${kpi.bgColor} ${kpi.color}`}>
                                {kpi.icon}
                            </div>
                            <TrendingUp className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-2xl font-bold">{kpi.value}</p>
                        <p className="text-sm text-slate-400 mt-1">{kpi.label}</p>
                        {kpi.total && (
                            <p className="text-xs text-slate-500 mt-0.5">
                                sur {kpi.total} au total
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 card animate-fade-in stagger-3">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold">Activité récente</h2>
                        </div>
                        <span className="text-xs text-primary font-medium cursor-pointer hover:underline">
                            Voir tout
                        </span>
                    </div>
                    <div className="space-y-4">
                        {stats.recentLogs.length > 0 ? (
                            stats.recentLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-dark-hover transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            Journal — {log.project.name}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            par {log.author.firstName} {log.author.lastName}
                                        </p>
                                    </div>
                                    <span
                                        className={`badge text-xs ${log.status === "VALIDE"
                                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                : log.status === "SOUMIS"
                                                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                                    : log.status === "REJETE"
                                                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                                                        : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                                            }`}
                                    >
                                        {log.status === "VALIDE" ? "Validé" : log.status === "SOUMIS" ? "Soumis" : log.status === "REJETE" ? "Rejeté" : "Brouillon"}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Aucune activité récente</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="card animate-fade-in stagger-4">
                    <div className="flex items-center gap-2 mb-6">
                        <Clock className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">En attente</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-amber-400" />
                                </div>
                                <span className="text-sm">Journaux à valider</span>
                            </div>
                            <span className="text-lg font-bold text-amber-400">
                                {stats.pendingValidations}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                </div>
                                <span className="text-sm">Incidents ouverts</span>
                            </div>
                            <span className="text-lg font-bold text-red-400">
                                {stats.openIncidents}
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6 pt-6 border-t border-border-dark">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-400">Progression globale</span>
                            <span className="text-sm font-bold text-primary">{stats.taskCompletionRate}%</span>
                        </div>
                        <div className="h-2 bg-background-dark rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-1000"
                                style={{ width: `${stats.taskCompletionRate}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
