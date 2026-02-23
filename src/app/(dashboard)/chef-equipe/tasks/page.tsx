"use client";

import { useState, useEffect, useCallback } from "react";
import {
    CheckSquare,
    Search,
    Loader2,
    ChevronDown,
    Clock,
    AlertCircle,
    CheckCircle2,
    Circle,
    Pause,
    TrendingUp,
    Users,
} from "lucide-react";

interface ProjectRef { id: string; name: string; }
interface UserRef { id: string; firstName: string; lastName: string; }
interface PhaseRef { id: string; name: string; }

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    progress: number;
    startDate: string | null;
    dueDate: string | null;
    project: ProjectRef;
    phase: PhaseRef | null;
    assignments: { user: UserRef }[];
    _count: { comments: number; subTasks: number };
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    A_FAIRE: { label: "À faire", color: "text-slate-400 bg-slate-500/10", icon: <Circle className="w-3 h-3" /> },
    EN_COURS: { label: "En cours", color: "text-blue-400 bg-blue-500/10", icon: <TrendingUp className="w-3 h-3" /> },
    EN_ATTENTE: { label: "En attente", color: "text-amber-400 bg-amber-500/10", icon: <Pause className="w-3 h-3" /> },
    TERMINE: { label: "Terminé", color: "text-emerald-400 bg-emerald-500/10", icon: <CheckCircle2 className="w-3 h-3" /> },
    ANNULE: { label: "Annulé", color: "text-red-400 bg-red-500/10", icon: <AlertCircle className="w-3 h-3" /> },
};

const PRIORITY_COLORS: Record<string, string> = {
    BASSE: "text-slate-400",
    NORMALE: "text-blue-400",
    HAUTE: "text-orange-400",
    URGENTE: "text-red-400",
};

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchTasks = useCallback(async () => {
        const res = await fetch("/api/tasks");
        if (res.ok) setTasks(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const handleProgressChange = async (id: string, progress: number) => {
        setUpdatingId(id);
        const status = progress >= 100 ? "TERMINE" : progress > 0 ? "EN_COURS" : "A_FAIRE";
        await fetch(`/api/tasks/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ progress, status }),
        });
        await fetchTasks();
        setUpdatingId(null);
    };

    const handleStatusChange = async (id: string, status: string) => {
        setUpdatingId(id);
        const progress = status === "TERMINE" ? 100 : undefined;
        await fetch(`/api/tasks/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, ...(progress !== undefined ? { progress } : {}) }),
        });
        await fetchTasks();
        setUpdatingId(null);
    };

    const filteredTasks = tasks.filter((t) => {
        const matchSearch = `${t.title} ${t.project.name}`.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !filterStatus || t.status === filterStatus;
        return matchSearch && matchStatus;
    });

    // Group by project for better overview
    const groupedByProject = filteredTasks.reduce((acc, task) => {
        const key = task.project.id;
        if (!acc[key]) acc[key] = { project: task.project, tasks: [] };
        acc[key].tasks.push(task);
        return acc;
    }, {} as Record<string, { project: ProjectRef; tasks: Task[] }>);

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : null;

    // Stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "TERMINE").length;
    const inProgressTasks = tasks.filter((t) => t.status === "EN_COURS").length;
    const overallProgress = totalTasks > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / totalTasks) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Chef d&apos;équipe</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Avancement des Tâches</h1>
                <p className="text-sm text-slate-400 mt-1">{totalTasks} tâche{totalTasks !== 1 ? "s" : ""}</p>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in stagger-1">
                <div className="card !py-3 text-center">
                    <p className="text-xl font-bold text-white">{totalTasks}</p>
                    <p className="text-[10px] text-slate-400">Total</p>
                </div>
                <div className="card !py-3 text-center">
                    <p className="text-xl font-bold text-blue-400">{inProgressTasks}</p>
                    <p className="text-[10px] text-slate-400">En cours</p>
                </div>
                <div className="card !py-3 text-center">
                    <p className="text-xl font-bold text-emerald-400">{completedTasks}</p>
                    <p className="text-[10px] text-slate-400">Terminées</p>
                </div>
                <div className="card !py-3 text-center">
                    <p className="text-xl font-bold text-primary">{overallProgress}%</p>
                    <p className="text-[10px] text-slate-400">Progression</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in stagger-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une tâche..." className="input-field pl-10" />
                </div>
                <div className="relative">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field pr-10 appearance-none min-w-[160px]" title="Filtrer par statut">
                        <option value="">Tous les statuts</option>
                        {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Tasks by Project */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : Object.keys(groupedByProject).length === 0 ? (
                <div className="card text-center py-16"><CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Aucune tâche assignée</p></div>
            ) : (
                <div className="space-y-6 animate-fade-in stagger-2">
                    {Object.values(groupedByProject).map(({ project, tasks: projectTasks }) => {
                        const projectProgress = Math.round(projectTasks.reduce((s, t) => s + t.progress, 0) / projectTasks.length);
                        return (
                            <div key={project.id} className="card">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="font-semibold text-white">{project.name}</h2>
                                    <span className="text-xs text-slate-400">{projectProgress}% global</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-4">
                                    <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${projectProgress}%` }} />
                                </div>
                                <div className="space-y-2">
                                    {projectTasks.map((task) => {
                                        const st = STATUS_MAP[task.status] || STATUS_MAP.A_FAIRE;
                                        const prColor = PRIORITY_COLORS[task.priority] || "text-slate-400";
                                        return (
                                            <div key={task.id} className={`p-3 rounded-xl bg-surface-dark-hover/50 border border-transparent hover:border-primary/20 transition-all ${updatingId === task.id ? "opacity-60" : ""}`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-sm font-medium text-white">{task.title}</h3>
                                                            <span className={`text-[10px] font-semibold ${prColor}`}>{task.priority}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                            {task.phase && <span>{task.phase.name}</span>}
                                                            {task.dueDate && (
                                                                <span className="flex items-center gap-0.5">
                                                                    <Clock className="w-3 h-3" />
                                                                    {formatDate(task.dueDate)}
                                                                </span>
                                                            )}
                                                            {task.assignments.length > 0 && (
                                                                <span className="flex items-center gap-0.5">
                                                                    <Users className="w-3 h-3" />
                                                                    {task.assignments.map((a) => `${a.user.firstName[0]}${a.user.lastName[0]}`).join(", ")}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="relative ml-3 shrink-0">
                                                        <select
                                                            value={task.status}
                                                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                                            className={`badge ${st.color} border-transparent text-xs pr-6 appearance-none cursor-pointer`}
                                                            title="Changer le statut"
                                                        >
                                                            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                                        </select>
                                                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                                                    </div>
                                                </div>
                                                {/* Progress bar */}
                                                <div className="flex items-center gap-3 ">
                                                    <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all ${task.progress >= 100 ? "bg-emerald-400" : task.progress > 50 ? "bg-blue-400" : task.progress > 0 ? "bg-amber-400" : "bg-slate-600"}`}
                                                            style={{ width: `${Math.min(task.progress, 100)}%` }}
                                                        />
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        step="5"
                                                        value={task.progress}
                                                        onChange={(e) => handleProgressChange(task.id, parseInt(e.target.value))}
                                                        className="w-20 h-1 accent-primary cursor-pointer"
                                                        title="Progression"
                                                    />
                                                    <span className="text-xs text-slate-400 w-8 text-right tabular-nums">{task.progress}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
