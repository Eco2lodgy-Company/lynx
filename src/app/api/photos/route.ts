import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthorizedUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const isClient = user.role === "CLIENT";
    const isAdmin = user.role === "ADMIN";
    const isConducteur = user.role === "CONDUCTEUR";

    let photoWhere: any = {};
    let feedbackWhere: any = {};

    if (isClient) {
        photoWhere = { 
            project: { clientId: user.id },
            OR: [
                { dailyLog: { status: "VALIDE" } },
                { report: { status: "PUBLIE" } }
            ]
        };
        feedbackWhere = {
            imageUrl: { not: null },
            feedback: { project: { clientId: user.id } }
        };
    } else if (isConducteur) {
        // Conducteur sees photos from projects they supervise
        const projectFilter = { supervisorId: user.id };
        photoWhere = { project: projectFilter };
        feedbackWhere = {
            imageUrl: { not: null },
            feedback: { project: projectFilter }
        };
    } else if (isAdmin) {
        // Admin sees everything
        photoWhere = {};
        feedbackWhere = { imageUrl: { not: null } };
    } else {
        // Other roles (Workers) see photos from their assigned projects
        const workerFilter = {
            OR: [
                { projectTeams: { some: { team: { leaderId: user.id } } } },
                { projectTeams: { some: { team: { members: { some: { userId: user.id } } } } } }
            ]
        };
        photoWhere = { project: workerFilter };
        feedbackWhere = {
            imageUrl: { not: null },
            feedback: { project: workerFilter }
        };
    }

    // 1. Fetch report photos
    const reportPhotos = await prisma.photo.findMany({
        where: photoWhere,
        include: {
            project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    // 2. Fetch feedback reply photos
    const feedbackPhotos = await prisma.feedbackReply.findMany({
        where: feedbackWhere,
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
    const user = await getAuthorizedUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

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
                uploadedById: user.id,
            },
            include: { project: { select: { id: true, name: true } } },
        });

        return NextResponse.json(photo, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
