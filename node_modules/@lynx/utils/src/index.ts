/**
 * @lynx/utils — Shared utilities for Lynx platform
 * Compression, date formatting, validation helpers, offline queue.
 */

// =============================================================================
// DATE FORMATTING (used by both web & mobile)
// =============================================================================

export function formatDateFR(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", options ?? {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return "À l'instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `il y a ${Math.floor(seconds / 86400)}j`;
  return formatDateShort(d);
}

// =============================================================================
// ROLE HELPERS
// =============================================================================

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  CONDUCTEUR: "Conducteur de Travaux",
  CHEF_EQUIPE: "Chef d'Équipe",
  CLIENT: "Client",
  OUVRIER: "Ouvrier",
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "#E74C3C",
  CONDUCTEUR: "#3498DB",
  CHEF_EQUIPE: "#E67E22",
  CLIENT: "#2ECC71",
  OUVRIER: "#95A5A6",
};

export function getRoleColor(role: string): string {
  return ROLE_COLORS[role] ?? "#95A5A6";
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

const STATUS_LABELS: Record<string, string> = {
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
  A_VENIR: "À venir",
  EN_ROUTE: "En route",
  LIVRE: "Livré",
  ABSENT: "Absent",
  RETARD: "Retard",
  CONGE: "Congé",
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// =============================================================================
// IMAGE HELPERS
// =============================================================================

export function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif)$/i.test(url);
}

export function getAssetUrl(baseUrl: string, url?: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// =============================================================================
// EXPORTS
// =============================================================================

export * from "./uploadQueue";
export * from "./compression";
