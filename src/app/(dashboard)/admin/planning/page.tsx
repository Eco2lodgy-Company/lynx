"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Loader2,
    ChevronLeft,
    ChevronRight,
    FolderKanban,
    CheckSquare,
    AlertCircle,
    Filter,
} from "lucide-react";

interface ProjectRef { id: string; name: string; status: string }
interface Task {
    id: string; title: string; status: string; priority: string;
    startDate: string | null; dueDate: string | null; progress: number;
    project: ProjectRef;
}
interface Project {
    id: string; name: string; status: string; progress: number;
    startDate: string | null; estimatedEndDate: string | null;
    _count: { tasks: number; incidents: number };
}

const STATUS_COLORS: Record<string, string> = {
    A_FAIRE: "bg-slate-500",
    EN_COURS: "bg-blue-500",
    EN_ATTENTE: "bg-amber-500",
    TERMINE: "bg-emerald-500",
    ANNULE: "bg-red-500",
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
    PLANIFIE: "bg-blue-400",
    EN_COURS: "bg-amber-400",
    EN_PAUSE: "bg-orange-400",
    TERMINE: "bg-emerald-400",
    ANNULE: "bg-red-400",
};

const MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

type View = "projects" | "tasks";

export default function AdminPlanningPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<View>("projects");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [filterStatus, setFilterStatus] = useState("");

    const fetchData = useCallback(async () => {
        const [tRes, pRes] = await Promise.all([fetch("/api/tasks"), fetch("/api/projects")]);
        if (tRes.ok) setTasks(await tRes.json());
        if (pRes.ok) setProjects(await pRes.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

    const getBar = (startDate: string | null, endDate: string | null) => {
        if (!startDate && !endDate) return null;
        const monthStart = new Date(year, month, 1).getTime();
        const monthEnd = new Date(year, month + 1, 0).getTime();
        const s = startDate ? Math.max(new Date(startDate).getTime(), monthStart) : monthStart;
        const e = endDate ? Math.min(new Date(endDate).getTime(), monthEnd) : monthEnd;
        if (s > monthEnd || e < monthStart) return null;
        const left = ((s - monthStart) / (monthEnd - monthStart)) * 100;
        const width = ((e - s) / (monthEnd - monthStart)) * 100;
        return { left: Math.max(0, left), width: Math.max(1, width) };
    };

    const filteredProjects = projects.filter((p) => !filterStatus || p.status === filterStatus);
    const filteredTasks = tasks.filter((t) => !filterStatus || t.status === filterStatus);

    const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < today && t.status !== "TERMINE").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Administration</p>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Planning Global</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {projects.length} projets · {tasks.length} tâches
                        {overdue > 0 && <span className="text-red-400 ml-2">⚠ {overdue} en retard</span>}
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="flex gap-1 p-1 bg-surface-dark rounded-xl border border-border-dark">
                        <button onClick={() => setView("projects")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === "projects" ? "bg-primary/20 text-primary" : "text-slate-400 hover:text-white"}`}>
                            <FolderKanban className="w-4 h-4" /> Projets
                        </button>
                        <button onClick={() => setView("tasks")} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === "tasks" ? "bg-primary/20 text-primary" : "text-slate-400 hover:text-white"}`}>
                            <CheckSquare className="w-4 h-4" /> Tâches
                        </button>
                    </div>
                </div>
            </div>

            {/* Alert overdue */}
            {overdue > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <p className="text-sm text-red-300">{overdue} tâche{overdue !== 1 ? "s" : ""} en retard — action requise</p>
                </div>
            )}

            {/* Gantt Card */}
            <div className="card animate-fade-in stagger-1">
                {/* Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-white hover:bg-surface-dark-hover rounded-lg transition-all" title="Mois précédent">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h2 className="font-semibold text-lg min-w-[160px] text-center">{MONTHS_FR[month]} {year}</h2>
                        <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-white hover:bg-surface-dark-hover rounded-lg transition-all" title="Mois suivant">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="input-field !py-1.5 text-xs min-w-[140px]"
                            title="Filtrer par statut"
                        >
                            <option value="">Tous les statuts</option>
                            {view === "projects"
                                ? ["PLANIFIE", "EN_COURS", "EN_PAUSE", "TERMINE", "ANNULE"].map((s) => (
                                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                                ))
                                : ["A_FAIRE", "EN_COURS", "EN_ATTENTE", "TERMINE", "ANNULE"].map((s) => (
                                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                                ))
                            }
                        </select>
                    </div>
                </div>

                {/* Day headers */}
                <div className="flex mb-2 ml-52">
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                        return (
                            <div key={day} className={`flex-1 text-center text-[9px] font-medium ${isToday ? "text-primary" : "text-slate-600"}`}>
                                {day}
                            </div>
                        );
                    })}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                ) : (
                    <div className="relative">
                        {/* Today line */}
                        {today.getMonth() === month && today.getFullYear() === year && (
                            <div
                                className="absolute top-0 bottom-0 w-px bg-primary/40 z-10 pointer-events-none"
                                style={{ left: `calc(13rem + ${((today.getDate() - 0.5) / daysInMonth) * 100}%)` }}
                            />
                        )}

                        {view === "projects" ? (
                            <div className="space-y-1.5">
                                {filteredProjects.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-8">Aucun projet</p>
                                ) : filteredProjects.map((p) => {
                                    const bar = getBar(p.startDate, p.estimatedEndDate);
                                    return (
                                        <div key={p.id} className="flex items-center gap-2 h-9">
                                            <div className="w-52 shrink-0 pr-3">
                                                <p className="text-xs font-medium truncate text-slate-200">{p.name}</p>
                                                <p className="text-[10px] text-slate-500">{p._count.tasks} tâches · {p.progress}%</p>
                                            </div>
                                            <div className="flex-1 relative h-7 bg-slate-800/50 rounded">
                                                {bar ? (
                                                    <div
                                                        className={`absolute top-1 bottom-1 rounded ${PROJECT_STATUS_COLORS[p.status] || "bg-slate-500"} opacity-80 flex items-center px-2 overflow-hidden`}
                                                        style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                                                    >
                                                        <span className="text-[9px] text-white font-medium truncate">{p.name}</span>
                                                    </div>
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center px-2">
                                                        <span className="text-[9px] text-slate-600">Non planifié</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {filteredTasks.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-8">Aucune tâche</p>
                                ) : filteredTasks.map((t) => {
                                    const bar = getBar(t.startDate, t.dueDate);
                                    const isOverdue = t.dueDate && new Date(t.dueDate) < today && t.status !== "TERMINE";
                                    return (
                                        <div key={t.id} className="flex items-center gap-2 h-8">
                                            <div className="w-52 shrink-0 pr-3">
                                                <p className={`text-xs truncate ${isOverdue ? "text-red-400" : "text-slate-300"}`}>{t.title}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{t.project.name}</p>
                                            </div>
                                            <div className="flex-1 relative h-6 bg-slate-800/50 rounded">
                                                {bar && (
                                                    <div
                                                        className={`absolute top-1 bottom-1 rounded ${STATUS_COLORS[t.status] || "bg-slate-500"} ${isOverdue ? "opacity-100 ring-1 ring-red-500" : "opacity-75"} flex items-center px-1.5 overflow-hidden`}
                                                        style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                                                    >
                                                        <span className="text-[9px] text-white font-medium">{t.progress}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-border-dark">
                    {(view === "projects" ? Object.entries(PROJECT_STATUS_COLORS) : Object.entries(STATUS_COLORS)).map(([k, color]) => (
                        <div key={k} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded ${color}`} />
                            <span className="text-[10px] text-slate-500">{k.replace("_", " ")}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
