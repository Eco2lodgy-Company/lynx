import { type ClassValue, clsx } from "clsx";

// Simple clsx implementation since we don't need the full package
export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        ...options,
    });
}

export function formatDateTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        // Projet
        PLANIFIE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        EN_COURS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        EN_PAUSE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        TERMINE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        ANNULE: "bg-red-500/20 text-red-400 border-red-500/30",
        // Tâches
        A_FAIRE: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        EN_ATTENTE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        // Journal
        BROUILLON: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        SOUMIS: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        VALIDE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        REJETE: "bg-red-500/20 text-red-400 border-red-500/30",
        // Incident
        OUVERT: "bg-red-500/20 text-red-400 border-red-500/30",
        RESOLU: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        FERME: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        // Présence
        PRESENT: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        ABSENT: "bg-red-500/20 text-red-400 border-red-500/30",
        RETARD: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        CONGE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        MALADIE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        // Priorité
        BASSE: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        NORMALE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        HAUTE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        URGENTE: "bg-red-500/20 text-red-400 border-red-500/30",
        // Sévérité
        FAIBLE: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        MOYENNE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        CRITIQUE: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
}

export function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        PLANIFIE: "Planifié",
        EN_COURS: "En cours",
        EN_PAUSE: "En pause",
        TERMINE: "Terminé",
        ANNULE: "Annulé",
        A_FAIRE: "À faire",
        EN_ATTENTE: "En attente",
        BROUILLON: "Brouillon",
        SOUMIS: "Soumis",
        VALIDE: "Validé",
        REJETE: "Rejeté",
        OUVERT: "Ouvert",
        RESOLU: "Résolu",
        FERME: "Fermé",
        PRESENT: "Présent",
        ABSENT: "Absent",
        RETARD: "En retard",
        CONGE: "En congé",
        MALADIE: "Maladie",
        BASSE: "Basse",
        NORMALE: "Normale",
        HAUTE: "Haute",
        URGENTE: "Urgente",
        FAIBLE: "Faible",
        MOYENNE: "Moyenne",
        CRITIQUE: "Critique",
        NOUVEAU: "Nouveau",
        LU: "Lu",
        TRAITE: "Traité",
    };
    return labels[status] || status;
}

export function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
        ADMIN: "Administrateur",
        CONDUCTEUR: "Conducteur de travaux",
        CHEF_EQUIPE: "Chef d'équipe",
        CLIENT: "Client",
        OUVRIER: "Ouvrier",
    };
    return labels[role] || role;
}

export function getRoleRedirect(role: string): string {
    const redirects: Record<string, string> = {
        ADMIN: "/admin/dashboard",
        CONDUCTEUR: "/conducteur/dashboard",
        CHEF_EQUIPE: "/chef-equipe/dashboard",
        CLIENT: "/client/dashboard",
        OUVRIER: "/ouvrier/dashboard",
    };
    return redirects[role] || "/login";
}
