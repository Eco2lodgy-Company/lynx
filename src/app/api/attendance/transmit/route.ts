import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "CHEF_EQUIPE") {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { date, attendanceIds } = await req.json();

        if (!attendanceIds || !Array.isArray(attendanceIds) || attendanceIds.length === 0) {
            return NextResponse.json({ error: "Aucun pointage à transmettre" }, { status: 400 });
        }

        // Récupérer les détails des pointages pour trouver les projets et superviseurs
        const attendances = await prisma.attendance.findMany({
            where: { id: { in: attendanceIds } },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            include: { project: true } as any
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projectIds = Array.from(new Set(attendances.map((a: any) => a.projectId).filter(Boolean))) as string[];

        // Trouver les conducteurs de travaux pour ces projets
        const projects = await prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: { supervisorId: true }
        });

        const conductorIds = Array.from(new Set(projects.map(p => p.supervisorId).filter(Boolean))) as string[];

        // Trouver tous les administrateurs
        const admins = await prisma.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true }
        });

        const adminIds = admins.map(a => a.id);

        // Fusionner les destinataires (Admins + Conducteurs concernés)
        const recipients = Array.from(new Set([...conductorIds, ...adminIds]));

        const title = "Pointage journalier transmis";
        const message = `${session.user.name} a transmis le pointage pour le ${new Date(date).toLocaleDateString('fr-FR')}. ${attendances.length} pointages enregistrés.`;

        // Créer les notifications
        const notificationsData = recipients.map(userId => ({
            userId,
            title,
            message,
            type: "VALIDATION",
            link: `/admin/attendance?date=${date}`,
            isRead: false
        }));

        if (notificationsData.length > 0) {
            await prisma.notification.createMany({
                data: notificationsData
            });
        }

        return NextResponse.json({
            success: true,
            recipientsCount: recipients.length,
            message: "Pointage transmis avec succès au conducteur et aux administrateurs."
        });
    } catch (error) {
        console.error("Attendance transmission error:", error);
        return NextResponse.json({ error: "Erreur lors de la transmission" }, { status: 500 });
    }
}
