"use client";

import { useState, useEffect, useCallback } from "react";
import {
    CheckSquare,
    Search,
    Loader2,
    AlertTriangle,
    Calendar,
    ChevronDown,
    Filter,
    CheckCircle2,
    Clock,
} from "lucide-react";

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    startDate: string | null;
    dueDate: string | null;
    progress: number;
    project: { id: string; name: string };
    phase: { id: string; name: string } | null;
}

interface Assignment {
    id: string;
    assignedAt: string;
    task: Task;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    A_FAIRE: { label: "À faire", color: "text-slate-400", bg: "bg-slate-500/10" },
    EN_COURS: { label: "En cours", color: "text-amber-400", bg: "bg-amber-500/10" },
    EN_ATTENTE: { label: "En attente", color: "text-blue-400", bg: "bg-blue-500/10" },
    TERMINE: { label: "Terminé", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    ANNULE: { label: "Annulé", color: "text-red-400", bg: "bg-red-500/10" },
};

const PRIORITY_MAP: Record<string, { label: string; color: string; dot: string }> = {
    BASSE: { label: "Basse", color: "text-slate-400", dot: "bg-slate-400" },
    NORMALE: { label: "Normale", color: "text-blue-400", dot: "bg-blue-400" },
    HAUTE: { label: "Haute", color: "text-amber-400", dot: "bg-amber-400" },
    URGENTE: { label: "Urgente", color: "text-red-400", dot: "bg-red-400" },
};

export default function OuvrierTasksPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterPriority, setFilterPriority] = useState("");

    const fetchTasks = useCallback(async () => {
        const res = await fetch("/api/tasks?myTasks=true");
        if (res.ok) {
            const tasks: Task[] = await res.json();
            // Wrap in assignment-like structure
            setAssignments(tasks.map((t) => ({ id: t.id, assignedAt: t.startDate || "", task: t })));
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const today = new Date();

    const filtered = assignments.filter((a) => {
        const matchSearch = a.task.title.toLowerCase().includes(search.toLowerCase()) ||
            a.task.project.name.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !filterStatus || a.task.status === filterStatus;
        const matchPriority = !filterPriority || a.task.priority === filterPriority;
        return matchSearch && matchStatus && matchPriority;
    });

    const overdue = filtered.filter((a) => a.task.dueDate && new Date(a.task.dueDate) < today && a.task.status !== "TERMINE");
    const active = filtered.filter((a) => a.task.status === "EN_COURS");
    const todo = filtered.filter((a) => a.task.status === "A_FAIRE");
    const done = filtered.filter((a) => a.task.status === "TERMINE");

    const formatDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—";

    const TaskCard = ({ a }: { a: Assignment }) => {
        const st = STATUS_MAP[a.task.status] || STATUS_MAP.A_FAIRE;
        const pr = PRIORITY_MAP[a.task.priority] || PRIORITY_MAP.NORMALE;
        const isOverdue = a.task.dueDate && new Date(a.task.dueDate) < today && a.task.status !== "TERMINE";

        return (
            <div className={`card transition-all hover:border-primary/20 ${isOverdue ? "border-red-500/30" : ""}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${pr.dot}`} />
                        <div className="min-w-0">
                            <h3 className={`font-semibold text-sm truncate ${isOverdue ? "text-red-300" : ""}`}>
                                {a.task.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">{a.task.project.name}</p>
                            {a.task.phase && (
                                <p className="text-[10px] text-slate-600 mt-0.5">Phase : {a.task.phase.name}</p>
                            )}
                        </div>
                    </div>
                    <span className={`badge ${st.color} ${st.bg} border-transparent text-xs shrink-0`}>{st.label}</span>
                </div>

                {a.task.description && (
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{a.task.description}</p>
                )}

                {/* Progress */}
                <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Progression</span>
                        <span className={`font-semibold ${a.task.status === "TERMINE" ? "text-emerald-400" : "text-primary"}`}>
                            {Math.round(a.task.progress)}%
                        </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${a.task.status === "TERMINE" ? "bg-emerald-400" : "bg-primary"}`}
                            style={{ width: `${a.task.progress}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                        {a.task.startDate && (
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {formatDate(a.task.startDate)}
                            </span>
                        )}
                        {a.task.dueDate && (
                            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-400 font-semibold" : ""}`}>
                                <Clock className="w-3 h-3" /> {formatDate(a.task.dueDate)}
                                {isOverdue && " ⚠"}
                            </span>
                        )}
                    </div>
                    <span className={`text-[10px] font-medium ${pr.color}`}>{pr.label}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Espace Ouvrier</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Mes Tâches</h1>
                <p className="text-sm text-slate-400 mt-1">
                    {assignments.length} tâche{assignments.length !== 1 ? "s" : ""} assignée{assignments.length !== 1 ? "s" : ""}
                    {overdue.length > 0 && <span className="text-red-400 ml-2">· {overdue.length} en retard</span>}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in stagger-1">
                {[
                    { label: "En cours", count: active.length, color: "text-amber-400", icon: <Clock className="w-4 h-4" /> },
                    { label: "À faire", count: todo.length, color: "text-slate-400", icon: <CheckSquare className="w-4 h-4" /> },
                    { label: "Terminées", count: done.length, color: "text-emerald-400", icon: <CheckCircle2 className="w-4 h-4" /> },
                    { label: "En retard", count: overdue.length, color: overdue.length > 0 ? "text-red-400" : "text-slate-400", icon: <AlertTriangle className="w-4 h-4" /> },
                ].map((s) => (
                    <div key={s.label} className="card !py-3 text-center">
                        <div className={`flex items-center justify-center gap-1 ${s.color} mb-1`}>{s.icon}</div>
                        <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                        <p className="text-[10px] text-slate-400">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in stagger-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher une tâche..."
                        className="input-field pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="input-field pl-8 pr-8 appearance-none text-sm"
                            title="Filtrer par statut"
                        >
                            <option value="">Tous statuts</option>
                            {Object.entries(STATUS_MAP).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            className="input-field pr-8 appearance-none text-sm"
                            title="Filtrer par priorité"
                        >
                            <option value="">Toutes priorités</option>
                            {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="card text-center py-16">
                    <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aucune tâche trouvée</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 animate-fade-in stagger-2">
                    {filtered.map((a) => <TaskCard key={a.id} a={a} />)}
                </div>
            )}
        </div>
    );
}
