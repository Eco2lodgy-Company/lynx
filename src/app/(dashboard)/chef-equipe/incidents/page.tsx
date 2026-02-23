"use client";

import { useState, useEffect, useCallback } from "react";
import {
    AlertTriangle,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Loader2,
    ChevronDown,
    MapPin,
    Clock,
    CheckCircle2,
    AlertOctagon,
    AlertCircle,
    Info,
} from "lucide-react";

interface ProjectRef { id: string; name: string; }
interface ReporterRef { id: string; firstName: string; lastName: string; }

interface Incident {
    id: string;
    title: string;
    description: string | null;
    severity: string;
    status: string;
    location: string | null;
    date: string;
    resolvedAt: string | null;
    resolution: string | null;
    reporter: ReporterRef;
    project: ProjectRef;
    _count: { photos: number; comments: number };
}

const SEVERITY_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    FAIBLE: { label: "Faible", color: "text-blue-400 bg-blue-500/10", icon: <Info className="w-3 h-3" /> },
    MOYENNE: { label: "Moyenne", color: "text-amber-400 bg-amber-500/10", icon: <AlertCircle className="w-3 h-3" /> },
    HAUTE: { label: "Haute", color: "text-orange-400 bg-orange-500/10", icon: <AlertTriangle className="w-3 h-3" /> },
    CRITIQUE: { label: "Critique", color: "text-red-400 bg-red-500/10", icon: <AlertOctagon className="w-3 h-3" /> },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    OUVERT: { label: "Ouvert", color: "text-red-400 bg-red-500/10" },
    EN_COURS: { label: "En cours", color: "text-amber-400 bg-amber-500/10" },
    RESOLU: { label: "Résolu", color: "text-emerald-400 bg-emerald-500/10" },
    FERME: { label: "Fermé", color: "text-slate-400 bg-slate-500/10" },
};

const emptyForm = { projectId: "", title: "", description: "", severity: "MOYENNE", location: "" };

