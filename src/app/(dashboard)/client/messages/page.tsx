"use client";

import { useState, useEffect, useCallback } from "react";
import {
    MessageSquare,
    Plus,
    Loader2,
    Send,
    X,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
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

interface Project {
    id: string;
    name: string;
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
    HAUTE: { label: "Haute", color: "text-amber-400" },
    URGENTE: { label: "Urgente", color: "text-red-400" },
};

export default function ClientMessagesPage() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        subject: "",
        message: "",
        projectId: "",
        priority: "NORMALE",
    });

    const fetchData = useCallback(async () => {
        const [fRes, pRes] = await Promise.all([
            fetch("/api/feedbacks"),
            fetch("/api/projects?clientOnly=true"),
        ]);
        if (fRes.ok) setFeedbacks(await fRes.json());
        if (pRes.ok) setProjects(await pRes.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubmit = async () => {
        if (!form.subject.trim() || !form.message.trim() || !form.projectId) {
            setError("Sujet, message et projet requis");
            return;
        }
        setSubmitting(true);
        const res = await fetch("/api/feedbacks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        setSubmitting(false);
        if (res.ok) {
            setShowModal(false);
            setForm({ subject: "", message: "", projectId: "", priority: "NORMALE" });
            fetchData();
        } else {
            setError("Erreur lors de l'envoi");
        }
    };

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

    const handleStatusChange = (id: string, status: string) => {
        setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Espace Client</p>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Mes Demandes</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {feedbacks.length} demande{feedbacks.length !== 1 ? "s" : ""} envoyée{feedbacks.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <button onClick={() => { setShowModal(true); setError(""); }} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Nouvelle demande
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in stagger-1">
                {Object.entries(STATUS_MAP).map(([status, meta]) => {
                    const count = feedbacks.filter((f) => f.status === status).length;
                    return (
                        <div key={status} className="card !py-3 text-center">
                            <p className={`text-xl font-bold ${meta.color.split(" ")[0]}`}>{count}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{meta.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : feedbacks.length === 0 ? (
                <div className="card text-center py-16">
                    <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 mb-4">Aucune demande envoyée</p>
                    <button onClick={() => setShowModal(true)} className="btn-primary text-sm mx-auto">
                        <Plus className="w-4 h-4" /> Envoyer une demande
                    </button>
                </div>
            ) : (
                <div className="space-y-3 animate-fade-in stagger-2">
                    {feedbacks.map((f) => {
                        const st = STATUS_MAP[f.status] || STATUS_MAP.EN_ATTENTE;
                        const pr = PRIORITY_MAP[f.priority] || PRIORITY_MAP.NORMALE;
                        return (
                            <div key={f.id} className="card hover:border-primary/20 transition-all cursor-pointer" onClick={() => setSelectedFeedback(f)}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                                            <MessageSquare className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold truncate">{f.subject}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">{f.project.name}</p>
                                            <p className="text-sm text-slate-400 mt-2 line-clamp-2">{f.message}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <span className={`badge ${st.color} border-transparent text-xs flex items-center gap-1`}>
                                            {st.icon} {st.label}
                                        </span>
                                        <span className={`text-xs font-medium ${pr.color}`}>{pr.label}</span>
                                        <span className="text-[10px] text-slate-600">{formatDate(f.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-[#0d1626] border border-white/10 rounded-[2rem] w-full max-w-lg animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Send className="w-5 h-5 text-primary" /> Nouvelle demande
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 px-1">Projet concérne *</label>
                                <div className="relative">
                                    <select
                                        value={form.projectId}
                                        onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                                        className="input-field pr-10 appearance-none w-full"
                                        title="Sélectionner un projet"
                                    >
                                        <option value="">Sélectionner un projet</option>
                                        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 px-1">Sujet de la demande *</label>
                                <input
                                    type="text"
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                    placeholder="Ex: Demande de modification du plan..."
                                    className="input-field w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 px-1">Niveau d'urgence</label>
                                <div className="relative">
                                    <select
                                        value={form.priority}
                                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                        className="input-field pr-10 appearance-none w-full"
                                        title="Priorité"
                                    >
                                        {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 px-1">Message détaillé *</label>
                                <textarea
                                    value={form.message}
                                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                                    rows={5}
                                    placeholder="Décrivez votre demande en détail..."
                                    className="input-field w-full resize-none min-h-[120px]"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 pt-0">
                            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-4">Annuler</button>
                            <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 py-4">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Envoyer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal with Chat */}
            {selectedFeedback && (
                <FeedbackDetailModal
                    feedback={selectedFeedback}
                    onClose={() => setSelectedFeedback(null)}
                    onStatusChange={handleStatusChange}
                    role="CLIENT"
                />
            )}
        </div>
    );
}
