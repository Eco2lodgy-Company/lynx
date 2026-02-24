"use client";
import { assetUrl } from "@/lib/assets";

import { useState, useEffect, useCallback } from "react";
import {
    Image,
    Search,
    Loader2,
    X,
    ChevronDown,
    MapPin,
    Calendar,
    ZoomIn,
    Download,
} from "lucide-react";

interface Photo {
    id: string;
    url: string;
    caption: string | null;
    latitude: number | null;
    longitude: number | null;
    takenAt: string | null;
    createdAt: string;
    project: { id: string; name: string };
    source: "REPORT" | "MESSAGE";
}

export default function ClientGalleryPage() {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterProject, setFilterProject] = useState("");
    const [lightbox, setLightbox] = useState<Photo | null>(null);

    const fetchPhotos = useCallback(async () => {
        const res = await fetch("/api/photos");
        if (res.ok) setPhotos(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            if (mounted) await fetchPhotos();
        };
        load();
        return () => { mounted = false; };
    }, [fetchPhotos]);

    const projects = Array.from(new Set(photos.map((p) => p.project.name)));

    const filtered = photos.filter((p) => {
        const matchSearch = `${p.caption || ""} ${p.project.name}`.toLowerCase().includes(search.toLowerCase());
        const matchProject = !filterProject || p.project.name === filterProject;
        return matchSearch && matchProject;
    });

    const formatDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Espace Client</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Galerie Photos</h1>
                <p className="text-sm text-slate-400 mt-1">{photos.length} photo{photos.length !== 1 ? "s" : ""} de chantier</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in stagger-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher une photo..."
                        className="input-field pl-10"
                    />
                </div>
                {projects.length > 1 && (
                    <div className="relative">
                        <select
                            value={filterProject}
                            onChange={(e) => setFilterProject(e.target.value)}
                            className="input-field pr-10 appearance-none min-w-[180px]"
                            title="Filtrer par projet"
                        >
                            <option value="">Tous les projets</option>
                            {projects.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="card text-center py-16">
                    <Image className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aucune photo disponible</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 animate-fade-in stagger-2">
                    {filtered.map((photo) => (
                        <button
                            key={photo.id}
                            onClick={() => setLightbox(photo)}
                            className="group relative aspect-square rounded-xl overflow-hidden bg-slate-800 border border-border-dark hover:border-primary/40 transition-all"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={assetUrl(photo.url)}
                                alt={photo.caption || "Photo de chantier"}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                <ZoomIn className="w-5 h-5 text-white mx-auto mb-1 opacity-80" />
                                {photo.caption && (
                                    <p className="text-[10px] text-white/90 text-center line-clamp-2">{photo.caption}</p>
                                )}
                            </div>
                            {/* Project badge */}
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                                <span className="text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm w-fit">
                                    {photo.project.name}
                                </span>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full backdrop-blur-sm w-fit font-bold uppercase tracking-tighter ${photo.source === "REPORT" ? "bg-blue-500/60 text-white" : "bg-purple-500/60 text-white"}`}>
                                    {photo.source === "REPORT" ? "Rapport" : "Message"}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            {lightbox && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setLightbox(null)}
                >
                    <div className="relative max-w-4xl w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setLightbox(null)}
                            className="absolute -top-10 right-0 p-2 text-white/70 hover:text-white transition-colors"
                            title="Fermer"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={assetUrl(lightbox.url)}
                            alt={lightbox.caption || "Photo de chantier"}
                            className="w-full max-h-[75vh] object-contain rounded-xl"
                        />
                        <div className="mt-3 flex items-start justify-between">
                            <div>
                                {lightbox.caption && (
                                    <p className="text-white font-medium">{lightbox.caption}</p>
                                )}
                                <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                                    <Image className="w-3.5 h-3.5" /> {lightbox.project.name}
                                </p>
                            </div>
                            <div className="text-right text-xs text-slate-500 space-y-1">
                                <p className="flex items-center gap-1 justify-end">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(lightbox.takenAt || lightbox.createdAt)}
                                </p>
                                {lightbox.latitude && lightbox.longitude && (
                                    <p className="flex items-center gap-1 justify-end">
                                        <MapPin className="w-3 h-3" />
                                        {lightbox.latitude.toFixed(4)}, {lightbox.longitude.toFixed(4)}
                                    </p>
                                )}
                                <div className="pt-2">
                                    <a
                                        href={assetUrl(lightbox.url)}
                                        download={`lynx-${lightbox.id}.jpg`}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary hover:text-navy-900 transition-all text-xs font-bold"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Download className="w-3 h-3" />
                                        Télécharger
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
