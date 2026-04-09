"use client";
import { assetUrl } from "@/lib/assets";
import { 
    Report as SharedReport, 
    ReportStatus, 
    ReportType 
} from "@lynx/types";

import { useState, useEffect, useCallback } from "react";
import {
    FileText, Plus, Search, ChevronDown, CheckCircle2,
    Calendar, Clock, FolderKanban, X, Download, ExternalLink, FileEdit, Loader2, Camera,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import PhotoCapture, { type Photo } from "@/components/ReportPhotoCapture";

interface ProjectRef { id: string; name: string }
interface Report extends Partial<SharedReport> {
    id: string;
    title: string;
    type: ReportType;
    status: ReportStatus;
    content: string | null;
    pdfUrl: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    createdAt: string;
    project: ProjectRef;
    photos: Photo[];
}

const TYPE_MAP: Record<ReportType, { label: string; color: string }> = {
    HEBDOMADAIRE: { label: "Hebdomadaire", color: "text-blue-400 bg-blue-500/10" },
    MENSUEL: { label: "Mensuel", color: "text-purple-400 bg-purple-500/10" },
    INCIDENT: { label: "Incident", color: "text-red-400 bg-red-500/10" },
    AVANCEMENT: { label: "Avancement", color: "text-amber-400 bg-amber-500/10" },
};

const STATUS_MAP: Record<ReportStatus, { label: string; color: string; icon: React.ReactNode }> = {
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

export default function ConducteurReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [projects, setProjects] = useState<ProjectRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [previewReport, setPreviewReport] = useState<Report | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [file, setFile] = useState<File | null>(null);
    const [pendingPhotos, setPendingPhotos] = useState<{ blob: Blob; previewUrl: string; caption: string; coords: { lat: number; lng: number } | null }[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

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

        if (!res.ok) {
            const d = await res.json();
            setError(d.error || "Erreur lors de la création du rapport");
            setSaving(false);
            return;
        }

        const report = await res.json();

        // Upload any pending photos
        if (pendingPhotos.length > 0) {
            for (const p of pendingPhotos) {
                const formData = new FormData();
                formData.append("photo", p.blob, `photo_${Date.now()}.jpg`);
                if (p.caption) formData.append("caption", p.caption);
                if (p.coords) {
                    formData.append("latitude", p.coords.lat.toString());
                    formData.append("longitude", p.coords.lng.toString());
                }
                formData.append("takenAt", new Date().toISOString());

                await fetch(`/api/reports/${report.id}/photos`, {
                    method: "POST",
                    body: formData,
                });
            }
        }

        setShowModal(false);
        setForm(emptyForm);
        setFile(null);
        setPendingPhotos([]);
        fetchReports();
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

    const handleDownloadPdf = async (reportId: string) => {
        try {
            const res = await fetch(`/api/reports/${reportId}/pdf`);
            if (!res.ok) throw new Error("Erreur PDF");
            const pdfData = await res.json();

            const doc = new jsPDF() as any;
            let y = 15;

            // Header
            doc.setFontSize(22);
            doc.setTextColor(15, 23, 42);
            doc.text("LYNX — Rapport", 14, y);
            y += 10;

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Généré le : ${new Date(pdfData.generatedAt).toLocaleString("fr-FR")}`, 14, y);
            y += 5;
            doc.text(`Par : ${pdfData.generatedBy}`, 14, y);
            y += 10;

            doc.setFontSize(16);
            doc.setTextColor(30);
            doc.text(pdfData.title, 14, y);
            y += 8;

            doc.setFontSize(10);
            doc.setTextColor(80);
            doc.text(`Projet : ${pdfData.project.name}`, 14, y); y += 5;
            if (pdfData.project.address) { doc.text(`Adresse : ${pdfData.project.address}`, 14, y); y += 5; }
            if (pdfData.project.supervisor) { doc.text(`Conducteur : ${pdfData.project.supervisor}`, 14, y); y += 5; }
            if (pdfData.project.client) { doc.text(`Client : ${pdfData.project.client}`, 14, y); y += 5; }
            if (pdfData.period.start) {
                doc.text(`Période : ${new Date(pdfData.period.start).toLocaleDateString("fr-FR")} — ${new Date(pdfData.period.end).toLocaleDateString("fr-FR")}`, 14, y);
                y += 5;
            }
            y += 5;

            // Content
            if (pdfData.content) {
                doc.setFontSize(12);
                doc.setTextColor(30);
                doc.text("Contenu", 14, y); y += 6;
                doc.setFontSize(10);
                doc.setTextColor(60);
                const contentLines = doc.splitTextToSize(pdfData.content, 180);
                doc.text(contentLines, 14, y);
                y += contentLines.length * 5 + 5;
            }

            // Photos section
            if (pdfData.photos && pdfData.photos.length > 0) {
                if (y > 230) { doc.addPage(); y = 15; }
                doc.setFontSize(12);
                doc.setTextColor(30);
                doc.text(`Photos (${pdfData.photos.length})`, 14, y);
                y += 8;

                for (const photo of pdfData.photos) {
                    try {
                        const fullUrl = photo.url.startsWith("http") ? photo.url : `${window.location.origin}/lynx${photo.url.startsWith("/") ? "" : "/"}${photo.url}`;
                        const imgRes = await fetch(fullUrl);
                        const blob = await imgRes.blob();
                        const base64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });

                        if (y > 200) { doc.addPage(); y = 15; }
                        doc.addImage(base64, "JPEG", 14, y, 60, 45);
                        if (photo.caption) {
                            doc.setFontSize(8);
                            doc.setTextColor(100);
                            doc.text(photo.caption, 78, y + 5);
                        }
                        if (photo.takenAt) {
                            doc.setFontSize(7);
                            doc.text(new Date(photo.takenAt).toLocaleString("fr-FR"), 78, y + 10);
                        }
                        y += 50;
                    } catch (imgErr) {
                        console.warn("Impossible de charger la photo pour le PDF:", imgErr);
                        doc.setFontSize(8);
                        doc.setTextColor(150);
                        doc.text(`[Photo non disponible: ${photo.caption || photo.url}]`, 14, y);
                        y += 8;
                    }
                }
            }

            // Daily Logs table
            if (pdfData.dailyLogs && pdfData.dailyLogs.length > 0) {
                if (y > 200) { doc.addPage(); y = 15; }
                doc.setFontSize(12);
                doc.setTextColor(30);
                doc.text("Journaux quotidiens", 14, y);
                y += 6;

                autoTable(doc, {
                    startY: y,
                    head: [["Date", "Auteur", "Résumé", "Travaux", "Météo"]],
                    body: pdfData.dailyLogs.map((log: any) => [
                        new Date(log.date).toLocaleDateString("fr-FR"),
                        log.author,
                        log.summary || "—",
                        log.workCompleted || "—",
                        log.weather || "—",
                    ]),
                    theme: "grid",
                    headStyles: { fillColor: [200, 132, 42] },
                    styles: { fontSize: 8 },
                });
            }

            doc.save(`rapport-${pdfData.title.replace(/\s+/g, "_")}.pdf`);
        } catch (e) {
            console.error("PDF generation error:", e);
        }
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

    const formatDate = (d: string | null) => {
        if (!d) return "";
        return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Conducteur de travaux</p>
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
                    <p className="text-slate-400 mb-4">Aucun rapport trouvé</p>
                    <button onClick={() => setShowModal(true)} className="btn-primary text-sm mx-auto"><Plus className="w-4 h-4" /> Créer un rapport</button>
                </div>
            ) : (
                <div className="space-y-3 animate-fade-in stagger-2">
                    {filteredReports.map((r) => {
                        const type = TYPE_MAP[r.type] || TYPE_MAP.HEBDOMADAIRE;
                        const status = STATUS_MAP[r.status] || STATUS_MAP.BROUILLON;
                        return (
                            <div key={r.id} className="card hover:border-primary/20 transition-all">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-white">{r.title}</h3>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                                                <span className="flex items-center gap-1"><FolderKanban className="w-3 h-3" /> {r.project.name}</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(r.createdAt)}</span>
                                                {r.periodStart && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" /> {formatDate(r.periodStart)} → {formatDate(r.periodEnd)}
                                                    </span>
                                                )}
                                                {r.photos.length > 0 && (
                                                    <span className="flex items-center gap-1 text-blue-400">
                                                        <Camera className="w-3 h-3" /> {r.photos.length} photo{r.photos.length !== 1 ? "s" : ""}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`badge ${type.color} border-transparent text-xs`}>{type.label}</span>
                                        <span className={`badge ${status.color} border-transparent text-xs inline-flex items-center gap-1`}>
                                            {status.icon} {status.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Mini photo preview */}
                                {r.photos.length > 0 && (
                                    <div className="flex gap-1.5 mt-3 pt-3 border-t border-border-dark/30 overflow-x-auto">
                                        {r.photos.slice(0, 5).map((p) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img key={p.id} src={assetUrl(p.url)} alt={p.caption || ""} className="w-12 h-12 rounded-lg object-cover border border-border-dark shrink-0" />
                                        ))}
                                        {r.photos.length > 5 && (
                                            <div className="w-12 h-12 rounded-lg bg-slate-800 border border-border-dark flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                                                +{r.photos.length - 5}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-dark/50">
                                    <button
                                        onClick={() => setPreviewReport(r)}
                                        className="text-xs text-slate-400 hover:text-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                                    >
                                        <FileText className="w-3.5 h-3.5" /> Aperçu & Photos
                                    </button>
                                    {r.status === "BROUILLON" && (
                                        <button
                                            onClick={() => handlePublish(r.id)}
                                            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-emerald-500/5 transition-colors"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Publier
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDownloadPdf(r.id)}
                                        className="text-xs text-slate-400 hover:text-blue-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-500/5 transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Télécharger PDF
                                    </button>
                                    {r.pdfUrl && (
                                        <a
                                            href={r.pdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-slate-400 hover:text-blue-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-500/5 transition-colors"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" /> Ouvrir PDF existant
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border-dark">
                            <h2 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Nouveau rapport</h2>
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
                                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Rapport hebdomadaire semaine 12..." className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Type</label>
                                <div className="relative">
                                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field pr-10 appearance-none w-full" title="Type de rapport">
                                        {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Début période</label>
                                    <input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} className="input-field w-full" title="Date de début" placeholder="Date de début" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Fin période</label>
                                    <input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} className="input-field w-full" title="Date de fin" placeholder="Date de fin" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Contenu</label>
                                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} placeholder="Contenu du rapport..." className="input-field w-full resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Fichier PDF (optionnel)</label>
                                <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input-field w-full text-sm" title="Fichier PDF" placeholder="Fichier PDF" />
                            </div>
                            {/* Photos Capture Section */}
                            <div className="pt-2">
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-3 px-1">Photos du rapport</label>

                                <div className="space-y-4">
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
                                                        onClick={() => removePendingPhoto(idx)}
                                                        className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                        title="Supprimer"
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
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 pt-0">
                            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Annuler</button>
                            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Créer le rapport
                            </button>
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
                                <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">{previewReport.content}</pre>
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
                                    <a
                                        href={previewReport.pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-border-dark hover:border-primary/50 text-slate-300 hover:text-primary transition-all group"
                                    >
                                        <FileText className="w-5 h-5 text-red-400" />
                                        <span className="text-sm font-medium">Ouvrir le PDF</span>
                                        <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
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
