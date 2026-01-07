/**
 * Video Project Storage
 * 
 * In-memory storage for MVP, migrate to database later
 */

import { VideoProject, VideoStatus, Scene, SceneStatus } from "./types";

// In-memory storage
const videoProjects = new Map<string, VideoProject>();

/**
 * Create a new video project
 */
export function createVideoProject(
  data: Omit<VideoProject, "id" | "status" | "createdAt" | "updatedAt">
): VideoProject {
  const id = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const project: VideoProject = {
    ...data,
    id,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  videoProjects.set(id, project);
  return project;
}

/**
 * Get a video project by ID
 */
export function getVideoProject(id: string): VideoProject | null {
  return videoProjects.get(id) || null;
}

/**
 * Update a video project
 */
export function updateVideoProject(
  id: string,
  updates: Partial<VideoProject>
): VideoProject | null {
  const project = videoProjects.get(id);
  if (!project) return null;
  
  const updated: VideoProject = {
    ...project,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  videoProjects.set(id, updated);
  return updated;
}

/**
 * Update project status
 */
export function updateProjectStatus(
  id: string,
  status: VideoStatus,
  error?: string
): VideoProject | null {
  const updates: Partial<VideoProject> = { status };
  
  if (error) {
    updates.error = error;
  }
  
  if (status === "complete") {
    updates.completedAt = new Date().toISOString();
  }
  
  return updateVideoProject(id, updates);
}

/**
 * Update a scene in a project
 */
export function updateScene(
  projectId: string,
  sceneId: string,
  updates: Partial<Scene>
): VideoProject | null {
  const project = videoProjects.get(projectId);
  if (!project || !project.script) return null;
  
  const scenes = project.script.scenes.map(scene => {
    if (scene.id === sceneId) {
      return { ...scene, ...updates };
    }
    return scene;
  });
  
  return updateVideoProject(projectId, {
    script: {
      ...project.script,
      scenes,
    },
  });
}

/**
 * Update scene status
 */
export function updateSceneStatus(
  projectId: string,
  sceneId: string,
  status: SceneStatus
): VideoProject | null {
  return updateScene(projectId, sceneId, { status });
}

/**
 * Delete a video project
 */
export function deleteVideoProject(id: string): boolean {
  return videoProjects.delete(id);
}

/**
 * List all video projects
 */
export function listVideoProjects(options?: {
  status?: VideoStatus;
  type?: string;
  limit?: number;
}): VideoProject[] {
  let projects = Array.from(videoProjects.values());
  
  if (options?.status) {
    projects = projects.filter(p => p.status === options.status);
  }
  
  if (options?.type) {
    projects = projects.filter(p => p.type === options.type);
  }
  
  // Sort by creation date (newest first)
  projects.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  if (options?.limit) {
    projects = projects.slice(0, options.limit);
  }
  
  return projects;
}

/**
 * Get project statistics
 */
export function getProjectStats(): {
  total: number;
  byStatus: Record<VideoStatus, number>;
  byType: Record<string, number>;
} {
  const projects = Array.from(videoProjects.values());
  
  const byStatus: Record<VideoStatus, number> = {
    draft: 0,
    scripting: 0,
    generating_audio: 0,
    generating_video: 0,
    assembling: 0,
    complete: 0,
    failed: 0,
  };
  
  const byType: Record<string, number> = {};
  
  for (const project of projects) {
    byStatus[project.status]++;
    byType[project.type] = (byType[project.type] || 0) + 1;
  }
  
  return {
    total: projects.length,
    byStatus,
    byType,
  };
}

/**
 * Clean up old failed projects (older than 7 days)
 */
export function cleanupOldProjects(): number {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let deleted = 0;
  
  for (const [id, project] of videoProjects.entries()) {
    if (
      project.status === "failed" &&
      new Date(project.createdAt).getTime() < sevenDaysAgo
    ) {
      videoProjects.delete(id);
      deleted++;
    }
  }
  
  return deleted;
}
