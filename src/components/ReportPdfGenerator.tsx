"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

interface PdfData {
    title: string;
    type: string;
    status: string;
    project: {
        name: string;
        address: string | null;
        supervisor: string | null;
        client: string | null;
    };
    period: {
        start: string | null;
        end: string | null;
    };
    content: string | null;
    dailyLogs: Array<{
        date: string;
        summary: string | null;
        workCompleted: string | null;
        weather: string | null;
        author: string;
    }>;
    photos: Array<{
        url: string;
        caption: string | null;
        takenAt: string;
    }>;
    generatedAt: string;
    generatedBy: string;
}

const TYPE_LABELS: Record<string, string> = {
    HEBDOMADAIRE: "Rapport Hebdomadaire",
    MENSUEL: "Rapport Mensuel",
    INCIDENT: "Rapport d'Incident",
    AVANCEMENT: "Rapport d'Avancement",
};

const WEATHER_LABELS: Record<string, string> = {
    ENSOLEILLE: "☀️ Ensoleillé",
    NUAGEUX: "☁️ Nuageux",
    PLUVIEUX: "🌧️ Pluvieux",
    VENTEUX: "💨 Venteux",
    NEIGEUX: "❄️ Neigeux",
};

export default function ReportPdfGenerator({ reportId }: { reportId: string }) {
    const [loading, setLoading] = useState(false);

    const generatePdf = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/${reportId}/pdf`);
            if (!res.ok) throw new Error("Erreur lors du chargement");

            const data: PdfData = await res.json();
            const doc = new jsPDF("p", "mm", "a4");
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            const contentWidth = pageWidth - margin * 2;
            let y = margin;

            // Helper: add a new page if needed
            const checkPage = (neededSpace: number) => {
                if (y + neededSpace > 280) {
                    doc.addPage();
                    y = margin;
                }
            };

            // ── HEADER ──────────────────────
            doc.setFillColor(15, 23, 42); // dark bg
            doc.rect(0, 0, pageWidth, 45, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.text("ECOTECH Platform — powered by NGS", margin, 10);

            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text(data.title, margin, 22);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(TYPE_LABELS[data.type] || data.type, margin, 30);

            if (data.period.start && data.period.end) {
                const start = new Date(data.period.start).toLocaleDateString("fr-FR");
                const end = new Date(data.period.end).toLocaleDateString("fr-FR");
                doc.text(`Période : ${start} → ${end}`, margin, 37);
            }

            y = 55;
            doc.setTextColor(30, 30, 30);

            // ── PROJECT INFO ─────────────────
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Informations du Projet", margin, y);
            y += 8;

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`Projet : ${data.project.name}`, margin, y); y += 5;
            if (data.project.address) { doc.text(`Adresse : ${data.project.address}`, margin, y); y += 5; }
            if (data.project.supervisor) { doc.text(`Conducteur : ${data.project.supervisor}`, margin, y); y += 5; }
            if (data.project.client) { doc.text(`Client : ${data.project.client}`, margin, y); y += 5; }

            y += 5;
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, y, pageWidth - margin, y);
            y += 8;

            // ── CONTENT ─────────────────────
            if (data.content) {
                checkPage(30);
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text("Contenu", margin, y);
                y += 7;

                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                const lines = doc.splitTextToSize(data.content, contentWidth);
                for (const line of lines) {
                    checkPage(6);
                    doc.text(line, margin, y);
                    y += 5;
                }
                y += 5;
            }

            // ── DAILY LOGS ──────────────────
            if (data.dailyLogs.length > 0) {
                checkPage(20);
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text("Journaux Validés", margin, y);
                y += 8;

                for (const log of data.dailyLogs) {
                    checkPage(25);
                    const date = new Date(log.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
                    const weather = log.weather ? ` — ${WEATHER_LABELS[log.weather] || log.weather}` : "";

                    doc.setFillColor(241, 245, 249);
                    doc.rect(margin, y - 3, contentWidth, 7, "F");
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "bold");
                    doc.text(`${date}${weather}`, margin + 2, y + 1);
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7);
                    doc.text(`Par ${log.author}`, pageWidth - margin - 2, y + 1, { align: "right" });
                    y += 8;

                    doc.setFontSize(8);
                    if (log.summary) {
                        const summaryLines = doc.splitTextToSize(log.summary, contentWidth - 4);
                        for (const l of summaryLines) {
                            checkPage(5);
                            doc.text(l, margin + 2, y);
                            y += 4;
                        }
                    }
                    if (log.workCompleted) {
                        checkPage(10);
                        doc.setFont("helvetica", "bold");
                        doc.text("Travaux réalisés :", margin + 2, y); y += 4;
                        doc.setFont("helvetica", "normal");
                        const workLines = doc.splitTextToSize(log.workCompleted, contentWidth - 6);
                        for (const l of workLines) {
                            checkPage(5);
                            doc.text(l, margin + 4, y);
                            y += 4;
                        }
                    }
                    y += 4;
                }
            }

            // ── PHOTOS LIST ─────────────────
            if (data.photos.length > 0) {
                checkPage(20);
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text(`Photos (${data.photos.length})`, margin, y);
                y += 8;

                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                for (const photo of data.photos) {
                    checkPage(8);
                    const date = new Date(photo.takenAt).toLocaleDateString("fr-FR");
                    doc.text(`• ${photo.caption || "Photo"} — ${date}`, margin + 2, y);
                    y += 5;
                }
            }

            // ── SIGNATURE / FOOTER ──────────
            checkPage(40);
            y += 10;
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, y, pageWidth - margin, y);
            y += 10;

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("Signature numérique", margin, y);
            y += 6;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text(`Généré par : ${data.generatedBy}`, margin, y); y += 4;
            doc.text(`Date : ${new Date(data.generatedAt).toLocaleString("fr-FR")}`, margin, y); y += 4;
            doc.text(`Statut : ${data.status === "PUBLIE" ? "✓ Rapport publié et validé" : "Brouillon"}`, margin, y);

            // ── FOOTER ON EACH PAGE ─────────
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(150, 150, 150);
                doc.text(`ECOTECH Platform — ${data.project.name}`, margin, 290);
                doc.text(`Page ${i}/${pageCount}`, pageWidth - margin, 290, { align: "right" });
            }

            // Save
            const fileName = `${data.project.name.replace(/\s+/g, "_")}_${data.type}_${new Date(data.generatedAt).toISOString().split("T")[0]}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error("PDF generation error:", error);
            alert("Erreur lors de la génération du PDF");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={generatePdf}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
            title="Télécharger en PDF"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF
        </button>
    );
}
