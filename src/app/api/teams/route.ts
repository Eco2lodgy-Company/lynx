import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const teams = await prisma.team.findMany({
        include: {
            leader: { select: { id: true, firstName: true, lastName: true, role: true } },
            department: { select: { id: true, name: true } },
            members: {
                include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
            },
            _count: { select: { members: true } },
        },
        orderBy: { name: "asc" },
    });

    return NextResponse.json(teams);
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { name, description, leaderId, departmentId } = await req.json();
        if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

        const team = await prisma.team.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                leaderId: leaderId || null,
                departmentId: departmentId || null,
            },
        });

        return NextResponse.json(team, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
