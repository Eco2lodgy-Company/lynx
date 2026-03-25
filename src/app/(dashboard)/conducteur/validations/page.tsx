"use client";

import { useState, useEffect, useCallback } from "react";
import {
    CheckSquare,
    ClipboardList,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    MessageSquare,
    Send,
    Loader2,
    Clock,
    Sun,
    Cloud,
    CloudRain,
    Wind,
    Snowflake,
    ChevronDown,
    MapPin,
    AlertOctagon,
    AlertCircle,
    Info,
    X,
} from "lucide-react";

interface ProjectRef { id: string; name: string; }
interface AuthorRef { id: string; firstName: string; lastName: string; }
interface CommentRef { id: string; content: string; author: AuthorRef; createdAt: string; }

interface DailyLog {
    id: string;
    date: string;
    weather: string | null;
    temperature: number | null;
    summary: string;
    workCompleted: string | null;
    issues: string | null;
    materials: string | null;
    status: string;
    rejectionNote: string | null;
    author: AuthorRef;
    project: ProjectRef;
    comments: CommentRef[];
}

interface Incident {
    id: string;
    title: string;
    description: string | null;
    severity: string;
    status: string;
    location: string | null;
    date: string;
    reporter: AuthorRef;
    project: ProjectRef;
    comments: CommentRef[];
}

const WEATHER_ICONS: Record<string, React.ReactNode> = {
    ENSOLEILLE: <Sun className="w-4 h-4 text-amber-400" />,
    NUAGEUX: <Cloud className="w-4 h-4 text-slate-400" />,
    PLUVIEUX: <CloudRain className="w-4 h-4 text-blue-400" />,
    VENTEUX: <Wind className="w-4 h-4 text-cyan-400" />,
    NEIGEUX: <Snowflake className="w-4 h-4 text-blue-200" />,
};

const SEVERITY_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    FAIBLE: { label: "Faible", color: "text-blue-400 bg-blue-500/10", icon: <Info className="w-3 h-3" /> },
    MOYENNE: { label: "Moyenne", color: "text-amber-400 bg-amber-500/10", icon: <AlertCircle className="w-3 h-3" /> },
    HAUTE: { label: "Haute", color: "text-orange-400 bg-orange-500/10", icon: <AlertTriangle className="w-3 h-3" /> },
    CRITIQUE: { label: "Critique", color: "text-red-400 bg-red-500/10", icon: <AlertOctagon className="w-3 h-3" /> },
};

type Tab = "logs" | "incidents";

