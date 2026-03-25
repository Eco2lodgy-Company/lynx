import AttendanceReport from "@/components/AttendanceReport";

export const metadata = { title: "Rapports de Pointage — Conducteur" };

export default function ConducteurAttendancePage() {
    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Conducteur de Travaux</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Suivi des Pointages Équipes</h1>
            </div>
            <AttendanceReport />
        </div>
    );
}
