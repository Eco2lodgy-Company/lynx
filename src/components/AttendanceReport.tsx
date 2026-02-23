"use client";

import { useState, useEffect, useCallback } from "react";
import {
    FileText,
    Download,
    Users,
    Construction,
    Loader2,
    Search,
    ChevronDown
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Project {
    id: string;
    name: string;
}

interface Team {
    id: string;
    name: string;
}

import { useSearchParams } from "next/navigation";

export default function AttendanceReport() {
    const searchParams = useSearchParams();
    const urlDate = searchParams.get("date");

    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [filters, setFilters] = useState({
        projectId: "all",
        teamId: "all",
        period: "daily",
        date: urlDate || new Date().toISOString().split("T")[0],
    });
    const [data, setData] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams(filters).toString();
            const res = await fetch(`/api/attendance/report?${query}`);
            if (res.ok) {
                setData(await res.json());
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    }, [filters]);

    useEffect(() => {
        const fetchMeta = async () => {
            const [pRes, tRes] = await Promise.all([
                fetch("/api/projects"),
                fetch("/api/teams")
            ]);
            if (pRes.ok) setProjects(await pRes.json());
            if (tRes.ok) setTeams(await tRes.json());
        };
        fetchMeta();
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const exportPDF = async () => {
        if (data.length === 0) return;
        setExporting(true);

        try {
            const doc = new jsPDF() as any;
            const title = `Rapport de Pointage - ${filters.period === "daily" ? filters.date : filters.period}`;

            doc.setFontSize(20);
            doc.setTextColor(15, 23, 42);
            doc.text("ECOTECH PLATFORM", 14, 20);

            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text(`Généré le : ${new Date().toLocaleString()}`, 14, 28);
            doc.text(title, 14, 35);

            const tableData = data.map(item => [
                new Date(item.date).toLocaleDateString("fr-FR"),
                `${item.user.firstName} ${item.user.lastName}`,
                item.project?.name || "N/A",
                item.status,
                item.checkIn ? new Date(item.checkIn).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—",
                item.validatedBy ? `${item.validatedBy.firstName} ${item.validatedBy.lastName}` : "Non validé"
            ]);

            autoTable(doc, {
                startY: 45,
                head: [["Date", "Nom", "Projet", "Statut", "Arrivée", "Validé par"]],
                body: tableData,
                theme: "grid",
                headStyles: { fillColor: [0, 150, 255] },
            });

            doc.save(`rapport-pointage-${filters.date}.pdf`);
        } catch (e) {
            console.error(e);
        }
        setExporting(false);
    };

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="card shadow-lg border-primary/10 overflow-visible">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5 flex-1 min-w-[150px]">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Période</label>
                        <div className="relative">
                            <select
                                value={filters.period}
                                onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                                className="input-field appearance-none pr-10"
                                title="Sélectionner la période du rapport"
                            >
                                <option value="daily">Journalier</option>
                                <option value="weekly">Hebdomadaire</option>
                                <option value="monthly">Mensuel</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-[150px]">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Date / Début</label>
                        <input
                            type="date"
                            value={filters.date}
                            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                            className="input-field"
                            title="Choisir la date de début du rapport"
                        />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Projet Specific</label>
                        <div className="relative">
                            <select
                                value={filters.projectId}
                                onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                                className="input-field appearance-none pr-10"
                                title="Filtrer par projet"
                            >
                                <option value="all">Tous les projets</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <Construction className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Équipe</label>
                        <div className="relative">
                            <select
                                value={filters.teamId}
                                onChange={(e) => setFilters({ ...filters, teamId: e.target.value })}
                                className="input-field appearance-none pr-10"
                                title="Filtrer par équipe"
                            >
                                <option value="all">Toutes les équipes</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                    </div>

                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="btn-primary !py-3 px-6 shadow-lg shadow-primary/20"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Générer
                    </button>
                </div>
            </div>

            {/* Results Table */}
            <div className="card p-0 overflow-hidden animate-fade-in border-white/5 shadow-2xl">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Données de Pointage
                        <span className="badge text-[10px] bg-primary/10 text-primary">{data.length} entrées</span>
                    </h3>
                    {data.length > 0 && (
                        <button
                            onClick={exportPDF}
                            disabled={exporting}
                            className="btn-secondary !py-1.5 !px-4 text-[10px] bg-white text-black hover:bg-slate-200"
                        >
                            {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            Exporter en PDF
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-white/[0.02] text-slate-500 font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Ouvrier</th>
                                <th className="px-6 py-4">Projet</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4">HR Arrivée</th>
                                <th className="px-6 py-4">Validé par</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        Aucune donnée à afficher. Ajustez les filtres et cliquez sur &quot;Générer&quot;.
                                    </td>
                                </tr>
                            ) : (
                                data.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-400">
                                            {new Date(item.date).toLocaleDateString("fr-FR")}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-white">
                                            {item.user.firstName} {item.user.lastName}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">
                                            {item.project?.name || "—"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`badge text-[10px] border-transparent ${item.status === "VALIDE" ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-primary">
                                            {item.checkIn ? new Date(item.checkIn).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {item.validatedBy ? `${item.validatedBy.firstName} ${item.validatedBy.lastName}` : "Non validé"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
