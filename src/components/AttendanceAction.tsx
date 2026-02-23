"use client";

import { useState } from "react";
import { Clock, Loader2, MapPin, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AttendanceActionProps {
    initialAttendance: {
        id: string;
        checkIn: string;
        status: string;
    } | null;
}

export default function AttendanceAction({ initialAttendance }: AttendanceActionProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleCheckIn = async (forceNoGps = false) => {
        setLoading(true);
        setError(null);

        const submitAttendance = async (coords?: { latitude: number; longitude: number }) => {
            try {
                const res = await fetch("/api/attendance/check-in", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        latitude: coords?.latitude || null,
                        longitude: coords?.longitude || null,
                        notes: forceNoGps ? "Pointage forcé sans GPS (erreur technique)" : null
                    }),
                });

                if (res.ok) {
                    router.refresh();
                } else {
                    const data = await res.json();
                    setError(data.error || "Une erreur est survenue");
                }
            } catch {
                setError("Erreur de connexion au serveur");
            } finally {
                setLoading(false);
            }
        };

        if (forceNoGps) {
            await submitAttendance();
            return;
        }

        if (!navigator.geolocation) {
            setError("La géolocalisation n'est pas supportée par votre navigateur");
            setLoading(false);
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                await submitAttendance({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (err) => {
                console.error("GPS Error:", err);
                let msg = "Impossible de récupérer votre position GPS.";
                if (err.code === 1) msg = "Accès GPS refusé. Veuillez l'autoriser dans les réglages de votre navigateur.";
                if (err.code === 2) msg = "Signal GPS indisponible ou trop faible.";
                if (err.code === 3) msg = "Délai d'attente GPS dépassé.";

                setError(`${msg} Vous pouvez forcer le pointage sans GPS si le problème persiste.`);
                setLoading(false);
            },
            options
        );
    };

    if (initialAttendance) {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col items-center text-center animate-fade-in">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="font-bold text-white mb-1 shadow-sm">Pointage enregistré</h3>
                <p className="text-xs text-emerald-400 font-medium">
                    Arrivée à {new Date(initialAttendance.checkIn).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/5 px-3 py-1.5 rounded-full">
                    <MapPin className="w-3 h-3 text-primary" />
                    Position GPS transmise
                </div>
                {initialAttendance.status === "EN_ATTENTE" && (
                    <p className="mt-4 text-[10px] text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-3 py-1 rounded-lg">
                        En attente de validation par le chef
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="card !p-8 flex flex-col items-center text-center animate-fade-in shadow-xl border-primary/20">
            <div className="w-16 h-16 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 border border-primary/20 rotate-3 hover:rotate-0 transition-transform duration-500">
                <Clock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Pointage Matinal</h2>
            <p className="text-sm text-slate-400 mb-8 max-w-[240px]">
                Confirmez votre présence sur le chantier d&apos;un simple clic.
            </p>

            {error && (
                <div className="mb-6 space-y-3 animate-shake">
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                        {error}
                    </div>
                    <button
                        onClick={() => handleCheckIn(true)}
                        disabled={loading}
                        className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-dashed border-white/10"
                    >
                        Forcer le pointage sans GPS
                    </button>
                </div>
            )}

            <button
                onClick={handleCheckIn}
                disabled={loading}
                className="btn-primary w-full justify-center !py-4 text-sm font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Transmission...
                    </>
                ) : (
                    <>
                        <MapPin className="w-5 h-5 mr-2" />
                        Pointer ma présence
                    </>
                )}
            </button>
            <p className="mt-4 text-[10px] text-slate-500 font-medium italic">
                Votre position GPS sera jointe au pointage.
            </p>
        </div>
    );
}