export default function IncidentsPage() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [projects, setProjects] = useState<ProjectRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterSeverity, setFilterSeverity] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [pendingPhotos, setPendingPhotos] = useState<{ blob: Blob; previewUrl: string; caption: string; coords: { lat: number; lng: number } | null }[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const fetchIncidents = useCallback(async () => {
        const res = await fetch("/api/incidents");
        if (res.ok) setIncidents(await res.json());
        setLoading(false);
    }, []);

    const fetchProjects = useCallback(async () => {
        const res = await fetch("/api/projects");
        if (res.ok) setProjects(await res.json());
    }, []);

    useEffect(() => { fetchIncidents(); fetchProjects(); }, [fetchIncidents, fetchProjects]);

    const handleLocalCapture = (blob: Blob, caption: string, coords: { lat: number; lng: number } | null) => {
        const previewUrl = URL.createObjectURL(blob);
        setPendingPhotos((prev) => [...prev, { blob, previewUrl, caption, coords }]);
    };

    const removePendingPhoto = (index: number) => {
        setPendingPhotos((prev) => {
            const copy = [...prev];
            URL.revokeObjectURL(copy[index].previewUrl);
            copy.splice(index, 1);
            return copy;
        });
    };

    const openCreateModal = () => {
        setEditingIncident(null);
        setForm(emptyForm);
        setPendingPhotos([]);
        setError("");
        setShowModal(true);
    };

    const openEditModal = (inc: Incident) => {
        setEditingIncident(inc);
        setForm({
            projectId: inc.project.id,
            title: inc.title,
            description: inc.description || "",
            severity: inc.severity,
            location: inc.location || "",
        });
        setPendingPhotos([]);
        setError(""); setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError("");
        try {
            const url = editingIncident ? `/api/incidents/${editingIncident.id}` : "/api/incidents";
            const method = editingIncident ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Erreur lors de l'enregistrement");
                setSaving(false);
                return;
            }

            const incident = await res.json();

            // Upload any pending photos if this was a new incident
            if (!editingIncident && pendingPhotos.length > 0) {
                for (const p of pendingPhotos) {
                    const formData = new FormData();
                    formData.append("photo", p.blob, `incident_${Date.now()}.jpg`);
                    if (p.caption) formData.append("caption", p.caption);
                    if (p.coords) {
                        formData.append("latitude", p.coords.lat.toString());
                        formData.append("longitude", p.coords.lng.toString());
                    }
                    formData.append("takenAt", new Date().toISOString());

                    await fetch(`/api/incidents/${incident.id}/photos`, {
                        method: "POST",
                        body: formData,
                    });
                }
            }

            setShowModal(false);
            setPendingPhotos([]);
            fetchIncidents();
        } catch { setError("Erreur réseau"); }
        setSaving(false);
    };

    const handleStatusChange = async (id: string, status: string) => {
        await fetch(`/api/incidents/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
        fetchIncidents();
    };

    const handleDelete = async (id: string) => {
        await fetch(`/api/incidents/${id}`, { method: "DELETE" });
        setDeleteConfirm(null); fetchIncidents();
    };

    const filteredIncidents = incidents.filter((i) => {
        const matchSearch = `${i.title} ${i.project.name}`.toLowerCase().includes(search.toLowerCase());
        const matchSeverity = !filterSeverity || i.severity === filterSeverity;
        return matchSearch && matchSeverity;
    });

    const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

    // Stats
    const open = incidents.filter((i) => i.status === "OUVERT").length;
    const critical = incidents.filter((i) => i.severity === "CRITIQUE" && i.status !== "RESOLU" && i.status !== "FERME").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Chef d&apos;équipe</p>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Incidents</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {incidents.length} incident{incidents.length !== 1 ? "s" : ""} — {open} ouvert{open !== 1 ? "s" : ""}
                        {critical > 0 && <span className="text-red-400 ml-2">⚠ {critical} critique{critical !== 1 ? "s" : ""}</span>}
                    </p>
                </div>
                <button onClick={openCreateModal} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Signaler un incident</button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in stagger-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un incident..." className="input-field pl-10" />
                </div>
                <div className="relative">
                    <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="input-field pr-10 appearance-none min-w-[160px]" title="Filtrer par sévérité">
                        <option value="">Toutes sévérités</option>
                        {Object.entries(SEVERITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : filteredIncidents.length === 0 ? (
                <div className="card text-center py-16"><AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Aucun incident trouvé</p></div>
            ) : (
                <div className="space-y-3 animate-fade-in stagger-2">
                    {filteredIncidents.map((inc) => {
                        const sev = SEVERITY_MAP[inc.severity] || SEVERITY_MAP.MOYENNE;
                        const st = STATUS_MAP[inc.status] || STATUS_MAP.OUVERT;
                        return (
                            <div key={inc.id} className={`card hover:border-primary/30 transition-all group ${inc.severity === "CRITIQUE" ? "border-red-500/20" : ""}`}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${sev.color}`}>{sev.icon}</div>
                                        <div>
                                            <h3 className="font-semibold text-white">{inc.title}</h3>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                                <span>{inc.project.name}</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(inc.date)}</span>
                                                {inc.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{inc.location}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => openEditModal(inc)} className="p-1.5 text-slate-500 hover:text-primary rounded-lg opacity-0 group-hover:opacity-100 transition-all" title="Modifier"><Edit2 className="w-3.5 h-3.5" /></button>
                                        {deleteConfirm === inc.id ? (
                                            <div className="flex gap-1">
                                                <button onClick={() => handleDelete(inc.id)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">Oui</button>
                                                <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs bg-slate-500/20 text-slate-400 rounded">Non</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setDeleteConfirm(inc.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                                        )}
                                    </div>
                                </div>
                                {inc.description && <p className="text-xs text-slate-400 mb-3 ml-11">{inc.description}</p>}
                                <div className="flex items-center gap-2 ml-11">
                                    <span className={`badge ${sev.color} border-transparent text-xs inline-flex items-center gap-1`}>{sev.icon} {sev.label}</span>
                                    <div className="relative">
                                        <select
                                            value={inc.status}
                                            onChange={(e) => handleStatusChange(inc.id, e.target.value)}
                                            className={`badge ${st.color} border-transparent text-xs pr-6 appearance-none cursor-pointer`}
                                            title="Changer le statut"
                                        >
                                            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                                    </div>
                                    {inc.status === "RESOLU" && inc.resolvedAt && (
                                        <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Résolu {formatDate(inc.resolvedAt)}</span>
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
                    <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-border-dark">
                            <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-400" /><h2 className="text-lg font-semibold">{editingIncident ? "Modifier" : "Signaler un incident"}</h2></div>
                            <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white" title="Fermer"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3"><p className="text-red-400 text-sm">{error}</p></div>}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Projet *</label>
                                <div className="relative"><select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="input-field appearance-none" required title="Projet">
                                    <option value="">Sélectionner...</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Titre *</label>
                                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required placeholder="Ex: Fissure mur porteur" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Description</label>
                                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field min-h-[80px] resize-none" rows={3} placeholder="Description détaillée..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400">Sévérité</label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(SEVERITY_MAP).map(([k, v]) => (
                                            <button key={k} type="button" onClick={() => setForm({ ...form, severity: k })} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${form.severity === k ? v.color + " border-current/30" : "text-slate-500 border-border-dark"}`}>
                                                {v.icon} {v.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Localisation</label>
                                    <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" placeholder="Ex: 2ème étage, mur B3" title="Localisation de l'incident" />
                                </div>
                            </div>

                            {/* Photos Capture Section */}
                            {!editingIncident && (
                                <div className="space-y-4 pt-2">
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 px-1">Photos de l&apos;incident</label>

                                    <PhotoCapture
                                        entityId="new"
                                        apiPath=""
                                        photos={[]}
                                        onPhotosChange={() => { }}
                                        onLocalCapture={handleLocalCapture}
                                    />

                                    {pendingPhotos.length > 0 && (
                                        <div className="flex gap-2 pb-2 overflow-x-auto custom-scrollbar">
                                            {pendingPhotos.map((p, idx) => (
                                                <div key={idx} className="relative shrink-0 group">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={p.previewUrl} alt="Pending" className="w-20 h-20 rounded-xl object-cover border border-border-dark" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removePendingPhoto(idx)}
                                                        className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                        title="Supprimer la photo"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                    {p.caption && (
                                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white p-1 truncate rounded-b-xl">
                                                            {p.caption}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-4 border-t border-border-dark">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-sm">Annuler</button>
                                <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : editingIncident ? "Enregistrer" : "Signaler"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
