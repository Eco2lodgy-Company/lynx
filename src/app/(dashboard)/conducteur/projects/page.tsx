"use client";

import { useState, useEffect, useCallback } from "react";
import {
    FolderKanban,
    Plus,
    Search,
    Edit2,
    X,
    Loader2,
    MapPin,
    Calendar,
    DollarSign,
    ChevronDown,
    TrendingUp,
    AlertTriangle,
    Clock,
    CheckCircle2,
    Pause,
    Ban,
} from "lucide-react";

interface Department { id: string; name: string; }
interface UserRef { id: string; firstName: string; lastName: string; }

interface Project {
    id: string;
    name: string;
    description: string | null;
    address: string | null;
    status: string;
    priority: string;
    startDate: string | null;
    estimatedEndDate: string | null;
    budget: number | null;
    progress: number;
    supervisor: UserRef | null;
    client: UserRef | null;
    department: Department | null;
    supervisorId: string | null;
    clientId: string | null;
    departmentId: string | null;
    _count: { tasks: number; phases: number; incidents: number; dailyLogs: number };
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PLANIFIE: { label: "Planifié", color: "text-blue-400 bg-blue-500/10", icon: <Clock className="w-3 h-3" /> },
    EN_COURS: { label: "En cours", color: "text-amber-400 bg-amber-500/10", icon: <TrendingUp className="w-3 h-3" /> },
    EN_PAUSE: { label: "En pause", color: "text-orange-400 bg-orange-500/10", icon: <Pause className="w-3 h-3" /> },
    TERMINE: { label: "Terminé", color: "text-emerald-400 bg-emerald-500/10", icon: <CheckCircle2 className="w-3 h-3" /> },
    ANNULE: { label: "Annulé", color: "text-red-400 bg-red-500/10", icon: <Ban className="w-3 h-3" /> },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
    BASSE: { label: "Basse", color: "text-slate-400" },
    NORMALE: { label: "Normale", color: "text-blue-400" },
    HAUTE: { label: "Haute", color: "text-orange-400" },
    URGENTE: { label: "Urgente", color: "text-red-400" },
};

const emptyForm = {
    name: "",
    description: "",
    address: "",
    status: "PLANIFIE",
    priority: "NORMALE",
    startDate: "",
    estimatedEndDate: "",
    budget: "",
    supervisorId: "",
    clientId: "",
};

