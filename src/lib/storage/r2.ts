import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
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
  contentType: string,
  folder: string = "uploads"
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const client = getR2Client();

  // Generate unique key
  const ext = filename.split(".").pop() || "bin";
  const key = `${folder}/${uuid()}.${ext}`;

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

/**
 * Upload a file buffer directly to R2
 */
export async function uploadToR2(
  key: string,
  data: Buffer,
  contentType: string
): Promise<void> {
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: data,
    ContentType: contentType,
  });

  await client.send(command);
}

// Minimum part size for multipart upload (5MB required by S3/R2)
const MIN_PART_SIZE = 5 * 1024 * 1024;
// Chunk size for streaming (10MB - keeps memory usage low)
const CHUNK_SIZE = 10 * 1024 * 1024;

/**
 * Upload a file to R2 using streaming multipart upload from a URL
 * This processes the file in chunks to minimize memory usage
 * Handles files up to 5TB (S3/R2 limit)
 */
export async function uploadToR2FromUrl(
  key: string,
  sourceUrl: string,
  contentType: string,
  headers?: Record<string, string>
): Promise<{ size: number }> {
  const client = getR2Client();

  // Fetch the file from source URL
  const response = await fetch(sourceUrl, {
    method: headers ? "POST" : "GET",
    headers: headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from source: ${response.status}`);
  }

  // Get content length if available
  const contentLength = response.headers.get("content-length");
  const expectedSize = contentLength ? parseInt(contentLength, 10) : 0;

  // For small files (< 10MB), use simple upload
  if (expectedSize > 0 && expectedSize < CHUNK_SIZE) {
    console.log(`[R2] Small file (${Math.round(expectedSize / 1024 / 1024)}MB), using simple upload`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);
    return { size: buffer.length };
  }

  // For large files, use multipart upload with streaming
  console.log(`[R2] Large file (~${Math.round(expectedSize / 1024 / 1024)}MB), using multipart upload`);

  // Start multipart upload
  const createCommand = new CreateMultipartUploadCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const { UploadId } = await client.send(createCommand);

  if (!UploadId) {
    throw new Error("Failed to create multipart upload");
  }

  const parts: { ETag: string; PartNumber: number }[] = [];
  let partNumber = 1;
  let totalSize = 0;
  let buffer = Buffer.alloc(0);

  try {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader available");
    }

    // Process the stream in chunks
    while (true) {
      const { done, value } = await reader.read();

      if (value) {
        // Append new data to buffer
        buffer = Buffer.concat([buffer, Buffer.from(value)]);
      }

      // Upload when we have enough data or we're done
      while (buffer.length >= CHUNK_SIZE || (done && buffer.length >= MIN_PART_SIZE)) {
        const chunkSize = Math.min(buffer.length, CHUNK_SIZE);
        const chunk = buffer.subarray(0, chunkSize);
        buffer = buffer.subarray(chunkSize);

        console.log(`[R2] Uploading part ${partNumber} (${Math.round(chunkSize / 1024 / 1024)}MB)`);

        const uploadPartCommand = new UploadPartCommand({
          Bucket: R2_BUCKET,
          Key: key,
          UploadId,
          PartNumber: partNumber,
          Body: chunk,
        });

        const { ETag } = await client.send(uploadPartCommand);

        if (ETag) {
          parts.push({ ETag, PartNumber: partNumber });
        }

        totalSize += chunkSize;
        partNumber++;
      }

      if (done) {
        // Upload any remaining data as final part (must be at least 1 byte)
        if (buffer.length > 0) {
          console.log(`[R2] Uploading final part ${partNumber} (${Math.round(buffer.length / 1024)}KB)`);

          const uploadPartCommand = new UploadPartCommand({
            Bucket: R2_BUCKET,
            Key: key,
            UploadId,
            PartNumber: partNumber,
            Body: buffer,
          });

          const { ETag } = await client.send(uploadPartCommand);

          if (ETag) {
            parts.push({ ETag, PartNumber: partNumber });
          }

          totalSize += buffer.length;
        }
        break;
      }
    }

    // Complete the multipart upload
    console.log(`[R2] Completing multipart upload (${parts.length} parts, ${Math.round(totalSize / 1024 / 1024)}MB total)`);

    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: key,
      UploadId,
      MultipartUpload: { Parts: parts },
    });

    await client.send(completeCommand);

    return { size: totalSize };
  } catch (error) {
    // Abort the multipart upload on error
    console.error("[R2] Multipart upload failed, aborting:", error);

    try {
      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: R2_BUCKET,
        Key: key,
        UploadId,
      });
      await client.send(abortCommand);
    } catch (abortError) {
      console.error("[R2] Failed to abort multipart upload:", abortError);
    }

    throw error;
  }
}

/**
 * Get the public URL for a file in R2
 * Requires public access to be enabled on the bucket or a custom domain
 */
export function getPublicUrl(key: string): string {
  // If a custom public URL is configured, use it
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }

  // Otherwise use the default R2 URL format
  // Note: This requires public access to be enabled on the bucket
  return `https://pub-${R2_ACCOUNT_ID}.r2.dev/${key}`;
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  await client.send(command);
}
