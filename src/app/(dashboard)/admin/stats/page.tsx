"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BarChart3,
    TrendingUp,
    Users,
    FolderKanban,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Activity,
    Loader2,
    ArrowUp,
    ArrowDown,
    Minus,
} from "lucide-react";

interface StatsData {
    users: { total: number; byRole: Record<string, number>; active: number };
    projects: { total: number; byStatus: Record<string, number>; avgProgress: number };
    tasks: { total: number; completed: number; inProgress: number; overdue: number };
    incidents: { total: number; open: number; critical: number; resolved: number };
    logs: { total: number; validated: number; pending: number };
    attendance: { today: number; present: number; absent: number; late: number };
}

const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Administrateurs",
    CONDUCTEUR: "Conducteurs",
    CHEF_EQUIPE: "Chefs d'équipe",
    CLIENT: "Clients",
    OUVRIER: "Ouvriers",
};

const STATUS_LABELS: Record<string, string> = {
    PLANIFIE: "Planifiés",
    EN_COURS: "En cours",
    EN_PAUSE: "En pause",
    TERMINE: "Terminés",
    ANNULE: "Annulés",
};

const STATUS_COLORS: Record<string, string> = {
    PLANIFIE: "bg-blue-500",
    EN_COURS: "bg-amber-500",
    EN_PAUSE: "bg-orange-500",
    TERMINE: "bg-emerald-500",
    ANNULE: "bg-red-500",
};

