import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "CHEF_EQUIPE") {
        return NextResponse.json({ error: "Seul un chef d'équipe peut valider le pointage" }, { status: 403 });
    }

    try {
        const { attendanceIds } = await req.json();
        console.log("Validation request for IDs:", attendanceIds);
        if (!Array.isArray(attendanceIds)) {
            return NextResponse.json({ error: "Liste d'IDs invalide" }, { status: 400 });
        }

        const result = await prisma.attendance.updateMany({
            where: {
                id: { in: attendanceIds },
                status: "EN_ATTENTE"
            },
            data: {
                status: "VALIDE",
                validatedById: session.user.id,
                updatedAt: new Date()
            }
        });

        console.log("Validation result count:", result.count);

        return NextResponse.json({
            success: true,
            count: result.count,
            validatedBy: session.user.name
        });
    } catch (error) {
        console.error("Attendance validation error:", error);
        return NextResponse.json({
            error: "Erreur lors de la validation",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
