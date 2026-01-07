/**
 * Video Assembly Pipeline
 * 
 * Uses FFmpeg to combine audio, video, and music into final output
 * Note: This runs on the server and requires FFmpeg to be installed
 */

import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir, unlink, readFile } from "fs/promises";
import { join } from "path";
import { Scene, VideoProject, VIDEO_TYPE_CONFIG } from "./types";

const execAsync = promisify(exec);

// Temp directory for processing
const TEMP_DIR = "/tmp/video-assembly";
const OUTPUT_DIR = process.env.VIDEO_OUTPUT_DIR || "/tmp/video-output";

interface AssemblyOptions {
  project: VideoProject;
  scenes: Scene[];
  musicUrl?: string;
  musicVolume?: number; // 0-1, default 0.3
  addTextOverlays?: boolean;
  outputFormat?: "mp4" | "webm";
}

interface AssemblyResult {
  outputPath: string;
  duration: number;
  fileSize: number;
}

/**
 * Ensure directories exist
 */
async function ensureDirectories(): Promise<void> {
  await mkdir(TEMP_DIR, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
}

/**
 * Download a file from URL to local path
 */
async function downloadFile(url: string, localPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  await writeFile(localPath, Buffer.from(buffer));
}

/**
 * Get audio duration using FFprobe
 */
async function getAudioDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  );
  return parseFloat(stdout.trim());
}

/**
 * Get video duration using FFprobe
 */
async function getVideoDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  );
  return parseFloat(stdout.trim());
}

/**
 * Concatenate audio files
 */
async function concatenateAudio(
  audioPaths: string[],
  outputPath: string
): Promise<void> {
  // Create concat file
  const concatFilePath = join(TEMP_DIR, "audio_concat.txt");
  const concatContent = audioPaths.map(p => `file '${p}'`).join("\n");
  await writeFile(concatFilePath, concatContent);
  
  await execAsync(
    `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}"`
  );
}

/**
 * Concatenate video files
 */
async function concatenateVideos(
  videoPaths: string[],
  outputPath: string,
  targetAspectRatio: "16:9" | "9:16" | "1:1"
): Promise<void> {
  const resolutions: Record<string, string> = {
    "16:9": "1920:1080",
    "9:16": "1080:1920",
    "1:1": "1080:1080",
  };
  const resolution = resolutions[targetAspectRatio];
  
  // Create concat file
  const concatFilePath = join(TEMP_DIR, "video_concat.txt");
  const concatContent = videoPaths.map(p => `file '${p}'`).join("\n");
  await writeFile(concatFilePath, concatContent);
  
  // Scale and pad videos to target resolution, then concatenate
  await execAsync(
    `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" -vf "scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset fast -crf 23 "${outputPath}"`
  );
}

/**
 * Add text overlay to video
 */
async function addTextOverlay(
  videoPath: string,
  text: string,
  outputPath: string,
  options: {
    position?: "top" | "center" | "bottom";
    fontSize?: number;
    fontColor?: string;
    startTime?: number;
    duration?: number;
  } = {}
): Promise<void> {
  const {
    position = "bottom",
    fontSize = 48,
    fontColor = "white",
    startTime = 0,
    duration,
  } = options;
  
  const yPositions: Record<string, string> = {
    top: "h*0.1",
    center: "(h-text_h)/2",
    bottom: "h*0.85",
  };
  
  let drawTextFilter = `drawtext=text='${text.replace(/'/g, "\\'")}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=${yPositions[position]}:enable='gte(t,${startTime})'`;
  
  if (duration) {
    drawTextFilter = `drawtext=text='${text.replace(/'/g, "\\'")}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=${yPositions[position]}:enable='between(t,${startTime},${startTime + duration})'`;
  }
  
  await execAsync(
    `ffmpeg -y -i "${videoPath}" -vf "${drawTextFilter}" -c:a copy "${outputPath}"`
  );
}

/**
 * Mix audio tracks (narration + music)
 */
async function mixAudio(
  narrationPath: string,
  musicPath: string,
  outputPath: string,
  musicVolume: number = 0.3
): Promise<void> {
  // Get narration duration to loop/trim music
  const narrationDuration = await getAudioDuration(narrationPath);
  
  await execAsync(
    `ffmpeg -y -i "${narrationPath}" -stream_loop -1 -i "${musicPath}" -filter_complex "[1:a]volume=${musicVolume},atrim=0:${narrationDuration}[music];[0:a][music]amix=inputs=2:duration=first[out]" -map "[out]" "${outputPath}"`
  );
}

