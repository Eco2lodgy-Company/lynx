import { NextRequest, NextResponse } from "next/server";
import prisma from "@lynx/prisma";
import { auth } from "@/lib/auth";
import { notifyAdminsAndSupervisor } from "@/lib/notifications";

// GET /api/advance-requests
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: any = {};
    if (projectId) where.projectId = projectId;

    if (session.user.role === "CHEF_EQUIPE") {
        where.userId = session.user.id;
    } else if (session.user.role === "CONDUCTEUR") {
        where.project = { supervisorId: session.user.id };
    }

    const requests = await prisma.advanceRequest.findMany({
        where,
        include: {
            user: { select: { firstName: true, lastName: true } },
            project: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(requests);
}

// POST /api/advance-requests (Req 7)
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || !["CHEF_EQUIPE", "ADMIN", "CONDUCTEUR"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { amount, reason, projectId } = await req.json();
        if (!amount || !reason || !projectId) {
            return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
        }

        const request = await prisma.advanceRequest.create({
            data: {
                amount: parseFloat(amount),
                reason,
                projectId,
                userId: session.user.id
            },
            include: {
                user: { select: { firstName: true, lastName: true } },
                project: { select: { name: true } }
            }
        });

        // Notify Admins and Supervisor
        await notifyAdminsAndSupervisor({
            projectId,
            title: "💰 Nouvelle demande d'avance",
            message: `${request.user.firstName} demande ${amount}€ pour : ${reason}`,
            type: "ALERTE",
            link: `/admin/advances`,
            excludeUserId: session.user.id
        });

        return NextResponse.json(request, { status: 201 });
    } catch (error) {
        console.error("Error creating advance request:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
