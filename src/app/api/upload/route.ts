import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const relativeUploadDir = `/uploads/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, "0")}`;
        const uploadDir = join(process.cwd(), "public", relativeUploadDir);

        await mkdir(uploadDir, { recursive: true });

        // Sanitize filename
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const uniqueName = `${Date.now()}-${safeName}`;
        const filePath = join(uploadDir, uniqueName);

        await writeFile(filePath, buffer);

        const url = `${relativeUploadDir}/${uniqueName}`;
        return NextResponse.json({ url });
    } catch (e) {
        console.error("Upload error:", e);
        return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
    }
}
