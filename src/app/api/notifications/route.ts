import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/notifications — get notifications for the current user
export async function GET() {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const notifications = await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
    });

    return NextResponse.json(notifications);
}

// PUT /api/notifications — mark notifications as read
export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { ids } = await req.json();

    if (ids && Array.isArray(ids) && ids.length > 0) {
        // Mark specific notifications as read
        await prisma.notification.updateMany({
            where: { id: { in: ids }, userId: session.user.id },
            data: { isRead: true },
        });
    } else {
        // Mark all as read
        await prisma.notification.updateMany({
            where: { userId: session.user.id, isRead: false },
            data: { isRead: true },
        });
    }

    return NextResponse.json({ ok: true });
}
