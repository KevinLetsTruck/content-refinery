"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface VideoProject {
  id: string;
  title: string;
  type: string;
  status: string;
  topic: string;
  createdAt: string;
  outputUrl?: string;
}

interface VideoTypeConfig {
  name: string;
  minDuration: number;
  maxDuration: number;
  defaultDuration: number;
  aspectRatio: string;
  description: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scripting: "bg-blue-100 text-blue-700",
  generating_audio: "bg-purple-100 text-purple-700",
  generating_video: "bg-indigo-100 text-indigo-700",
  assembling: "bg-orange-100 text-orange-700",
  complete: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function VideoPage() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [videoTypes, setVideoTypes] = useState<Record<string, VideoTypeConfig>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  
  // Form state
  const [topic, setTopic] = useState("");
  const [videoType, setVideoType] = useState("short");
  const [tone, setTone] = useState("educational");
  const [sourceContent, setSourceContent] = useState("");
  
  // Script preview
  const [previewProject, setPreviewProject] = useState<any>(null);
  const [producing, setProducing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch config
      const configRes = await fetch("/api/video?action=config");
      const configData = await configRes.json();
      setVideoTypes(configData.videoTypes);
      
      // Fetch projects
      const projectsRes = await fetch("/api/video");
      const projectsData = await projectsRes.json();
      setProjects(projectsData.projects);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          type: videoType,
          tone,
          sourceContent: sourceContent || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPreviewProject(data);
        fetchData(); // Refresh list
      } else {
        alert(data.error || "Failed to create video");
      }
    } catch (error) {
      console.error("Create error:", error);
      alert("Failed to create video");
    } finally {
      setCreating(false);
    }
  };

  const handleStartProduction = async (projectId: string) => {
    setProducing(projectId);
    try {
      const response = await fetch(`/api/video/${projectId}?action=produce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skipVideoGeneration: !process.env.NEXT_PUBLIC_RUNWAY_ENABLED,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchData();
        setPreviewProject(null);
      } else {
        alert(data.error || "Production failed");
      }
    } catch (error) {
      console.error("Production error:", error);
      alert("Production failed");
    } finally {
      setProducing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🎬 Video Producer</h1>
              <p className="text-gray-600">AI-powered video creation pipeline</p>
            </div>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              {showCreate ? "Close" : "+ New Video"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Create Form */}
        {showCreate && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Create New Video</h2>
            
            <form onSubmit={handleCreateScript} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video Topic *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., 5 blood sugar tips for long-haul drivers"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video Type
                  </label>
                  <select
                    value={videoType}
                    onChange={(e) => setVideoType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(videoTypes).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.name} ({config.defaultDuration}s)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tone
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="educational">Educational</option>
                    <option value="promotional">Promotional</option>
                    <option value="entertaining">Entertaining</option>
                    <option value="inspirational">Inspirational</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Content (optional)
                </label>
                <textarea
                  value={sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                  placeholder="Paste blog post, podcast transcript, or notes to base the video on..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <button
                type="submit"
                disabled={creating || !topic.trim()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
              >
                {creating ? "Generating Script..." : "Generate Script"}
              </button>
            </form>
          </div>
        )}

        {/* Script Preview */}
        {previewProject && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">📝 Script Preview</h2>
              <button
                onClick={() => setPreviewProject(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕ Close
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
              <p className="font-semibold text-indigo-800">Hook:</p>
              <p className="text-indigo-900">&ldquo;{previewProject.script.hook}&rdquo;</p>
            </div>
            
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold">Scenes ({previewProject.script.scenes.length})</h3>
              {previewProject.script.scenes.map((scene: any, i: number) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm font-medium">
                      Scene {scene.order}
                    </span>
                    <span className="text-gray-500 text-sm">{scene.duration}s</span>
                  </div>
                  <p className="text-gray-800 mb-2"><strong>Narration:</strong> {scene.narration}</p>
                  <p className="text-gray-600 text-sm"><strong>Visual:</strong> {scene.visualDescription}</p>
                  {scene.textOverlay && (
                    <p className="text-indigo-600 text-sm mt-1"><strong>Text:</strong> {scene.textOverlay}</p>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mb-4 p-4 bg-green-50 rounded-lg">
              <p className="font-semibold text-green-800">Call to Action:</p>
              <p className="text-green-900">&ldquo;{previewProject.script.callToAction}&rdquo;</p>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => handleStartProduction(previewProject.project.id)}
                disabled={producing === previewProject.project.id}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              >
                {producing === previewProject.project.id ? "Starting Production..." : "✅ Approve & Start Production"}
              </button>
              <button
                onClick={() => setPreviewProject(null)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                ✏️ Edit Script
              </button>
            </div>
          </div>
        )}

        {/* Projects List */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Video Projects</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No video projects yet. Create your first one above!
            </div>
          ) : (
            <div className="divide-y">
              {projects.map((project) => (
                <div key={project.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.title}</h3>
                      <p className="text-gray-600 text-sm">{project.topic}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}>
                          {project.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {videoTypes[project.type]?.name || project.type}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {project.status === "draft" && (
                        <button
                          onClick={() => handleStartProduction(project.id)}
                          disabled={producing === project.id}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          {producing === project.id ? "..." : "Produce"}
                        </button>
                      )}
                      {project.outputUrl && (
                        <a
                          href={project.outputUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                        >
                          Download
                        </a>
                      )}
                      <Link
                        href={`/video/${project.id}`}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
