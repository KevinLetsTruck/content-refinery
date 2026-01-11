#!/usr/bin/env npx ts-node
/**
 * Test YouTube upload script - standalone version
 */

import * as fs from "fs";
import * as path from "path";

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const CLIENT_ID = envVars.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = envVars.YOUTUBE_CLIENT_SECRET;
const REFRESH_TOKEN = envVars.YOUTUBE_REFRESH_TOKEN;

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

async function getAccessToken(): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh failed: ${JSON.stringify(error)}`);
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}

async function uploadVideo(
  accessToken: string,
  videoBuffer: Buffer,
  title: string,
  description: string,
  tags: string[],
  isShort: boolean = true
): Promise<{ id: string; url: string }> {
  // Video metadata
  const metadata = {
    snippet: {
      title: isShort && !title.includes("#Shorts") ? `${title} #Shorts` : title,
      description,
      tags,
      categoryId: "22", // People & Blogs
    },
    status: {
      privacyStatus: "unlisted", // Start unlisted for testing
      selfDeclaredMadeForKids: false,
    },
  };

  // Step 1: Initialize resumable upload
  console.log("Initializing upload...");
  const initResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/*",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initResponse.ok) {
    const error = await initResponse.json();
    throw new Error(`Upload init failed: ${JSON.stringify(error)}`);
  }

  const uploadUrl = initResponse.headers.get("location");
  if (!uploadUrl) {
    throw new Error("No upload URL returned");
  }

  // Step 2: Upload the video
  console.log("Uploading video...");
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "video/*",
      "Content-Length": videoBuffer.length.toString(),
    },
    body: new Uint8Array(videoBuffer),
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Upload failed: ${error}`);
  }

  const result = await uploadResponse.json();
  const videoId = result.id;

  return {
    id: videoId,
    url: isShort
      ? `https://youtube.com/shorts/${videoId}`
      : `https://youtube.com/watch?v=${videoId}`,
  };
}

async function main() {
  console.log("YouTube Upload Test");
  console.log("===================\n");

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error("Missing YouTube credentials in .env.local");
    process.exit(1);
  }

  console.log("Getting access token...");
  const accessToken = await getAccessToken();
  console.log("✅ Got access token\n");

  // Read the test video
  const videoPath = "/tmp/test-youtube-short.mp4";
  if (!fs.existsSync(videoPath)) {
    console.error(`Video file not found: ${videoPath}`);
    process.exit(1);
  }

  const videoBuffer = fs.readFileSync(videoPath);
  console.log(`Video size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB\n`);

  console.log("Uploading to YouTube as Short...\n");

  const result = await uploadVideo(
    accessToken,
    videoBuffer,
    "Professional Driver Safety Check",
    `A professional driver performing a pre-trip tire inspection at sunrise. Safety first! 🚛

Let's Truck Health Coaching - Helping professional drivers live longer, healthier lives.

#trucking #truckdriver #safety #pretrip #letstruck`,
    ["trucking", "truck driver", "safety", "pretrip", "letstruck", "health"],
    true
  );

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║                    🎉 UPLOAD SUCCESSFUL!                       ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");
  console.log(`Video ID: ${result.id}`);
  console.log(`URL: ${result.url}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
