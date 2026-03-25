"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Calendar,
    Loader2,
    ChevronLeft,
    ChevronRight,
    FolderKanban,
    CheckSquare,
    Clock,
    Circle,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";

interface ProjectRef { id: string; name: string; status: string; progress: number; }
interface PhaseRef { id: string; name: string; }

interface Task {
    id: string;
    title: string;
    status: string;
    priority: string;
    startDate: string | null;
    dueDate: string | null;
    progress: number;
    project: ProjectRef;
    phase: PhaseRef | null;
}

interface Project {
    id: string;
    name: string;
    status: string;
    progress: number;
    startDate: string | null;
    estimatedEndDate: string | null;
    _count: { tasks: number; incidents: number };
}

const STATUS_COLORS: Record<string, string> = {
    A_FAIRE: "bg-slate-600",
    EN_COURS: "bg-blue-500",
    EN_ATTENTE: "bg-amber-500",
    TERMINE: "bg-emerald-500",
    ANNULE: "bg-red-500",
};

const PRIORITY_BORDER: Record<string, string> = {
    BASSE: "border-l-slate-500",
    NORMALE: "border-l-blue-500",
    HAUTE: "border-l-orange-500",
    URGENTE: "border-l-red-500",
};

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

type View = "gantt" | "list";

export default function PlanningPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<View>("gantt");
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const fetchData = useCallback(async () => {
        const [tasksRes, projectsRes] = await Promise.all([
            fetch("/api/tasks"),
            fetch("/api/projects"),
        ]);
        if (tasksRes.ok) setTasks(await tasksRes.json());
        if (projectsRes.ok) setProjects(await projectsRes.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Calendar helpers
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

    // Tasks with dates in current month
    const tasksInMonth = tasks.filter((t) => {
        if (!t.startDate && !t.dueDate) return false;
        const start = t.startDate ? new Date(t.startDate) : null;
        const end = t.dueDate ? new Date(t.dueDate) : null;
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        if (start && start <= monthEnd && (!end || end >= monthStart)) return true;
        if (end && end >= monthStart && end <= monthEnd) return true;
        return false;
    });

    // Tasks due today or overdue
    const todayTasks = tasks.filter((t) => {
        if (!t.dueDate || t.status === "TERMINE") return false;
        const due = new Date(t.dueDate);
        return due <= today;
    });

    const overdueTasks = todayTasks.filter((t) => {
        const due = new Date(t.dueDate!);
        return due < today;
    });

    const formatDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—";

    // Gantt bar position
    const getGanttBar = (task: Task) => {
        if (!task.startDate && !task.dueDate) return null;
        const monthStart = new Date(year, month, 1).getTime();
        const monthEnd = new Date(year, month + 1, 0).getTime();
        const taskStart = task.startDate ? Math.max(new Date(task.startDate).getTime(), monthStart) : monthStart;
        const taskEnd = task.dueDate ? Math.min(new Date(task.dueDate).getTime(), monthEnd) : monthEnd;
        if (taskStart > monthEnd || taskEnd < monthStart) return null;
        const left = ((taskStart - monthStart) / (monthEnd - monthStart)) * 100;
        const width = ((taskEnd - taskStart) / (monthEnd - monthStart)) * 100;
        return { left: Math.max(0, left), width: Math.max(1, width) };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Conducteur de travaux</p>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Planning</h1>
                    <p className="text-sm text-slate-400 mt-1">{tasks.length} tâches · {projects.length} projets</p>
                </div>
                <div className="flex gap-1 p-1 bg-surface-dark rounded-xl border border-border-dark">
                    <button onClick={() => setView("gantt")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === "gantt" ? "bg-primary/20 text-primary" : "text-slate-400 hover:text-white"}`}>
                        <Calendar className="w-4 h-4" /> Gantt
                    </button>
                    <button onClick={() => setView("list")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === "list" ? "bg-primary/20 text-primary" : "text-slate-400 hover:text-white"}`}>
                        <CheckSquare className="w-4 h-4" /> Liste
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {overdueTasks.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-red-400">{overdueTasks.length} tâche{overdueTasks.length !== 1 ? "s" : ""} en retard</p>
                        <p className="text-xs text-red-300/70">{overdueTasks.map((t) => t.title).join(", ")}</p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : view === "gantt" ? (
                /* ─── GANTT VIEW ─── */
                <div className="card animate-fade-in">
                    {/* Month navigation */}
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-white hover:bg-surface-dark-hover rounded-lg transition-all" title="Mois précédent">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h2 className="font-semibold text-lg">{MONTHS_FR[month]} {year}</h2>
                        <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-white hover:bg-surface-dark-hover rounded-lg transition-all" title="Mois suivant">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="flex mb-2 ml-48">
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                            return (
                                <div key={day} className={`flex-1 text-center text-[9px] font-medium ${isToday ? "text-primary" : "text-slate-600"}`}>
                                    {day}
                                </div>
                            );
                        })}
                    </div>

                    {/* Today line */}
                    <div className="relative">
                        {today.getMonth() === month && today.getFullYear() === year && (
                            <div
                                className="absolute top-0 bottom-0 w-px bg-primary/40 z-10 pointer-events-none"
                                style={{ left: `calc(12rem + ${((today.getDate() - 1) / daysInMonth) * 100}%)` }}
                            />
                        )}

                        {/* Tasks */}
                        {tasksInMonth.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">Aucune tâche planifiée ce mois</div>
                        ) : (
                            <div className="space-y-1.5">
                                {tasksInMonth.map((task) => {
                                    const bar = getGanttBar(task);
                                    return (
                                        <div key={task.id} className="flex items-center gap-2 h-8">
                                            <div className="w-48 shrink-0 pr-3">
                                                <p className="text-xs truncate text-slate-300">{task.title}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{task.project.name}</p>
                                            </div>
                                            <div className="flex-1 relative h-6 bg-slate-800/50 rounded">
                                                {bar && (
                                                    <div
                                                        className={`absolute top-1 bottom-1 rounded ${STATUS_COLORS[task.status] || "bg-slate-600"} opacity-80 flex items-center px-1.5 overflow-hidden`}
                                                        style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                                                    >
                                                        <span className="text-[9px] text-white font-medium truncate">{task.progress}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border-dark">
                        {Object.entries(STATUS_COLORS).map(([k, color]) => (
                            <div key={k} className="flex items-center gap-1.5">
                                <div className={`w-3 h-3 rounded ${color}`} />
                                <span className="text-[10px] text-slate-500">
                                    {k === "A_FAIRE" ? "À faire" : k === "EN_COURS" ? "En cours" : k === "EN_ATTENTE" ? "En attente" : k === "TERMINE" ? "Terminé" : "Annulé"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* ─── LIST VIEW ─── */
                <div className="space-y-4 animate-fade-in">
                    {/* Projects summary */}
                    <div className="card">
                        <h2 className="font-semibold flex items-center gap-2 mb-4"><FolderKanban className="w-4 h-4 text-amber-400" /> Projets</h2>
                        <div className="space-y-3">
                            {projects.map((p) => (
                                <div key={p.id} className="flex items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-medium truncate">{p.name}</p>
                                            {p.estimatedEndDate && (
                                                <span className="text-[10px] text-slate-500 flex items-center gap-0.5 shrink-0">
                                                    <Clock className="w-3 h-3" /> {formatDate(p.estimatedEndDate)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                                                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${p.progress}%` }} />
                                            </div>
                                            <span className="text-xs text-slate-400 w-8 text-right tabular-nums">{p.progress}%</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-500 shrink-0">{p._count.tasks} tâches</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tasks by status */}
                    {[
                        { status: "EN_COURS", label: "En cours", icon: <TrendingUp className="w-4 h-4 text-blue-400" />, color: "text-blue-400" },
                        { status: "A_FAIRE", label: "À faire", icon: <Circle className="w-4 h-4 text-slate-400" />, color: "text-slate-400" },
                        { status: "TERMINE", label: "Terminées", icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, color: "text-emerald-400" },
                    ].map(({ status, label, icon, color }) => {
                        const statusTasks = tasks.filter((t) => t.status === status);
                        if (statusTasks.length === 0) return null;
                        return (
                            <div key={status} className="card">
                                <h2 className={`font-semibold flex items-center gap-2 mb-3 ${color}`}>{icon} {label} ({statusTasks.length})</h2>
                                <div className="space-y-2">
                                    {statusTasks.map((task) => (
                                        <div key={task.id} className={`flex items-center gap-3 py-2 px-3 rounded-xl bg-surface-dark-hover/50 border-l-2 ${PRIORITY_BORDER[task.priority] || "border-l-slate-500"}`}>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{task.title}</p>
                                                <p className="text-xs text-slate-500">{task.project.name}{task.phase ? ` · ${task.phase.name}` : ""}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                {task.dueDate && (
                                                    <p className={`text-xs ${new Date(task.dueDate) < today && status !== "TERMINE" ? "text-red-400" : "text-slate-400"}`}>
                                                        {formatDate(task.dueDate)}
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-500">{task.progress}%</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
