import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { v4 as uuid } from "uuid";

// Simple local file storage for MVP
// Can be upgraded to Cloudflare R2 or S3 later

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  // Ensure upload directory exists
  await mkdir(UPLOAD_DIR, { recursive: true });

  // Generate unique filename
  const ext = filename.split(".").pop() || "bin";
  const key = `${uuid()}.${ext}`;
  const filePath = join(UPLOAD_DIR, key);

  // Write file to disk
  await writeFile(filePath, buffer);

  // In production, this would be a CDN URL
  // For now, return a local path that can be served
  const url = `/uploads/${key}`;

  return { url, key };
}

export async function getFileUrl(key: string): Promise<string> {
  return `/uploads/${key}`;
}

export async function getFile(key: string): Promise<Buffer | null> {
  const filePath = join(UPLOAD_DIR, key);
  
  if (!existsSync(filePath)) {
    return null;
  }
  
  return await readFile(filePath);
}

// For production with Cloudflare R2:
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// 
// const r2 = new S3Client({
//   region: "auto",
//   endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
//   credentials: {
//     accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
//     secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
//   },
// });
// 
// export async function uploadFile(buffer: Buffer, filename: string, contentType: string) {
//   const key = `${uuid()}-${filename}`;
//   
//   await r2.send(new PutObjectCommand({
//     Bucket: process.env.CLOUDFLARE_R2_BUCKET,
//     Key: key,
//     Body: buffer,
//     ContentType: contentType,
//   }));
//   
//   return {
//     url: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`,
//     key,
//   };
// }
