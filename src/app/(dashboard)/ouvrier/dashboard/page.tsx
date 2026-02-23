import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
    CheckSquare,
    Calendar,
    Clock,
    AlertTriangle,
    TrendingUp,
    CheckCircle2,
    ArrowRight,
} from "lucide-react";
import Link from "next/link";
import AttendanceAction from "@/components/AttendanceAction";

export const metadata = { title: "Tableau de bord — Ouvrier" };

async function getOuvrierData(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [assignments, attendance, tasksTotal, tasksDone, overdue] = await Promise.all([
        prisma.taskAssignment.findMany({
            where: { userId },
            include: {
                task: {
                    include: {
                        project: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { assignedAt: "desc" },
            take: 5,
        }),
        prisma.attendance.findFirst({
            where: { userId, date: { gte: today, lt: tomorrow } },
        }),
        prisma.taskAssignment.count({ where: { userId } }),
        prisma.taskAssignment.count({ where: { userId, task: { status: "TERMINE" } } }),
        prisma.taskAssignment.count({
            where: {
                userId,
                task: { dueDate: { lt: new Date() }, status: { notIn: ["TERMINE", "ANNULE"] } },
            },
        }),
    ]);

    return { assignments, attendance, tasksTotal, tasksDone, overdue };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    A_FAIRE: { label: "À faire", color: "text-slate-400", bg: "bg-slate-500/10" },
    EN_COURS: { label: "En cours", color: "text-amber-400", bg: "bg-amber-500/10" },
    EN_ATTENTE: { label: "En attente", color: "text-blue-400", bg: "bg-blue-500/10" },
    TERMINE: { label: "Terminé", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    ANNULE: { label: "Annulé", color: "text-red-400", bg: "bg-red-500/10" },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
    BASSE: { label: "Basse", color: "text-slate-400" },
    NORMALE: { label: "Normale", color: "text-blue-400" },
    HAUTE: { label: "Haute", color: "text-amber-400" },
    URGENTE: { label: "Urgente", color: "text-red-400" },
};

export default async function OuvrierDashboard() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return null;

    const { assignments, attendance, tasksTotal, tasksDone, overdue } = await getOuvrierData(userId);

    const completionRate = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;
    const inProgress = assignments.filter((a) => a.task.status === "EN_COURS").length;

    const kpis = [
        {
            label: "Tâches assignées",
            value: tasksTotal,
            sub: `${inProgress} en cours`,
            icon: <CheckSquare className="w-6 h-6" />,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            href: "/ouvrier/tasks",
        },
        {
            label: "Tâches terminées",
            value: tasksDone,
            sub: `${completionRate}% de complétion`,
            icon: <CheckCircle2 className="w-6 h-6" />,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            href: "/ouvrier/tasks",
        },
        {
            label: "En retard",
            value: overdue,
            sub: overdue > 0 ? "Action requise" : "Tout est à jour",
            icon: <AlertTriangle className="w-6 h-6" />,
            color: overdue > 0 ? "text-red-400" : "text-slate-400",
            bg: overdue > 0 ? "bg-red-500/10" : "bg-slate-500/10",
            href: "/ouvrier/tasks",
        },
        {
            label: "Pointage",
            value: attendance ? (attendance.checkOut ? "✓" : "En cours") : "—",
            sub: attendance ? "Présent aujourd'hui" : "Non pointé",
            icon: <Clock className="w-6 h-6" />,
            color: attendance ? "text-emerald-400" : "text-slate-400",
            bg: attendance ? "bg-emerald-500/10" : "bg-slate-500/10",
            href: "/ouvrier/planning",
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Espace Ouvrier</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    Bonjour, {session?.user?.name?.split(" ")[0]} 👷
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
            </div>

            {/* Alert overdue */}
            {overdue > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    <p className="text-sm text-red-300">
                        {overdue} tâche{overdue !== 1 ? "s" : ""} en retard — consultez vos tâches
                    </p>
                    <Link href="/ouvrier/tasks" className="ml-auto text-xs text-red-400 hover:underline flex items-center gap-1">
                        Voir <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in stagger-1">
                {kpis.map((kpi, i) => (
                    <Link
                        key={kpi.label}
                        href={kpi.href}
                        className="card hover:border-primary/30 transition-all group cursor-pointer"
                        style={{ animationDelay: `${(i + 1) * 0.1}s` }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>{kpi.icon}</div>
                            <TrendingUp className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-2xl font-bold">{kpi.value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{kpi.sub}</p>
                        <p className="text-sm text-slate-400 mt-1">{kpi.label}</p>
                    </Link>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Tasks */}
                <div className="lg:col-span-2 card animate-fade-in stagger-2">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-semibold flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-amber-400" /> Mes tâches récentes
                        </h2>
                        <Link href="/ouvrier/tasks" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                            Voir tout <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {assignments.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Aucune tâche assignée</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {assignments.map((a) => {
                                const st = STATUS_MAP[a.task.status] || STATUS_MAP.A_FAIRE;
                                const pr = PRIORITY_MAP[a.task.priority] || PRIORITY_MAP.NORMALE;
                                const isOverdue = a.task.dueDate && new Date(a.task.dueDate) < new Date() && a.task.status !== "TERMINE";
                                return (
                                    <div key={a.id} className={`p-3 rounded-xl border transition-all ${isOverdue ? "border-red-500/30 bg-red-500/5" : "border-border-dark/50 bg-surface-dark-hover/30"}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className={`text-sm font-medium truncate ${isOverdue ? "text-red-300" : ""}`}>
                                                    {a.task.title}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">{a.task.project.name}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className={`badge ${st.color} ${st.bg} border-transparent text-xs`}>{st.label}</span>
                                                <span className={`text-[10px] font-medium ${pr.color}`}>{pr.label}</span>
                                            </div>
                                        </div>
                                        {a.task.dueDate && (
                                            <p className={`text-xs mt-2 flex items-center gap-1 ${isOverdue ? "text-red-400" : "text-slate-500"}`}>
                                                <Calendar className="w-3 h-3" />
                                                Échéance : {new Date(a.task.dueDate).toLocaleDateString("fr-FR")}
                                                {isOverdue && " — EN RETARD"}
                                            </p>
                                        )}
                                        {/* Progress bar */}
                                        <div className="mt-2">
                                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${a.task.status === "TERMINE" ? "bg-emerald-400" : "bg-primary"}`}
                                                    style={{ width: `${a.task.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Completion & Attendance */}
                <div className="space-y-4">
                    {/* Attendance Action */}
                    <AttendanceAction initialAttendance={attendance} />

                    {/* Completion rate */}
                    <div className="card animate-fade-in stagger-3">
                        <h2 className="font-semibold flex items-center gap-2 mb-4">
                            <TrendingUp className="w-4 h-4 text-primary" /> Taux de complétion
                        </h2>
                        <div className="flex items-center justify-center mb-4">
                            <div className="relative w-28 h-28">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                                    <circle
                                        cx="18" cy="18" r="15.9" fill="none"
                                        stroke={completionRate >= 80 ? "#10b981" : completionRate >= 50 ? "#f59e0b" : "#ef4444"}
                                        strokeWidth="3"
                                        strokeDasharray={`${completionRate} ${100 - completionRate}`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold">{completionRate}%</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Total</span>
                                <span className="font-semibold">{tasksTotal}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-emerald-400">Terminées</span>
                                <span className="font-semibold text-emerald-400">{tasksDone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-amber-400">En cours</span>
                                <span className="font-semibold text-amber-400">{inProgress}</span>
                            </div>
                            {overdue > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-red-400">En retard</span>
                                    <span className="font-semibold text-red-400">{overdue}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attendance today */}
                    <div className="card animate-fade-in stagger-4">
                        <h2 className="font-semibold flex items-center gap-2 mb-4">
                            <Clock className="w-4 h-4 text-blue-400" /> Pointage du jour
                        </h2>
                        {attendance ? (
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Arrivée</span>
                                    <span className="font-semibold text-emerald-400">
                                        {attendance.checkIn
                                            ? new Date(attendance.checkIn).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                                            : "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Départ</span>
                                    <span className={`font-semibold ${attendance.checkOut ? "text-blue-400" : "text-slate-500"}`}>
                                        {attendance.checkOut
                                            ? new Date(attendance.checkOut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                                            : "En cours"}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Statut</span>
                                    <span className={`font-semibold ${attendance.status === "PRESENT" ? "text-emerald-400" : attendance.status === "RETARD" ? "text-amber-400" : "text-red-400"}`}>
                                        {attendance.status}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-xs text-slate-400">Non pointé aujourd&apos;hui</p>
                                <Link href="/ouvrier/planning" className="text-xs text-primary hover:underline mt-1 inline-block">
                                    Voir le planning →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
