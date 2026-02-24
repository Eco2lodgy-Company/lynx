"use client";

import { useState, useEffect, useCallback } from "react";
import {
    FileText, Plus, Search, Download, Trash2, Eye,
    ChevronDown, CheckCircle2, Clock, FolderKanban, X, Loader2, ExternalLink, FileEdit, Camera,
} from "lucide-react";
import PhotoCapture, { type Photo } from "@/components/ReportPhotoCapture";

interface ProjectRef { id: string; name: string }
interface Report {
    id: string;
    title: string;
    type: string;
    status: string;
    content: string | null;
    pdfUrl: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    createdAt: string;
    project: ProjectRef;
    photos: Photo[];
}

const TYPE_MAP: Record<string, { label: string; color: string }> = {
    HEBDOMADAIRE: { label: "Hebdomadaire", color: "text-blue-400 bg-blue-500/10" },
    MENSUEL: { label: "Mensuel", color: "text-purple-400 bg-purple-500/10" },
    INCIDENT: { label: "Incident", color: "text-red-400 bg-red-500/10" },
    AVANCEMENT: { label: "Avancement", color: "text-amber-400 bg-amber-500/10" },
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    BROUILLON: { label: "Brouillon", color: "text-slate-400 bg-slate-500/10", icon: <FileEdit className="w-3 h-3" /> },
    PUBLIE: { label: "Publié", color: "text-emerald-400 bg-emerald-500/10", icon: <CheckCircle2 className="w-3 h-3" /> },
};