export default function StatsPage() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        const res = await fetch("/api/stats");
        if (res.ok) setStats(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!stats) return <p className="text-slate-400">Erreur de chargement</p>;

    const taskRate = stats.tasks.total > 0
        ? Math.round((stats.tasks.completed / stats.tasks.total) * 100)
        : 0;

    const logRate = stats.logs.total > 0
        ? Math.round((stats.logs.validated / stats.logs.total) * 100)
        : 0;

    const attendanceRate = stats.attendance.today > 0
        ? Math.round((stats.attendance.present / stats.attendance.today) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Administration</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Statistiques</h1>
                <p className="text-sm text-slate-400 mt-1">Vue d&apos;ensemble analytique du chantier</p>
            </div>

            {/* Top KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in stagger-1">
                {[
                    {
                        label: "Utilisateurs actifs",
                        value: stats.users.active,
                        total: stats.users.total,
                        icon: <Users className="w-5 h-5" />,
                        color: "text-blue-400",
                        bg: "bg-blue-500/10",
                        trend: "up",
                    },
                    {
                        label: "Projets actifs",
                        value: stats.projects.byStatus["EN_COURS"] || 0,
                        total: stats.projects.total,
                        icon: <FolderKanban className="w-5 h-5" />,
                        color: "text-amber-400",
                        bg: "bg-amber-500/10",
                        trend: "stable",
                    },
                    {
                        label: "Tâches complétées",
                        value: `${taskRate}%`,
                        sub: `${stats.tasks.completed}/${stats.tasks.total}`,
                        icon: <CheckCircle2 className="w-5 h-5" />,
                        color: "text-emerald-400",
                        bg: "bg-emerald-500/10",
                        trend: "up",
                    },
                    {
                        label: "Incidents ouverts",
                        value: stats.incidents.open,
                        sub: `${stats.incidents.critical} critiques`,
                        icon: <AlertTriangle className="w-5 h-5" />,
                        color: stats.incidents.open > 0 ? "text-red-400" : "text-emerald-400",
                        bg: stats.incidents.open > 0 ? "bg-red-500/10" : "bg-emerald-500/10",
                        trend: stats.incidents.open > 0 ? "down" : "up",
                    },
                ].map((kpi) => (
                    <div key={kpi.label} className="card">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color}`}>{kpi.icon}</div>
                            {kpi.trend === "up" ? (
                                <ArrowUp className="w-4 h-4 text-emerald-400" />
                            ) : kpi.trend === "down" ? (
                                <ArrowDown className="w-4 h-4 text-red-400" />
                            ) : (
                                <Minus className="w-4 h-4 text-slate-500" />
                            )}
                        </div>
                        <p className="text-2xl font-bold">{kpi.value}</p>
                        {"total" in kpi && kpi.total !== undefined && (
                            <p className="text-xs text-slate-500">sur {kpi.total}</p>
                        )}
                        {"sub" in kpi && kpi.sub && (
                            <p className="text-xs text-slate-500">{kpi.sub}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-4 animate-fade-in stagger-2">
                {/* Projects by Status */}
                <div className="card">
                    <h2 className="font-semibold flex items-center gap-2 mb-5">
                        <FolderKanban className="w-4 h-4 text-amber-400" /> Répartition des projets
                    </h2>
                    <div className="space-y-3">
                        {Object.entries(stats.projects.byStatus).map(([status, count]) => {
                            const pct = stats.projects.total > 0 ? (count / stats.projects.total) * 100 : 0;
                            return (
                                <div key={status}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">{STATUS_LABELS[status] || status}</span>
                                        <span className="font-semibold">{count}</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${STATUS_COLORS[status] || "bg-slate-500"}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border-dark flex items-center justify-between text-xs text-slate-400">
                        <span>Progression moyenne</span>
                        <span className="font-bold text-primary">{Math.round(stats.projects.avgProgress)}%</span>
                    </div>
                </div>

                {/* Users by Role */}
                <div className="card">
                    <h2 className="font-semibold flex items-center gap-2 mb-5">
                        <Users className="w-4 h-4 text-blue-400" /> Équipe par rôle
                    </h2>
                    <div className="space-y-3">
                        {Object.entries(stats.users.byRole).map(([role, count]) => {
                            const pct = stats.users.total > 0 ? (count / stats.users.total) * 100 : 0;
                            return (
                                <div key={role}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-400">{ROLE_LABELS[role] || role}</span>
                                        <span className="font-semibold">{count}</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-primary/70 transition-all duration-700"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-border-dark flex items-center justify-between text-xs text-slate-400">
                        <span>Utilisateurs actifs</span>
                        <span className="font-bold text-emerald-400">{stats.users.active}/{stats.users.total}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid lg:grid-cols-3 gap-4 animate-fade-in stagger-3">
                {/* Tasks */}
                <div className="card">
                    <h2 className="font-semibold flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Tâches
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">Complétées</span>
                            <span className="text-sm font-bold text-emerald-400">{stats.tasks.completed}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">En cours</span>
                            <span className="text-sm font-bold text-amber-400">{stats.tasks.inProgress}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">En retard</span>
                            <span className="text-sm font-bold text-red-400">{stats.tasks.overdue}</span>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border-dark">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Taux de complétion</span>
                            <span className="font-bold text-primary">{taskRate}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${taskRate}%` }} />
                        </div>
                    </div>
                </div>

                {/* Logs */}
                <div className="card">
                    <h2 className="font-semibold flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-blue-400" /> Journaux
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">Validés</span>
                            <span className="text-sm font-bold text-emerald-400">{stats.logs.validated}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">En attente</span>
                            <span className="text-sm font-bold text-amber-400">{stats.logs.pending}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">Total</span>
                            <span className="text-sm font-bold">{stats.logs.total}</span>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border-dark">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Taux de validation</span>
                            <span className="font-bold text-primary">{logRate}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${logRate}%` }} />
                        </div>
                    </div>
                </div>

                {/* Attendance Today */}
                <div className="card">
                    <h2 className="font-semibold flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-purple-400" /> Pointage du jour
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">Présents</span>
                            <span className="text-sm font-bold text-emerald-400">{stats.attendance.present}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">Retards</span>
                            <span className="text-sm font-bold text-amber-400">{stats.attendance.late}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">Absents</span>
                            <span className="text-sm font-bold text-red-400">{stats.attendance.absent}</span>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border-dark">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Taux de présence</span>
                            <span className="font-bold text-primary">{attendanceRate}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-purple-500 transition-all duration-700" style={{ width: `${attendanceRate}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Incidents Summary */}
            <div className="card animate-fade-in stagger-4">
                <h2 className="font-semibold flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-orange-400" /> Incidents — Vue globale
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Total", value: stats.incidents.total, color: "text-slate-300" },
                        { label: "Ouverts", value: stats.incidents.open, color: "text-red-400" },
                        { label: "Critiques", value: stats.incidents.critical, color: "text-orange-400" },
                        { label: "Résolus", value: stats.incidents.resolved, color: "text-emerald-400" },
                    ].map((item) => (
                        <div key={item.label} className="text-center p-4 rounded-xl bg-surface-dark-hover/50">
                            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                            <p className="text-xs text-slate-400 mt-1">{item.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Refresh */}
            <div className="flex justify-end animate-fade-in">
                <button
                    onClick={() => { setLoading(true); fetchStats(); }}
                    className="btn-secondary text-sm"
                >
                    <TrendingUp className="w-4 h-4" /> Actualiser
                </button>
            </div>
        </div>
    );
}
