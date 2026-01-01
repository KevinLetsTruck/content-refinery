"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Link from "next/link";
import {
  Upload,
  FileAudio,
  Link as LinkIcon,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Play,
  Sparkles,
} from "lucide-react";

type UploadStatus = "idle" | "uploading" | "transcribing" | "extracting" | "complete" | "error";

interface SourceRecord {
  id: string;
  title: string;
  status: string;
  duration_seconds?: number;
}

interface ExtractionResult {
  id: string;
  type: string;
  text: string;
  confidence: number;
}

export default function IngestPage() {
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<"audio" | "url">("audio");
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [source, setSource] = useState<SourceRecord | null>(null);
  const [extractions, setExtractions] = useState<ExtractionResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      if (!title) {
        // Auto-fill title from filename
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".flac"],
    },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024, // 500MB
  });

  const handleSubmit = async () => {
    if (!title) {
      setError("Please enter a title");
      return;
    }

    if (sourceType === "audio" && !selectedFile) {
      setError("Please select an audio file");
      return;
    }

    if (sourceType === "url" && !url) {
      setError("Please enter a URL");
      return;
    }

    setError(null);
    setStatus("uploading");
    setStatusMessage("Uploading content...");

    try {
      // Step 1: Create source
      const formData = new FormData();
      formData.append("title", title);
      formData.append("sourceType", sourceType);
      
      if (sourceType === "audio" && selectedFile) {
        formData.append("file", selectedFile);
      } else if (sourceType === "url") {
        formData.append("url", url);
      }

      const createResponse = await fetch("/api/sources", {
        method: "POST",
        body: formData,
      });

      if (!createResponse.ok) {
        throw new Error("Failed to create source");
      }

      const { source: createdSource } = await createResponse.json();
      setSource(createdSource);

      // Step 2: Transcribe
      setStatus("transcribing");
      setStatusMessage("Transcribing audio... This may take a few minutes.");

      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: createdSource.id }),
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        throw new Error(errorData.error || "Transcription failed");
      }

      const { transcript } = await transcribeResponse.json();

      // Step 3: Extract content
      setStatus("extracting");
      setStatusMessage("AI is extracting content pieces...");

      const extractResponse = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sourceId: createdSource.id,
          transcriptId: transcript.id,
        }),
      });

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        throw new Error(errorData.error || "Extraction failed");
      }

      const { extractions: extractedContent } = await extractResponse.json();
      setExtractions(extractedContent || []);

      // Complete!
      setStatus("complete");
      setStatusMessage(`Successfully extracted ${extractedContent?.length || 0} content pieces!`);

    } catch (err) {
      console.error("Error:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "An error occurred");
      setStatusMessage("");
    }
  };

  const resetForm = () => {
    setTitle("");
    setSelectedFile(null);
    setUrl("");
    setStatus("idle");
    setStatusMessage("");
    setSource(null);
    setExtractions([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Ingest Content</h1>
            <p className="text-sm text-muted-foreground">
              Upload podcasts for transcription and AI extraction
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {status === "idle" && (
          <div className="space-y-6">
            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Content Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., TBB Episode 2847 - Gut Health"
                className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Source Type Toggle */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Source Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSourceType("audio")}
                  className={`flex-1 px-4 py-3 rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                    sourceType === "audio"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent"
                  }`}
                >
                  <FileAudio className="h-4 w-4" />
                  Audio File
                </button>
                <button
                  onClick={() => setSourceType("url")}
                  className={`flex-1 px-4 py-3 rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                    sourceType === "url"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent"
                  }`}
                >
                  <LinkIcon className="h-4 w-4" />
                  URL / RSS
                </button>
              </div>
            </div>

            {/* File Upload */}
            {sourceType === "audio" && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Audio File
                </label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileAudio className="h-12 w-12 mx-auto text-primary" />
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="text-sm text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="font-medium">
                        {isDragActive
                          ? "Drop the file here..."
                          : "Drag and drop an audio file"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse • MP3, WAV, M4A up to 500MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* URL Input */}
            {sourceType === "url" && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Audio URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/episode.mp3"
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Direct link to audio file or YouTube URL
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!title || (sourceType === "audio" && !selectedFile) || (sourceType === "url" && !url)}
              className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Process Content
            </button>
          </div>
        )}

        {/* Processing Status */}
        {(status === "uploading" || status === "transcribing" || status === "extracting") && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {status === "uploading" && "Uploading..."}
              {status === "transcribing" && "Transcribing..."}
              {status === "extracting" && "Extracting Content..."}
            </h2>
            <p className="text-muted-foreground">{statusMessage}</p>
            
            {/* Progress Steps */}
            <div className="flex justify-center gap-4 mt-8">
              <div className={`flex items-center gap-2 ${status === "uploading" ? "text-primary" : "text-green-600"}`}>
                {status === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span className="text-sm">Upload</span>
              </div>
              <div className={`flex items-center gap-2 ${
                status === "transcribing" ? "text-primary" : 
                status === "extracting" ? "text-green-600" : "text-muted-foreground"
              }`}>
                {status === "transcribing" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : status === "extracting" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2" />
                )}
                <span className="text-sm">Transcribe</span>
              </div>
              <div className={`flex items-center gap-2 ${
                status === "extracting" ? "text-primary" : "text-muted-foreground"
              }`}>
                {status === "extracting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2" />
                )}
                <span className="text-sm">Extract</span>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="text-center py-12">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Processing Failed</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <button
              onClick={resetForm}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Success State */}
        {status === "complete" && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Processing Complete!</h2>
              <p className="text-muted-foreground">{statusMessage}</p>
            </div>

            {/* Extractions Preview */}
            {extractions.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Extracted Content ({extractions.length})</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {extractions.slice(0, 10).map((extraction) => (
                    <div
                      key={extraction.id}
                      className="bg-card border rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          extraction.type === "quote" ? "bg-blue-100 text-blue-800" :
                          extraction.type === "stat" ? "bg-green-100 text-green-800" :
                          extraction.type === "hot_take" ? "bg-orange-100 text-orange-800" :
                          extraction.type === "story" ? "bg-purple-100 text-purple-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {extraction.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(extraction.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm line-clamp-3">{extraction.text}</p>
                    </div>
                  ))}
                  {extractions.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{extractions.length - 10} more extractions
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={resetForm}
                className="flex-1 border px-4 py-2 rounded-lg hover:bg-accent"
              >
                Upload Another
              </button>
              <Link
                href="/queue"
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-center hover:bg-primary/90"
              >
                View Queue →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
