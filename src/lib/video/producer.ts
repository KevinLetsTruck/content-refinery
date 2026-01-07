/**
 * Video Producer - Main Orchestrator
 * 
 * Coordinates the entire video production pipeline:
 * 1. Script Generation (Claude)
 * 2. Voice Synthesis (ElevenLabs)
 * 3. Video Generation (Runway)
 * 4. Music Selection
 * 5. Final Assembly (FFmpeg)
 */

import {
  VideoProject,
  VideoGenerationRequest,
  VideoScript,
  Scene,
  VIDEO_TYPE_CONFIG,
} from "./types";
import {
  createVideoProject,
  updateVideoProject,
  updateProjectStatus,
  updateScene,
  getVideoProject,
} from "./storage";
import { generateVideoScript, generateVideoMetadata } from "./script-generator";
import { getElevenLabsClient } from "./elevenlabs";
import { getRunwayClient, enhancePromptForRunway } from "./runway";
import { getBestTrackForDuration, toneToMusicMood } from "./music";
import { assembleVideo, generateThumbnail } from "./assembly";

// R2 storage helpers (reuse from existing)
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL;

interface ProducerOptions {
  skipVideoGeneration?: boolean; // For testing without Runway
  skipAssembly?: boolean; // For testing individual steps
}

/**
 * Main video production function
 */
