import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
    FolderKanban,
    FileText,
    Image,
    MessageSquare,
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ArrowRight,
} from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Tableau de bord — Client" };

async function getClientData(userId: string) {
    const [projects, reports, photos, feedbacks] = await Promise.all([
        prisma.project.findMany({
            where: { clientId: userId },
            include: {
                _count: { select: { tasks: true, incidents: true, photos: true } },
                supervisor: { select: { firstName: true, lastName: true } },
            },
            orderBy: { updatedAt: "desc" },
        }),
        prisma.report.findMany({
            where: { project: { clientId: userId }, status: "PUBLIE" },
            include: { project: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: 5,
        }),
        prisma.photo.count({ where: { project: { clientId: userId } } }),
        prisma.feedback.count({ where: { authorId: userId } }),
    ]);

    return { projects, reports, photos, feedbacks };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    PLANIFIE: { label: "Planifié", color: "text-blue-400", bg: "bg-blue-500/10" },
    EN_COURS: { label: "En cours", color: "text-amber-400", bg: "bg-amber-500/10" },
    EN_PAUSE: { label: "En pause", color: "text-orange-400", bg: "bg-orange-500/10" },
    TERMINE: { label: "Terminé", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    ANNULE: { label: "Annulé", color: "text-red-400", bg: "bg-red-500/10" },
};

const TYPE_MAP: Record<string, string> = {
    HEBDOMADAIRE: "Hebdomadaire",
    MENSUEL: "Mensuel",
    INCIDENT: "Incident",
    AVANCEMENT: "Avancement",
};

export default async function ClientDashboard() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return null;

    const { projects, reports, photos, feedbacks } = await getClientData(userId);

    const activeProjects = projects.filter((p) => p.status === "EN_COURS").length;
    const completedProjects = projects.filter((p) => p.status === "TERMINE").length;

    const kpis = [
        {
            label: "Mes projets",
            value: projects.length,
            sub: `${activeProjects} en cours`,
            icon: <FolderKanban className="w-6 h-6" />,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            href: "/client/projects",
        },
        {
            label: "Rapports publiés",
            value: reports.length,
            sub: "Disponibles",
            icon: <FileText className="w-6 h-6" />,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            href: "/client/reports",
        },
        {
            label: "Photos chantier",
            value: photos,
            sub: "Galerie",
            icon: <Image className="w-6 h-6" />,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            href: "/client/gallery",
        },
        {
            label: "Mes demandes",
            value: feedbacks,
            sub: "Envoyées",
            icon: <MessageSquare className="w-6 h-6" />,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            href: "/client/messages",
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">
                    Espace Client
                </p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    Bienvenue, {session?.user?.name?.split(" ")[0]}
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    Suivez l&apos;avancement de vos projets en temps réel
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in stagger-1">
                {kpis.map((kpi, i) => (
                    <Link
                        key={kpi.label}
                        href={kpi.href}
                        className="card hover:border-primary/30 transition-all group cursor-pointer"
                        style={{ animationDelay: `${(i + 1) * 0.1}s` }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>
                                {kpi.icon}
                            </div>
                            <TrendingUp className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-2xl font-bold">{kpi.value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{kpi.sub}</p>
                        <p className="text-sm text-slate-400 mt-1">{kpi.label}</p>
                    </Link>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Projects List */}
                <div className="lg:col-span-2 card animate-fade-in stagger-2">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <FolderKanban className="w-5 h-5 text-primary" /> Mes projets
                        </h2>
                        <Link href="/client/projects" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                            Voir tout <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {projects.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <FolderKanban className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Aucun projet assigné</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {projects.slice(0, 4).map((project) => {
                                const st = STATUS_MAP[project.status] || STATUS_MAP.PLANIFIE;
                                return (
                                    <div key={project.id} className="p-4 rounded-xl bg-surface-dark-hover/50 border border-border-dark/50 hover:border-primary/20 transition-all">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="font-semibold text-sm">{project.name}</h3>
                                                {project.supervisor && (
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Conducteur : {project.supervisor.firstName} {project.supervisor.lastName}
                                                    </p>
                                                )}
                                            </div>
                                            <span className={`badge ${st.color} ${st.bg} border-transparent text-xs`}>
                                                {st.label}
                                            </span>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="mb-3">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-400">Progression</span>
                                                <span className="font-semibold text-primary">{Math.round(project.progress)}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-700"
                                                    style={{ width: `${project.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-4 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> {project._count.tasks} tâches
                                            </span>
                                            {project._count.incidents > 0 && (
                                                <span className="flex items-center gap-1 text-orange-400">
                                                    <AlertTriangle className="w-3 h-3" /> {project._count.incidents} incidents
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Image className="w-3 h-3" /> {project._count.photos} photos
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recent Reports */}
                <div className="card animate-fade-in stagger-3">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-400" /> Rapports récents
                        </h2>
                        <Link href="/client/reports" className="text-xs text-primary hover:underline">
                            Voir tout
                        </Link>
                    </div>

                    {reports.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">Aucun rapport disponible</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map((r) => (
                                <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-dark-hover transition-colors">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                                        <FileText className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium truncate">{r.title}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{r.project.name}</p>
                                        <p className="text-[10px] text-slate-600 mt-0.5">
                                            {TYPE_MAP[r.type] || r.type} · {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Summary stats */}
                    <div className="mt-5 pt-4 border-t border-border-dark space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> En cours</span>
                            <span className="font-semibold text-amber-400">{activeProjects}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Terminés</span>
                            <span className="font-semibold text-emerald-400">{completedProjects}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
