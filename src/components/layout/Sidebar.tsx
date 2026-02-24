"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import NotificationBell from "@/components/NotificationBell";
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    ClipboardList,
    Clock,
    FileText,
    AlertTriangle,
    Calendar,
    Settings,
    LogOut,
    Menu,
    X,
    HardHat,
    CheckSquare,
    MessageSquare,
    BarChart3,
    Image,
    Building2,
} from "lucide-react";

interface SidebarProps {
    userRole: string;
    userName: string;
    userAvatar?: string | null;
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const navItemsByRole: Record<string, NavItem[]> = {
    ADMIN: [
        { label: "Tableau de bord", href: "/admin/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Utilisateurs", href: "/admin/users", icon: <Users className="w-5 h-5" /> },
        { label: "Projets", href: "/admin/projects", icon: <FolderKanban className="w-5 h-5" /> },
        { label: "Équipes", href: "/admin/teams", icon: <Building2 className="w-5 h-5" /> },
        { label: "Pointage", href: "/admin/attendance", icon: <Clock className="w-5 h-5" /> },
        { label: "Rapports", href: "/admin/reports", icon: <FileText className="w-5 h-5" /> },
        { label: "Demandes Clients", href: "/admin/feedbacks", icon: <MessageSquare className="w-5 h-5" /> },
        { label: "Statistiques", href: "/admin/stats", icon: <BarChart3 className="w-5 h-5" /> },
        { label: "Planning", href: "/admin/planning", icon: <Calendar className="w-5 h-5" /> },
        { label: "Paramètres", href: "/admin/settings", icon: <Settings className="w-5 h-5" /> },
    ],
    CONDUCTEUR: [
        { label: "Tableau de bord", href: "/conducteur/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Projets", href: "/conducteur/projects", icon: <FolderKanban className="w-5 h-5" /> },
        { label: "Tâches", href: "/conducteur/tasks", icon: <CheckSquare className="w-5 h-5" /> },
        { label: "Validations", href: "/conducteur/validations", icon: <CheckSquare className="w-5 h-5" /> },
        { label: "Planning", href: "/conducteur/planning", icon: <Calendar className="w-5 h-5" /> },
        { label: "Incidents", href: "/conducteur/incidents", icon: <AlertTriangle className="w-5 h-5" /> },
        { label: "Pointage", href: "/conducteur/attendance", icon: <Clock className="w-5 h-5" /> },
        { label: "Rapports", href: "/conducteur/reports", icon: <FileText className="w-5 h-5" /> },
        { label: "Demandes Clients", href: "/conducteur/feedbacks", icon: <MessageSquare className="w-5 h-5" /> },
    ],
    CHEF_EQUIPE: [
        { label: "Tableau de bord", href: "/chef-equipe/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Pointage", href: "/chef-equipe/attendance", icon: <Clock className="w-5 h-5" /> },
        { label: "Journal", href: "/chef-equipe/daily-logs", icon: <ClipboardList className="w-5 h-5" /> },
        { label: "Tâches", href: "/chef-equipe/tasks", icon: <CheckSquare className="w-5 h-5" /> },
        { label: "Incidents", href: "/chef-equipe/incidents", icon: <AlertTriangle className="w-5 h-5" /> },
    ],
    CLIENT: [
        { label: "Tableau de bord", href: "/client/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Mes Projets", href: "/client/projects", icon: <FolderKanban className="w-5 h-5" /> },
        { label: "Rapports", href: "/client/reports", icon: <FileText className="w-5 h-5" /> },
        { label: "Galerie", href: "/client/gallery", icon: <Image className="w-5 h-5" /> },
        { label: "Messages", href: "/client/messages", icon: <MessageSquare className="w-5 h-5" /> },
    ],
    OUVRIER: [
        { label: "Tableau de bord", href: "/ouvrier/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Mes Tâches", href: "/ouvrier/tasks", icon: <CheckSquare className="w-5 h-5" /> },
        { label: "Planning", href: "/ouvrier/planning", icon: <Calendar className="w-5 h-5" /> },
    ],
};

export default function Sidebar({ userRole, userName, userAvatar }: SidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const navItems = navItemsByRole[userRole] || [];

    const initials = userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <>
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-surface-dark/95 backdrop-blur-xl border-b border-border-dark z-50 flex items-center justify-between px-4">
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 text-slate-400 hover:text-primary transition-colors"
                    title="Ouvrir le menu"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                    <HardHat className="w-6 h-6 text-primary" />
                    <span className="text-lg font-bold text-primary">ECOTECH</span>
                </div>
                <NotificationBell />
            </header>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 z-50"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-72 bg-navy-900 border-r border-border-dark z-50 flex flex-col transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)
          lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"} shadow-2xl shadow-black/50`}
            >
                {/* Logo Section with Premium Gradient */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-border-dark bg-navy-800/50 backdrop-blur-sm">
                    <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                            <HardHat className="w-6 h-6 text-navy-900" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-widest flex items-center gap-1">
                                ECOTECH <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                            </h1>
                            <p className="text-[9px] text-primary/60 font-bold tracking-[0.2em] uppercase">NGS Platform</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden p-2 text-slate-400 hover:text-primary hover:bg-white/5 rounded-xl transition-all"
                        title="Fermer le menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation with Staggered Groups */}
                <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-6">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 px-4 mb-4 opacity-50">
                            Menu Principal
                        </p>
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`nav-link relative group ${isActive ? "active" : ""}`}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full animate-fade-in" />
                                    )}
                                    <div className={`p-2 rounded-lg transition-colors ${isActive ? "text-primary bg-primary/10" : "text-slate-500 group-hover:text-primary group-hover:bg-primary/5"}`}>
                                        {item.icon}
                                    </div>
                                    <span className={`flex-1 font-medium transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* User Profile & Logout - Fixed at bottom */}
                <div className="p-4 bg-navy-800/30 border-t border-border-dark backdrop-blur-md">
                    <Link
                        href="/profile"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-4 mb-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-white/10 transition-all group overflow-hidden relative"
                    >
                        {/* Status Indicator */}
                        <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />

                        <div className="relative">
                            {userAvatar ? (
                                <img
                                    src={userAvatar}
                                    alt={`Avatar de ${userName}`}
                                    className="w-12 h-12 rounded-xl object-cover border-2 border-white/10 group-hover:border-primary/50 transition-all duration-300 shadow-lg"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 border-2 border-white/10 flex items-center justify-center group-hover:border-primary/50 transition-all duration-300 shadow-lg">
                                    <span className="text-sm font-bold text-primary">{initials}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{userName}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                {userRole === "ADMIN" && "Administrateur"}
                                {userRole === "CONDUCTEUR" && "Conducteur"}
                                {userRole === "CHEF_EQUIPE" && "Chef d'équipe"}
                                {userRole === "CLIENT" && "Client"}
                                {userRole === "OUVRIER" && "Ouvrier"}
                            </p>
                        </div>
                    </Link>

                    <button
                        onClick={() => signOut({ callbackUrl: "/lynx/login" })}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 shadow-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Se déconnecter
                    </button>
                </div>
            </aside >
        </>
    );
}
