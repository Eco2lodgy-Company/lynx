"use client";

import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
    QrCode,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    Loader2,
    ArrowLeft,
    RefreshCw,
    Maximize2
} from "lucide-react";
import Link from "next/link";

export default function AttendanceScanPage() {
    const [scanResult, setScanResult] = useState<any>(null);
    const [scanning, setScanning] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (scanning) {
            scannerRef.current = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );

            scannerRef.current.render(onScanSuccess, onScanFailure);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Error clearing scanner:", err));
            }
        };
    }, [scanning]);

    async function onScanSuccess(decodedText: string) {
        if (loading) return;

        setScanning(false);
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/attendance/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qrToken: decodedText }),
            });

            const data = await res.json();

            if (res.ok) {
                setScanResult(data);
            } else {
                setError(data.message || "Erreur lors du pointage");
            }
        } catch (err) {
            setError("Erreur de connexion au serveur");
        } finally {
            setLoading(false);
        }
    }

    function onScanFailure(error: any) {
        // quiet fail for scanning
    }

    const resetScanner = () => {
        setScanResult(null);
        setError(null);
        setScanning(true);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href="/chef-equipe/dashboard" className="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight">Pointage QR Code</h1>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Scanner le badge ouvrier</p>
                </div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Scanner Area */}
            {scanning ? (
                <div className="space-y-6">
                    <div className="relative group">
                        {/* Overlay Decor */}
                        <div className="absolute inset-x-0 -top-4 flex justify-center z-10">
                            <div className="px-4 py-1 bg-primary text-navy-900 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-xl">
                                Scanner Actif
                            </div>
                        </div>

                        <div id="reader" className="overflow-hidden rounded-[2.5rem] border-4 border-white/5 bg-navy-900 shadow-2xl relative">
                            {/* Loading State fallback */}
                            <div className="flex flex-col items-center justify-center p-20 opacity-20 italic text-sm text-slate-500">
                                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                                Initialisation de la caméra...
                            </div>
                        </div>

                        {/* Scan Corners Decor */}
                        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-3xl m-6 pointer-events-none" />
                        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-3xl m-6 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-3xl m-6 pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-3xl m-6 pointer-events-none" />
                    </div>

                    <div className="text-center space-y-4">
                        <div className="flex justify-center gap-6">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                    <Maximize2 className="w-4 h-4 text-slate-400" />
                                </div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Centrer le code</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                    <RefreshCw className="w-4 h-4 text-slate-400" />
                                </div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Auto-focus</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-scale-up">
                    {loading ? (
                        <div className="card !p-12 text-center space-y-4">
                            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                            <p className="text-lg font-medium text-slate-300">Traitement du pointage...</p>
                        </div>
                    ) : error ? (
                        <div className="card !p-12 text-center space-y-6 border-red-500/20">
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 shadow-xl shadow-red-500/5">
                                <AlertCircle className="w-10 h-10 text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white">Échec du pointage</h2>
                                <p className="text-slate-400">{error}</p>
                            </div>
                            <button onClick={resetScanner} className="btn-primary w-full py-4 text-base bg-red-500 hover:bg-red-600 shadow-red-500/20">
                                Réessayer
                            </button>
                        </div>
                    ) : scanResult ? (
                        <div className="card !p-12 text-center space-y-6 border-emerald-500/20">
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em]">Scanner Succès !</p>
                                <h2 className="text-3xl font-bold text-white">{scanResult.worker.firstName} {scanResult.worker.lastName}</h2>
                                <p className="text-slate-400">{scanResult.message}</p>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-4 flex items-center justify-between text-left">
                                <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Heure</p>
                                    <p className="text-sm font-medium">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Statut</p>
                                    <span className="text-emerald-400 text-xs font-bold">PRÉSENT ✅</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={resetScanner} className="btn-primary flex-1 py-4 text-base">
                                    Scan Suivant
                                </button>
                                <Link href="/chef-equipe/dashboard" className="btn-secondary flex-1 py-4 text-base">
                                    Terminé
                                </Link>
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Safety Footer */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" />
                Vérification Biométrique Activée
            </div>
        </div>
    );
}
