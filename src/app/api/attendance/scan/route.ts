import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const session = await auth();

    if (!session || session.user.role !== "CHEF_EQUIPE") {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { qrToken } = await req.json();

        if (!qrToken) {
            return new NextResponse("QR Token is required", { status: 400 });
        }

        const worker = await prisma.user.findUnique({
            where: { qrToken },
        });

        if (!worker) {
            return new NextResponse("Ouvrier non trouvé", { status: 404 });
        }

        const today = new Date();
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // Check if attendance already recorded today
        const existingAttendance = await prisma.attendance.findUnique({
            where: {
                userId_date: {
                    userId: worker.id,
                    date: todayDate,
                },
            },
        });

        if (existingAttendance) {
            return NextResponse.json({
                success: false,
                message: "Pointage déjà effectué aujourd'hui",
                worker: { firstName: worker.firstName, lastName: worker.lastName }
            }, { status: 200 });
        }

        const attendance = await prisma.attendance.create({
            data: {
                userId: worker.id,
                date: todayDate,
                checkIn: today,
                status: "PRESENT",
                notes: `Pointé par QR Code par ${session.user.name}`,
            },
        });

        return NextResponse.json({
            success: true,
            message: `Présence confirmée pour ${worker.firstName} ${worker.lastName}`,
            worker: { firstName: worker.firstName, lastName: worker.lastName },
            attendance,
        });
    } catch (error) {
        console.error("Attendance Scan Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
