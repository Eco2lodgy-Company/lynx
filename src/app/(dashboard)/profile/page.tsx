"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Shield, Camera, Lock, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import Image from "next/image";

export default function ProfilePage() {
    const { data: session, update } = useSession();
    const [uploading, setUploading] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            // 1. Upload file
            const upRes = await fetch("/api/upload", { method: "POST", body: formData });
            if (!upRes.ok) throw new Error("Erreur upload");
            const { url } = await upRes.json();

            // 2. Update user profile
            const updateRes = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatar: url }),
            });

            if (!updateRes.ok) throw new Error("Erreur mise à jour profil");

            await update({ user: { ...session?.user, avatar: url } });
            setMessage({ type: "success", text: "Photo de profil mise à jour !" });
        } catch (err) {
            console.error(err);
            setMessage({ type: "error", text: "Impossible de mettre à jour la photo." });
        } finally {
            setUploading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (passwordForm.new !== passwordForm.confirm) {
            setMessage({ type: "error", text: "Les mots de passe ne correspondent pas." });
            return;
        }

        setPasswordLoading(true);

        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: passwordForm.current,
                    newPassword: passwordForm.new,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage({ type: "error", text: data.error || "Erreur lors du changement de mot de passe." });
            } else {
                setMessage({ type: "success", text: "Mot de passe modifié avec succès." });
                setPasswordForm({ current: "", new: "", confirm: "" });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: "error", text: "Erreur serveur." });
        } finally {
            setPasswordLoading(false);
        }
    };

    if (!session?.user) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Mon Profil</h1>
                <p className="text-slate-400">Gérez vos informations personnelles et votre sécurité.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                    {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <p className="text-sm font-medium">{message.text}</p>
                </div>
            )}

            <div className="grid md:grid-cols-3 gap-8">
                {/* Avatar & Info */}
                <div className="md:col-span-1 space-y-6">
                    <div className="card text-center p-8">
                        <div className="relative w-32 h-32 mx-auto mb-4 group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface-dark bg-surface-dark shadow-xl relative">
                                {session.user.image ? (
                                    <Image
                                        src={session.user.image}
                                        alt="Avatar"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-4xl font-bold">
                                        {session.user.name?.[0].toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <label className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer hover:bg-primary-hover transition-colors shadow-lg">
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} title="Modifier la photo de profil" />
                            </label>
                        </div>

                        <h2 className="text-xl font-bold">{session.user.name}</h2>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium mt-2 border border-slate-700">
                            <Shield className="w-3 h-3" />
                            {session.user.role}
                        </div>

                        <div className="mt-6 pt-6 border-t border-border-dark/50 text-left space-y-3">
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Email</label>
                                <p className="text-slate-300 font-medium truncate" title={session.user.email || ""}>{session.user.email}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">ID Utilisateur</label>
                                <p className="text-slate-300 font-mono text-xs truncate" title={session.user.id}>{session.user.id}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div className="md:col-span-2">
                    <div className="card">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-dark/50">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                <Lock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Sécurité</h3>
                                <p className="text-xs text-slate-400">Modification du mot de passe</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Mot de passe actuel</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordForm.current}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                                    className="input-field"
                                    title="Mot de passe actuel"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nouveau mot de passe</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={passwordForm.new}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                    className="input-field"
                                    title="Nouveau mot de passe"
                                />
                                <p className="text-xs text-slate-500 mt-1">Minimum 6 caractères.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirmer le nouveau mot de passe</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={passwordForm.confirm}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                    className="input-field"
                                    title="Confirmer le nouveau mot de passe"
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="btn-primary w-full sm:w-auto"
                                >
                                    {passwordLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Mise à jour...
                                        </>
                                    ) : (
                                        "Mettre à jour le mot de passe"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
