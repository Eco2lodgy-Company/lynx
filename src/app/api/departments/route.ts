import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const departments = await prisma.department.findMany({
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: { users: true, teams: true },
            },
        },
    });

    return NextResponse.json(departments);
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    try {
        const { name, description } = await req.json();
        if (!name?.trim()) {
            return NextResponse.json({ error: "Nom requis" }, { status: 400 });
        }

        const dept = await prisma.department.create({
            data: { name: name.trim(), description: description?.trim() || null },
            include: { _count: { select: { users: true, teams: true } } },
        });

        return NextResponse.json(dept, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
