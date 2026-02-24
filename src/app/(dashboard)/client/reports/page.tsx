"use client";
import { assetUrl } from "@/lib/assets";

import { useState, useEffect, useCallback } from "react";
import {
    FileText,
    Search,
    Loader2,
    Download,
    Eye,
    X,
    ChevronDown,
    Clock,
    CheckCircle2,
    FileEdit,
    FolderKanban,
    Calendar,
    Image,
    GalleryHorizontal,
    ZoomIn,
} from "lucide-react";

interface Photo {
    id: string;
    url: string;
    caption: string | null;
    createdAt: string;
}

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
    project: { id: string; name: string };
    photos: Photo[];
}

const TYPE_MAP: Record<string, { label: string; color: string }> = {
    HEBDOMADAIRE: { label: "Hebdomadaire", color: "text-blue-400 bg-blue-500/10" },
    MENSUEL: { label: "Mensuel", color: "text-purple-400 bg-purple-500/10" },
    INCIDENT: { label: "Incident", color: "text-red-400 bg-red-500/10" },
    AVANCEMENT: { label: "Avancement", color: "text-amber-400 bg-amber-500/10" },
};

export default function ClientReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("");
    const [preview, setPreview] = useState<Report | null>(null);

    const fetchReports = useCallback(async () => {
        const res = await fetch("/api/reports?clientOnly=true");
        if (res.ok) setReports(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            if (mounted) await fetchReports();
        };
        load();
        return () => { mounted = false; };
    }, [fetchReports]);

    const filtered = reports.filter((r) => {
        const matchSearch = `${r.title} ${r.project.name}`.toLowerCase().includes(search.toLowerCase());
        const matchType = !filterType || r.type === filterType;
        return matchSearch && matchType;
    });

    const formatDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Espace Client</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Rapports</h1>
                <p className="text-sm text-slate-400 mt-1">Rapports publiés par votre conducteur de travaux</p>
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
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un rapport..."
                        className="input-field pl-10"
                    />
                </div>
                <div className="relative">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="input-field pr-10 appearance-none min-w-[160px]"
                        title="Filtrer par type"
                    >
                        <option value="">Tous les types</option>
                        {Object.entries(TYPE_MAP).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="card text-center py-16">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aucun rapport disponible</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 animate-fade-in stagger-2">
                    {filtered.map((r) => {
                        const type = TYPE_MAP[r.type] || TYPE_MAP.HEBDOMADAIRE;
                        return (
                            <div key={r.id} className="card hover:border-primary/30 transition-all group">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{r.title}</h3>
                                            <span className={`badge ${type.color} border-transparent text-[10px] shrink-0`}>{type.label}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                            <FolderKanban className="w-3 h-3" /> {r.project.name}
                                        </p>

                                        {r.photos.length > 0 && (
                                            <div className="flex gap-1.5 mt-3 overflow-hidden rounded-lg">
                                                {r.photos.slice(0, 3).map((p, idx) => (
                                                    <div key={p.id} className="relative aspect-video w-full max-w-[80px] overflow-hidden bg-slate-800">
                                                        <img src={assetUrl(p.url)} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                        {idx === 2 && r.photos.length > 3 && (
                                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white">
                                                                +{r.photos.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 mt-3">
                                            <span className="badge border-transparent text-[10px] text-emerald-400 bg-emerald-500/10 inline-flex items-center gap-1 font-bold italic">
                                                <CheckCircle2 className="w-2.5 h-2.5" /> Publié
                                            </span>
                                            {r.photos.length > 0 && (
                                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                    <Image className="w-2.5 h-2.5" /> {r.photos.length} photo{r.photos.length > 1 ? "s" : ""}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-white/5">
                                            {r.periodStart && (
                                                <p className="text-[10px] text-slate-500 flex items-center gap-1 text-xs">
                                                    <Calendar className="w-3 h-3 text-slate-600" />
                                                    {formatDate(r.periodStart)} → {formatDate(r.periodEnd)}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-slate-600 flex items-center gap-1 text-xs">
                                                <Clock className="w-3 h-3 text-slate-600" /> {formatDate(r.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4 pt-3 border-t border-border-dark/50">
                                    <button
                                        onClick={() => setPreview(r)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                    >
                                        <Eye className="w-3.5 h-3.5" /> Lire
                                    </button>
                                    {r.pdfUrl && (
                                        <a
                                            href={r.pdfUrl}
                                            download
                                            className="flex-1 flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5" /> PDF
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Preview Modal */}
            {preview && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
                    <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border-dark">
                            <div>
                                <h2 className="font-semibold">{preview.title}</h2>
                                <p className="text-xs text-slate-400 mt-0.5">{preview.project.name} · {formatDate(preview.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {preview.pdfUrl && (
                                    <a href={preview.pdfUrl} download className="btn-secondary text-xs py-1.5">
                                        <Download className="w-3.5 h-3.5" /> PDF
                                    </a>
                                )}
                                <button onClick={() => setPreview(null)} className="p-1 text-slate-400 hover:text-white" title="Fermer">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="p-8 space-y-8">
                            {/* Summary / Content */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Compte-rendu détaillé</h3>
                                {preview.content ? (
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 shadow-inner">
                                        <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">
                                            {preview.content}
                                        </pre>
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-sm italic py-4 border-b border-white/5">Aucun contenu textuel pour ce rapport.</p>
                                )}
                            </div>

                            {/* Photos Gallery */}
                            {preview.photos.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Photos jointes ({preview.photos.length})</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {preview.photos.map((photo) => (
                                            <div key={photo.id} className="group relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-white/5 shadow-lg">
                                                <img src={assetUrl(photo.url)} alt={photo.caption || "Photo du rapport"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                {photo.caption && (
                                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                                        <p className="text-[10px] text-white/90 line-clamp-1 italic">{photo.caption}</p>
                                                    </div>
                                                )}
                                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => window.open(assetUrl(photo.url), '_blank')}
                                                        className="p-2 bg-black/60 text-white rounded-xl hover:bg-primary hover:text-navy-900 transition-all"
                                                        title="Agrandir"
                                                    >
                                                        <ZoomIn className="w-3.5 h-3.5" />
                                                    </button>
                                                    <a
                                                        href={assetUrl(photo.url)}
                                                        download={`rapport-${photo.id}.jpg`}
                                                        className="p-2 bg-black/60 text-white rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                                                        title="Télécharger"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Period Info */}
                            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Période concernée</p>
                                    <p className="text-sm text-slate-300">
                                        {preview.periodStart ? (
                                            `${formatDate(preview.periodStart)} → ${formatDate(preview.periodEnd)}`
                                        ) : "Non spécifiée"}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="badge border-transparent text-[10px] text-emerald-400 bg-emerald-500/10 font-bold italic px-3 py-1">
                                        Rapport validé et publié
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
