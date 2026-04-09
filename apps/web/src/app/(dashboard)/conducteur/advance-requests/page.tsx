import { useState, useEffect, useCallback } from "react";
import { CircleDollarSign, Plus, Loader2, X, CheckCircle, XCircle, Clock, ChevronDown } from "lucide-react";
import { 
    AdvanceRequest as SharedAdvanceRequest, 
    AdvanceRequestStatus 
} from "@lynx/types";
import { 
    useAdvanceRequests, 
    useCreateAdvanceRequest, 
    useProjects 
} from "@lynx/api-client";

interface AdvanceRequest extends Partial<SharedAdvanceRequest> {
    id: string;
    amount: number;
    reason: string;
    status: AdvanceRequestStatus;
    createdAt: string;
    project: { name: string };
    user: { firstName: string; lastName: string };
}

interface Project { id: string; name: string; }

const STATUS_MAP: Record<AdvanceRequestStatus, { label: string; color: string; icon: React.ReactNode }> = {
    EN_ATTENTE: { label: "En attente",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20",   icon: <Clock className="w-3 h-3" /> },
    VALIDE:     { label: "Approuvée",   color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle className="w-3 h-3" /> },
    REJETE:     { label: "Rejetée",     color: "text-red-400 bg-red-500/10 border-red-500/20",           icon: <XCircle className="w-3 h-3" /> },
    PAYE:       { label: "Payée",       color: "text-blue-400 bg-blue-500/10 border-blue-500/20",       icon: <CircleDollarSign className="w-3 h-3" /> },
};

export default function ConducteurAdvanceRequestsPage() {
    const { data: requests = [], isLoading: loading } = useAdvanceRequests();
    const { data: projects = [] } = useProjects();
    const { mutate: createRequest, isPending: submitting } = useCreateAdvanceRequest();

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ projectId: "", amount: "", reason: "" });

    const handleSubmit = async () => {
        if (!form.projectId || !form.amount || !form.reason) return;
        createRequest({ ...form, amount: Number(form.amount) }, {
            onSuccess: () => {
                setShowModal(false);
                setForm({ projectId: "", amount: "", reason: "" });
            }
        });
    };

    const fmt = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "DZD" });
    const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Espace Conducteur</p>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-3">
                        <CircleDollarSign className="w-8 h-8 text-primary" /> Demandes de Fonds
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Soumettez et suivez les demandes d&apos;avance</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary text-sm shrink-0">
                    <Plus className="w-4 h-4" /> Nouvelle demande
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : requests.length === 0 ? (
                <div className="card text-center py-16">
                    <CircleDollarSign className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aucune demande de fonds</p>
                </div>
            ) : (
                <div className="space-y-3 animate-fade-in stagger-1">
                    {requests.map(r => {
                        const st = STATUS_MAP[r.status] || STATUS_MAP.EN_ATTENTE;
                        return (
                            <div key={r.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                                        <CircleDollarSign className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-xl font-black text-primary">{fmt(r.amount)}</span>
                                        <p className="text-sm text-slate-300 mt-1">{r.reason}</p>
                                        <p className="text-xs text-primary font-medium mt-1">{r.project.name} — {fmtDate(r.createdAt)}</p>
                                    </div>
                                </div>
                                <span className={`badge border text-xs flex items-center gap-1.5 shrink-0 ${st.color}`}>{st.icon} {st.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-[#0d1626] border border-white/10 rounded-[2rem] w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2"><CircleDollarSign className="w-5 h-5 text-primary" /> Nouvelle demande</h2>
                            <button title="Fermer" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Projet *</label>
                                <div className="relative">
                                    <select value={form.projectId} onChange={e => setForm({...form, projectId: e.target.value})} className="input-field w-full pr-10 appearance-none" title="Projet">
                                        <option value="">Sélectionner un projet</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Montant (DZD) *</label>
                                <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="Ex: 50000" className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Motif *</label>
                                <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={4} placeholder="Expliquez le besoin en fonds..." className="input-field w-full resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-3">Annuler</button>
                            <button onClick={handleSubmit} disabled={submitting || !form.projectId || !form.amount || !form.reason} className="btn-primary flex-1 py-3">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CircleDollarSign className="w-4 h-4" />} Envoyer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