export default function ConducteurProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [conducteurs, setConducteurs] = useState<UserRef[]>([]);
    const [clients, setClients] = useState<UserRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const fetchProjects = useCallback(async () => {
        const res = await fetch("/api/projects");
        const data = await res.json();
        setProjects(data);
        setLoading(false);
    }, []);

    const fetchMeta = useCallback(async () => {
        const userRes = await fetch("/api/users");
        if (userRes.ok) {
            const allUsers = await userRes.json();
            setConducteurs(allUsers.filter((u: { role: string }) => ["ADMIN", "CONDUCTEUR"].includes(u.role)));
            setClients(allUsers.filter((u: { role: string }) => u.role === "CLIENT"));
        }
    }, []);

    useEffect(() => {
        fetchProjects();
        fetchMeta();
    }, [fetchProjects, fetchMeta]);

    const openCreateModal = () => {
        setEditingProject(null);
        setForm(emptyForm);
        setError("");
        setShowModal(true);
    };

    const openEditModal = (project: Project) => {
        setEditingProject(project);
        setForm({
            name: project.name,
            description: project.description || "",
            address: project.address || "",
            status: project.status,
            priority: project.priority,
            startDate: project.startDate ? project.startDate.split("T")[0] : "",
            estimatedEndDate: project.estimatedEndDate ? project.estimatedEndDate.split("T")[0] : "",
            budget: project.budget?.toString() || "",
            supervisorId: project.supervisorId || "",
            clientId: project.clientId || "",
        });
        setError("");
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError("");
        try {
            const url = editingProject ? `/api/projects/${editingProject.id}` : "/api/projects";
            const res = await fetch(url, { method: editingProject ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (!res.ok) { const data = await res.json(); setError(data.error || "Erreur"); setSaving(false); return; }
            setShowModal(false); fetchProjects();
        } catch { setError("Erreur réseau"); }
        setSaving(false);
    };

    const filteredProjects = projects.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !filterStatus || p.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const formatCurrency = (amount: number | null) => {
        if (!amount) return "—";
        return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Conducteur</p>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Mes Projets</h1>
                    <p className="text-sm text-slate-400 mt-1">{projects.length} projet{projects.length !== 1 ? "s" : ""} sous votre supervision</p>
                </div>
                <button onClick={openCreateModal} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Nouveau projet</button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in stagger-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="input-field pl-10" />
                </div>
                <div className="relative">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field pr-10 appearance-none min-w-[180px]">
                        <option value="">Tous les statuts</option>
                        {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : filteredProjects.length === 0 ? (
                <div className="card text-center py-16"><FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Aucun projet trouvé</p></div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 animate-fade-in stagger-2">
                    {filteredProjects.map((project) => {
                        const st = STATUS_MAP[project.status] || STATUS_MAP.PLANIFIE;
                        const pr = PRIORITY_MAP[project.priority] || PRIORITY_MAP.NORMALE;
                        return (
                            <div key={project.id} className="card hover:border-primary/30 transition-all group">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold truncate text-white group-hover:text-primary transition-colors">{project.name}</h3>
                                        {project.address && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{project.address}</span></p>}
                                    </div>
                                    <button onClick={() => openEditModal(project)} className="p-1.5 text-slate-500 hover:text-primary rounded-lg transition-colors opacity-0 group-hover:opacity-100 ml-2" title="Modifier"><Edit2 className="w-3.5 h-3.5" /></button>
                                </div>
                                {project.description && <p className="text-xs text-slate-400 line-clamp-2 mb-3">{project.description}</p>}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className={`badge ${st.color} border-transparent text-xs inline-flex items-center gap-1`}>{st.icon} {st.label}</span>
                                    <span className={`badge border-transparent text-xs ${pr.color} bg-current/10`}>{pr.label}</span>
                                </div>
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Progression</span><span className="font-semibold text-primary">{project.progress}%</span></div>
                                    <div className="w-full h-1.5 bg-surface-dark rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full transition-all duration-500" style={{ width: `${project.progress}%` }} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(project.startDate)}</div>
                                    <div className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatCurrency(project.budget)}</div>
                                    <div className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{project._count.incidents} incident{project._count.incidents !== 1 ? "s" : ""}</div>
                                    <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{project._count.tasks} tâche{project._count.tasks !== 1 ? "s" : ""}</div>
                                </div>

                                {/* Supervisor & Client */}
                                <div className="mt-3 pt-3 border-t border-border-dark/50 flex flex-col gap-2">
                                    {project.supervisor && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center" title="Conducteur">
                                                <span className="text-[10px] font-bold text-blue-400">
                                                    {project.supervisor.firstName[0]}{project.supervisor.lastName[0]}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {project.supervisor.firstName} {project.supervisor.lastName} (Conducteur)
                                            </span>
                                        </div>
                                    )}
                                    {project.client && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center" title="Client">
                                                <span className="text-[10px] font-bold text-emerald-400">
                                                    {project.client.firstName[0]}{project.client.lastName[0]}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {project.client.firstName} {project.client.lastName} (Client)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-border-dark">
                            <div className="flex items-center gap-2"><FolderKanban className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">{editingProject ? "Modifier" : "Nouveau projet"}</h2></div>
                            <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3"><p className="text-red-400 text-sm">{error}</p></div>}
                            <div className="space-y-1"><label className="text-xs font-medium text-slate-400">Nom *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required placeholder="Nom du projet" /></div>
                            <div className="space-y-1"><label className="text-xs font-medium text-slate-400">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field min-h-[80px] resize-none" rows={3} placeholder="Description..." /></div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Conducteur du projet *</label>
                                    <div className="relative">
                                        <select
                                            value={form.supervisorId}
                                            onChange={(e) => setForm({ ...form, supervisorId: e.target.value })}
                                            className="input-field appearance-none"
                                            required
                                        >
                                            <option value="">Sélectionner...</option>
                                            {conducteurs.map((u) => (
                                                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Client *</label>
                                    <div className="relative">
                                        <select
                                            value={form.clientId}
                                            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                                            className="input-field appearance-none"
                                            required
                                        >
                                            <option value="">Sélectionner...</option>
                                            {clients.map((u) => (
                                                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1"><label className="text-xs font-medium text-slate-400">Adresse du chantier</label><input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" placeholder="Ex: Lot 42, Cité Hydra, Alger" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-xs font-medium text-slate-400">Statut</label><div className="relative"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field appearance-none">{Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /></div></div>
                                <div className="space-y-1"><label className="text-xs font-medium text-slate-400">Priorité</label><div className="relative"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field appearance-none">{Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /></div></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-xs font-medium text-slate-400">Date début</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-field" /></div>
                                <div className="space-y-1"><label className="text-xs font-medium text-slate-400">Date fin estimée</label><input type="date" value={form.estimatedEndDate} onChange={(e) => setForm({ ...form, estimatedEndDate: e.target.value })} className="input-field" /></div>
                            </div>
                            <div className="space-y-1"><label className="text-xs font-medium text-slate-400">Budget du projet (€)</label><input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="input-field" placeholder="Ex: 150000" /></div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-border-dark">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-sm">Annuler</button>
                                <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</> : editingProject ? "Enregistrer" : "Créer"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
