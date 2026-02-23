import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
    Calendar,
    Clock,
    AlertTriangle,
    ChevronRight,
    MapPin,
} from "lucide-react";

export const metadata = { title: "Planning — Ouvrier" };

async function getOuvrierPlanning(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const [assignments, attendanceHistory] = await Promise.all([
        prisma.taskAssignment.findMany({
            where: {
                userId,
                task: {
                    OR: [
                        { dueDate: { gte: today } },
                        { status: "EN_COURS" },
                    ],
                },
            },
            include: {
                task: {
                    include: {
                        project: { select: { id: true, name: true, address: true } },
                        phase: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { task: { dueDate: "asc" } },
        }),
        prisma.attendance.findMany({
            where: {
                userId,
                date: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
            },
            orderBy: { date: "desc" },
        }),
    ]);

    return { assignments, attendanceHistory };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    A_FAIRE: { label: "À faire", color: "text-slate-400", bg: "bg-slate-500/10", dot: "bg-slate-400" },
    EN_COURS: { label: "En cours", color: "text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-400" },
    EN_ATTENTE: { label: "En attente", color: "text-blue-400", bg: "bg-blue-500/10", dot: "bg-blue-400" },
    TERMINE: { label: "Terminé", color: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400" },
};

const ATTENDANCE_STATUS: Record<string, { label: string; color: string }> = {
    PRESENT: { label: "Présent", color: "text-emerald-400" },
    ABSENT: { label: "Absent", color: "text-red-400" },
    RETARD: { label: "En retard", color: "text-amber-400" },
    CONGE: { label: "Congé", color: "text-blue-400" },
};

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function groupByDate(assignments: Awaited<ReturnType<typeof getOuvrierPlanning>>["assignments"]) {
    const groups: Record<string, typeof assignments> = {};
    for (const a of assignments) {
        const key = a.task.dueDate
            ? new Date(a.task.dueDate).toDateString()
            : "Sans échéance";
        if (!groups[key]) groups[key] = [];
        groups[key].push(a);
    }
    return groups;
}

export default async function OuvrierPlanningPage() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return null;

    const { assignments, attendanceHistory } = await getOuvrierPlanning(userId);
    const today = new Date();
    const groups = groupByDate(assignments);

    const formatDay = (dateStr: string) => {
        if (dateStr === "Sans échéance") return dateStr;
        const d = new Date(dateStr);
        const isToday = d.toDateString() === today.toDateString();
        const isTomorrow = d.toDateString() === new Date(today.getTime() + 86400000).toDateString();
        if (isToday) return "Aujourd'hui";
        if (isTomorrow) return "Demain";
        return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
    };

    const isOverdue = (dueDate: Date | null) =>
        dueDate && new Date(dueDate) < today;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Espace Ouvrier</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Mon Planning</h1>
                <p className="text-sm text-slate-400 mt-1">
                    {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Timeline */}
                <div className="lg:col-span-2 space-y-4">
                    {Object.keys(groups).length === 0 ? (
                        <div className="card text-center py-16">
                            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">Aucune tâche planifiée</p>
                        </div>
                    ) : (
                        Object.entries(groups).map(([dateStr, tasks], gi) => {
                            const isToday = dateStr !== "Sans échéance" && new Date(dateStr).toDateString() === today.toDateString();
                            return (
                                <div key={dateStr} className="animate-fade-in" style={{ animationDelay: `${gi * 0.1}s` }}>
                                    {/* Date header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border ${isToday ? "bg-primary/20 border-primary/40 text-primary" : "bg-surface-dark border-border-dark text-slate-400"}`}>
                                            {dateStr !== "Sans échéance" ? (
                                                <>
                                                    <span className="text-[10px] font-medium uppercase">{DAYS_FR[new Date(dateStr).getDay()]}</span>
                                                    <span className="text-lg font-bold leading-none">{new Date(dateStr).getDate()}</span>
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-center leading-tight px-1">Sans date</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className={`font-semibold ${isToday ? "text-primary" : ""}`}>{formatDay(dateStr)}</p>
                                            <p className="text-xs text-slate-500">{tasks.length} tâche{tasks.length !== 1 ? "s" : ""}</p>
                                        </div>
                                        {isToday && (
                                            <span className="ml-auto badge bg-primary/20 text-primary border-primary/30 text-xs">Aujourd&apos;hui</span>
                                        )}
                                    </div>

                                    {/* Tasks */}
                                    <div className="space-y-2 pl-15">
                                        {tasks.map((a) => {
                                            const st = STATUS_MAP[a.task.status] || STATUS_MAP.A_FAIRE;
                                            const overdue = isOverdue(a.task.dueDate);
                                            return (
                                                <div
                                                    key={a.id}
                                                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${overdue ? "border-red-500/30 bg-red-500/5" : "border-border-dark/50 bg-surface-dark-hover/30 hover:border-primary/20"}`}
                                                >
                                                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${st.dot}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className={`text-sm font-medium ${overdue ? "text-red-300" : ""}`}>{a.task.title}</p>
                                                            <span className={`badge ${st.color} ${st.bg} border-transparent text-xs shrink-0`}>{st.label}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {a.task.project.name}
                                                            {a.task.project.address && ` · ${a.task.project.address}`}
                                                        </p>
                                                        {a.task.phase && (
                                                            <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
                                                                <ChevronRight className="w-3 h-3" /> {a.task.phase.name}
                                                            </p>
                                                        )}
                                                        {/* Progress */}
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${a.task.status === "TERMINE" ? "bg-emerald-400" : "bg-primary"}`}
                                                                    style={{ width: `${a.task.progress}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] text-slate-500">{Math.round(a.task.progress)}%</span>
                                                        </div>
                                                        {overdue && (
                                                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3" /> En retard
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Attendance History */}
                <div className="card animate-fade-in stagger-2 h-fit">
                    <h2 className="font-semibold flex items-center gap-2 mb-5">
                        <Clock className="w-4 h-4 text-blue-400" /> Présences (7 jours)
                    </h2>

                    {attendanceHistory.length === 0 ? (
                        <div className="text-center py-6 text-slate-500">
                            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">Aucun pointage récent</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {attendanceHistory.map((att) => {
                                const st = ATTENDANCE_STATUS[att.status] || ATTENDANCE_STATUS.PRESENT;
                                const d = new Date(att.date);
                                const isAttToday = d.toDateString() === today.toDateString();
                                return (
                                    <div key={att.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-dark-hover transition-colors">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isAttToday ? "bg-primary/20 text-primary" : "bg-slate-800 text-slate-400"}`}>
                                            {d.getDate()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium">
                                                {DAYS_FR[d.getDay()]} {d.getDate()} {MONTHS_FR[d.getMonth()]}
                                            </p>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                                {att.checkIn && (
                                                    <span>↑ {new Date(att.checkIn).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                                                )}
                                                {att.checkOut && (
                                                    <span>↓ {new Date(att.checkOut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Weekly summary */}
                    <div className="mt-4 pt-4 border-t border-border-dark grid grid-cols-3 gap-2 text-center">
                        {[
                            { label: "Présent", count: attendanceHistory.filter((a) => a.status === "PRESENT").length, color: "text-emerald-400" },
                            { label: "Retard", count: attendanceHistory.filter((a) => a.status === "RETARD").length, color: "text-amber-400" },
                            { label: "Absent", count: attendanceHistory.filter((a) => a.status === "ABSENT").length, color: "text-red-400" },
                        ].map((s) => (
                            <div key={s.label}>
                                <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
                                <p className="text-[10px] text-slate-500">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
