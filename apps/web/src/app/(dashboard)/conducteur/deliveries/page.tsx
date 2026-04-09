"use client";

import { useState, useEffect, useCallback } from "react";
import { Truck, Plus, Loader2, X, CalendarClock, Package, ChevronDown, CheckCircle } from "lucide-react";
import { 
    Delivery as SharedDelivery, 
    DeliveryStatus 
} from "@lynx/types";
import { 
    useDeliveries, 
    useCreateDelivery, 
    useUpdateDeliveryStatus, 
    useProjects 
} from "@lynx/api-client";

interface Delivery extends Partial<SharedDelivery> {
    id: string;
    item: string;
    quantity: string | null;
    supplier: string | null;
    plannedDate: string;
    status: DeliveryStatus;
    notes: string | null;
    project: { name: string };
}

interface Project { id: string; name: string; }

const STATUS_MAP: Record<DeliveryStatus, { label: string; color: string }> = {
    A_VENIR:  { label: "À venir",    color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    EN_ROUTE:  { label: "En transit", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    LIVRE:      { label: "Livré",      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    RETARDE:    { label: "Retardé",    color: "text-red-400 bg-red-500/10 border-red-500/20" },
    ANNULE:     { label: "Annulé",     color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
    URGENT:     { label: "Urgent",     color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
};

export default function ConducteurDeliveriesPage() {
    const { data: deliveries = [], isLoading: loading } = useDeliveries();
    const { data: projects = [] } = useProjects();
    const { mutate: createDelivery, isPending: submitting } = useCreateDelivery();
    const { mutate: updateStatus } = useUpdateDeliveryStatus();

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ projectId: "", item: "", quantity: "", supplier: "", plannedDate: "", notes: "" });

    const handleSubmit = async () => {
        if (!form.projectId || !form.item || !form.plannedDate) return;
        createDelivery(form, {
            onSuccess: () => {
                setShowModal(false);
                setForm({ projectId: "", item: "", quantity: "", supplier: "", plannedDate: "", notes: "" });
            }
        });
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        updateStatus({ id, status: status as DeliveryStatus });
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Espace Conducteur</p>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Truck className="w-8 h-8 text-primary" /> Livraisons
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Suivi logistique des chantiers</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary text-sm shrink-0">
                    <Plus className="w-4 h-4" /> Planifier une livraison
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : deliveries.length === 0 ? (
                <div className="card text-center py-16">
                    <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aucune livraison planifiée</p>
                </div>
            ) : (
                <div className="space-y-3 animate-fade-in stagger-1">
                    {deliveries.map(d => {
                        const st = STATUS_MAP[d.status] || STATUS_MAP.EN_ATTENTE;
                        return (
                            <div key={d.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-white truncate">{d.item}</h3>
                                        <p className="text-xs text-primary font-medium">{d.project?.name}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                                            {d.supplier && <span>Fournisseur: <span className="text-slate-300">{d.supplier}</span></span>}
                                            {d.quantity && <span>Qté: <span className="text-slate-300">{d.quantity}</span></span>}
                                            <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {formatDate(d.plannedDate)}</span>
                                        </div>
                                        {d.notes && <p className="text-xs text-slate-500 mt-1 italic">{d.notes}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={`badge border text-xs ${st.color}`}>{st.label}</span>
                                    {d.status !== "LIVRE" && (
                                        <div className="relative group">
                                            <button title="Changer le statut" className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-slate-400">
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                            <div className="absolute right-0 top-full mt-1 bg-[#0d1626] border border-white/10 rounded-xl shadow-xl py-1 z-10 w-40 hidden group-hover:block">
                                                {Object.entries(STATUS_MAP).filter(([k]) => k !== d.status).map(([k, v]) => (
                                                    <button key={k} onClick={() => handleStatusUpdate(d.id, k)} className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 text-slate-300">
                                                        {v.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {d.status === "LIVRE" && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-[#0d1626] border border-white/10 rounded-[2rem] w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> Planifier une livraison</h2>
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
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Article / Matériau *</label>
                                <input type="text" value={form.item} onChange={e => setForm({...form, item: e.target.value})} placeholder="Ex: Béton M25, Acier HA12..." className="input-field w-full" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Quantité</label>
                                    <input type="text" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} placeholder="Ex: 10 m³" className="input-field w-full" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Date prévue *</label>
                                    <input type="date" value={form.plannedDate} onChange={e => setForm({...form, plannedDate: e.target.value})} title="Date de livraison prévue" className="input-field w-full" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Fournisseur</label>
                                <input type="text" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} placeholder="Nom du fournisseur" className="input-field w-full" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Notes</label>
                                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} placeholder="Instructions spéciales..." className="input-field w-full resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-3">Annuler</button>
                            <button onClick={handleSubmit} disabled={submitting || !form.projectId || !form.item || !form.plannedDate} className="btn-primary flex-1 py-3">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />} Planifier
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
