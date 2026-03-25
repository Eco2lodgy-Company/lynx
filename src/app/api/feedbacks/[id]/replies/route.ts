import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();

    if (!session || !["ADMIN", "CONDUCTEUR", "CLIENT"].includes(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const contentType = req.headers.get("content-type") || "";
        console.log("POST Feedback Reply:", { id, contentType, userId: session.user.id });

        let content = "";
        let imageUrl: string | null = null;

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            content = formData.get("content") as string || "";
            const file = formData.get("photo") as File | null;

            if (file && file.size > 0) {
                console.log("Processing photo:", file.name, "size:", file.size);
                const buffer = Buffer.from(await file.arrayBuffer());
                const relDir = `/uploads/chat/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, "0")}`;
                const uploadDir = join(process.cwd(), "public", relDir);
                await mkdir(uploadDir, { recursive: true });

                const ext = file.name.split(".").pop() || "jpg";
                const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
                const filePath = join(uploadDir, uniqueName);
                await writeFile(filePath, buffer);
                imageUrl = `${relDir}/${uniqueName}`;
                console.log("Photo saved at:", imageUrl);
            }
        } else {
            const body = await req.json();
            content = body.content || "";
        }

        if (!content && !imageUrl) {
            return NextResponse.json({ error: "Content or image is required" }, { status: 400 });
        }

        const reply = await prisma.feedbackReply.create({
            data: {
                content,
                imageUrl,
                feedbackId: id,
                authorId: session.user.id,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        avatar: true,
                    },
                },
            },
        });

        // Update feedback status if replied by Admin or Conducteur
        if (session.user.role === "ADMIN" || session.user.role === "CONDUCTEUR") {
            await prisma.feedback.update({
                where: { id },
                data: { status: "EN_COURS" }
            });
        }

        return NextResponse.json(reply);
    } catch (error) {
        console.error("Feedback Reply Error DETAILS:", error);
        return NextResponse.json({ error: "Internal Server Error", detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();

    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { id } = await params;
        const replies = await prisma.feedbackReply.findMany({
            where: { feedbackId: id },
            include: {
                author: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json(replies);
    } catch (error) {
        console.error("Fetch Feedback Replies Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
