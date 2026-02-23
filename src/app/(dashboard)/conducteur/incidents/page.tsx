"use client";

import { useState, useEffect, useCallback } from "react";
import {
    AlertTriangle, Search, Loader2, ChevronDown, Clock, MapPin,
    MessageSquare, Send, X, AlertOctagon, AlertCircle, Info,
    CheckCircle2, Camera, ExternalLink,
} from "lucide-react";
import PhotoCapture, { type Photo } from "@/components/ReportPhotoCapture";

interface ProjectRef { id: string; name: string }
interface ReporterRef { id: string; firstName: string; lastName: string }
interface CommentRef { id: string; content: string; author: ReporterRef; createdAt: string }

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
    comments: CommentRef[];
    photos: Photo[];
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

export default function ConducteurIncidentsPage() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterSeverity, setFilterSeverity] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [comment, setComment] = useState("");
    const [sending, setSending] = useState(false);

    const fetchIncidents = useCallback(async () => {
        const res = await fetch("/api/incidents");
        if (res.ok) setIncidents(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

    const handleStatusChange = async (id: string, status: string) => {
        await fetch(`/api/incidents/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        fetchIncidents();
        if (selectedIncident?.id === id) {
            setSelectedIncident({ ...selectedIncident, status });
        }
    };

    const handleSendComment = async () => {
        if (!comment.trim() || !selectedIncident) return;
        setSending(true);
        const res = await fetch(`/api/incidents/${selectedIncident.id}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: comment }),
        });
        if (res.ok) {
            setComment("");
            fetchIncidents();
            const updated = await fetch(`/api/incidents/${selectedIncident.id}`).then(r => r.json());
            setSelectedIncident(updated);
        }
        setSending(true);
    };

    const updateIncidentPhotos = (incidentId: string, photos: Photo[]) => {
        setIncidents((prev) =>
            prev.map((i) => (i.id === incidentId ? { ...i, photos } : i))
        );
        if (selectedIncident && selectedIncident.id === incidentId) {
            setSelectedIncident({ ...selectedIncident, photos });
        }
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    const formatDateTime = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

    const filteredIncidents = incidents.filter(i => {
        const matchSearch = `${i.title} ${i.project.name}`.toLowerCase().includes(search.toLowerCase());
        const matchSeverity = !filterSeverity || i.severity === filterSeverity;
        const matchStatus = !filterStatus || i.status === filterStatus;
        return matchSearch && matchSeverity && matchStatus;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Conducteur de travaux</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Incidents / Remarques</h1>
                <p className="text-sm text-slate-400 mt-1">{incidents.length} incident{incidents.length !== 1 ? "s" : ""} signalés</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 animate-fade-in stagger-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="input-field pl-10" />
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="input-field pr-10 appearance-none min-w-[140px]" title="Gravité">
                            <option value="">Toutes gravités</option>
                            {Object.entries(SEVERITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field pr-10 appearance-none min-w-[140px]" title="Statut">
                            <option value="">Tous statuts</option>
                            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : filteredIncidents.length === 0 ? (
                <div className="card text-center py-16"><AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Aucun incident trouvé</p></div>
            ) : (
                <div className="grid grid-cols-1 gap-4 animate-fade-in stagger-2">
                    {filteredIncidents.map((i) => {
                        const sev = SEVERITY_MAP[i.severity] || SEVERITY_MAP.MOYENNE;
                        const st = STATUS_MAP[i.status] || STATUS_MAP.OUVERT;
                        return (
                            <div key={i.id} className="card hover:border-primary/20 transition-all cursor-pointer group" onClick={() => setSelectedIncident(i)}>
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-2xl bg-slate-800/50 ${sev.color.split(" ")[0]} border border-border-dark`}>
                                            {sev.icon}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-white text-lg">{i.title}</h3>
                                                <span className={`badge ${sev.color} border-transparent text-[10px]`}>{sev.label}</span>
                                                <span className={`badge ${st.color} border-transparent text-[10px]`}>{st.label}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                                                    <div className="w-1 h-1 rounded-full bg-primary" /> {i.project.name}
                                                </span>
                                                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {formatDate(i.date)}</span>
                                                {i.location && <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {i.location}</span>}
                                                <span className="flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> {i._count.comments}</span>
                                                {i.photos?.length > 0 && <span className="flex items-center gap-1.5 text-blue-400"><Camera className="w-3 h-3" /> {i.photos.length}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button className="btn-secondary text-xs sm:opacity-0 group-hover:opacity-100 transition-opacity">Détails</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Details Modal */}
            {selectedIncident && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedIncident(null)}>
                    <div className="bg-surface-dark border border-border-dark rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-border-dark flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl bg-slate-800/50 ${SEVERITY_MAP[selectedIncident.severity]?.color.split(" ")[0]}`}>
                                    {SEVERITY_MAP[selectedIncident.severity]?.icon}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{selectedIncident.title}</h2>
                                    <p className="text-sm text-slate-400">{selectedIncident.project.name} · Signalé par {selectedIncident.reporter.firstName} {selectedIncident.reporter.lastName}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedIncident(null)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Info & Description */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="flex flex-wrap gap-3">
                                        <div className="px-4 py-2 rounded-2xl bg-slate-800/50 border border-border-dark">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Gravité</p>
                                            <div className={`flex items-center gap-2 text-sm font-semibold ${SEVERITY_MAP[selectedIncident.severity]?.color.split(" ")[0]}`}>
                                                {SEVERITY_MAP[selectedIncident.severity]?.label}
                                            </div>
                                        </div>
                                        <div className="px-4 py-2 rounded-2xl bg-slate-800/50 border border-border-dark">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Statut</p>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={selectedIncident.status}
                                                    onChange={(e) => handleStatusChange(selectedIncident.id, e.target.value)}
                                                    className="bg-transparent text-sm font-semibold text-white focus:outline-none"
                                                    title="Modifier le statut"
                                                >
                                                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k} className="bg-slate-900">{v.label}</option>)}
                                                </select>
                                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                        </div>
                                        <div className="px-4 py-2 rounded-2xl bg-slate-800/50 border border-border-dark">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Date</p>
                                            <div className="text-sm font-semibold text-white">{formatDate(selectedIncident.date)}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Description</h3>
                                        <p className="text-slate-300 leading-relaxed bg-slate-800/30 p-4 rounded-2xl border border-border-dark/50">
                                            {selectedIncident.description || "Aucune description fournie."}
                                        </p>
                                    </div>

                                    {/* Photos Section */}
                                    <div className="space-y-4 pt-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                            <Camera className="w-4 h-4 text-primary" /> Photos de l&apos;incident ({selectedIncident.photos?.length || 0})
                                        </h3>
                                        <PhotoCapture
                                            entityId={selectedIncident.id}
                                            apiPath="/api/incidents"
                                            photos={selectedIncident.photos || []}
                                            onPhotosChange={(photos) => updateIncidentPhotos(selectedIncident.id, photos)}
                                        />
                                    </div>
                                </div>

                                {/* Comments Side */}
                                <div className="bg-slate-800/20 rounded-3xl border border-border-dark flex flex-col h-full min-h-[400px]">
                                    <div className="p-4 border-b border-border-dark flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-primary" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">Discussions</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {selectedIncident.comments.length === 0 ? (
                                            <p className="text-center text-slate-500 text-xs py-10 italic">Aucun commentaire</p>
                                        ) : (
                                            selectedIncident.comments.map((c) => (
                                                <div key={c.id} className="space-y-1">
                                                    <div className="flex items-center justify-between text-[10px]">
                                                        <span className="font-bold text-slate-300">{c.author.firstName} {c.author.lastName}</span>
                                                        <span className="text-slate-500">{formatDateTime(c.createdAt)}</span>
                                                    </div>
                                                    <div className="p-3 rounded-2xl bg-slate-800/50 text-xs text-slate-200 border border-border-dark/50">
                                                        {c.content}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-3 border-t border-border-dark">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                placeholder="Ajouter un commentaire..."
                                                className="input-field pr-12 text-sm"
                                                onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                                            />
                                            <button
                                                onClick={handleSendComment}
                                                disabled={sending || !comment.trim()}
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors disabled:opacity-50"
                                                title="Envoyer"
                                            >
                                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
