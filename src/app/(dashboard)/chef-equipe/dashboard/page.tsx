import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import {
    Clock,
    ClipboardList,
    AlertTriangle,
    CheckSquare,
    Users,
    TrendingUp,
    ArrowRight,
    UserCheck,
} from "lucide-react";

export const metadata = { title: "Tableau de bord — Chef d'équipe" };

export default async function ChefEquipeDashboard() {
    const session = await auth();
    const userId = session?.user?.id;

    // Today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Stats
    const [attendanceToday, dailyLogCount, incidentCount, taskCount] = await Promise.all([
        prisma.attendance.findMany({
            where: { date: { gte: startOfDay, lt: endOfDay } },
            include: { user: { select: { firstName: true, lastName: true } } },
        }),
        prisma.dailyLog.count({ where: { authorId: userId } }),
        prisma.incident.count({ where: { reporterId: userId, status: { in: ["OUVERT", "EN_COURS"] } } }),
        prisma.task.count({
            where: {
                project: {
                    projectTeams: { some: { team: { leaderId: userId } } },
                },
                status: { in: ["A_FAIRE", "EN_COURS"] },
            },
        }),
    ]);

    const present = attendanceToday.filter((a) => a.status === "PRESENT").length;
    const absent = attendanceToday.filter((a) => a.status === "ABSENT").length;
    const retard = attendanceToday.filter((a) => a.status === "RETARD").length;
    const total = attendanceToday.length;

    // Recent logs
    const recentLogs = await prisma.dailyLog.findMany({
        where: { authorId: userId },
        include: { project: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 5,
    });

    // Recent incidents
    const recentIncidents = await prisma.incident.findMany({
        where: { reporterId: userId },
        include: { project: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 5,
    });

    const formatDate = (date: Date) =>
        date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Chef d&apos;équipe</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    Bonjour, {session?.user?.name?.split(" ")[0]} 👋
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in stagger-1">
                <Link href="/chef-equipe/attendance" className="card hover:border-primary/30 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-2xl font-bold">{present}<span className="text-sm font-normal text-slate-500">/{total || "—"}</span></p>
                    <p className="text-xs text-slate-400 mt-0.5">Présents aujourd&apos;hui</p>
                </Link>

                <Link href="/chef-equipe/daily-logs" className="card hover:border-primary/30 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-2xl font-bold">{dailyLogCount}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Journaux rédigés</p>
                </Link>

                <Link href="/chef-equipe/incidents" className="card hover:border-primary/30 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-2xl font-bold">{incidentCount}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Incidents ouverts</p>
                </Link>

                <Link href="/chef-equipe/tasks" className="card hover:border-primary/30 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                            <CheckSquare className="w-5 h-5" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-2xl font-bold">{taskCount}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Tâches en cours</p>
                </Link>
            </div>

            {/* Attendance Summary + Quick Actions */}
            <div className="grid lg:grid-cols-2 gap-4 animate-fade-in stagger-2">
                {/* Attendance Today */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" /> Pointage du jour
                        </h2>
                        <Link href="/chef-equipe/attendance" className="text-xs text-primary hover:underline">
                            Voir tout →
                        </Link>
                    </div>
                    {total === 0 ? (
                        <div className="text-center py-6">
                            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">Aucun pointage enregistré</p>
                            <Link href="/chef-equipe/attendance" className="text-xs text-primary hover:underline mt-1 inline-block">
                                Commencer le pointage →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-emerald-500/10 rounded-xl py-3">
                                    <p className="text-lg font-bold text-emerald-400">{present}</p>
                                    <p className="text-[10px] text-slate-400">Présents</p>
                                </div>
                                <div className="bg-amber-500/10 rounded-xl py-3">
                                    <p className="text-lg font-bold text-amber-400">{retard}</p>
                                    <p className="text-[10px] text-slate-400">Retards</p>
                                </div>
                                <div className="bg-red-500/10 rounded-xl py-3">
                                    <p className="text-lg font-bold text-red-400">{absent}</p>
                                    <p className="text-[10px] text-slate-400">Absents</p>
                                </div>
                            </div>
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                                {attendanceToday.slice(0, 6).map((a) => (
                                    <div key={a.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-surface-dark-hover/50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                <span className="text-[9px] font-bold text-primary">
                                                    {a.user.firstName[0]}{a.user.lastName[0]}
                                                </span>
                                            </div>
                                            <span className="text-xs">{a.user.firstName} {a.user.lastName}</span>
                                        </div>
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${a.status === "PRESENT" ? "text-emerald-400 bg-emerald-500/10" :
                                            a.status === "RETARD" ? "text-amber-400 bg-amber-500/10" :
                                                "text-red-400 bg-red-500/10"
                                            }`}>
                                            {a.status === "PRESENT" ? "Présent" : a.status === "RETARD" ? "Retard" : "Absent"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <h2 className="font-semibold flex items-center gap-2 mb-4">
                        <TrendingUp className="w-4 h-4 text-primary" /> Actions rapides
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Link href="/chef-equipe/attendance" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-dark-hover/50 border border-transparent hover:border-primary/30 transition-all text-center group">
                            <UserCheck className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-medium">Faire le pointage</span>
                        </Link>
                        <Link href="/chef-equipe/daily-logs" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-dark-hover/50 border border-transparent hover:border-primary/30 transition-all text-center group">
                            <ClipboardList className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-medium">Rédiger le journal</span>
                        </Link>
                        <Link href="/chef-equipe/incidents" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-dark-hover/50 border border-transparent hover:border-primary/30 transition-all text-center group">
                            <AlertTriangle className="w-6 h-6 text-orange-400 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-medium">Signaler un incident</span>
                        </Link>
                        <Link href="/chef-equipe/tasks" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-dark-hover/50 border border-transparent hover:border-primary/30 transition-all text-center group">
                            <CheckSquare className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-medium">Avancement tâches</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-4 animate-fade-in stagger-3">
                {/* Recent Logs */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-blue-400" /> Derniers journaux
                        </h2>
                    </div>
                    {recentLogs.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">Aucun journal</p>
                    ) : (
                        <div className="space-y-2">
                            {recentLogs.map((log) => (
                                <div key={log.id} className="flex items-center justify-between py-2 border-b border-border-dark/50 last:border-0">
                                    <div>
                                        <p className="text-sm font-medium">{log.project.name}</p>
                                        <p className="text-xs text-slate-500 line-clamp-1">{log.summary || "—"}</p>
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                        <p className="text-xs text-slate-400">{formatDate(log.date)}</p>
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${log.status === "VALIDE" ? "text-emerald-400 bg-emerald-500/10" :
                                            log.status === "SOUMIS" ? "text-blue-400 bg-blue-500/10" :
                                                log.status === "REJETE" ? "text-red-400 bg-red-500/10" :
                                                    "text-slate-400 bg-slate-500/10"
                                            }`}>
                                            {log.status === "VALIDE" ? "Validé" : log.status === "SOUMIS" ? "Soumis" : log.status === "REJETE" ? "Rejeté" : "Brouillon"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Incidents */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-400" /> Derniers incidents
                        </h2>
                    </div>
                    {recentIncidents.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">Aucun incident</p>
                    ) : (
                        <div className="space-y-2">
                            {recentIncidents.map((inc) => (
                                <div key={inc.id} className="flex items-center justify-between py-2 border-b border-border-dark/50 last:border-0">
                                    <div>
                                        <p className="text-sm font-medium">{inc.title}</p>
                                        <p className="text-xs text-slate-500">{inc.project.name}</p>
                                    </div>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${inc.severity === "CRITIQUE" ? "text-red-400 bg-red-500/10" :
                                        inc.severity === "HAUTE" ? "text-orange-400 bg-orange-500/10" :
                                            "text-amber-400 bg-amber-500/10"
                                        }`}>
                                        {inc.severity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
