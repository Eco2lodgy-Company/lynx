import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || "";
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || "";
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "lynx-media";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

// Initialize S3 Client specifically for Cloudflare R2
export const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

export async function generatePresignedUrl(fileName: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileName,
    ContentType: contentType,
  });

  // URL expire dans 15 minutes
  return await getSignedUrl(s3, command, { expiresIn: 900 });
}
