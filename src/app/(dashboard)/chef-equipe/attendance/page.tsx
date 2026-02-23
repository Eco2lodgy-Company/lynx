"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Clock,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Loader2,
    CheckCircle2,
    Users,
    MapPin,
    ExternalLink,
    Send,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface UserInfo {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
}

interface Attendance {
    id: string;
    userId: string;
    date: string;
    status: string;
    checkIn: string | null;
    checkOut: string | null;
    notes: string;
    latitude: number | null;
    longitude: number | null;
    user: UserInfo;
    project?: { name: string } | null;
    validatedBy?: { firstName: string; lastName: string } | null;
}

export default function AttendancePage() {
    const router = useRouter();
    const [date, setDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [transmitting, setTransmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const attRes = await fetch(`/api/attendance/team-today?date=${date}`);
            if (attRes.ok) {
                const attData = await attRes.json();
                setAttendance(attData);
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    }, [date]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const changeDate = (delta: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + delta);
        setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    };

    const handleSave = async (attendanceId: string) => {
        setSaving(attendanceId);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch("/api/attendance/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attendanceIds: [attendanceId] }),
            });

            if (res.ok) {
                setSuccess("Pointage validé avec succès.");
                await fetchData();
            } else {
                const d = await res.json();
                setError(d.error || "Échec de la validation");
            }
        } catch (e) {
            console.error("Error saving attendance:", e);
            setError("Erreur réseau");
        }
        setSaving(null);
    };

    const handleValidateAll = async () => {
        const pendingIds = attendance
            .filter(a => a.status === "EN_ATTENTE")
            .map(a => a.id);

        console.log("Pending IDs found for validation:", pendingIds);

        if (pendingIds.length === 0) {
            console.warn("No pending attendance records to validate.");
            return;
        }

        setSaving("ALL");
        setError(null);
        try {
            console.log("Sending batch validation request...");
            const res = await fetch("/api/attendance/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attendanceIds: pendingIds })
            });

            console.log("Response status:", res.status);

            if (res.ok) {
                console.log("Validation successful, refreshing data...");
                const data = await res.json();
                setSuccess(`${data.count} pointage(s) validé(s) avec succès.`);
                await fetchData();
                router.refresh();
            } else {
                const d = await res.json();
                console.error("Validation error response:", d);
                setError(d.error || "Une erreur est survenue lors de la validation groupée");
            }
        } catch (e) {
            console.error("Network error during validation:", e);
            setError("Erreur réseau");
        }
        setSaving(null);
    };

    const handleTransmit = async () => {
        if (attendance.length === 0) return;

        setTransmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch("/api/attendance/transmit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date,
                    attendanceIds: attendance.map(a => a.id)
                })
            });

            if (res.ok) {
                const data = await res.json();
                setSuccess(data.message || "Pointage transmis avec succès.");
            } else {
                const d = await res.json();
                setError(d.error || "Une erreur est survenue lors de la transmission");
            }
        } catch (e) {
            console.error(e);
            setError("Erreur réseau");
        }
        setTransmitting(false);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("fr-FR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
        });
    };

    // Stats
    const stats = {
        present: attendance.filter((a) => a.status === "VALIDE" || a.status === "PRESENT").length,
        pending: attendance.filter((a) => a.status === "EN_ATTENTE").length,
        retard: attendance.filter((a) => a.status === "RETARD").length,
        absent: attendance.filter((a) => a.status === "ABSENT").length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Chef d&apos;équipe</p>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Pointage du Personnel</h1>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleValidateAll}
                        disabled={saving === "ALL" || stats.pending === 0}
                        className={`btn-primary text-sm shadow-xl transition-all ${stats.pending === 0
                            ? "bg-slate-700 text-slate-400 cursor-not-allowed opacity-50 border-transparent shadow-none"
                            : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 border-transparent text-white"
                            }`}
                    >
                        {saving === "ALL" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Valider tout ({stats.pending})
                    </button>

                    <button
                        onClick={handleTransmit}
                        disabled={transmitting || attendance.length === 0 || stats.pending > 0}
                        className={`btn-primary text-sm shadow-xl transition-all ${attendance.length === 0 || stats.pending > 0
                            ? "bg-slate-700 text-slate-400 cursor-not-allowed opacity-50 border-transparent shadow-none"
                            : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 border-transparent text-white"
                            }`}
                        title={stats.pending > 0 ? "Validez tous les pointages avant de transmettre" : "Transmettre au conducteur et admin"}
                    >
                        {transmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Transmettre
                    </button>
                </div>
            </div>

            {/* Date Nav */}
            <div className="card flex items-center justify-between animate-fade-in stagger-1">
                <button onClick={() => changeDate(-1)} className="p-2 hover:text-primary rounded-lg transition-colors" title="Jour précédent">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <p className="font-semibold capitalize text-sm lg:text-base">{formatDate(date)}</p>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-[10px] text-slate-500 bg-transparent border-none text-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity" />
                </div>
                <button onClick={() => changeDate(1)} className="p-2 hover:text-primary rounded-lg transition-colors" title="Jour suivant">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in stagger-2">
                {[
                    { label: "Validés", value: stats.present, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "À Valider", value: stats.pending, color: "text-amber-400", bg: "bg-amber-500/10" },
                    { label: "Retards", value: stats.retard, color: "text-orange-400", bg: "bg-orange-500/10" },
                    { label: "Absents", value: stats.absent, color: "text-red-400", bg: "bg-red-500/10" },
                ].map((stat) => (
                    <div key={stat.label} className={`card !p-4 border-white/5 ${stat.bg}`}>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 animate-shake">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    {success}
                </div>
            )}

            {/* Workers List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : attendance.length === 0 ? (
                <div className="card text-center py-20 border-dashed border-white/5">
                    <Users className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
                    <p className="text-slate-500 font-medium">Aucun pointage enregistré pour cette date.</p>
                </div>
            ) : (
                <div className="space-y-3 animate-fade-in stagger-3">
                    {attendance.map((att) => {
                        const worker = att.user;
                        const isPending = att.status === "EN_ATTENTE";
                        return (
                            <div key={att.id} className={`card transition-all duration-300 ${isPending ? "border-amber-500/40 bg-amber-500/5 shadow-lg shadow-amber-500/5" : att.status === "VALIDE" ? "border-emerald-500/20" : "border-white/5"}`}>
                                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                    {/* Worker Info */}
                                    <div className="flex items-center gap-4 min-w-[220px]">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
                                                <span className="text-sm font-bold text-primary">{worker.firstName[0]}{worker.lastName[0]}</span>
                                            </div>
                                            {isPending && <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-navy-900 animate-pulse" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white tracking-tight">{worker.firstName} {worker.lastName}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{att.project?.name || "Siège / Hors site"}</p>
                                        </div>
                                    </div>

                                    {/* Status & Validation */}
                                    <div className="flex flex-col flex-1 gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${att.status === "VALIDE" ? "text-emerald-400 bg-emerald-500/10" :
                                                att.status === "EN_ATTENTE" ? "text-amber-400 bg-amber-500/10 animate-pulse" :
                                                    "text-red-400 bg-red-500/10"
                                                }`}>
                                                {att.status === "VALIDE" ? "✓ Validé" : att.status === "EN_ATTENTE" ? "À Valider" : att.status}
                                            </span>
                                            {att.validatedBy && (
                                                <span className="text-[10px] text-slate-600 font-medium">
                                                    Validé par {att.validatedBy.firstName}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs font-mono">
                                            <div className="flex items-center gap-1.5 text-emerald-400/80">
                                                <Clock className="w-3.5 h-3.5" />
                                                {att.checkIn ? new Date(att.checkIn).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                                            </div>
                                            {att.checkOut && (
                                                <div className="flex items-center gap-1.5 text-blue-400/80">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(att.checkOut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* GPS Location */}
                                    <div className="flex flex-col gap-1.5 min-w-[160px]">
                                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Position GPS</p>
                                        {att.latitude && att.longitude ? (
                                            <a
                                                href={`https://www.google.com/maps?q=${att.latitude},${att.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-xs text-primary hover:text-white transition-colors group"
                                            >
                                                <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="font-medium underline underline-offset-4 decoration-primary/30">Ouvrir Maps</span>
                                                <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                                            </a>
                                        ) : (
                                            <div className="flex items-center gap-2 text-[10px] text-slate-700 italic">
                                                <MapPin className="w-3.5 h-3.5" />
                                                Non disponible
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-end min-w-[140px]">
                                        {isPending ? (
                                            <button
                                                onClick={() => handleSave(att.id)}
                                                disabled={saving === att.id}
                                                className="btn-primary !py-2.5 !px-6 text-xs font-bold uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white border-transparent shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                            >
                                                {saving === att.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    "Valider"
                                                )}
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 text-emerald-400/60 bg-emerald-500/5 px-4 py-2.5 rounded-xl border border-emerald-500/10">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Enregistré</span>
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
