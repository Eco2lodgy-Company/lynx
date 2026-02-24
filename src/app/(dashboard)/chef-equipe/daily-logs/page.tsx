"use client";
import { assetUrl } from "@/lib/assets";

import { useState, useEffect, useCallback } from "react";
import {
    FileText, Plus, Search, Edit2, Trash2, X, Loader2, ChevronDown,
    Sun, Cloud, CloudRain, Wind, Snowflake, Send, Save, CheckCircle2,
    Clock, AlertTriangle, Camera,
} from "lucide-react";
import PhotoCapture, { type Photo } from "@/components/ReportPhotoCapture";

interface ProjectRef { id: string; name: string; }
interface AuthorRef { id: string; firstName: string; lastName: string; }

interface DailyLog {
    id: string;
    date: string;
    weather: string | null;
    temperature: number | null;
    summary: string;
    workCompleted: string | null;
    issues: string | null;
    materialsUsed: string | null;
    status: string;
    author: AuthorRef;
    project: ProjectRef;
    photos: Photo[];
}

const WEATHER_OPTIONS = [
    { value: "ENSOLEILLE", label: "Ensoleillé", icon: <Sun className="w-4 h-4" /> },
    { value: "NUAGEUX", label: "Nuageux", icon: <Cloud className="w-4 h-4" /> },
    { value: "PLUVIEUX", label: "Pluvieux", icon: <CloudRain className="w-4 h-4" /> },
    { value: "VENTEUX", label: "Venteux", icon: <Wind className="w-4 h-4" /> },
    { value: "NEIGEUX", label: "Neigeux", icon: <Snowflake className="w-4 h-4" /> },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    BROUILLON: { label: "Brouillon", color: "text-slate-400 bg-slate-500/10", icon: <Save className="w-3 h-3" /> },
    SOUMIS: { label: "Soumis", color: "text-blue-400 bg-blue-500/10", icon: <Send className="w-3 h-3" /> },
    VALIDE: { label: "Validé", color: "text-emerald-400 bg-emerald-500/10", icon: <CheckCircle2 className="w-3 h-3" /> },
    REJETE: { label: "Rejeté", color: "text-red-400 bg-red-500/10", icon: <X className="w-3 h-3" /> },
};

const emptyForm = {
    projectId: "",
    date: new Date().toISOString().split("T")[0],
    weather: "ENSOLEILLE",
    temperature: "",
    summary: "",
    workCompleted: "",
    issues: "",
    materialsUsed: "",
    status: "BROUILLON",
};

