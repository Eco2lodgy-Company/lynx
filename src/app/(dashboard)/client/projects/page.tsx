import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
    FolderKanban,
    MapPin,
    Calendar,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Image,
    TrendingUp,
    Layers,
} from "lucide-react";

export const metadata = { title: "Mes Projets — Client" };

async function getClientProjects(userId: string) {
    return prisma.project.findMany({
        where: { clientId: userId },
        include: {
            supervisor: { select: { firstName: true, lastName: true, phone: true } },
            phases: {
                orderBy: { order: "asc" },
                include: { _count: { select: { tasks: true } } },
            },
            _count: { select: { tasks: true, incidents: true, photos: true, dailyLogs: true } },
        },
        orderBy: { updatedAt: "desc" },
    });
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    PLANIFIE: { label: "Planifié", color: "text-blue-400", bg: "bg-blue-500/10", dot: "bg-blue-400" },
    EN_COURS: { label: "En cours", color: "text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-400" },
    EN_PAUSE: { label: "En pause", color: "text-orange-400", bg: "bg-orange-500/10", dot: "bg-orange-400" },
    TERMINE: { label: "Terminé", color: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400" },
    ANNULE: { label: "Annulé", color: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-400" },
};

const PHASE_STATUS: Record<string, { label: string; color: string }> = {
    A_FAIRE: { label: "À faire", color: "text-slate-400" },
    EN_COURS: { label: "En cours", color: "text-amber-400" },
    TERMINE: { label: "Terminé", color: "text-emerald-400" },
};

export default async function ClientProjectsPage() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return null;

    const projects = await getClientProjects(userId);

    const formatDate = (d: Date | null) =>
        d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Espace Client</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Mes Projets</h1>
                <p className="text-sm text-slate-400 mt-1">
                    {projects.length} projet{projects.length !== 1 ? "s" : ""} · suivi en temps réel
                </p>
            </div>

            {projects.length === 0 ? (
                <div className="card text-center py-20">
                    <FolderKanban className="w-14 h-14 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucun projet assigné</h3>
                    <p className="text-sm text-slate-400">Contactez votre administrateur pour être associé à un projet.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {projects.map((project, idx) => {
                        const st = STATUS_MAP[project.status] || STATUS_MAP.PLANIFIE;
                        return (
                            <div key={project.id} className="card animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                                {/* Project Header */}
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`w-2.5 h-2.5 rounded-full ${st.dot} shrink-0`} />
                                            <h2 className="text-lg font-bold">{project.name}</h2>
                                        </div>
                                        {project.address && (
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {project.address}
                                            </p>
                                        )}
                                        {project.description && (
                                            <p className="text-sm text-slate-400 mt-2 line-clamp-2">{project.description}</p>
                                        )}
                                    </div>
                                    <span className={`badge ${st.color} ${st.bg} border-transparent text-xs shrink-0`}>
                                        {st.label}
                                    </span>
                                </div>

                                {/* Progress */}
                                <div className="mb-5">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-400 flex items-center gap-1">
                                            <TrendingUp className="w-3.5 h-3.5" /> Avancement global
                                        </span>
                                        <span className="font-bold text-primary">{Math.round(project.progress)}%</span>
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-1000"
                                            style={{ width: `${project.progress}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Timeline phases */}
                                {project.phases.length > 0 && (
                                    <div className="mb-5">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1">
                                            <Layers className="w-3.5 h-3.5" /> Phases du projet
                                        </h3>
                                        <div className="relative">
                                            {/* Timeline line */}
                                            <div className="absolute left-3 top-0 bottom-0 w-px bg-border-dark" />
                                            <div className="space-y-3 pl-8">
                                                {project.phases.map((phase) => {
                                                    const ps = PHASE_STATUS[phase.status] || PHASE_STATUS.A_FAIRE;
                                                    return (
                                                        <div key={phase.id} className="relative">
                                                            {/* Dot */}
                                                            <div className={`absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-surface-dark ${phase.status === "TERMINE" ? "bg-emerald-400" :
                                                                    phase.status === "EN_COURS" ? "bg-amber-400" : "bg-slate-600"
                                                                }`} />
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-sm font-medium">{phase.name}</p>
                                                                    <p className={`text-xs ${ps.color}`}>{ps.label} · {phase._count.tasks} tâches</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xs font-semibold text-primary">{Math.round(phase.progress)}%</p>
                                                                    <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full ${phase.status === "TERMINE" ? "bg-emerald-400" : "bg-primary"}`}
                                                                            style={{ width: `${phase.progress}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Meta grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border-dark/50">
                                    <div className="text-center p-2 rounded-lg bg-surface-dark-hover/50">
                                        <p className="text-lg font-bold text-emerald-400">{project._count.tasks}</p>
                                        <p className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5 mt-0.5">
                                            <CheckCircle2 className="w-3 h-3" /> Tâches
                                        </p>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-surface-dark-hover/50">
                                        <p className="text-lg font-bold text-blue-400">{project._count.dailyLogs}</p>
                                        <p className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5 mt-0.5">
                                            <Clock className="w-3 h-3" /> Journaux
                                        </p>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-surface-dark-hover/50">
                                        <p className={`text-lg font-bold ${project._count.incidents > 0 ? "text-orange-400" : "text-slate-400"}`}>
                                            {project._count.incidents}
                                        </p>
                                        <p className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5 mt-0.5">
                                            <AlertTriangle className="w-3 h-3" /> Incidents
                                        </p>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-surface-dark-hover/50">
                                        <p className="text-lg font-bold text-purple-400">{project._count.photos}</p>
                                        <p className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5 mt-0.5">
                                            <Image className="w-3 h-3" /> Photos
                                        </p>
                                    </div>
                                </div>

                                {/* Dates & Supervisor */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 pt-3 border-t border-border-dark/30 text-xs text-slate-500">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> Début : {formatDate(project.startDate)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> Fin prévue : {formatDate(project.estimatedEndDate)}
                                        </span>
                                    </div>
                                    {project.supervisor && (
                                        <span className="text-slate-400">
                                            Conducteur : <span className="text-white">{project.supervisor.firstName} {project.supervisor.lastName}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