export default function ValidationsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("logs");
    const [logs, setLogs] = useState<DailyLog[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Comment modal
    const [commentModal, setCommentModal] = useState<{ id: string; type: "log" | "incident"; title: string } | null>(null);
    const [commentText, setCommentText] = useState("");
    const [rejectNote, setRejectNote] = useState("");
    const [rejectModal, setRejectModal] = useState<string | null>(null);
    const [sendingComment, setSendingComment] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [logsRes, incRes] = await Promise.all([
            fetch("/api/validations?type=logs"),
            fetch("/api/validations?type=incidents"),
        ]);
        if (logsRes.ok) setLogs(await logsRes.json());
        if (incRes.ok) setIncidents(await incRes.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleValidateLog = async (id: string, status: "VALIDE" | "REJETE", rejectionNote?: string) => {
        setActionLoading(id);
        await fetch(`/api/daily-logs/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, ...(rejectionNote ? { rejectionNote } : {}) }),
        });
        setRejectModal(null);
        setRejectNote("");
        await fetchData();
        setActionLoading(null);
    };

    const handleUpdateIncident = async (id: string, status: string) => {
        setActionLoading(id);
        await fetch(`/api/incidents/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        await fetchData();
        setActionLoading(null);
    };

    const handleSendComment = async () => {
        if (!commentModal || !commentText.trim()) return;
        setSendingComment(true);
        await fetch("/api/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content: commentText,
                ...(commentModal.type === "log" ? { dailyLogId: commentModal.id } : { incidentId: commentModal.id }),
            }),
        });
        setCommentText("");
        setCommentModal(null);
        setSendingComment(false);
        fetchData();
    };

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

    const formatDateTime = (d: string) =>
        new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Conducteur de travaux</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Validations</h1>
                <p className="text-sm text-slate-400 mt-1">
                    {logs.length} journal{logs.length !== 1 ? "x" : ""} en attente · {incidents.length} incident{incidents.length !== 1 ? "s" : ""} actif{incidents.length !== 1 ? "s" : ""}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-surface-dark rounded-xl border border-border-dark w-fit animate-fade-in stagger-1">
                <button
                    onClick={() => setActiveTab("logs")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "logs" ? "bg-primary/20 text-primary" : "text-slate-400 hover:text-white"}`}
                >
                    <ClipboardList className="w-4 h-4" /> Journaux
                    {logs.length > 0 && <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{logs.length}</span>}
                </button>
                <button
                    onClick={() => setActiveTab("incidents")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "incidents" ? "bg-primary/20 text-primary" : "text-slate-400 hover:text-white"}`}
                >
                    <AlertTriangle className="w-4 h-4" /> Incidents
                    {incidents.length > 0 && <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{incidents.length}</span>}
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : activeTab === "logs" ? (
                /* ─── LOGS TAB ─── */
                logs.length === 0 ? (
                    <div className="card text-center py-16">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400/30 mx-auto mb-3" />
                        <p className="text-slate-400">Aucun journal en attente de validation</p>
                    </div>
                ) : (
                    <div className="space-y-4 animate-fade-in">
                        {logs.map((log) => (
                            <div key={log.id} className="card border-blue-500/20 hover:border-blue-500/40 transition-all">
                                {/* Log Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="text-amber-400">{WEATHER_ICONS[log.weather || ""] || <Sun className="w-4 h-4" />}</div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">{log.project.name}</h3>
                                                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> En attente
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Par {log.author.firstName} {log.author.lastName} · {formatDate(log.date)}
                                                {log.temperature && ` · ${log.temperature}°C`}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => setCommentModal({ id: log.id, type: "log", title: `${log.project.name} — ${formatDate(log.date)}` })}
                                            className="p-2 text-slate-400 hover:text-blue-400 rounded-lg transition-colors"
                                            title="Commenter"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setRejectModal(log.id)}
                                            disabled={actionLoading === log.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                                        >
                                            <XCircle className="w-3.5 h-3.5" /> Rejeter
                                        </button>
                                        <button
                                            onClick={() => handleValidateLog(log.id, "VALIDE")}
                                            disabled={actionLoading === log.id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                                        >
                                            {actionLoading === log.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                            Valider
                                        </button>
                                    </div>
                                </div>

                                {/* Log Content */}
                                <div className="space-y-2 ml-7">
                                    <p className="text-sm text-slate-300">{log.summary}</p>
                                    {log.workCompleted && (
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 mb-0.5">Travaux réalisés</p>
                                            <p className="text-xs text-slate-400">{log.workCompleted}</p>
                                        </div>
                                    )}
                                    {log.issues && (
                                        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2">
                                            <p className="text-xs font-medium text-red-400 mb-0.5 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Problèmes signalés
                                            </p>
                                            <p className="text-xs text-red-300/70">{log.issues}</p>
                                        </div>
                                    )}
                                    {log.materials && (
                                        <p className="text-xs text-slate-500">Matériaux : {log.materials}</p>
                                    )}
                                </div>

                                {/* Comments */}
                                {log.comments.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-border-dark/50 ml-7 space-y-2">
                                        {log.comments.map((c) => (
                                            <div key={c.id} className="flex gap-2">
                                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                                    <span className="text-[8px] font-bold text-primary">{c.author.firstName[0]}{c.author.lastName[0]}</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500">{c.author.firstName} {c.author.lastName} · {formatDateTime(c.createdAt)}</p>
                                                    <p className="text-xs text-slate-300">{c.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            ) : (
                /* ─── INCIDENTS TAB ─── */
                incidents.length === 0 ? (
                    <div className="card text-center py-16">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400/30 mx-auto mb-3" />
                        <p className="text-slate-400">Aucun incident actif</p>
                    </div>
                ) : (
                    <div className="space-y-4 animate-fade-in">
                        {incidents.map((inc) => {
                            const sev = SEVERITY_MAP[inc.severity] || SEVERITY_MAP.MOYENNE;
                            return (
                                <div key={inc.id} className={`card transition-all ${inc.severity === "CRITIQUE" ? "border-red-500/30" : "border-orange-500/20 hover:border-orange-500/40"}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${sev.color}`}>{sev.icon}</div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{inc.title}</h3>
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sev.color}`}>{sev.label}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                                    <span>{inc.project.name}</span>
                                                    <span>Par {inc.reporter.firstName} {inc.reporter.lastName}</span>
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(inc.date)}</span>
                                                    {inc.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{inc.location}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => setCommentModal({ id: inc.id, type: "incident", title: inc.title })}
                                                className="p-2 text-slate-400 hover:text-blue-400 rounded-lg transition-colors"
                                                title="Commenter"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                            </button>
                                            <div className="relative">
                                                <select
                                                    value={inc.status}
                                                    onChange={(e) => handleUpdateIncident(inc.id, e.target.value)}
                                                    disabled={actionLoading === inc.id}
                                                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-surface-dark border border-border-dark text-slate-300 appearance-none pr-7 cursor-pointer hover:border-primary/30 transition-colors"
                                                    title="Changer le statut"
                                                >
                                                    <option value="OUVERT">Ouvert</option>
                                                    <option value="EN_COURS">En cours</option>
                                                    <option value="RESOLU">Résolu</option>
                                                    <option value="FERME">Fermé</option>
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    {inc.description && <p className="text-sm text-slate-300 ml-11 mb-2">{inc.description}</p>}

                                    {/* Comments */}
                                    {inc.comments.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-border-dark/50 ml-11 space-y-2">
                                            {inc.comments.map((c) => (
                                                <div key={c.id} className="flex gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                                        <span className="text-[8px] font-bold text-primary">{c.author.firstName[0]}{c.author.lastName[0]}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-500">{c.author.firstName} {c.author.lastName} · {formatDateTime(c.createdAt)}</p>
                                                        <p className="text-xs text-slate-300">{c.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* Comment Modal */}
            {commentModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setCommentModal(null)}>
                    <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-lg animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-border-dark">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-blue-400" />
                                <h2 className="text-sm font-semibold">{commentModal.title}</h2>
                            </div>
                            <button onClick={() => setCommentModal(null)} className="p-1 text-slate-400 hover:text-white" title="Fermer"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4 space-y-3">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Votre commentaire actionnable..."
                                className="input-field min-h-[100px] resize-none text-sm"
                                rows={4}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setCommentModal(null)} className="btn-secondary text-sm">Annuler</button>
                                <button onClick={handleSendComment} disabled={!commentText.trim() || sendingComment} className="btn-primary text-sm">
                                    {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Envoyer</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setRejectModal(null)}>
                    <div className="bg-surface-dark border border-red-500/30 rounded-2xl w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-border-dark">
                            <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-400" />
                                <h2 className="text-sm font-semibold">Motif de rejet</h2>
                            </div>
                            <button onClick={() => setRejectModal(null)} className="p-1 text-slate-400 hover:text-white" title="Fermer"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4 space-y-3">
                            <textarea
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                placeholder="Expliquez pourquoi ce journal est rejeté..."
                                className="input-field min-h-[80px] resize-none text-sm border-red-500/20"
                                rows={3}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setRejectModal(null)} className="btn-secondary text-sm">Annuler</button>
                                <button
                                    onClick={() => handleValidateLog(rejectModal, "REJETE", rejectNote)}
                                    disabled={!rejectNote.trim()}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <XCircle className="w-4 h-4" /> Confirmer le rejet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
