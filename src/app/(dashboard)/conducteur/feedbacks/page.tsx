"use client";

import { useState, useEffect, useCallback } from "react";
import {
    MessageSquare, Loader2, Search, ChevronDown, Clock, CheckCircle2,
    AlertCircle, X, ArrowRight, User, FolderKanban,
} from "lucide-react";
import FeedbackDetailModal from "@/components/FeedbackDetailModal";

interface Feedback {
    id: string;
    subject: string;
    message: string;
    status: string;
    priority: string;
    createdAt: string;
    project: { id: string; name: string };
    author: { id: string; firstName: string; lastName: string } | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    EN_ATTENTE: { label: "En attente", color: "text-amber-400 bg-amber-500/10", icon: <Clock className="w-3 h-3" /> },
    EN_COURS: { label: "En traitement", color: "text-blue-400 bg-blue-500/10", icon: <AlertCircle className="w-3 h-3" /> },
    RESOLU: { label: "Résolu", color: "text-emerald-400 bg-emerald-500/10", icon: <CheckCircle2 className="w-3 h-3" /> },
    FERME: { label: "Fermé", color: "text-slate-400 bg-slate-500/10", icon: <X className="w-3 h-3" /> },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
    BASSE: { label: "Basse", color: "text-slate-400" },
    NORMALE: { label: "Normale", color: "text-blue-400" },
    HAUTE: { label: "Haute", color: "text-orange-400" },
    URGENTE: { label: "Urgente", color: "text-red-400" },
};

export default function ConducteurFeedbacksPage() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

    const fetchFeedbacks = useCallback(async () => {
        const res = await fetch("/api/feedbacks");
        if (res.ok) setFeedbacks(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

    const handleStatusChange = async (id: string, status: string) => {
        setUpdatingId(id);
        await fetch(`/api/feedbacks/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        await fetchFeedbacks();
        setUpdatingId(null);
    };

    const filteredFeedbacks = feedbacks.filter((f) => {
        const matchSearch = `${f.subject} ${f.author?.firstName || ""} ${f.project.name}`.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !filterStatus || f.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const pending = feedbacks.filter((f) => f.status === "EN_ATTENTE").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Conducteur de travaux</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Demandes Clients</h1>
                <p className="text-sm text-slate-400 mt-1">
                    {feedbacks.length} demande{feedbacks.length !== 1 ? "s" : ""} reçue{feedbacks.length !== 1 ? "s" : ""}
                    {pending > 0 && <span className="text-amber-400 ml-2">⚠ {pending} en attente</span>}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in stagger-1">
                {Object.entries(STATUS_MAP).map(([status, meta]) => {
                    const count = feedbacks.filter((f) => f.status === status).length;
                    return (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(filterStatus === status ? "" : status)}
                            className={`card !py-3 text-center transition-all ${filterStatus === status ? "border-primary/40" : ""}`}
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
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field pr-10 appearance-none min-w-[160px]" title="Filtrer par statut">
                        <option value="">Tous statuts</option>
                        {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : filteredFeedbacks.length === 0 ? (
                <div className="card text-center py-16">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400/30 mx-auto mb-3" />
                    <p className="text-slate-400">Aucune demande trouvée</p>
                </div>
            ) : (
                <div className="space-y-3 animate-fade-in stagger-2">
                    {filteredFeedbacks.map((f) => {
                        const st = STATUS_MAP[f.status] || STATUS_MAP.EN_ATTENTE;
                        const pr = PRIORITY_MAP[f.priority] || PRIORITY_MAP.NORMALE;
                        return (
                            <div
                                key={f.id}
                                className={`card hover:border-primary/20 transition-all cursor-pointer ${f.status === "EN_ATTENTE" ? "border-amber-500/20" : ""} ${updatingId === f.id ? "opacity-60" : ""}`}
                                onClick={() => setSelectedFeedback(f)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${f.status === "EN_ATTENTE" ? "bg-amber-500/10 text-amber-400" : "bg-primary/10 text-primary"}`}>
                                            <MessageSquare className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-semibold truncate">{f.subject}</h3>
                                                <span className={`text-[10px] font-semibold ${pr.color}`}>● {pr.label}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {f.author ? `${f.author.firstName} ${f.author.lastName}` : "Anonyme"}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <FolderKanban className="w-3 h-3" />
                                                    {f.project.name}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(f.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-400 line-clamp-2">{f.message}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={f.status}
                                                onChange={(e) => handleStatusChange(f.id, e.target.value)}
                                                className={`badge ${st.color} border-transparent text-xs pr-6 appearance-none cursor-pointer`}
                                                title="Changer le statut"
                                            >
                                                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-600" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal */}
            {selectedFeedback && (
                <FeedbackDetailModal
                    feedback={selectedFeedback}
                    onClose={() => setSelectedFeedback(null)}
                    onStatusChange={handleStatusChange}
                    role="CONDUCTEUR"
                />
            )}
        </div>
    );
}
