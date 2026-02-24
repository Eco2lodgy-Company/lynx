"use client";
import { assetUrl } from "@/lib/assets";

import { useState, useEffect } from "react";
import {
    MessageSquare, Loader2, X, User, ArrowRight, Paperclip, Trash2
} from "lucide-react";
import { useRef } from "react";

interface Reply {
    id: string;
    content: string;
    imageUrl?: string | null;
    createdAt: string;
    author: {
        id: string;
        firstName: string;
        lastName: string;
        role: string;
        avatar?: string | null;
    };
}

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
    EN_ATTENTE: { label: "En attente", color: "text-amber-400 bg-amber-500/10", icon: null },
    EN_COURS: { label: "En traitement", color: "text-blue-400 bg-blue-500/10", icon: null },
    RESOLU: { label: "Résolu", color: "text-emerald-400 bg-emerald-500/10", icon: null },
    FERME: { label: "Fermé", color: "text-slate-400 bg-slate-500/10", icon: null },
};

export default function FeedbackDetailModal({
    feedback,
    onClose,
    onStatusChange,
    role = "ADMIN"
}: {
    feedback: Feedback,
    onClose: () => void,
    onStatusChange: (id: string, status: string) => void,
    role?: string
}) {
    const [replies, setReplies] = useState<Reply[]>([]);
    const [newReply, setNewReply] = useState("");
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchReplies = async () => {
            const res = await fetch(`/api/feedbacks/${feedback.id}/replies`);
            if (res.ok) setReplies(await res.json());
            setLoading(false);
        };
        fetchReplies();
    }, [feedback.id]);

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedPhoto(file);
            const url = URL.createObjectURL(file);
            setPhotoPreview(url);
        }
    };

    const removePhoto = () => {
        setSelectedPhoto(null);
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSendReply = async () => {
        if (!newReply.trim() && !selectedPhoto) return;
        setSending(true);
        try {
            const formData = new FormData();
            formData.append("content", newReply.trim());
            if (selectedPhoto) formData.append("photo", selectedPhoto);

            const res = await fetch(`/api/feedbacks/${feedback.id}/replies`, {
                method: "POST",
                body: formData,
            });
            if (res.ok) {
                const reply = await res.json();
                setReplies([...replies, reply]);
                setNewReply("");
                removePhoto();
                // Update local status to in progress if it was pending
                if (feedback.status === "EN_ATTENTE" && (role === "ADMIN" || role === "CONDUCTEUR")) {
                    onStatusChange(feedback.id, "EN_COURS");
                }
            } else {
                const text = await res.text();
                console.error("Failed to send reply:", text);
            }
        } catch (err) {
            console.error("Error sending reply:", err);
        } finally {
            setSending(false);
        }
    };

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#0d1626] border border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-up shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 relative z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white leading-tight">{feedback.subject}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">
                                Par : <span className="text-primary font-medium">{feedback.author ? `${feedback.author.firstName} ${feedback.author.lastName}` : "Anonyme"}</span>
                            </span>
                            <span className="text-slate-700">·</span>
                            <span className="text-xs text-slate-400">{feedback.project.name}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Original Message */}
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="bg-white/5 rounded-2xl rounded-tl-none p-4 border border-white/5">
                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{feedback.message}</p>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium px-1">Client · {formatDate(feedback.createdAt)}</p>
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="flex items-center gap-4 py-2">
                        <div className="h-px flex-1 bg-white/5" />
                        <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Discussion</span>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>

                    {/* Replies */}
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                    ) : replies.length === 0 ? (
                        <div className="text-center py-8">
                            <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2 opacity-20" />
                            <p className="text-xs text-slate-500 italic">Aucune réponse encore</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {replies.map((reply) => (
                                <div key={reply.id} className={`flex gap-4 ${reply.author.role === "CLIENT" ? "" : "flex-row-reverse"}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${reply.author.role === "CLIENT" ? "bg-primary/10 border-primary/20" : "bg-sky-500/10 border-sky-500/20"}`}>
                                        <User className={`w-5 h-5 ${reply.author.role === "CLIENT" ? "text-primary" : "text-sky-400"}`} />
                                    </div>
                                    <div className={`flex-1 space-y-2 ${reply.author.role === "CLIENT" ? "" : "text-right"}`}>
                                        <div className={`rounded-2xl p-4 border ${reply.author.role === "CLIENT" ? "bg-white/5 border-white/5 rounded-tl-none" : "bg-primary/10 border-primary/20 rounded-tr-none text-left"}`}>
                                            {reply.imageUrl && (
                                                <div className="mb-3 rounded-lg overflow-hidden border border-white/10 shadow-lg bg-black/50">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={assetUrl(reply.imageUrl)} alt="Partagé" className="max-w-full max-h-[300px] object-contain mx-auto" />
                                                </div>
                                            )}
                                            {reply.content && <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{reply.content}</p>}
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium px-1">
                                            {reply.author.firstName} {reply.author.lastName} · {formatDate(reply.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer / Reply Input */}
                <div className="p-6 bg-white/[0.02] border-t border-white/5 relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Statut :</span>
                        <div className="flex gap-2">
                            {Object.entries(STATUS_MAP).map(([k, v]) => (
                                <button
                                    key={k}
                                    onClick={() => onStatusChange(feedback.id, k)}
                                    className={`text-[10px] px-2 py-1 rounded-md border transition-all font-bold ${feedback.status === k ? v.color + " border-current" : "text-slate-600 border-white/5 hover:border-slate-500"}`}
                                >
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="relative group">
                        {photoPreview && (
                            <div className="absolute bottom-full left-0 right-0 mb-4 p-3 glass-effect rounded-2xl border border-white/10 animate-fade-in flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-black">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-slate-300 font-medium truncate">{selectedPhoto?.name}</p>
                                        <p className="text-[10px] text-slate-500">Prêt à l&apos;envoi</p>
                                    </div>
                                </div>
                                <button
                                    onClick={removePhoto}
                                    className="p-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
                                    title="Supprimer la photo"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-end gap-2 bg-navy-900/60 border border-white/5 rounded-2xl p-2 focus-within:border-primary/50 transition-all">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-slate-400 hover:text-primary transition-colors rounded-xl hover:bg-white/5"
                                title="Ajouter une photo"
                                type="button"
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoSelect}
                            />
                            <textarea
                                value={newReply}
                                onChange={(e) => setNewReply(e.target.value)}
                                placeholder="Rédigez votre réponse ici..."
                                className="flex-1 bg-transparent border-none p-2 text-sm text-slate-200 outline-none resize-none min-h-[44px] max-h-[120px] custom-scrollbar"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendReply();
                                    }
                                }}
                            />
                            <button
                                onClick={handleSendReply}
                                disabled={sending || (!newReply.trim() && !selectedPhoto)}
                                className="p-3 bg-primary text-navy-900 rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-primary/20 shrink-0"
                                title="Envoyer le message"
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
