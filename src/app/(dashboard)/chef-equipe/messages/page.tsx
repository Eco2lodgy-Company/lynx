"use client";

import ChatInterface from "@/components/ChatInterface";
import { MessageSquare } from "lucide-react";

export default function ChefMessagesPage() {
    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
            <div className="animate-fade-in shrink-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Espace Chef d&apos;équipe</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-3">
                    <MessageSquare className="w-8 h-8 text-primary" />
                    Messages
                </h1>
                <p className="text-sm text-slate-400 mt-1">Discussions et canaux de chantier</p>
            </div>
            <div className="animate-scale-up stagger-1 flex-1 min-h-0">
                <ChatInterface />
            </div>
        </div>
    );
}
