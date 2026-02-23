import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const isClient = session.user.role === "CLIENT";

    // 1. Fetch report photos
    const reportPhotos = await prisma.photo.findMany({
        where: isClient
            ? { project: { clientId: session.user.id } }
            : undefined,
        include: {
            project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    // 2. Fetch feedback reply photos
    const feedbackPhotos = await prisma.feedbackReply.findMany({
        where: {
            imageUrl: { not: null },
            feedback: isClient
                ? { project: { clientId: session.user.id } }
                : undefined,
        },
        include: {
            feedback: {
                include: {
                    project: { select: { id: true, name: true } }
                }
            }
        },
        orderBy: { createdAt: "desc" },
    });

    // 3. Unify results
    const normalizedReportPhotos = reportPhotos.map((p: any) => ({
        id: p.id,
        url: p.url,
        caption: p.caption,
        latitude: p.latitude,
        longitude: p.longitude,
        takenAt: p.takenAt?.toISOString() || p.createdAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
        project: p.project,
        source: "REPORT" as const
    }));

    const normalizedFeedbackPhotos = feedbackPhotos.map((p: any) => ({
        id: p.id,
        url: p.imageUrl!,
        caption: p.content || "Image partagée dans la discussion",
        latitude: null,
        longitude: null,
        takenAt: p.createdAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
        project: p.feedback.project,
        source: "MESSAGE" as const
    }));

    const allPhotos = [...normalizedReportPhotos, ...normalizedFeedbackPhotos]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(allPhotos);
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    try {
        const { url, caption, projectId, latitude, longitude, takenAt } = await req.json();
        if (!url?.trim() || !projectId) {
            return NextResponse.json({ error: "URL et projet requis" }, { status: 400 });
        }

        const photo = await prisma.photo.create({
            data: {
                url: url.trim(),
                caption: caption?.trim() || null,
                projectId,
                latitude: latitude ?? null,
                longitude: longitude ?? null,
                takenAt: takenAt ? new Date(takenAt) : undefined,
                uploadedById: session.user.id,
            },
            include: { project: { select: { id: true, name: true } } },
        });

        return NextResponse.json(photo, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
