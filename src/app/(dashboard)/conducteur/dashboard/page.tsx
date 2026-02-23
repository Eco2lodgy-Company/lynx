import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import {
    FolderKanban,
    CheckSquare,
    AlertTriangle,
    ClipboardList,
    ArrowRight,
    TrendingUp,
    Clock,
    CheckCircle2,
} from "lucide-react";

export const metadata = { title: "Tableau de bord — Conducteur" };

export default async function ConducteurDashboard() {
    const session = await auth();
    const userId = session?.user?.id;

    const today = new Date();

    // Récupérer les projets supervisés
    const supervisedProjects = await prisma.project.findMany({
        where: { supervisorId: userId },
        select: { id: true },
    });
    const projectIds = supervisedProjects.map((p) => p.id);

    const [projects, pendingLogs, pendingIncidents, activeIncidents] = await Promise.all([
        prisma.project.findMany({
            where: { supervisorId: userId },
            include: {
                _count: { select: { tasks: true, incidents: true, dailyLogs: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: 5,
        }),
        prisma.dailyLog.findMany({
            where: {
                status: "SOUMIS",
                projectId: { in: projectIds },
            },
            include: {
                author: { select: { firstName: true, lastName: true } },
                project: { select: { id: true, name: true } },
            },
            orderBy: { date: "desc" },
            take: 5,
        }),
        prisma.incident.count({
            where: {
                status: { in: ["OUVERT", "EN_COURS"] },
                projectId: { in: projectIds },
                severity: { in: ["HAUTE", "CRITIQUE"] },
            },
        }),
        prisma.incident.findMany({
            where: {
                status: { in: ["OUVERT", "EN_COURS"] },
                projectId: { in: projectIds },
            },
            include: {
                project: { select: { name: true } },
                reporter: { select: { firstName: true, lastName: true } },
            },
            orderBy: [{ severity: "desc" }, { date: "desc" }],
            take: 5,
        }),
    ]);

    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === "EN_COURS").length;
    const totalPending = pendingLogs.length;

    const formatDate = (date: Date) =>
        date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

    const SEVERITY_COLORS: Record<string, string> = {
        FAIBLE: "text-blue-400 bg-blue-500/10",
        MOYENNE: "text-amber-400 bg-amber-500/10",
        HAUTE: "text-orange-400 bg-orange-500/10",
        CRITIQUE: "text-red-400 bg-red-500/10",
    };

    const STATUS_COLORS: Record<string, string> = {
        PLANIFIE: "text-slate-400 bg-slate-500/10",
        EN_COURS: "text-amber-400 bg-amber-500/10",
        EN_PAUSE: "text-orange-400 bg-orange-500/10",
        TERMINE: "text-emerald-400 bg-emerald-500/10",
        ANNULE: "text-red-400 bg-red-500/10",
    };

    const STATUS_LABELS: Record<string, string> = {
        PLANIFIE: "Planifié",
        EN_COURS: "En cours",
        EN_PAUSE: "En pause",
        TERMINE: "Terminé",
        ANNULE: "Annulé",
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Conducteur de travaux</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    Bonjour, {session?.user?.name?.split(" ")[0]} 👷
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in stagger-1">
                <Link href="/conducteur/projects" className="card hover:border-primary/30 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400"><FolderKanban className="w-5 h-5" /></div>
                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-2xl font-bold">
                        {totalProjects}
                        <span className="text-sm font-normal text-slate-500 ml-1">projets</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{activeProjects} en cours</p>
                </Link>

                <Link href="/conducteur/validations" className="card hover:border-primary/30 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400"><CheckSquare className="w-5 h-5" /></div>
                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-2xl font-bold">{totalPending}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Journaux à valider</p>
                </Link>

                <Link href="/conducteur/incidents" className="card hover:border-primary/30 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400"><AlertTriangle className="w-5 h-5" /></div>
                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-2xl font-bold">{pendingIncidents}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Incidents critiques</p>
                </Link>

                <div className="card">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400"><TrendingUp className="w-5 h-5" /></div>
                    </div>
                    <p className="text-2xl font-bold">
                        {totalProjects > 0
                            ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / totalProjects)
                            : 0}%
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Progression moyenne</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-2 gap-4 animate-fade-in stagger-2">
                {/* Pending Validations */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-blue-400" /> Journaux à valider
                        </h2>
                        <Link href="/conducteur/validations" className="text-xs text-primary hover:underline">Voir tout →</Link>
                    </div>
                    {pendingLogs.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400/30 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">Aucune validation en attente</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pendingLogs.map((log) => (
                                <Link
                                    key={log.id}
                                    href="/conducteur/validations"
                                    className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-dark-hover/50 hover:bg-blue-500/5 border border-transparent hover:border-blue-500/20 transition-all"
                                >
                                    <div>
                                        <p className="text-sm font-medium">{log.project.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {log.author.firstName} {log.author.lastName} · {formatDate(log.date)}
                                        </p>
                                    </div>
                                    <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> En attente
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Active Incidents */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-400" /> Incidents actifs
                        </h2>
                        <Link href="/conducteur/incidents" className="text-xs text-primary hover:underline">Voir tout →</Link>
                    </div>
                    {activeIncidents.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400/30 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">Aucun incident actif</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {activeIncidents.map((inc) => (
                                <div key={inc.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-dark-hover/50">
                                    <div>
                                        <p className="text-sm font-medium">{inc.title}</p>
                                        <p className="text-xs text-slate-500">
                                            {inc.project.name} · {inc.reporter.firstName} {inc.reporter.lastName}
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[inc.severity] || "text-slate-400 bg-slate-500/10"}`}>
                                        {inc.severity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Projects Overview */}
            <div className="card animate-fade-in stagger-3">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold flex items-center gap-2">
                        <FolderKanban className="w-4 h-4 text-amber-400" /> Mes projets
                    </h2>
                    <Link href="/conducteur/projects" className="text-xs text-primary hover:underline">Gérer →</Link>
                </div>
                {projects.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Aucun projet assigné</p>
                ) : (
                    <div className="space-y-3">
                        {projects.map((project) => (
                            <div key={project.id} className="flex items-center gap-4 py-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-medium truncate">{project.name}</p>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[project.status] || "text-slate-400 bg-slate-500/10"}`}>
                                            {STATUS_LABELS[project.status] || project.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full"
                                                // eslint-disable-next-line react-dom/no-unsafe-inline-style
                                                style={{ width: `${project.progress}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400 w-8 text-right tabular-nums">{project.progress}%</span>
                                    </div>
                                </div>
                                <div className="text-right text-xs text-slate-500 shrink-0">
                                    <p>{project._count.tasks} tâches</p>
                                    <p>{project._count.incidents} incidents</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