export default function DailyLogsPage() {
    const [logs, setLogs] = useState<DailyLog[]>([]);
    const [projects, setProjects] = useState<ProjectRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
    const [previewLog, setPreviewLog] = useState<DailyLog | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [pendingPhotos, setPendingPhotos] = useState<{ blob: Blob; previewUrl: string; caption: string; coords: { lat: number; lng: number } | null }[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        const res = await fetch("/api/daily-logs");
        if (res.ok) setLogs(await res.json());
        setLoading(false);
    }, []);

    const fetchProjects = useCallback(async () => {
        const res = await fetch("/api/projects");
        if (res.ok) setProjects(await res.json());
    }, []);

    useEffect(() => { fetchLogs(); fetchProjects(); }, [fetchLogs, fetchProjects]);

    const openCreateModal = () => {
        setEditingLog(null);
        setForm(emptyForm);
        setPendingPhotos([]);
        setError("");
        setShowModal(true);
    };

    const openEditModal = (log: DailyLog) => {
        setEditingLog(log);
        setForm({
            projectId: log.project.id,
            date: log.date.split("T")[0],
            weather: log.weather || "ENSOLEILLE",
            temperature: log.temperature?.toString() || "",
            summary: log.summary,
            workCompleted: log.workCompleted || "",
            issues: log.issues || "",
            materialsUsed: log.materialsUsed || "",
            status: log.status,
        });
        setPendingPhotos([]);
        setError("");
        setShowModal(true);
    };

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

    const handleSubmit = async (e: React.FormEvent, submitStatus?: string) => {
        e.preventDefault();
        setSaving(true);
        setError("");

        try {
            const body = { ...form, status: submitStatus || form.status };
            const url = editingLog ? `/api/daily-logs/${editingLog.id}` : "/api/daily-logs";
            const method = editingLog ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                let msg = data.error || "Erreur lors de l'enregistrement";
                if (res.status === 500 && msg.includes("Unique constraint")) {
                    msg = "Un journal existe déjà pour ce projet à cette date.";
                }
                setError(msg);
                setSaving(false);
                return;
            }

            const log = await res.json();

            // Upload any pending photos if this was a new log
            if (!editingLog && pendingPhotos.length > 0) {
                for (const p of pendingPhotos) {
                    const formData = new FormData();
                    formData.append("photo", p.blob, `photo_${Date.now()}.jpg`);
                    if (p.caption) formData.append("caption", p.caption);
                    if (p.coords) {
                        formData.append("latitude", p.coords.lat.toString());
                        formData.append("longitude", p.coords.lng.toString());
                    }
                    formData.append("takenAt", new Date().toISOString());

                    await fetch(`/api/daily-logs/${log.id}/photos`, {
                        method: "POST",
                        body: formData,
                    });
                }
            }

            setShowModal(false);
            setPendingPhotos([]);
            fetchLogs();
        } catch {
            setError("Erreur réseau");
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        await fetch(`/api/daily-logs/${id}`, { method: "DELETE" });
        setDeleteConfirm(null);
        fetchLogs();
    };

    const updateLogPhotos = (logId: string, photos: Photo[]) => {
        setLogs((prev) =>
            prev.map((l) => (l.id === logId ? { ...l, photos } : l))
        );
        if (previewLog && previewLog.id === logId) {
            setPreviewLog({ ...previewLog, photos });
        }
    };

    const filteredLogs = logs.filter((log) =>
        `${log.summary} ${log.project.name}`.toLowerCase().includes(search.toLowerCase())
    );

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

    const getWeatherIcon = (weather: string | null) => {
        const w = WEATHER_OPTIONS.find((o) => o.value === weather);
        return w?.icon || <Sun className="w-4 h-4" />;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Chef d&apos;équipe</p>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Journal de Chantier</h1>
                    <p className="text-sm text-slate-400 mt-1">{logs.length} entrée{logs.length !== 1 ? "s" : ""}</p>
                </div>
                <button onClick={openCreateModal} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Nouvelle entrée
                </button>
            </div>

            {/* Search */}
            <div className="relative animate-fade-in stagger-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher dans les journaux..."
                    className="input-field pl-10"
                />
            </div>

            {/* Logs */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : filteredLogs.length === 0 ? (
                <div className="card text-center py-16"><FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Aucun journal trouvé</p></div>
            ) : (
                <div className="space-y-3 animate-fade-in stagger-2">
                    {filteredLogs.map((log) => {
                        const st = STATUS_MAP[log.status] || STATUS_MAP.BROUILLON;
                        return (
                            <div key={log.id} className="card hover:border-primary/30 transition-all group cursor-pointer" onClick={() => setPreviewLog(log)}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="text-amber-400">{getWeatherIcon(log.weather)}</div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-white">{log.project.name}</h3>
                                                <span className={`badge ${st.color} border-transparent text-xs inline-flex items-center gap-1`}>
                                                    {st.icon} {st.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(log.date)}</span>
                                                {log.temperature && <span>{log.temperature}°C</span>}
                                                {log.photos?.length > 0 && (
                                                    <span className="flex items-center gap-1 text-blue-400">
                                                        <Camera className="w-3 h-3" /> {log.photos.length}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        {log.status === "BROUILLON" && (
                                            <>
                                                <button onClick={() => openEditModal(log)} className="p-1.5 text-slate-500 hover:text-primary rounded-lg" title="Modifier">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                {deleteConfirm === log.id ? (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleDelete(log.id)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">Oui</button>
                                                        <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs bg-slate-500/20 text-slate-400 rounded">Non</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setDeleteConfirm(log.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg" title="Supprimer">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <p className="text-sm text-slate-300 mb-2 line-clamp-2">{log.summary}</p>

                                {log.photos?.length > 0 && (
                                    <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                                        {log.photos.slice(0, 6).map((p) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img key={p.id} src={assetUrl(p.url)} alt="" className="w-10 h-10 rounded-lg object-cover border border-border-dark shrink-0" />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-border-dark">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold">{editingLog ? "Modifier le journal" : "Nouveau journal"}</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3"><p className="text-red-400 text-sm">{error}</p></div>}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Projet *</label>
                                    <div className="relative">
                                        <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="input-field appearance-none" required title="Choisir un projet">
                                            <option value="">Sélectionner...</option>
                                            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Date *</label>
                                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400">Météo</label>
                                <div className="flex flex-wrap gap-2">
                                    {WEATHER_OPTIONS.map((w) => (
                                        <button
                                            key={w.value}
                                            type="button"
                                            onClick={() => setForm({ ...form, weather: w.value })}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.weather === w.value
                                                ? "text-amber-400 bg-amber-500/15 border-amber-500/30"
                                                : "text-slate-500 bg-transparent border-border-dark hover:border-slate-500"
                                                }`}
                                        >
                                            {w.icon} {w.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Température (°C)</label>
                                <input type="number" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} className="input-field w-32" placeholder="Ex: 30" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Résumé de la journée *</label>
                                <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="input-field min-h-[80px] resize-none" rows={3} required placeholder="Résumé des activités..." />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Travaux réalisés</label>
                                <textarea value={form.workCompleted} onChange={(e) => setForm({ ...form, workCompleted: e.target.value })} className="input-field min-h-[60px] resize-none" rows={2} placeholder="Détail des travaux..." />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Problèmes / Incidents</label>
                                <textarea value={form.issues} onChange={(e) => setForm({ ...form, issues: e.target.value })} className="input-field min-h-[60px] resize-none" rows={2} placeholder="Problèmes rencontrés..." />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Matériaux utilisés</label>
                                <textarea value={form.materialsUsed} onChange={(e) => setForm({ ...form, materialsUsed: e.target.value })} className="input-field min-h-[60px] resize-none" rows={2} placeholder="Matériaux consommés..." />
                            </div>

                            {/* Photos Capture Section */}
                            {!editingLog && (
                                <div className="space-y-4 pt-2">
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 px-1">Photos du jour</label>

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
                                <button type="button" disabled={saving} onClick={(e) => handleSubmit(e as unknown as React.FormEvent, "BROUILLON")} className="btn-secondary text-sm inline-flex items-center gap-1.5">
                                    <Save className="w-4 h-4" /> Enregistrer brouillon
                                </button>
                                <button type="button" disabled={saving} onClick={(e) => handleSubmit(e as unknown as React.FormEvent, "SOUMIS")} className="btn-primary text-sm">
                                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : <><Send className="w-4 h-4" /> Soumettre</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Preview Modal with Photos */}
            {previewLog && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewLog(null)}>
                    <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-border-dark">
                            <div>
                                <h2 className="text-xl font-bold text-white">{previewLog.project.name}</h2>
                                <p className="text-sm text-slate-400 mt-1">{formatDate(previewLog.date)} · Par {previewLog.author.firstName} {previewLog.author.lastName}</p>
                            </div>
                            <button onClick={() => setPreviewLog(null)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Weather & Temp */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-sm font-medium">
                                    {getWeatherIcon(previewLog.weather)} {WEATHER_OPTIONS.find(o => o.value === previewLog.weather)?.label}
                                </div>
                                {previewLog.temperature && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-medium">
                                        {previewLog.temperature}°C
                                    </div>
                                )}
                                <div className={`px-3 py-1.5 rounded-full text-sm font-medium border ${STATUS_MAP[previewLog.status]?.color} border-current opacity-70`}>
                                    {STATUS_MAP[previewLog.status]?.label}
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Résumé du jour</h3>
                                    <p className="text-slate-200 leading-relaxed">{previewLog.summary}</p>
                                </div>

                                {previewLog.workCompleted && (
                                    <div className="space-y-1">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Travaux réalisés</h3>
                                        <p className="text-slate-300 text-sm">{previewLog.workCompleted}</p>
                                    </div>
                                )}

                                {previewLog.issues && (
                                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5 mb-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5" /> Problèmes & Bloquages
                                        </h3>
                                        <p className="text-red-200/80 text-sm">{previewLog.issues}</p>
                                    </div>
                                )}

                                {previewLog.materialsUsed && (
                                    <div className="space-y-1">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Matériaux utilisés</h3>
                                        <p className="text-slate-300 text-sm">{previewLog.materialsUsed}</p>
                                    </div>
                                )}
                            </div>

                            {/* Photos Section */}
                            <div className="border-t border-border-dark pt-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-white flex items-center gap-2">
                                        <Camera className="w-5 h-5 text-primary" />
                                        Photos & Documents ({previewLog.photos?.length || 0})
                                    </h3>
                                </div>

                                <PhotoCapture
                                    entityId={previewLog.id}
                                    apiPath="/api/daily-logs"
                                    photos={previewLog.photos || []}
                                    onPhotosChange={(photos) => updateLogPhotos(previewLog.id, photos)}
                                    readOnly={previewLog.status === "VALIDE"}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
