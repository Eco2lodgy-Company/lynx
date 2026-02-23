"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Users,
    Plus,
    Edit2,
    Trash2,
    X,
    Loader2,
    Building2,
    ChevronDown,
    Search,
    UserCheck,
} from "lucide-react";

interface Department { id: string; name: string; description: string | null; _count: { users: number; teams: number } }
interface UserRef { id: string; firstName: string; lastName: string; role: string }
interface TeamMember { id: string; user: UserRef }
interface Team {
    id: string; name: string; description: string | null;
    leader: UserRef | null; leaderId: string | null;
    department: { id: string; name: string } | null; departmentId: string | null;
    members: TeamMember[];
    _count: { members: number }
}

export default function TeamsPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [users, setUsers] = useState<UserRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"teams" | "departments">("teams");
    const [search, setSearch] = useState("");

    // Department modal
    const [deptModal, setDeptModal] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [deptForm, setDeptForm] = useState({ name: "", description: "" });
    const [deptSaving, setDeptSaving] = useState(false);

    // Team modal
    const [teamModal, setTeamModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [teamForm, setTeamForm] = useState({ name: "", description: "", leaderId: "", departmentId: "" });
    const [teamSaving, setTeamSaving] = useState(false);

    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [error, setError] = useState("");

    const fetchAll = useCallback(async () => {
        const [dRes, tRes, uRes] = await Promise.all([
            fetch("/api/departments"),
            fetch("/api/teams"),
            fetch("/api/users"),
        ]);
        if (dRes.ok) setDepartments(await dRes.json());
        if (tRes.ok) setTeams(await tRes.json());
        if (uRes.ok) setUsers(await uRes.json());
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Departments ──
    const openDeptCreate = () => { setEditingDept(null); setDeptForm({ name: "", description: "" }); setError(""); setDeptModal(true); };
    const openDeptEdit = (d: Department) => { setEditingDept(d); setDeptForm({ name: d.name, description: d.description || "" }); setError(""); setDeptModal(true); };

    const saveDept = async () => {
        setDeptSaving(true); setError("");
        const url = editingDept ? `/api/departments/${editingDept.id}` : "/api/departments";
        const method = editingDept ? "PUT" : "POST";
        const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(deptForm) });
        if (!res.ok) { const d = await res.json(); setError(d.error || "Erreur"); }
        else { setDeptModal(false); fetchAll(); }
        setDeptSaving(false);
    };

    const deleteDept = async (id: string) => {
        await fetch(`/api/departments/${id}`, { method: "DELETE" });
        setDeleteConfirm(null); fetchAll();
    };

    // ── Teams ──
    const openTeamCreate = () => { setEditingTeam(null); setTeamForm({ name: "", description: "", leaderId: "", departmentId: "" }); setError(""); setTeamModal(true); };
    const openTeamEdit = (t: Team) => {
        setEditingTeam(t);
        setTeamForm({ name: t.name, description: t.description || "", leaderId: t.leaderId || "", departmentId: t.departmentId || "" });
        setError(""); setTeamModal(true);
    };

    const saveTeam = async () => {
        setTeamSaving(true); setError("");
        const url = editingTeam ? `/api/teams/${editingTeam.id}` : "/api/teams";
        const method = editingTeam ? "PUT" : "POST";
        const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(teamForm) });
        if (!res.ok) { const d = await res.json(); setError(d.error || "Erreur"); }
        else { setTeamModal(false); fetchAll(); }
        setTeamSaving(false);
    };

    const deleteTeam = async (id: string) => {
        await fetch(`/api/teams/${id}`, { method: "DELETE" });
        setDeleteConfirm(null); fetchAll();
    };

    const chefs = users.filter((u) => ["CHEF_EQUIPE", "CONDUCTEUR", "ADMIN"].includes(u.role));

    const filteredTeams = teams.filter((t) =>
        `${t.name} ${t.department?.name || ""}`.toLowerCase().includes(search.toLowerCase())
    );
    const filteredDepts = departments.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Administration</p>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Équipes & Départements</h1>
                    <p className="text-sm text-slate-400 mt-1">{teams.length} équipes · {departments.length} départements</p>
                </div>
                <button
                    onClick={activeTab === "teams" ? openTeamCreate : openDeptCreate}
                    className="btn-primary text-sm"
                >
                    <Plus className="w-4 h-4" />
                    {activeTab === "teams" ? "Nouvelle équipe" : "Nouveau département"}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-surface-dark rounded-xl border border-border-dark w-fit animate-fade-in stagger-1">
                <button
                    onClick={() => setActiveTab("teams")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "teams" ? "bg-primary/20 text-primary" : "text-slate-400 hover:text-white"}`}
                >
                    <Users className="w-4 h-4" /> Équipes
                </button>
                <button
                    onClick={() => setActiveTab("departments")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "departments" ? "bg-primary/20 text-primary" : "text-slate-400 hover:text-white"}`}
                >
                    <Building2 className="w-4 h-4" /> Départements
                </button>
            </div>

            {/* Search */}
            <div className="relative animate-fade-in stagger-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Rechercher ${activeTab === "teams" ? "une équipe" : "un département"}...`}
                    className="input-field pl-10 max-w-sm"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : activeTab === "teams" ? (
                /* ── TEAMS ── */
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 animate-fade-in stagger-2">
                    {filteredTeams.length === 0 ? (
                        <div className="col-span-full card text-center py-16">
                            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">Aucune équipe trouvée</p>
                            <button onClick={openTeamCreate} className="btn-primary text-sm mt-4">
                                <Plus className="w-4 h-4" /> Créer une équipe
                            </button>
                        </div>
                    ) : filteredTeams.map((team) => (
                        <div key={team.id} className="card hover:border-primary/30 transition-all group">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-white group-hover:text-primary transition-colors">{team.name}</h3>
                                    {team.department && (
                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                            <Building2 className="w-3 h-3" /> {team.department.name}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openTeamEdit(team)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg transition-colors" title="Modifier">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    {deleteConfirm === team.id ? (
                                        <div className="flex gap-1">
                                            <button onClick={() => deleteTeam(team.id)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">Oui</button>
                                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs bg-slate-500/20 text-slate-400 rounded">Non</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setDeleteConfirm(team.id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors" title="Supprimer">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {team.description && <p className="text-xs text-slate-400 line-clamp-2 mb-3">{team.description}</p>}

                            {team.leader && (
                                <div className="flex items-center gap-2 mb-3">
                                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="text-xs text-slate-400">
                                        Chef : <span className="text-white">{team.leader.firstName} {team.leader.lastName}</span>
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-border-dark/50">
                                <div className="flex -space-x-2">
                                    {team.members.slice(0, 5).map((m) => (
                                        <div key={m.id} className="w-7 h-7 rounded-full bg-primary/20 border-2 border-surface-dark flex items-center justify-center" title={`${m.user.firstName} ${m.user.lastName}`}>
                                            <span className="text-[9px] font-bold text-primary">{m.user.firstName[0]}{m.user.lastName[0]}</span>
                                        </div>
                                    ))}
                                    {team._count.members > 5 && (
                                        <div className="w-7 h-7 rounded-full bg-slate-700 border-2 border-surface-dark flex items-center justify-center">
                                            <span className="text-[9px] text-slate-400">+{team._count.members - 5}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs text-slate-500">{team._count.members} membre{team._count.members !== 1 ? "s" : ""}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* ── DEPARTMENTS ── */
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 animate-fade-in stagger-2">
                    {filteredDepts.length === 0 ? (
                        <div className="col-span-full card text-center py-16">
                            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">Aucun département trouvé</p>
                            <button onClick={openDeptCreate} className="btn-primary text-sm mt-4">
                                <Plus className="w-4 h-4" /> Créer un département
                            </button>
                        </div>
                    ) : filteredDepts.map((dept) => (
                        <div key={dept.id} className="card hover:border-primary/30 transition-all group">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-semibold text-white group-hover:text-primary transition-colors">{dept.name}</h3>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openDeptEdit(dept)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg transition-colors" title="Modifier">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    {deleteConfirm === dept.id ? (
                                        <div className="flex gap-1">
                                            <button onClick={() => deleteDept(dept.id)} className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">Oui</button>
                                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs bg-slate-500/20 text-slate-400 rounded">Non</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setDeleteConfirm(dept.id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors" title="Supprimer">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {dept.description && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{dept.description}</p>}
                            <div className="flex gap-4 mt-4 pt-3 border-t border-border-dark/50 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {dept._count.users} utilisateurs</span>
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {dept._count.teams} équipes</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Department Modal */}
            {deptModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeptModal(false)}>
                    <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border-dark">
                            <h2 className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> {editingDept ? "Modifier" : "Nouveau"} département</h2>
                            <button onClick={() => setDeptModal(false)} className="p-1 text-slate-400 hover:text-white" title="Fermer"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-lg p-3">{error}</p>}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Nom *</label>
                                <input type="text" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} className="input-field" placeholder="Ex: Génie Civil" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Description</label>
                                <textarea value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} className="input-field resize-none" rows={3} title="Description du département" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setDeptModal(false)} className="btn-secondary text-sm">Annuler</button>
                                <button onClick={saveDept} disabled={!deptForm.name.trim() || deptSaving} className="btn-primary text-sm">
                                    {deptSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Modal */}
            {teamModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setTeamModal(false)}>
                    <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border-dark">
                            <h2 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> {editingTeam ? "Modifier" : "Nouvelle"} équipe</h2>
                            <button onClick={() => setTeamModal(false)} className="p-1 text-slate-400 hover:text-white" title="Fermer"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-lg p-3">{error}</p>}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Nom *</label>
                                <input type="text" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} className="input-field" placeholder="Ex: Équipe Fondations" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400">Description</label>
                                <textarea value={teamForm.description} onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })} className="input-field resize-none" rows={3} title="Description de l'équipe" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Chef d&apos;équipe</label>
                                    <div className="relative">
                                        <select value={teamForm.leaderId} onChange={(e) => setTeamForm({ ...teamForm, leaderId: e.target.value })} className="input-field appearance-none" title="Chef d'équipe">
                                            <option value="">Aucun</option>
                                            {chefs.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400">Département</label>
                                    <div className="relative">
                                        <select value={teamForm.departmentId} onChange={(e) => setTeamForm({ ...teamForm, departmentId: e.target.value })} className="input-field appearance-none" title="Département">
                                            <option value="">Aucun</option>
                                            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setTeamModal(false)} className="btn-secondary text-sm">Annuler</button>
                                <button onClick={saveTeam} disabled={!teamForm.name.trim() || teamSaving} className="btn-primary text-sm">
                                    {teamSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
