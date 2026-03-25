import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { generatePresignedUrl, R2_PUBLIC_URL } from "../upload/s3";
import crypto from "crypto";

const router = Router();

// POST /api/upload/presigned
router.post("/presigned", authMiddleware, async (req: AuthRequest, res: any) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ error: "Filename et contentType requis" });
    }

    // Generate a unique filename to avoid collisions
    const rawExtension = filename.split('.').pop() || '';
    const extension = rawExtension === filename ? '' : `.${rawExtension}`;
    const uniqueFileName = `${crypto.randomUUID()}${extension}`;
    
    // For organization: images/ uuid .png
    const objectKey = `uploads/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${uniqueFileName}`;

    const presignedUrl = await generatePresignedUrl(objectKey, contentType);
    
    // La publicUrl est l'URL où l'image sera accessible après l'upload
    const publicUrl = `${R2_PUBLIC_URL}/${objectKey}`;

    return res.status(200).json({
      presignedUrl,
      publicUrl,
      objectKey
    });
  } catch (error) {
    console.error("[Upload] Erreur génération presigned URL:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
