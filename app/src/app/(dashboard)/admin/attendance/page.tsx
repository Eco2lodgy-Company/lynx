import AttendanceReport from "@/components/AttendanceReport";

export const metadata = { title: "Rapports de Pointage — Admin" };

export default function AdminAttendancePage() {
    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80 mb-1">Administration</p>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Archives & Rapports de Pointage</h1>
            </div>
            <AttendanceReport />
        </div>
    );
}
