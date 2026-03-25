"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    MessageSquare,
    Search,
    Send,
    Loader2,
    Plus,
    X
} from "lucide-react";
import { useSession } from "next-auth/react";
import { assetUrl } from "@/lib/assets";

interface User {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
}

interface Message {
    id: string;
    content: string;
    createdAt: string;
    authorId: string;
    author: { firstName: string; lastName: string };
    attachments: { url: string; type: string }[];
}

interface Conversation {
    id: string;
    name: string | null;
    isGroup: boolean;
    updatedAt: string;
    members: { userId: string; user: { firstName: string; lastName: string } }[];
    messages: Message[];
}

export default function ChatInterface() {
    const { data: session } = useSession();
    const currentUser = session?.user;

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState("");

    const [showNewModal, setShowNewModal] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [convName, setConvName] = useState("");
    const [creating, setCreating] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchConversations = useCallback(async () => {
        const res = await fetch("/api/conversations");
        if (res.ok) {
            const data = await res.json();
            setConversations(data);
        }
        setLoadingConvs(false);
    }, []);

    useEffect(() => {
        const init = async () => {
            await fetchConversations();
        };
        init();
    }, [fetchConversations]);

    const fetchMessages = useCallback(async (convId: string) => {
        setLoadingMsgs(true);
        const res = await fetch(`/api/messages?conversationId=${convId}`);
        if (res.ok) {
            const data = await res.json();
            setMessages(data);
        }
        setLoadingMsgs(false);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        const load = async () => {
            if (selectedConv) {
                await fetchMessages(selectedConv);
            }
        };
        load();
    }, [selectedConv, fetchMessages]);

    // Poll messages every 5 seconds if a conversation is open
    useEffect(() => {
        if (!selectedConv) return;
        const interval = setInterval(() => {
            fetch(`/api/messages?conversationId=${selectedConv}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setMessages(data);
                });
        }, 5000);
        return () => clearInterval(interval);
    }, [selectedConv]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !selectedConv) return;

        setSending(true);
        const tempMsg = {
            id: 'temp-' + Date.now(),
            content: newMessage,
            createdAt: new Date().toISOString(),
            authorId: currentUser?.id || '',
            author: { firstName: currentUser?.name?.split(' ')[0] || '', lastName: '' },
            attachments: []
        };
        setMessages(prev => [...prev, tempMsg]);
        setNewMessage("");

        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

        const res = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId: selectedConv, content: tempMsg.content })
        });

        if (res.ok) {
            const finalMsg = await res.json();
            setMessages(prev => prev.map(m => m.id === tempMsg.id ? finalMsg : m));
            fetchConversations(); // Update latest message in list
        }
        setSending(false);
    };

    const handleCreateConversation = async () => {
        if (selectedUsers.length === 0) return;
        setCreating(true);
        const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                memberIds: selectedUsers,
                isGroup: selectedUsers.length > 1,
                name: selectedUsers.length > 1 ? convName || "Nouveau groupe" : undefined
            })
        });

        if (res.ok) {
            const newConv = await res.json();
            await fetchConversations();
            setSelectedConv(newConv.id);
            setShowNewModal(false);
            setSelectedUsers([]);
            setConvName("");
        }
        setCreating(false);
    };

    const openNewModal = async () => {
        setShowNewModal(true);
        const res = await fetch("/api/users");
        if (res.ok) {
            const data = await res.json();
            setUsers(data.filter((u: User) => u.id !== currentUser?.id));
        }
    };

    const getConvName = (conv: Conversation) => {
        if (conv.name) return conv.name;
        const others = conv.members.filter(m => m.userId !== currentUser?.id);
        if (others.length === 0) return "Moi-même";
        if (others.length === 1) return `${others[0].user.firstName} ${others[0].user.lastName}`;
        return others.map(m => m.user.firstName).join(', ');
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        if (new Date().toDateString() === d.toDateString()) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    };

    const filteredConvs = conversations.filter(c => getConvName(c).toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex h-[calc(100vh-12rem)] min-h-[500px] border border-white/5 rounded-2xl overflow-hidden bg-[#0d1626]">
            {/* Sidebar */}
            <div className="w-80 border-r border-white/5 flex flex-col bg-[#080d17]">
                <div className="p-4 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold">Messages</h2>
                        <button title="Nouvelle discussion" onClick={openNewModal} className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/50"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
                    {loadingConvs ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                    ) : filteredConvs.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 text-sm">Aucune discussion trouvée.</div>
                    ) : (
                        filteredConvs.map(conv => {
                            const lastMsg = conv.messages?.[0];
                            const isSelected = selectedConv === conv.id;
                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConv(conv.id)}
                                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-slate-800/50'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-[#0d1626]' : 'bg-slate-800 text-primary'}`}>
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-primary' : 'text-slate-200'}`}>{getConvName(conv)}</h3>
                                            {lastMsg && <span className="text-[10px] text-slate-500 shrink-0 ml-2">{formatTime(lastMsg.createdAt)}</span>}
                                        </div>
                                        <p className={`text-xs truncate ${isSelected ? 'text-primary/70' : 'text-slate-400'}`}>
                                            {lastMsg ? (`${lastMsg.authorId === currentUser?.id ? 'Vous: ' : ''}${lastMsg.content || 'Photo'}`) : 'Commencez à discuter...'}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-[#0d1626]">
                {selectedConv ? (
                    <>
                        <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-[#0a111c]">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-primary">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-200">{getConvName(conversations.find(c => c.id === selectedConv)!)}</h2>
                                <p className="text-xs text-slate-400">Discussion en temps réel</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loadingMsgs ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                            ) : messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                    <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                                    <p>Envoyez le premier message !</p>
                                </div>
                            ) : (
                                messages.map((msg, i) => {
                                    const isMe = msg.authorId === currentUser?.id;
                                    const showName = !isMe && (i === 0 || messages[i-1].authorId !== msg.authorId);
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            {showName && (
                                                <span className="text-[10px] text-slate-500 mb-1 ml-2">
                                                    {msg.author?.firstName} {msg.author?.lastName}
                                                </span>
                                            )}
                                            <div className="flex items-end gap-2 max-w-[75%]">
                                                {!isMe && (
                                                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-primary shrink-0 mb-1">
                                                        {msg.author?.firstName?.charAt(0)}
                                                    </div>
                                                )}
                                                <div className={`p-3 rounded-2xl ${isMe ? 'bg-primary text-[#0d1626] rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm'}`}>
                                                    {(() => {
                                                        let atts = msg.attachments;
                                                        if (typeof atts === 'string') {
                                                            try { atts = JSON.parse(atts); } catch { atts = []; }
                                                        }
                                                        if (!Array.isArray(atts) || atts.length === 0) return null;
                                                        return (
                                                            <div className="flex flex-wrap gap-2 mb-2">
                                                                {atts.map((att: { url: string; type?: string }) => (
                                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                                    <img key={att.url} src={assetUrl(att.url)} alt="" className="max-w-xs max-h-48 rounded-lg object-contain bg-black/20" />
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                    {msg.content && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                                                </div>
                                            </div>
                                            <span className="text-[9px] text-slate-500 mt-1 mx-8">{formatTime(msg.createdAt)}</span>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t border-white/5 bg-[#0a111c]">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Écrivez un message..."
                                    className="flex-1 bg-slate-800/50 border border-white/5 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-primary/50 text-slate-200"
                                />
                                <button
                                    title="Envoyer"
                                    type="submit"
                                    disabled={!newMessage.trim() || sending}
                                    className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-[#0d1626] disabled:opacity-50 hover:bg-primary/90 transition-colors shrink-0"
                                >
                                    <Send className="w-5 h-5 ml-1" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-[#0a111c]">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-10" />
                        <h3 className="text-xl font-medium text-slate-300 mb-2">Vos Messages</h3>
                        <p className="text-sm">Sélectionnez une discussion pour commencer à échanger.</p>
                    </div>
                )}
            </div>

            {/* New Conversation Modal */}
            {showNewModal && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0d1626] rounded-[2rem] border border-white/10 w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Nouvelle Discussion</h2>
                            <button title="Fermer" onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {selectedUsers.length > 1 && (
                            <div className="mb-4">
                                <label className="block text-xs uppercase text-slate-500 font-bold mb-2">Nom du groupe (Optionnel)</label>
                                <input 
                                    className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-sm focus:outline-none focus:border-primary/50"
                                    placeholder="Ex: Équipe Chantier A"
                                    value={convName}
                                    onChange={e => setConvName(e.target.value)}
                                />
                            </div>
                        )}

                        <label className="block text-xs uppercase text-slate-500 font-bold mb-2">Sélectionner les participants</label>
                        <div className="max-h-60 overflow-y-auto bg-slate-800/50 rounded-xl border border-white/5 mb-6">
                            {users.map(u => {
                                const isSelected = selectedUsers.includes(u.id);
                                return (
                                    <button
                                        key={u.id}
                                        onClick={() => setSelectedUsers(prev => isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                                        className="w-full flex items-center gap-3 p-3 border-b border-white/5 last:border-0 hover:bg-white/5"
                                    >
                                        <div className={`w-5 h-5 rounded overflow-hidden border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-[#0d1626]' : 'border-slate-600'}`}>
                                            {isSelected && <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                        </div>
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 text-xs font-bold">
                                            {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                                        </div>
                                        <div className="text-left flex-1">
                                            <p className="font-semibold text-sm">{u.firstName} {u.lastName}</p>
                                            <p className="text-[10px] text-slate-400 capitalize">{u.role}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <button 
                            onClick={handleCreateConversation} 
                            disabled={selectedUsers.length === 0 || creating}
                            className="w-full btn-primary py-3 flex justify-center items-center"
                        >
                            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer la discussion"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
