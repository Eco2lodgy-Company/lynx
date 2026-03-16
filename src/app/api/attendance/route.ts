import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

// GET /api/attendance — Liste des pointages
export async function GET(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const now = new Date();
    const todayStr = (dateStr ? new Date(dateStr) : now).toISOString().split("T")[0];
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    // Worker only sees their own record
    const where: { date: { gte: Date; lt: Date }; userId?: string } = {
        date: { gte: startOfDay, lt: endOfDay },
    };
    if (user.role === "OUVRIER") {
        where.userId = user.id;
    }

    const attendance = await prisma.attendance.findMany({
        where,
        include: {
            user: {
                select: { id: true, firstName: true, lastName: true, role: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(attendance);
}

// POST /api/attendance — Créer ou mettre à jour un pointage
export async function POST(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    try {
        const body = await req.json();
        const { userId, date, status, checkIn, checkOut, notes, latitude, longitude } = body;

        // Security check: Workers can only update their own record
        const targetUserId = userId || user.id;
        if (user.role === "OUVRIER" && targetUserId !== user.id) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        const dateObj = new Date(date || new Date());
        const dateStr = dateObj.toISOString().split("T")[0];
        const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);

        // Check duplicate
        const existing = await prisma.attendance.findFirst({
            where: { userId: targetUserId, date: startOfDay },
        });

        // Workers cannot force status
        const finalStatus = user.role === "OUVRIER" ? (existing?.status || "EN_ATTENTE") : (status || "VALIDE");

        if (existing) {
            const updateData: any = {
                status: finalStatus,
                notes: notes || existing.notes,
                latitude: latitude !== undefined ? latitude : existing.latitude,
                longitude: longitude !== undefined ? longitude : existing.longitude,
                projectId: projectId || existing.projectId,
            };

            if (checkIn) updateData.checkIn = new Date(checkIn);
            if (checkOut) updateData.checkOut = new Date(checkOut);

            const updated = await prisma.attendance.update({
                where: { id: existing.id },
                data: updateData,
                include: { 
                    user: { select: { id: true, firstName: true, lastName: true, role: true } },
                    project: { select: { name: true } }
                },
            });
            return NextResponse.json(updated);
        }

        const attendance = await prisma.attendance.create({
            data: {
                userId: targetUserId,
                date: startOfDay,
                status: finalStatus,
                checkIn: checkIn ? new Date(checkIn) : null,
                checkOut: checkOut ? new Date(checkOut) : null,
                notes: notes || null,
                latitude: latitude || null,
                longitude: longitude || null,
                projectId: projectId || null,
            },
            include: { 
                user: { select: { id: true, firstName: true, lastName: true, role: true } },
                project: { select: { name: true } }
            },
        });

        return NextResponse.json(attendance, { status: 201 });
    } catch (error) {
        console.error("Error creating attendance:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
