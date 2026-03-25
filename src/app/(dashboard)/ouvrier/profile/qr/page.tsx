"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { User, ShieldCheck, Loader2, Download, Share2 } from "lucide-react";

export default function WorkerQRPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            const res = await fetch("/api/auth/session");
            const session = await res.json();
            if (session?.user) {
                const userRes = await fetch(`/api/users/${session.user.id}`);
                const userData = await userRes.json();
                setUser(userData);
            }
            setLoading(false);
        };
        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!user) return <div className="text-center py-20">Utilisateur non trouvé</div>;

    const qrValue = user.qrToken || user.id;

    return (
        <div className="max-w-md mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto border border-primary/20 shadow-lg shadow-primary/10">
                    <User className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight mt-4">Mon QR Code de Pointage</h1>
                <p className="text-sm text-slate-400">Présentez ce code à votre chef d'équipe chaque matin</p>
            </div>

            {/* QR Card */}
            <div className="card !p-8 relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />

                <div className="relative z-10 flex flex-col items-center gap-6">
                    {/* QR Container */}
                    <div className="bg-white p-4 rounded-[2rem] shadow-2xl shadow-primary/20 border-4 border-primary/10">
                        <QRCodeSVG
                            value={qrValue}
                            size={200}
                            level="H"
                            includeMargin={false}
                            imageSettings={{
                                src: "/logo_mini.png", // If exists, else skip
                                x: undefined,
                                y: undefined,
                                height: 40,
                                width: 40,
                                excavate: true,
                            }}
                        />
                    </div>

                    {/* User Info */}
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-white">{user.firstName} {user.lastName}</h2>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <span className="badge text-primary bg-primary/10 border-primary/20 text-xs font-bold uppercase tracking-widest">
                                {user.role}
                            </span>
                            <span className="text-slate-600">ID: {user.id.slice(-6).toUpperCase()}</span>
                        </div>
                    </div>

                    {/* Security Badge */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Code Sécurisé & Unique
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
                <button className="btn-secondary text-sm flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> Enregistrer
                </button>
                <button className="btn-secondary text-sm flex items-center justify-center gap-2">
                    <Share2 className="w-4 h-4" /> Partager
                </button>
            </div>

            {/* Instruction */}
            <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-4 text-xs text-slate-400 leading-relaxed italic">
                Note : Pour des raisons de sécurité, votre chef d'équipe doit valider manuellement votre présence après le scan.
            </div>
        </div>
    );
}