const emptyForm = {
    title: "",
    type: "HEBDOMADAIRE",
    projectId: "",
    content: "",
    periodStart: "",
    periodEnd: "",
};

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [projects, setProjects] = useState<ProjectRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [previewReport, setPreviewReport] = useState<Report | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const fetchReports = useCallback(async () => {
        const res = await fetch("/api/reports");
        if (res.ok) setReports(await res.json());
        setLoading(false);
    }, []);

    const fetchProjects = useCallback(async () => {
        const res = await fetch("/api/projects");
        if (res.ok) setProjects(await res.json());
    }, []);

    useEffect(() => { fetchReports(); fetchProjects(); }, [fetchReports, fetchProjects]);

    const handleSubmit = async () => {
        if (!form.title.trim() || !form.projectId) { setError("Titre et projet requis"); return; }
        setSaving(true); setError("");

        let pdfUrl = null;
        if (file) {
            const formData = new FormData();
            formData.append("file", file);
            try {
                const upRes = await fetch("/api/upload", { method: "POST", body: formData });
                if (!upRes.ok) throw new Error("Erreur upload");
                const { url } = await upRes.json();
                pdfUrl = url;
            } catch {
                setError("Erreur lors de l'upload du fichier");
                setSaving(false);
                return;
            }
        }

        const res = await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, pdfUrl }),
        });

        if (!res.ok) { const d = await res.json(); setError(d.error || "Erreur"); }
        else {
            setShowModal(false);
            setForm(emptyForm);
            setFile(null);
            fetchReports();
        }
        setSaving(false);
    };

    const handlePublish = async (id: string) => {
        await fetch(`/api/reports/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "PUBLIE" }),
        });
        fetchReports();
    };

    const handleDelete = async (id: string) => {
        await fetch(`/api/reports/${id}`, { method: "DELETE" });
        setDeleteConfirm(null);
        fetchReports();
    };

    const updateReportPhotos = (reportId: string, photos: Photo[]) => {
        setReports((prev) =>
            prev.map((r) => (r.id === reportId ? { ...r, photos } : r))
        );
        if (previewReport && previewReport.id === reportId) {
            setPreviewReport({ ...previewReport, photos });
        }
    };

    const filteredReports = reports.filter((r) => {
        const matchSearch = `${r.title} ${r.project.name}`.toLowerCase().includes(search.toLowerCase());
        const matchType = !filterType || r.type === filterType;
        const matchStatus = !filterStatus || r.status === filterStatus;
        return matchSearch && matchType && matchStatus;
    });

    const formatDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Administration</p>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Rapports</h1>
                    <p className="text-sm text-slate-400 mt-1">{reports.length} rapport{reports.length !== 1 ? "s" : ""}</p>
                </div>
                <button onClick={() => { setForm(emptyForm); setFile(null); setError(""); setShowModal(true); }} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Nouveau rapport
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in stagger-1">
                {Object.entries(TYPE_MAP).map(([type, meta]) => {
                    const count = reports.filter((r) => r.type === type).length;
                    return (
                        <button
                            key={type}
                            onClick={() => setFilterType(filterType === type ? "" : type)}
                            className={`card !py-3 text-center transition-all ${filterType === type ? "border-primary/40" : ""}`}
                        >
                            <p className={`text-xl font-bold ${meta.color.split(" ")[0]}`}>{count}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{meta.label}</p>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in stagger-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="input-field pl-10" />
                </div>
                <div className="relative">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field pr-10 appearance-none min-w-[150px]" title="Filtrer par statut">
                        <option value="">Tous statuts</option>
                        {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : filteredReports.length === 0 ? (
                <div className="card text-center py-16">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aucun rapport trouvé</p>
                </div>
            ) : (
                <div className="card !p-0 overflow-hidden animate-fade-in stagger-2">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border-dark text-left">
                                <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Rapport</th>
                                <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider hidden sm:table-cell">Projet</th>
                                <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">Photos</th>
                                <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Statut</th>
                                <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map((r) => {
                                const type = TYPE_MAP[r.type] || TYPE_MAP.HEBDOMADAIRE;
                                const status = STATUS_MAP[r.status] || STATUS_MAP.BROUILLON;
                                return (
                                    <tr key={r.id} className="border-b border-border-dark/50 hover:bg-surface-dark-hover transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{r.title}</p>
                                                    <p className="text-xs text-slate-500">{formatDate(r.createdAt)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">
                                            <span className="flex items-center gap-1"><FolderKanban className="w-3 h-3" /> {r.project.name}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`badge ${type.color} border-transparent text-xs`}>{type.label}</span>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            {r.photos.length > 0 ? (
                                                <span className="flex items-center gap-1 text-xs text-blue-400">
                                                    <Camera className="w-3 h-3" /> {r.photos.length} photo{r.photos.length !== 1 ? "s" : ""}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`badge ${status.color} border-transparent text-xs inline-flex items-center gap-1`}>
                                                {status.icon} {status.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => setPreviewReport(r)} className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg transition-colors" title="Aperçu">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {r.status === "BROUILLON" && (
                                                    <button onClick={() => handlePublish(r.id)} className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors" title="Publier">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {r.pdfUrl && (
                                                    <a href={r.pdfUrl} download className="p-1.5 text-slate-400 hover:text-primary rounded-lg transition-colors" title="Télécharger PDF">
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                )}
                                                {deleteConfirm === r.id ? (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleDelete(r.id)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">Oui</button>
                                                        <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs bg-slate-500/20 text-slate-400 rounded">Non</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setDeleteConfirm(r.id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors" title="Supprimer">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border-dark">
                            <h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Nouveau rapport</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white" title="Fermer"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-lg p-3">{error}</p>}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Titre *</label>
                                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Ex: Rapport hebdomadaire semaine 12" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Type</label>
                                    <div className="relative">
                                        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field appearance-none" title="Type de rapport">
                                            {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Projet *</label>
                                    <div className="relative">
                                        <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="input-field appearance-none" title="Projet">
                                            <option value="">Sélectionner...</option>
                                            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Début de période</label>
                                    <input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} className="input-field" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Fin de période</label>
                                    <input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} className="input-field" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Contenu</label>
                                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input-field resize-none" rows={5} placeholder="Résumé des activités, observations, recommandations..." />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">PDF joint (optionnel)</label>
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                    className="input-field"
                                    title="Date de début"
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 italic flex items-center gap-1">
                                <Camera className="w-3 h-3" /> Vous pourrez ajouter des photos géolocalisées après la création du rapport.
                            </p>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowModal(false)} className="btn-secondary text-sm">Annuler</button>
                                <button onClick={handleSubmit} disabled={saving} className="btn-primary text-sm">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer le rapport"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal with Photos */}
            {previewReport && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewReport(null)}>
                    <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border-dark">
                            <div>
                                <h2 className="font-semibold">{previewReport.title}</h2>
                                <p className="text-xs text-slate-400 mt-0.5">{previewReport.project.name} · {formatDate(previewReport.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {previewReport.status === "BROUILLON" && (
                                    <button onClick={() => { handlePublish(previewReport.id); setPreviewReport(null); }} className="btn-primary text-xs py-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Publier
                                    </button>
                                )}
                                <button onClick={() => setPreviewReport(null)} className="p-1 text-slate-400 hover:text-white" title="Fermer"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="p-5 space-y-5">
                            {/* Badges */}
                            <div className="flex flex-wrap gap-2">
                                <span className={`badge ${TYPE_MAP[previewReport.type]?.color || ""} border-transparent text-xs`}>{TYPE_MAP[previewReport.type]?.label}</span>
                                <span className={`badge ${STATUS_MAP[previewReport.status]?.color || ""} border-transparent text-xs`}>{STATUS_MAP[previewReport.status]?.label}</span>
                                {previewReport.periodStart && (
                                    <span className="badge border-transparent text-xs text-slate-400 bg-slate-500/10 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {formatDate(previewReport.periodStart)} → {formatDate(previewReport.periodEnd)}
                                    </span>
                                )}
                            </div>

                            {/* Content */}
                            {previewReport.content ? (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">{previewReport.content}</pre>
                                </div>
                            ) : (
                                <p className="text-slate-400 text-sm italic">Aucun contenu</p>
                            )}

                            {/* Photos Section */}
                            <div className="border-t border-border-dark/50 pt-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                    <Camera className="w-3.5 h-3.5" />
                                    Photos du rapport ({previewReport.photos?.length || 0})
                                </h3>
                                <PhotoCapture
                                    entityId={previewReport.id}
                                    apiPath="/api/reports"
                                    photos={previewReport.photos || []}
                                    onPhotosChange={(photos) => updateReportPhotos(previewReport.id, photos)}
                                />
                            </div>

                            {/* PDF */}
                            {previewReport.pdfUrl && (
                                <div className="border-t border-border-dark/50 pt-4">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pièce jointe</p>
                                    <a
                                        href={previewReport.pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-border-dark hover:border-primary/50 text-slate-300 hover:text-primary transition-all group w-full sm:w-auto"
                                    >
                                        <div className="p-2 rounded bg-slate-900 text-red-400 group-hover:text-red-500 transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-sm font-medium">Document PDF</p>
                                            <p className="text-[10px] text-slate-500 group-hover:text-primary/70">Cliquer pour ouvrir</p>
                                        </div>
                                        <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
