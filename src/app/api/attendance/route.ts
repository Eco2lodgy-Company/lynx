import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/attendance — Liste des pointages
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const now = new Date();
    const todayStr = (dateStr ? new Date(dateStr) : now).toISOString().split("T")[0];
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    const attendance = await prisma.attendance.findMany({
        where: {
            date: { gte: startOfDay, lt: endOfDay },
        },
        include: {
            user: {
                select: { id: true, firstName: true, lastName: true, role: true, department: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(attendance);
}

// POST /api/attendance — Créer un pointage
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CHEF_EQUIPE"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { userId, date, status, checkIn, checkOut, notes } = body;

        if (!userId || !date || !status) {
            return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
        }

        const dateObj = new Date(date);
        const dateStr = dateObj.toISOString().split("T")[0];
        const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);

        // Check duplicate
        const existing = await prisma.attendance.findFirst({
            where: { userId, date: startOfDay },
        });

        if (existing) {
            // Update existing
            const updated = await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                    status,
                    checkIn: checkIn ? new Date(checkIn) : null,
                    checkOut: checkOut ? new Date(checkOut) : null,
                    notes: notes || null,
                },
                include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
            });
            return NextResponse.json(updated);
        }

        const attendance = await prisma.attendance.create({
            data: {
                userId,
                date: startOfDay,
                status,
                checkIn: checkIn ? new Date(checkIn) : null,
                checkOut: checkOut ? new Date(checkOut) : null,
                notes: notes || null,
            },
            include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
        });

        return NextResponse.json(attendance, { status: 201 });
    } catch (error) {
        console.error("Error creating attendance:", error);
        return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }
}