export async function produceVideo(
  request: VideoGenerationRequest,
  options: ProducerOptions = {}
): Promise<VideoProject> {
  const config = VIDEO_TYPE_CONFIG[request.type];
  
  // Create project
  const project = createVideoProject({
    title: `Video: ${request.topic.slice(0, 50)}`,
    type: request.type,
    topic: request.topic,
    sourceContent: request.sourceContent,
    tone: request.tone || "educational",
    targetDuration: request.targetDuration || config.defaultDuration,
  });
  
  console.log(`[Producer] Created project ${project.id}`);
  
  try {
    // Step 1: Generate Script
    await generateScript(project.id, request);
    
    // Step 2: Generate Audio for each scene
    await generateAllAudio(project.id);
    
    // Step 3: Generate Video for each scene (unless skipped)
    if (!options.skipVideoGeneration) {
      await generateAllVideo(project.id);
    }
    
    // Step 4: Assemble final video (unless skipped)
    if (!options.skipAssembly && !options.skipVideoGeneration) {
      await assembleFinalVideo(project.id);
    }
    
    // Step 5: Generate metadata
    await generateMetadata(project.id);
    
    const finalProject = getVideoProject(project.id)!;
    console.log(`[Producer] Project ${project.id} complete!`);
    
    return finalProject;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Producer] Project ${project.id} failed:`, errorMessage);
    updateProjectStatus(project.id, "failed", errorMessage);
    throw error;
  }
}

/**
 * Step 1: Generate script
 */
async function generateScript(
  projectId: string,
  request: VideoGenerationRequest
): Promise<void> {
  console.log(`[Producer] Generating script for ${projectId}...`);
  updateProjectStatus(projectId, "scripting");
  
  const result = await generateVideoScript(request);
  
  updateVideoProject(projectId, {
    script: result.script,
  });
  
  console.log(`[Producer] Script generated: ${result.sceneCount} scenes, ~${result.estimatedDuration}s`);
}

/**
 * Step 2: Generate audio for all scenes
 */
async function generateAllAudio(projectId: string): Promise<void> {
  console.log(`[Producer] Generating audio for ${projectId}...`);
  updateProjectStatus(projectId, "generating_audio");
  
  const project = getVideoProject(projectId);
  if (!project?.script) {
    throw new Error("No script found");
  }
  
  const elevenLabs = getElevenLabsClient();
  
  for (const scene of project.script.scenes) {
    console.log(`[Producer] Generating audio for scene ${scene.order}/${project.script.scenes.length}...`);
    
    try {
      const audioBuffer = await elevenLabs.generateSpeech({
        text: scene.narration,
      });
      
      // TODO: Upload to R2 and get URL
      // For now, store as base64 data URL (not ideal for production)
      const base64 = Buffer.from(audioBuffer).toString("base64");
      const audioUrl = `data:audio/mp3;base64,${base64}`;
      
      // Estimate duration based on text
      const audioDuration = elevenLabs.estimateDuration(scene.narration);
      
      updateScene(projectId, scene.id, {
        audioUrl,
        audioDuration,
        status: "audio_ready",
      });
    } catch (error) {
      console.error(`[Producer] Audio generation failed for scene ${scene.id}:`, error);
      throw error;
    }
  }
  
  console.log(`[Producer] All audio generated for ${projectId}`);
}

/**
 * Step 3: Generate video for all scenes
 */
async function generateAllVideo(projectId: string): Promise<void> {
  console.log(`[Producer] Generating video for ${projectId}...`);
  updateProjectStatus(projectId, "generating_video");
  
  const project = getVideoProject(projectId);
  if (!project?.script) {
    throw new Error("No script found");
  }
  
  const runway = getRunwayClient();
  
  if (!runway.isConfigured()) {
    console.warn("[Producer] Runway not configured, skipping video generation");
    return;
  }
  
  const config = VIDEO_TYPE_CONFIG[project.type];
  const aspectRatio = config.aspectRatio === "9:16" ? "9:16" : "16:9";
  
  for (const scene of project.script.scenes) {
    console.log(`[Producer] Generating video for scene ${scene.order}/${project.script.scenes.length}...`);
    
    try {
      // Enhance the prompt for better results
      const enhancedPrompt = enhancePromptForRunway(
        scene.visualDescription,
        scene.visualStyle || "cinematic",
        scene.cameraMovement || "slow_pan"
      );
      
      // Generate video
      const videoUrl = await runway.generateAndWait({
        prompt: enhancedPrompt,
        aspectRatio,
        duration: Math.min(scene.duration, 10) as 5 | 10,
      });
      
      updateScene(projectId, scene.id, {
        videoUrl,
        status: "video_ready",
      });
    } catch (error) {
      console.error(`[Producer] Video generation failed for scene ${scene.id}:`, error);
      throw error;
    }
  }
  
  console.log(`[Producer] All video generated for ${projectId}`);
}

/**
 * Step 4: Assemble final video
 */
async function assembleFinalVideo(projectId: string): Promise<void> {
  console.log(`[Producer] Assembling final video for ${projectId}...`);
  updateProjectStatus(projectId, "assembling");
  
  const project = getVideoProject(projectId);
  if (!project?.script) {
    throw new Error("No script found");
  }
  
  // Get music track
  const musicMood = toneToMusicMood(project.tone);
  const musicTrack = getBestTrackForDuration(musicMood, project.script.totalDuration);
  
  // Assemble
  const result = await assembleVideo({
    project,
    scenes: project.script.scenes,
    musicUrl: musicTrack?.url,
    musicVolume: 0.25,
    addTextOverlays: true,
  });
  
  // Generate thumbnail
  const thumbnailPath = result.outputPath.replace(".mp4", "_thumb.jpg");
  await generateThumbnail(result.outputPath, thumbnailPath, 2);
  
  updateVideoProject(projectId, {
    outputUrl: result.outputPath,
    thumbnailUrl: thumbnailPath,
    status: "complete",
  });
  
  console.log(`[Producer] Assembly complete: ${result.outputPath}`);
}

/**
 * Step 5: Generate YouTube metadata
 */
async function generateMetadata(projectId: string): Promise<void> {
  const project = getVideoProject(projectId);
  if (!project?.script) return;
  
  console.log(`[Producer] Generating metadata for ${projectId}...`);
  
  const metadata = await generateVideoMetadata(
    project.script,
    project.topic,
    project.type
  );
  
  updateVideoProject(projectId, {
    youtubeTitle: metadata.title,
    youtubeDescription: metadata.description,
    youtubeTags: metadata.tags,
  });
  
  console.log(`[Producer] Metadata generated: "${metadata.title}"`);
}

/**
 * Generate only the script (for preview)
 */
export async function generateScriptOnly(
  request: VideoGenerationRequest
): Promise<{ project: VideoProject; script: VideoScript }> {
  const config = VIDEO_TYPE_CONFIG[request.type];
  
  const project = createVideoProject({
    title: `Video: ${request.topic.slice(0, 50)}`,
    type: request.type,
    topic: request.topic,
    sourceContent: request.sourceContent,
    tone: request.tone || "educational",
    targetDuration: request.targetDuration || config.defaultDuration,
  });
  
  updateProjectStatus(project.id, "scripting");
  const result = await generateVideoScript(request);
  
  updateVideoProject(project.id, {
    script: result.script,
    status: "draft",
  });
  
  return {
    project: getVideoProject(project.id)!,
    script: result.script,
  };
}

/**
 * Continue production from draft (after script approval)
 */
export async function continueFromDraft(
  projectId: string,
  options: ProducerOptions = {}
): Promise<VideoProject> {
  const project = getVideoProject(projectId);
  if (!project) {
    throw new Error("Project not found");
  }
  
  if (!project.script) {
    throw new Error("Project has no script");
  }
  
  try {
    await generateAllAudio(projectId);
    
    if (!options.skipVideoGeneration) {
      await generateAllVideo(projectId);
    }
    
    if (!options.skipAssembly && !options.skipVideoGeneration) {
      await assembleFinalVideo(projectId);
    }
    
    await generateMetadata(projectId);
    
    return getVideoProject(projectId)!;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    updateProjectStatus(projectId, "failed", errorMessage);
    throw error;
  }
}