/**
 * Combine video and audio
 */
async function combineVideoAudio(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  const videoDuration = await getVideoDuration(videoPath);
  const audioDuration = await getAudioDuration(audioPath);
  
  // If video is shorter than audio, loop it; if longer, trim it
  if (videoDuration < audioDuration) {
    // Loop video to match audio
    await execAsync(
      `ffmpeg -y -stream_loop -1 -i "${videoPath}" -i "${audioPath}" -c:v libx264 -c:a aac -shortest -map 0:v -map 1:a "${outputPath}"`
    );
  } else {
    // Trim video to match audio
    await execAsync(
      `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v libx264 -c:a aac -t ${audioDuration} -map 0:v -map 1:a "${outputPath}"`
    );
  }
}

/**
 * Main assembly function
 */
export async function assembleVideo(options: AssemblyOptions): Promise<AssemblyResult> {
  const {
    project,
    scenes,
    musicUrl,
    musicVolume = 0.3,
    addTextOverlays = true,
    outputFormat = "mp4",
  } = options;
  
  await ensureDirectories();
  
  const projectDir = join(TEMP_DIR, project.id);
  await mkdir(projectDir, { recursive: true });
  
  const config = VIDEO_TYPE_CONFIG[project.type];
  
  try {
    // Step 1: Download all scene audio files
    console.log(`[Assembly] Downloading ${scenes.length} audio files...`);
    const audioPaths: string[] = [];
    for (const scene of scenes) {
      if (!scene.audioUrl) {
        throw new Error(`Scene ${scene.id} has no audio`);
      }
      const audioPath = join(projectDir, `audio_${scene.order}.mp3`);
      await downloadFile(scene.audioUrl, audioPath);
      audioPaths.push(audioPath);
    }
    
    // Step 2: Concatenate all audio
    console.log("[Assembly] Concatenating audio...");
    const fullNarrationPath = join(projectDir, "narration.mp3");
    await concatenateAudio(audioPaths, fullNarrationPath);
    
    // Step 3: Download all scene video files
    console.log(`[Assembly] Downloading ${scenes.length} video files...`);
    const videoPaths: string[] = [];
    for (const scene of scenes) {
      if (!scene.videoUrl) {
        throw new Error(`Scene ${scene.id} has no video`);
      }
      const videoPath = join(projectDir, `video_${scene.order}.mp4`);
      await downloadFile(scene.videoUrl, videoPath);
      videoPaths.push(videoPath);
    }
    
    // Step 4: Concatenate all videos
    console.log("[Assembly] Concatenating videos...");
    const fullVideoPath = join(projectDir, "full_video.mp4");
    await concatenateVideos(videoPaths, fullVideoPath, config.aspectRatio);
    
    // Step 5: Mix narration with music (if provided)
    let finalAudioPath = fullNarrationPath;
    if (musicUrl) {
      console.log("[Assembly] Mixing audio with music...");
      const musicPath = join(projectDir, "music.mp3");
      await downloadFile(musicUrl, musicPath);
      
      finalAudioPath = join(projectDir, "mixed_audio.mp3");
      await mixAudio(fullNarrationPath, musicPath, finalAudioPath, musicVolume);
    }
    
    // Step 6: Combine video and audio
    console.log("[Assembly] Combining video and audio...");
    const outputPath = join(OUTPUT_DIR, `${project.id}.${outputFormat}`);
    await combineVideoAudio(fullVideoPath, finalAudioPath, outputPath);
    
    // Get final file info
    const duration = await getVideoDuration(outputPath);
    const { size: fileSize } = await import("fs").then(fs => 
      fs.promises.stat(outputPath)
    );
    
    console.log(`[Assembly] Complete: ${outputPath} (${duration}s, ${Math.round(fileSize / 1024 / 1024)}MB)`);
    
    return {
      outputPath,
      duration,
      fileSize,
    };
  } finally {
    // Cleanup temp files (optional - uncomment in production)
    // await execAsync(`rm -rf "${projectDir}"`);
  }
}

/**
 * Generate a thumbnail from video
 */
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp: number = 1 // seconds into video
): Promise<void> {
  await execAsync(
    `ffmpeg -y -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`
  );
}

/**
 * Check if FFmpeg is installed
 */
export async function checkFFmpegInstalled(): Promise<boolean> {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}
