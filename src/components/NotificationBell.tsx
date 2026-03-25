"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, CheckCheck, AlertTriangle, Info, CheckCircle2, ClipboardList } from "lucide-react";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    link: string | null;
    createdAt: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
    ALERTE: <AlertTriangle className="w-4 h-4 text-red-400" />,
    VALIDATION: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    TACHE: <ClipboardList className="w-4 h-4 text-blue-400" />,
    INCIDENT: <AlertTriangle className="w-4 h-4 text-orange-400" />,
    INFO: <Info className="w-4 h-4 text-blue-400" />,
};

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const panelRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) setNotifications(await res.json());
        } catch {
            // silently fail
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(() => {
            fetchNotifications();
            setNow(Date.now());
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isOpen]);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const markAllAsRead = async () => {
        await fetch("/api/notifications", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

    const handleClick = (n: Notification) => {
        // Mark as read
        if (!n.isRead) {
            fetch("/api/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: [n.id] }),
            });
            setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
        }
        if (n.link) {
            router.push(n.link);
            setIsOpen(false);
        }
    };

    const timeAgo = (d: string) => {
        const diff = now - new Date(d).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "À l'instant";
        if (mins < 60) return `Il y a ${mins}min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `Il y a ${hours}h`;
        const days = Math.floor(hours / 24);
        return `Il y a ${days}j`;
    };

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-slate-400 hover:text-primary transition-colors relative"
                title="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface-dark border border-border-dark rounded-2xl shadow-2xl z-[60] animate-fade-in overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border-dark">
                        <h3 className="font-semibold text-sm">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                                    title="Tout marquer comme lu"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" /> Tout lire
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-white" title="Fermer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">Aucune notification</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    className={`flex items-start gap-3 p-3 border-b border-border-dark/50 hover:bg-surface-dark-hover/50 transition-colors cursor-pointer ${!n.isRead ? "bg-primary/[0.03]" : ""}`}
                                >
                                    <div className="shrink-0 mt-0.5">
                                        {TYPE_ICON[n.type] || TYPE_ICON.INFO}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-xs font-medium truncate ${!n.isRead ? "text-white" : "text-slate-400"}`}>{n.title}</p>
                                            {!n.isRead && <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />}
                                        </div>
                                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                                        <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
