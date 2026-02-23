"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, HardHat, ChevronRight } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Email ou mot de passe incorrect");
                setIsLoading(false);
                return;
            }

            // Fetch session to get role and redirect
            const res = await fetch("/lynx/api/auth/session");
            const session = await res.json();
            const role = session?.user?.role;

            const redirectMap: Record<string, string> = {
                ADMIN: "/admin/dashboard",
                CONDUCTEUR: "/conducteur/dashboard",
                CHEF_EQUIPE: "/chef-equipe/dashboard",
                CLIENT: "/client/dashboard",
                OUVRIER: "/ouvrier/dashboard",
            };

            router.push(redirectMap[role] || "/login");
            router.refresh();
        } catch {
            setError("Une erreur est survenue. Veuillez réessayer.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ultra Premium Background Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] animate-pulse stagger-2" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-500/5 rounded-full blur-[150px]" />

                {/* Advanced Grid Pattern */}
                <div
                    className="absolute inset-0 opacity-[0.05]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(0,180,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,255,0.2) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                        maskImage: "radial-gradient(circle at center, black 40%, transparent 80%)"
                    }}
                />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo & Branding - Enhanced */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-[2rem] mb-8 shadow-2xl shadow-primary/10 relative group">
                        <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <HardHat className="w-12 h-12 text-primary relative z-10" />
                    </div>
                    <h1 className="text-5xl font-bold tracking-tighter mb-3">
                        <span className="text-white">LYNX</span>
                        <span className="text-primary">.</span>
                    </h1>
                    <p className="text-[10px] text-primary font-bold tracking-[0.4em] uppercase opacity-70">
                        Smart Construction Management
                    </p>
                </div>

                {/* Login Card - Glassmorphism Evolution */}
                <div className="glass-effect rounded-[2.5rem] p-10 shadow-2xl shadow-black/80 animate-scale-up stagger-1 border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-1 h-6 bg-primary rounded-full" />
                        <h2 className="text-xl font-bold text-white tracking-tight">Accès Plateforme</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Error message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 animate-fade-in flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <p className="text-red-400 text-xs font-medium">{error}</p>
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-3">
                            <label
                                htmlFor="email"
                                className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1"
                            >
                                Identifiant Professionnel
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nom@ngs-platform.com"
                                className="input-field !bg-navy-900/60 !border-white/5 focus:!border-primary/50 text-base"
                                required
                                autoComplete="email"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-3">
                            <label
                                htmlFor="password"
                                className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1"
                            >
                                Clef d&apos;Accès
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-field !bg-navy-900/60 !border-white/5 focus:!border-primary/50 pr-14 text-base"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-all p-2 rounded-lg hover:bg-white/5"
                                    title={showPassword ? "Masquer" : "Afficher"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit - Premium Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full justify-center !py-4 text-sm font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Authentification...
                                </>
                            ) : (
                                <>
                                    Se Connecter
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer - Professional */}
                <div className="text-center mt-12 animate-fade-in stagger-3">
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.3em]">
                        © 2024 LYNX NGS Platform
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-4 opacity-30">
                        <div className="h-[1px] w-8 bg-slate-700" />
                        <HardHat className="w-4 h-4 text-slate-700" />
                        <div className="h-[1px] w-8 bg-slate-700" />
                    </div>
                </div>
            </div>
        </div>
    );
}
