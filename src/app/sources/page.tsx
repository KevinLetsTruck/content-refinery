"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/navigation/Sidebar";
import {
  FolderOpen,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  FileAudio,
  FileText,
  Loader2,
  Upload,
  ArrowRight,
  Trash2,
} from "lucide-react";

interface Source {
  id: string;
  title: string;
  sourceType: string;
  contentType: string | null;
  status: string;
  createdAt: string;
  extractionCount: number;
  generatedCount: number;
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; spin?: boolean }> = {
  pending: { icon: Clock, color: "text-[#888888]", bg: "bg-[#888888]/10" },
  processing: { icon: Loader2, color: "text-[#F4A300]", bg: "bg-[#F4A300]/10", spin: true },
  transcribing: { icon: Loader2, color: "text-[#F4A300]", bg: "bg-[#F4A300]/10", spin: true },
  extracting: { icon: Loader2, color: "text-[#F4A300]", bg: "bg-[#F4A300]/10", spin: true },
  generating_visuals: { icon: Loader2, color: "text-[#F4A300]", bg: "bg-[#F4A300]/10", spin: true },
  completed: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
  failed: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
};

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sources");
      if (response.ok) {
        const data = await response.json();
        setSources(data.sources || []);
      }
    } catch (error) {
      console.error("Failed to fetch sources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this source and all its extractions and generated content?")) {
      return;
    }
    
    setDeleting(id);
    try {
      const response = await fetch(`/api/sources/${id}`, { method: "DELETE" });
      if (response.ok) {
        setSources(sources.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete source:", error);
    } finally {
      setDeleting(null);
    }
  };

  const stats = {
    total: sources.length,
    processing: sources.filter(s => s.status.includes("ing")).length,
    completed: sources.filter(s => s.status === "completed").length,
    failed: sources.filter(s => s.status === "failed").length,
  };

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar />

      <main className="flex-1 ml-64">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />

        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Sources</h1>
              <p className="text-[#888888] mt-1">
                All ingested content from AudioRoad and other sources
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchSources}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#333333] text-[#888888] hover:text-white hover:border-[#FF4500] transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <Link
                href="/ingest"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF4500] text-white hover:bg-[#FF6633] transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload New
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Sources", value: stats.total, color: "text-white" },
              { label: "Processing", value: stats.processing, color: "text-[#F4A300]" },
              { label: "Completed", value: stats.completed, color: "text-green-500" },
              { label: "Failed", value: stats.failed, color: "text-red-500" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-4">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-[#888888]">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Sources List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF4500]" />
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-12 bg-[#1A1A1A] border border-[#333333] rounded-lg">
              <FolderOpen className="h-12 w-12 text-[#666666] mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">No sources yet</h3>
              <p className="text-[#888888] mb-6">
                Upload your first episode to get started with content generation
              </p>
              <Link
                href="/ingest"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF4500] text-white hover:bg-[#FF6633] transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload Episode
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => {
                const config = statusConfig[source.status] || statusConfig.pending;
                const StatusIcon = config.icon;

                return (
                  <div
                    key={source.id}
                    className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-4 hover:border-[#444444] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-[#0D0D0D]">
                          {source.sourceType === "audio" ? (
                            <FileAudio className="h-5 w-5 text-[#FF4500]" />
                          ) : (
                            <FileText className="h-5 w-5 text-[#F4A300]" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{source.title}</h3>
                          <p className="text-sm text-[#888888]">
                            {source.contentType || source.sourceType} • {source.extractionCount} extractions • {source.generatedCount} posts
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
                          <StatusIcon className={`h-4 w-4 ${config.color} ${config.spin ? "animate-spin" : ""}`} />
                          <span className={`text-sm capitalize ${config.color}`}>
                            {source.status.replace("_", " ")}
                          </span>
                        </div>
                        
                        <span className="text-sm text-[#666666]">
                          {new Date(source.createdAt).toLocaleDateString()}
                        </span>

                        {source.status === "completed" && source.generatedCount > 0 && (
                          <Link
                            href={`/queue?source=${source.id}`}
                            className="flex items-center gap-1 text-sm text-[#FF4500] hover:underline"
                          >
                            View content
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}

                        <button
                          onClick={() => handleDelete(source.id)}
                          disabled={deleting === source.id}
                          className="p-2 text-[#666666] hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Delete source"
                        >
                          {deleting === source.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

