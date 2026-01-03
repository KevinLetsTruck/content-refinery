import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuid } from "uuid";

// Cloudflare R2 Configuration
// R2 is S3-compatible, so we use the AWS SDK
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET || "content-refinery";
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL;

// Check if R2 is configured
export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

// Create R2 client
function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, and CLOUDFLARE_R2_SECRET_ACCESS_KEY.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Get a presigned URL for uploading a file directly to R2
 * The client uploads directly to R2, bypassing the server
 */
export async function getPresignedUploadUrl(
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const client = getR2Client();
  
  // Generate unique key
  const ext = filename.split(".").pop() || "bin";
  const key = `uploads/${uuid()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  // URL expires in 1 hour
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  
  // Public URL for accessing the file (if public access is enabled)
  const publicUrl = R2_PUBLIC_URL 
    ? `${R2_PUBLIC_URL}/${key}`
    : `https://${R2_BUCKET}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

  return { uploadUrl, key, publicUrl };
}

/**
 * Get a presigned URL for downloading a file from R2
 */
export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  // URL expires in 1 hour
  return await getSignedUrl(client, command, { expiresIn: 3600 });
}

/**
 * Get a stream of the file from R2 (for processing)
 */
export async function getFileStream(key: string): Promise<ReadableStream | null> {
  const client = getR2Client();

  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    const response = await client.send(command);
    return response.Body?.transformToWebStream() || null;
  } catch (error) {
    console.error("Error fetching file from R2:", error);
    return null;
  }
}

/**
 * Get the file as a buffer from R2 (for smaller files)
 */
export async function getFileBuffer(key: string): Promise<Buffer | null> {
  const client = getR2Client();

  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    const response = await client.send(command);
    const bytes = await response.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch (error) {
    console.error("Error fetching file from R2:", error);
    return null;
  }
}


