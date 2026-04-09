"use client";
import { 
    Delivery as SharedDelivery, 
    DeliveryStatus 
} from "@lynx/types";

import { useState, useEffect, useCallback } from "react";
import { Truck, Loader2, CalendarClock, Package, CheckCircle } from "lucide-react";

interface Delivery extends Partial<SharedDelivery> {
    id: string;
    item: string;
    quantity: string | null;
    supplier: string | null;
    plannedDate: string;
    status: string;
    notes: string | null;
    project: { name: string };
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    A_VENIR:   { label: "En attente",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    EN_ROUTE:  { label: "En transit",  color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    LIVRE:     { label: "Livré",        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    ANNULE:    { label: "Annulé",       color: "text-red-400 bg-red-500/10 border-red-500/20" },
};

export default function ChefDeliveriesPage() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        const res = await fetch("/api/deliveries");
        if (res.ok) setDeliveries(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

    return (
        <div className="space-y-6">
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Espace Chef d&apos;équipe</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Truck className="w-8 h-8 text-primary" /> Livraisons
                </h1>
                <p className="text-sm text-slate-400 mt-1">Suivez les livraisons de matériaux sur votre chantier</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : deliveries.length === 0 ? (
                <div className="card text-center py-16">
                    <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aucune livraison planifiée pour vos chantiers</p>
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
                                    {d.status === "LIVRE" && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
