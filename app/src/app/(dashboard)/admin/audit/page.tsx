"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Shield,
    Search,
    Clock,
    User,
    Filter,
    ChevronDown,
    Loader2,
    FileText,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Activity,
} from "lucide-react";

interface AuditEntry {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    details: string | null;
    createdAt: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        role: string;
    };
}

const ACTION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    VALIDATE_LOG: { label: "Journal validé", color: "text-emerald-400 bg-emerald-500/10", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    REJECT_LOG: { label: "Journal rejeté", color: "text-red-400 bg-red-500/10", icon: <XCircle className="w-3.5 h-3.5" /> },
    CREATE_INCIDENT: { label: "Incident créé", color: "text-orange-400 bg-orange-500/10", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    UPDATE_INCIDENT: { label: "Incident modifié", color: "text-amber-400 bg-amber-500/10", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    RESOLVE_INCIDENT: { label: "Incident résolu", color: "text-emerald-400 bg-emerald-500/10", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    CREATE_TASK: { label: "Tâche créée", color: "text-blue-400 bg-blue-500/10", icon: <FileText className="w-3.5 h-3.5" /> },
    UPDATE_TASK: { label: "Tâche modifiée", color: "text-blue-400 bg-blue-500/10", icon: <FileText className="w-3.5 h-3.5" /> },
    CREATE_REPORT: { label: "Rapport créé", color: "text-blue-400 bg-blue-500/10", icon: <FileText className="w-3.5 h-3.5" /> },
    PUBLISH_REPORT: { label: "Rapport publié", color: "text-emerald-400 bg-emerald-500/10", icon: <FileText className="w-3.5 h-3.5" /> },
    DELETE_REPORT: { label: "Rapport supprimé", color: "text-red-400 bg-red-500/10", icon: <XCircle className="w-3.5 h-3.5" /> },
    VALIDATE_ATTENDANCE: { label: "Pointage validé", color: "text-emerald-400 bg-emerald-500/10", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    CREATE_USER: { label: "Utilisateur créé", color: "text-blue-400 bg-blue-500/10", icon: <User className="w-3.5 h-3.5" /> },
    UPDATE_USER: { label: "Utilisateur modifié", color: "text-amber-400 bg-amber-500/10", icon: <User className="w-3.5 h-3.5" /> },
    CREATE_PROJECT: { label: "Projet créé", color: "text-blue-400 bg-blue-500/10", icon: <FileText className="w-3.5 h-3.5" /> },
};

const ENTITY_OPTIONS = [
    { value: "", label: "Toutes entités" },
    { value: "DailyLog", label: "Journaux" },
    { value: "Incident", label: "Incidents" },
    { value: "Task", label: "Tâches" },
    { value: "Report", label: "Rapports" },
    { value: "Attendance", label: "Pointage" },
    { value: "User", label: "Utilisateurs" },
    { value: "Project", label: "Projets" },
];

const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Admin",
    CONDUCTEUR: "Conducteur",
    CHEF_EQUIPE: "Chef d'équipe",
    OUVRIER: "Ouvrier",
    CLIENT: "Client",
};

export default function AuditPage() {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [entityFilter, setEntityFilter] = useState("");
    const [search, setSearch] = useState("");

    const fetchAudit = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (entityFilter) params.set("entity", entityFilter);
        params.set("limit", "100");

        const res = await fetch(`/api/audit?${params}`);
        if (res.ok) setEntries(await res.json());
        setLoading(false);
    }, [entityFilter]);

    useEffect(() => { fetchAudit(); }, [fetchAudit]);

    const formatDateTime = (d: string) =>
        new Date(d).toLocaleString("fr-FR", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
        });

    const filteredEntries = entries.filter((e) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const actionInfo = ACTION_LABELS[e.action];
        const userName = `${e.user.firstName} ${e.user.lastName}`.toLowerCase();
        const details = e.details ? e.details.toLowerCase() : "";
        return (
            userName.includes(q) ||
            (actionInfo?.label || e.action).toLowerCase().includes(q) ||
            e.entity.toLowerCase().includes(q) ||
            details.includes(q)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Administration</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Shield className="w-7 h-7 text-primary" />
                    Journal d&apos;audit
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    Traçabilité complète — {entries.length} action{entries.length !== 1 ? "s" : ""} enregistrée{entries.length !== 1 ? "s" : ""}
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in stagger-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher par utilisateur, action..."
                        className="input-field pl-10"
                        title="Rechercher dans l'audit"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                        value={entityFilter}
                        onChange={(e) => setEntityFilter(e.target.value)}
                        className="input-field pl-10 pr-8 appearance-none min-w-[180px]"
                        title="Filtrer par entité"
                    >
                        {ENTITY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : filteredEntries.length === 0 ? (
                <div className="card text-center py-16">
                    <Activity className="w-12 h-12 text-slate-400/30 mx-auto mb-3" />
                    <p className="text-slate-400">Aucune action enregistrée</p>
                </div>
            ) : (
                <div className="space-y-2 animate-fade-in stagger-2">
                    {filteredEntries.map((entry) => {
                        const actionInfo = ACTION_LABELS[entry.action] || {
                            label: entry.action,
                            color: "text-slate-400 bg-slate-500/10",
                            icon: <Activity className="w-3.5 h-3.5" />,
                        };
                        let parsedDetails: Record<string, string> | null = null;
                        try {
                            if (entry.details) parsedDetails = JSON.parse(entry.details);
                        } catch { /* ignore */ }

                        return (
                            <div key={entry.id} className="card py-3 px-4 hover:border-primary/20 transition-all">
                                <div className="flex items-center gap-3">
                                    {/* Action Icon */}
                                    <div className={`p-2 rounded-lg shrink-0 ${actionInfo.color}`}>
                                        {actionInfo.icon}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm">{actionInfo.label}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-dark text-slate-400 border border-border-dark">
                                                {entry.entity}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {entry.user.firstName} {entry.user.lastName}
                                                <span className="text-[10px] text-slate-500">({ROLE_LABELS[entry.user.role] || entry.user.role})</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDateTime(entry.createdAt)}
                                            </span>
                                        </div>
                                        {/* Parsed details */}
                                        {parsedDetails && (
                                            <div className="flex flex-wrap gap-2 mt-1.5">
                                                {Object.entries(parsedDetails).map(([key, value]) => (
                                                    <span key={key} className="text-[10px] px-2 py-0.5 rounded bg-surface-dark text-slate-500 border border-border-dark/50">
                                                        {key}: {String(value)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
