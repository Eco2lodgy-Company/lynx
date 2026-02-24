import {
    Settings,
    Shield,
    Bell,
    Database,
    Info,
    CheckCircle2,
} from "lucide-react";

export const metadata = { title: "Paramètres — Administration" };

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Administration</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Paramètres</h1>
                <p className="text-sm text-slate-400 mt-1">Configuration générale de la plateforme LYNX</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* App Info */}
                <div className="card animate-fade-in stagger-1">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                            <Info className="w-5 h-5" />
                        </div>
                        <h2 className="font-semibold">Informations de l&apos;application</h2>
                    </div>
                    <div className="space-y-3 text-sm">
                        {[
                            { label: "Nom", value: "ECOTECH Platform — powered by NGS" },
                            { label: "Version", value: "1.0.0" },
                            { label: "Framework", value: "Next.js 16 (App Router)" },
                            { label: "Base de données", value: "SQLite (dev) / PostgreSQL (prod)" },
                            { label: "ORM", value: "Prisma 6" },
                            { label: "Authentification", value: "NextAuth.js v5" },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between py-2 border-b border-border-dark/50 last:border-0">
                                <span className="text-slate-400">{item.label}</span>
                                <span className="font-medium text-slate-200">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Security */}
                <div className="card animate-fade-in stagger-2">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h2 className="font-semibold">Sécurité</h2>
                    </div>
                    <div className="space-y-3">
                        {[
                            { label: "Authentification JWT", active: true },
                            { label: "Contrôle d'accès basé sur les rôles (RBAC)", active: true },
                            { label: "Sessions sécurisées (HttpOnly cookies)", active: true },
                            { label: "Validation des données (Zod)", active: true },
                            { label: "Protection CSRF", active: true },
                            { label: "Hachage des mots de passe (bcrypt)", active: true },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center gap-3 py-2 border-b border-border-dark/50 last:border-0">
                                <CheckCircle2 className={`w-4 h-4 shrink-0 ${item.active ? "text-emerald-400" : "text-slate-600"}`} />
                                <span className={`text-sm ${item.active ? "text-slate-200" : "text-slate-500"}`}>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notifications */}
                <div className="card animate-fade-in stagger-3">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                            <Bell className="w-5 h-5" />
                        </div>
                        <h2 className="font-semibold">Notifications</h2>
                    </div>
                    <div className="space-y-4">
                        {[
                            { label: "Alertes tâches en retard", desc: "Notifier les chefs d'équipe des tâches dépassées" },
                            { label: "Nouveaux incidents", desc: "Alerter le conducteur lors d'un incident signalé" },
                            { label: "Rapports publiés", desc: "Notifier le client lors de la publication d'un rapport" },
                            { label: "Demandes client", desc: "Alerter le conducteur lors d'une nouvelle demande" },
                        ].map((item) => (
                            <div key={item.label} className="flex items-start justify-between gap-3 py-2 border-b border-border-dark/50 last:border-0">
                                <div>
                                    <p className="text-sm font-medium">{item.label}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                                </div>
                                <div className="w-10 h-5 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-end pr-0.5 shrink-0 mt-0.5">
                                    <div className="w-4 h-4 rounded-full bg-primary" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-4 italic">Configuration des notifications — fonctionnalité à venir en Phase 7</p>
                </div>

                {/* Database */}
                <div className="card animate-fade-in stagger-4">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                            <Database className="w-5 h-5" />
                        </div>
                        <h2 className="font-semibold">Base de données</h2>
                    </div>
                    <div className="space-y-3 text-sm">
                        {[
                            { label: "Statut", value: "Connectée", color: "text-emerald-400" },
                            { label: "Environnement", value: "Développement (SQLite)", color: "text-amber-400" },
                            { label: "Schéma Prisma", value: "v1.0 — 18 modèles", color: "text-slate-200" },
                            { label: "Migrations", value: "db push (dev)", color: "text-slate-200" },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between py-2 border-b border-border-dark/50 last:border-0">
                                <span className="text-slate-400">{item.label}</span>
                                <span className={`font-medium ${item.color}`}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                        <p className="text-xs text-blue-300">
                            <strong>Phase 7 :</strong> Migration vers PostgreSQL prévue pour la production.
                        </p>
                    </div>
                </div>
            </div>

            {/* Roles */}
            <div className="card animate-fade-in stagger-4">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                        <Settings className="w-5 h-5" />
                    </div>
                    <h2 className="font-semibold">Rôles & Permissions</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border-dark">
                                <th className="text-left py-2 pr-4 text-slate-400 font-medium">Rôle</th>
                                <th className="text-center py-2 px-2 text-slate-400 font-medium">Dashboard</th>
                                <th className="text-center py-2 px-2 text-slate-400 font-medium">Projets</th>
                                <th className="text-center py-2 px-2 text-slate-400 font-medium">Utilisateurs</th>
                                <th className="text-center py-2 px-2 text-slate-400 font-medium">Rapports</th>
                                <th className="text-center py-2 px-2 text-slate-400 font-medium">Planning</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { role: "ADMIN", color: "text-red-400", perms: [true, true, true, true, true] },
                                { role: "CONDUCTEUR", color: "text-amber-400", perms: [true, true, false, true, true] },
                                { role: "CHEF_EQUIPE", color: "text-blue-400", perms: [true, false, false, false, true] },
                                { role: "CLIENT", color: "text-emerald-400", perms: [true, true, false, true, false] },
                                { role: "OUVRIER", color: "text-slate-400", perms: [true, false, false, false, true] },
                            ].map((row) => (
                                <tr key={row.role} className="border-b border-border-dark/50 last:border-0">
                                    <td className={`py-3 pr-4 font-semibold ${row.color}`}>{row.role}</td>
                                    {row.perms.map((p, i) => (
                                        <td key={i} className="py-3 px-2 text-center">
                                            {p
                                                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                                                : <span className="text-slate-700 text-lg leading-none">—</span>
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
