"use client";

import { useState, useEffect, useCallback } from "react";
import {
    CheckSquare, Search, Loader2, ChevronDown, Clock,
    AlertCircle, CheckCircle2, Circle, Pause, TrendingUp,
    Users, Plus, X, FolderKanban,
} from "lucide-react";

interface ProjectRef { id: string; name: string }
interface UserRef { id: string; firstName: string; lastName: string; role: string }
interface PhaseRef { id: string; name: string }
interface TeamRef {
    id: string;
    name: string;
    members: { user: UserRef }[];
}

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
    BASSE: "text-slate-400", NORMALE: "text-blue-400", HAUTE: "text-orange-400", URGENTE: "text-red-400",
};

const emptyForm = { title: "", description: "", projectId: "", priority: "NORMALE", startDate: "", dueDate: "", teamId: "", assigneeId: "" };

export default function ConducteurTasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<ProjectRef[]>([]);
    const [teams, setTeams] = useState<TeamRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const fetchTasks = useCallback(async () => {
        const res = await fetch("/api/tasks");
        if (res.ok) setTasks(await res.json());
        setLoading(false);
    }, []);

    const fetchProjects = useCallback(async () => {
        const res = await fetch("/api/projects");
        if (res.ok) setProjects(await res.json());
    }, []);

    const fetchTeams = useCallback(async () => {
        const res = await fetch("/api/teams");
        if (res.ok) setTeams(await res.json());
    }, []);

    useEffect(() => { fetchTasks(); fetchProjects(); fetchTeams(); }, [fetchTasks, fetchProjects, fetchTeams]);

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

    const handleCreate = async () => {
        if (!form.title.trim() || !form.projectId) { setError("Titre et projet requis"); return; }
        setSaving(true); setError("");
        const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...form,
                startDate: form.startDate || null,
                dueDate: form.dueDate || null,
                assigneeIds: form.assigneeId ? [form.assigneeId] : [],
            }),
        });
        setSaving(false);
        if (res.ok) {
            setShowModal(false);
            setForm(emptyForm);
            fetchTasks();
        } else {
            const d = await res.json();
            setError(d.error || "Erreur");
        }
    };

    const filteredTasks = tasks.filter((t) => {
        const matchSearch = `${t.title} ${t.project.name}`.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !filterStatus || t.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : null;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "TERMINE").length;
    const inProgressTasks = tasks.filter((t) => t.status === "EN_COURS").length;
    const overallProgress = totalTasks > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / totalTasks) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Conducteur de travaux</p>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Gestion des Tâches</h1>
                    <p className="text-sm text-slate-400 mt-1">{totalTasks} tâche{totalTasks !== 1 ? "s" : ""}</p>
                </div>
                <button onClick={() => { setShowModal(true); setError(""); }} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Nouvelle tâche
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in stagger-1">
                <div className="card !py-3 text-center"><p className="text-xl font-bold text-white">{totalTasks}</p><p className="text-[10px] text-slate-400">Total</p></div>
                <div className="card !py-3 text-center"><p className="text-xl font-bold text-blue-400">{inProgressTasks}</p><p className="text-[10px] text-slate-400">En cours</p></div>
                <div className="card !py-3 text-center"><p className="text-xl font-bold text-emerald-400">{completedTasks}</p><p className="text-[10px] text-slate-400">Terminées</p></div>
                <div className="card !py-3 text-center"><p className="text-xl font-bold text-primary">{overallProgress}%</p><p className="text-[10px] text-slate-400">Progression</p></div>
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

            {/* Task List */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : filteredTasks.length === 0 ? (
                <div className="card text-center py-16">
                    <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 mb-4">Aucune tâche trouvée</p>
                    <button onClick={() => setShowModal(true)} className="btn-primary text-sm mx-auto"><Plus className="w-4 h-4" /> Créer une tâche</button>
                </div>
            ) : (
                <div className="space-y-3 animate-fade-in stagger-2">
                    {filteredTasks.map((task) => {
                        const st = STATUS_MAP[task.status] || STATUS_MAP.A_FAIRE;
                        const prColor = PRIORITY_COLORS[task.priority] || "text-slate-400";
                        return (
                            <div key={task.id} className={`card hover:border-primary/20 transition-all ${updatingId === task.id ? "opacity-60" : ""}`}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-white">{task.title}</h3>
                                            <span className={`text-[10px] font-semibold ${prColor}`}>{task.priority}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                                            <span className="flex items-center gap-1"><FolderKanban className="w-3 h-3" /> {task.project.name}</span>
                                            {task.phase && <span>{task.phase.name}</span>}
                                            {task.dueDate && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {formatDate(task.dueDate)}</span>}
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
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                                        <div
                                            className={`h-1.5 rounded-full transition-all ${task.progress >= 100 ? "bg-emerald-400" : task.progress > 50 ? "bg-blue-400" : task.progress > 0 ? "bg-amber-400" : "bg-slate-600"}`}
                                            style={{ width: `${Math.min(task.progress, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-400 w-8 text-right tabular-nums">{task.progress}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-lg animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border-dark">
                            <h2 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Nouvelle tâche</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white" title="Fermer"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Projet *</label>
                                <div className="relative">
                                    <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="input-field pr-10 appearance-none w-full" title="Sélectionner un projet">
                                        <option value="">Sélectionner un projet</option>
                                        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Titre *</label>
                                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Couler dalle béton..." className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Description..." className="input-field w-full resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Équipe</label>
                                    <div className="relative">
                                        <select
                                            value={form.teamId}
                                            onChange={(e) => setForm({ ...form, teamId: e.target.value, assigneeId: "" })}
                                            className="input-field pr-10 appearance-none w-full"
                                            title="Sélectionner une équipe"
                                        >
                                            <option value="">Toutes les équipes</option>
                                            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Ouvrier responsable</label>
                                    <div className="relative">
                                        <select
                                            value={form.assigneeId}
                                            onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                                            className="input-field pr-10 appearance-none w-full"
                                            title="Assigner un ouvrier"
                                        >
                                            <option value="">Sélectionner un ouvrier</option>
                                            {form.teamId
                                                ? teams.find(t => t.id === form.teamId)?.members.map(m => (
                                                    <option key={m.user.id} value={m.user.id}>{m.user.firstName} {m.user.lastName}</option>
                                                ))
                                                : teams.flatMap(t => t.members).map(m => (
                                                    <option key={m.user.id} value={m.user.id}>{m.user.firstName} {m.user.lastName}</option>
                                                ))
                                            }
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Priorité</label>
                                    <div className="relative">
                                        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field pr-10 appearance-none w-full" title="Priorité">
                                            <option value="BASSE">Basse</option>
                                            <option value="NORMALE">Normale</option>
                                            <option value="HAUTE">Haute</option>
                                            <option value="URGENTE">Urgente</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Date début</label>
                                    <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-field w-full" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Date d&apos;échéance</label>
                                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field w-full" />
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 pt-0">
                            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Annuler</button>
                            <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Créer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
