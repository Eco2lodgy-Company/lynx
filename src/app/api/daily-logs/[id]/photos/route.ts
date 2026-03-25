import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// GET /api/daily-logs/[id]/photos — get all photos for a daily log
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id } = await params;
    const photos = await prisma.photo.findMany({
        where: { dailyLogId: id },
        include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { takenAt: "desc" },
    });

    return NextResponse.json(photos);
}

// POST /api/daily-logs/[id]/photos — upload a photo for a daily log
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;

    try {
        const formData = await req.formData();
        const file = formData.get("photo") as File | null;
        const caption = formData.get("caption") as string | null;
        const latitude = formData.get("latitude") as string | null;
        const longitude = formData.get("longitude") as string | null;
        const takenAt = formData.get("takenAt") as string | null;

        if (!file) {
            return NextResponse.json({ error: "Aucune photo fournie" }, { status: 400 });
        }

        // Verify daily log exists
        const log = await prisma.dailyLog.findUnique({ where: { id } });
        if (!log) {
            return NextResponse.json({ error: "Journal introuvable" }, { status: 404 });
        }

        // Save file
        const buffer = Buffer.from(await file.arrayBuffer());
        const relDir = `/uploads/photos/daily-logs/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, "0")}`;
        const uploadDir = join(process.cwd(), "public", relDir);
        await mkdir(uploadDir, { recursive: true });

        const ext = file.name.split(".").pop() || "jpg";
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filePath = join(uploadDir, uniqueName);
        await writeFile(filePath, buffer);

        const url = `${relDir}/${uniqueName}`;

        // Create photo record
        const photo = await prisma.photo.create({
            data: {
                url,
                caption: caption?.trim() || null,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                takenAt: takenAt ? new Date(takenAt) : new Date(),
                dailyLogId: id,
                uploadedById: session.user.id,
                projectId: log.projectId,
            },
            include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
        });

        return NextResponse.json(photo, { status: 201 });
    } catch (error) {
        console.error("Error uploading daily log photo:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// DELETE /api/daily-logs/[id]/photos — delete a photo (pass photoId in body)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || !["ADMIN", "CONDUCTEUR", "CHEF_EQUIPE"].includes(session.user.role)) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    await params; // consume
    const { photoId } = await req.json();
    if (!photoId) return NextResponse.json({ error: "photoId requis" }, { status: 400 });

    try {
        await prisma.photo.delete({ where: { id: photoId } });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Photo introuvable" }, { status: 404 });
    }
}

// PUT /api/daily-logs/[id]/photos — update photo caption
export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    try {
        const { photoId, caption } = await req.json();
        if (!photoId) return NextResponse.json({ error: "photoId requis" }, { status: 400 });

        const photo = await prisma.photo.update({
            where: { id: photoId },
            data: { caption: caption?.trim() || null },
        });

        return NextResponse.json(photo);
    } catch {
        return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
    }
}
