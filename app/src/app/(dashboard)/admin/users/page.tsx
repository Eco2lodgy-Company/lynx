"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Users,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Loader2,
    Shield,
    UserCheck,
    UserX,
    ChevronDown,
} from "lucide-react";

interface Department {
    id: string;
    name: string;
}

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
    department: Department | null;
    departmentId: string | null;
}

const ROLES = [
    { value: "ADMIN", label: "Administrateur", color: "text-red-400 bg-red-500/10" },
    { value: "CONDUCTEUR", label: "Conducteur", color: "text-blue-400 bg-blue-500/10" },
    { value: "CHEF_EQUIPE", label: "Chef d'équipe", color: "text-amber-400 bg-amber-500/10" },
    { value: "CLIENT", label: "Client", color: "text-purple-400 bg-purple-500/10" },
    { value: "OUVRIER", label: "Ouvrier", color: "text-emerald-400 bg-emerald-500/10" },
];

const emptyForm = {
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "OUVRIER",
    departmentId: "",
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        const res = await fetch("/api/users");
        const data = await res.json();
        setUsers(data);
        setLoading(false);
    }, []);

    const fetchDepartments = useCallback(async () => {
        const res = await fetch("/api/departments");
        const data = await res.json();
        setDepartments(data);
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
    }, [fetchUsers, fetchDepartments]);

    const openCreateModal = () => {
        setEditingUser(null);
        setForm(emptyForm);
        setError("");
        setShowModal(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setForm({
            email: user.email,
            password: "",
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone || "",
            role: user.role,
            departmentId: user.departmentId || "",
        });
        setError("");
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");

        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
            const method = editingUser ? "PUT" : "POST";

            const body: Record<string, unknown> = { ...form };
            if (editingUser && !form.password) delete body.password;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Erreur");
                setSaving(false);
                return;
            }

            setShowModal(false);
            fetchUsers();
        } catch {
            setError("Erreur réseau");
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        try {
            await fetch(`/api/users/${id}`, { method: "DELETE" });
            setDeleteConfirm(null);
            fetchUsers();
        } catch {
            setError("Erreur lors de la suppression");
        }
    };

    const handleToggleActive = async (user: User) => {
        await fetch(`/api/users/${user.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !user.isActive }),
        });
        fetchUsers();
    };

    const filteredUsers = users.filter((u) => {
        const matchSearch =
            `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase());
        const matchRole = !filterRole || u.role === filterRole;
        return matchSearch && matchRole;
    });

    const getRoleBadge = (role: string) => {
        const r = ROLES.find((x) => x.value === role);
        return r ? (
            <span className={`badge ${r.color} border-transparent`}>{r.label}</span>
        ) : (
            <span className="badge">{role}</span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">
                        Administration
                    </p>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Utilisateurs</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {users.length} utilisateur{users.length !== 1 ? "s" : ""} enregistré
                        {users.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <button onClick={openCreateModal} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" />
                    Nouvel utilisateur
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-in stagger-1">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un utilisateur..."
                        className="input-field pl-10"
                    />
                </div>
                <div className="relative">
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="input-field pr-10 appearance-none min-w-[180px]"
                    >
                        <option value="">Tous les rôles</option>
                        {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Users Table */}
            <div className="card !p-0 overflow-hidden animate-fade-in stagger-2">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">Aucun utilisateur trouvé</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border-dark text-left">
                                    <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Utilisateur</th>
                                    <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider hidden sm:table-cell">Email</th>
                                    <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Rôle</th>
                                    <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">Département</th>
                                    <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Statut</th>
                                    <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b border-border-dark/50 hover:bg-surface-dark-hover transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                                                    <span className="text-xs font-bold text-primary">
                                                        {user.firstName[0]}{user.lastName[0]}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                                                    <p className="text-xs text-slate-500 sm:hidden">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{user.email}</td>
                                        <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                                        <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                                            {user.department?.name || "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleToggleActive(user)}
                                                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${user.isActive
                                                        ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                                                        : "text-red-400 bg-red-500/10 hover:bg-red-500/20"
                                                    }`}
                                            >
                                                {user.isActive ? (
                                                    <><UserCheck className="w-3 h-3" /> Actif</>
                                                ) : (
                                                    <><UserX className="w-3 h-3" /> Inactif</>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="Modifier"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {deleteConfirm === user.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleDelete(user.id)}
                                                            className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                                                        >
                                                            Confirmer
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(null)}
                                                            className="px-2 py-1 text-xs bg-slate-500/20 text-slate-400 rounded"
                                                        >
                                                            Annuler
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeleteConfirm(user.id)}
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Create/Edit */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div
                        className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-border-dark">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-semibold">
                                    {editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
                                </h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Prénom *</label>
                                    <input
                                        type="text"
                                        value={form.firstName}
                                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Nom *</label>
                                    <input
                                        type="text"
                                        value={form.lastName}
                                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Email *</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">
                                    Mot de passe {editingUser ? "(laisser vide pour ne pas modifier)" : "*"}
                                </label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="input-field"
                                    required={!editingUser}
                                    minLength={6}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Téléphone</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    className="input-field"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Rôle *</label>
                                    <div className="relative">
                                        <select
                                            value={form.role}
                                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                                            className="input-field appearance-none"
                                            required
                                        >
                                            {ROLES.map((r) => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Département</label>
                                    <div className="relative">
                                        <select
                                            value={form.departmentId}
                                            onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                                            className="input-field appearance-none"
                                        >
                                            <option value="">Aucun</option>
                                            {departments.map((d) => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border-dark">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-sm">
                                    Annuler
                                </button>
                                <button type="submit" disabled={saving} className="btn-primary text-sm">
                                    {saving ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
                                    ) : editingUser ? (
                                        "Enregistrer"
                                    ) : (
                                        "Créer l'utilisateur"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
