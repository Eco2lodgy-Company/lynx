import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import { SessionProvider } from "next-auth/react";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    return (
        <SessionProvider session={session}>
            <div className="min-h-screen bg-background-dark">
                <Sidebar
                    userRole={session.user.role}
                    userName={session.user.name || "Utilisateur"}
                    userAvatar={session.user.image}
                />
                {/* Main Content */}
                <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen">
                    <div className="p-6 lg:p-8">{children}</div>
                </main>
            </div>
        </SessionProvider>
    );
}
