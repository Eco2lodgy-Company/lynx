import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getAuthorizedUser } from "@/lib/api-auth";
import sharp from "sharp";

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif', 'image/avif'];

export async function POST(req: NextRequest) {
    const user = await getAuthorizedUser();
    if (!user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    try {
        console.log("[Upload API] Parsing formData...");
        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: "Aucun fichier n'a été fourni" }, { status: 400 });
        }

        const uploadDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });

        const isImage = IMAGE_TYPES.includes(file.type.toLowerCase()) || 
                        /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif)$/i.test(file.name);

        let buffer = Buffer.from(await file.arrayBuffer());
        let filename: string;
        let url: string;

        if (isImage) {
            // Convert to WebP lightweight version regardless of original format
            const webpBuffer = await sharp(buffer)
                .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 75, effort: 4 })
                .toBuffer();

            const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');
            filename = `${Date.now()}-${baseName}.webp`;
            buffer = webpBuffer;
            console.log(
                `[Upload API] Image compressed: ${file.size} → ${webpBuffer.length} bytes (${Math.round(webpBuffer.length / file.size * 100)}%)`
            );
        } else {
            // Video or other binary — save as-is
            filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        }

        const path = join(uploadDir, filename);
        await writeFile(path, buffer);
        url = `/uploads/${filename}`;

        console.log("[Upload API] Success:", url);
        return NextResponse.json({ url });
    } catch (e) {
        console.error("[Upload API] Fatal error:", e);
        return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
    }
}
