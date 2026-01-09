/**
 * Migration Script: Import existing R2 PDFs as Lead Magnets
 *
 * This script scans the R2 bucket for existing PDF files in the lead-magnets/
 * prefix and creates corresponding database records.
 *
 * Run with: npm run migrate:lead-magnets
 */

import { PrismaClient } from "@prisma/client";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();

const R2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function migrate() {
  console.log("Starting lead magnet migration...");
  console.log("R2 Endpoint:", process.env.R2_ENDPOINT);
  console.log("R2 Bucket:", process.env.R2_BUCKET_NAME);

  if (!process.env.R2_ENDPOINT || !process.env.R2_BUCKET_NAME) {
    console.error("Missing R2 environment variables");
    process.exit(1);
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: "lead-magnets/",
    });

    const response = await R2.send(command);
    const files = response.Contents || [];

    console.log(`Found ${files.length} files in lead-magnets/ prefix`);

    let created = 0;
    let skipped = 0;

    for (const file of files) {
      // Skip if not a PDF
      if (!file.Key?.endsWith(".pdf")) {
        console.log(`  Skip (not PDF): ${file.Key}`);
        continue;
      }

      const fileName = file.Key.split("/").pop() || "";

      // Generate title from filename
      // e.g., "gut-health-guide.pdf" -> "Gut Health Guide"
      const title = fileName
        .replace(".pdf", "")
        .replace(/-/g, " ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // Build public URL
      const publicUrl = `${process.env.R2_PUBLIC_URL}/${file.Key}`;

      // Check if already exists
      const existing = await prisma.leadMagnet.findFirst({
        where: { fileUrl: publicUrl },
      });

      if (existing) {
        console.log(`  Skip (exists): ${fileName}`);
        skipped++;
        continue;
      }

      // Create new lead magnet record
      const lm = await prisma.leadMagnet.create({
        data: {
          title,
          fileUrl: publicUrl,
          storageKey: file.Key,
          fileName,
          fileSizeBytes: file.Size ? BigInt(file.Size) : null,
          isActive: true,
        },
      });

      console.log(`  Created: ${lm.title} (${lm.id})`);
      created++;
    }

    console.log("\nMigration complete!");
    console.log(`  Created: ${created}`);
    console.log(`  Skipped: ${skipped}`);

  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
