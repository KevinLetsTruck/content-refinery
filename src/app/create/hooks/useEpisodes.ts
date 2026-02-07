import { useState, useCallback } from "react";

export interface Episode {
  id: string;
  title: string;
  originalFilename: string | null;
  status: string;
  durationFormatted: string | null;
  hasTranscript: boolean;
  createdAt: string;
}

export interface DropboxStatus {
  isConnected: boolean;
  folderPath: string | null;
  totalEpisodes: number;
  pendingTranscription: number;
}

export interface PendingFile {
  id: string;
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
}

export function useEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropboxStatus, setDropboxStatus] = useState<DropboxStatus | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  // Fetch episodes, Dropbox status, and pending files
  const loadEpisodes = useCallback(async () => {
    setLoading(true);
    try {
      const [episodesRes, statusRes, pendingRes] = await Promise.all([
        fetch("/api/episodes?limit=20&hasTranscript=true"),
        fetch("/api/dropbox/sync"),
        fetch("/api/dropbox/sync?pending=true"),
      ]);

      if (episodesRes.ok) {
        const data = await episodesRes.json();
        setEpisodes(data.episodes || []);
      }

      if (statusRes.ok) {
        const status = await statusRes.json();
        setDropboxStatus(status);
      }

      if (pendingRes.ok) {
        const pending = await pendingRes.json();
        setPendingFiles(pending.files || []);
      }
    } catch (err) {
      console.error("Failed to fetch episodes:", err);
      setError("Failed to load episodes");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh is an alias for loadEpisodes
  const refresh = loadEpisodes;

  return {
    episodes,
    loading,
    error,
    dropboxStatus,
    pendingFiles,
    loadEpisodes,
    refresh,
  };
}
