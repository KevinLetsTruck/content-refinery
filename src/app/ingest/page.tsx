"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Link from "next/link";
import { Sidebar } from "@/components/navigation/Sidebar";
import {
  Upload,
  FileAudio,
  Link as LinkIcon,
  Loader2,
  CheckCircle,
  XCircle,
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

  const [uploadProgress, setUploadProgress] = useState(0);

  // Upload file directly to R2 using presigned URL
  const uploadToR2 = async (file: File): Promise<{ key: string; publicUrl: string }> => {
    // Step 1: Get presigned URL
    const presignResponse = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    const presignData = await presignResponse.json();

    if (!presignResponse.ok) {
      // If R2 not configured, fall back to server upload (for small files only)
      if (presignData.fallback) {
        throw new Error("FALLBACK_TO_SERVER");
      }
      throw new Error(presignData.error || "Failed to get upload URL");
    }

    const { uploadUrl, key, publicUrl } = presignData;

    // Step 2: Upload directly to R2
    setStatusMessage(`Uploading ${file.name}...`);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file to storage");
    }

    return { key, publicUrl };
  };

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
    setStatusMessage("Preparing upload...");
    setUploadProgress(0);

    try {
      let fileUrl: string | null = null;
      let r2Key: string | null = null;

      // Step 1: Upload file
      if (sourceType === "audio" && selectedFile) {
        try {
          // Try R2 upload first (for large files)
          const { key, publicUrl } = await uploadToR2(selectedFile);
          r2Key = key;
          fileUrl = publicUrl;
          setStatusMessage("File uploaded to cloud storage!");
        } catch (r2Error) {
          // Fall back to server upload for small files or if R2 not configured
          if (r2Error instanceof Error && r2Error.message === "FALLBACK_TO_SERVER") {
            // Check file size for server upload
            const MAX_SERVER_SIZE = 25 * 1024 * 1024; // 25MB
            if (selectedFile.size > MAX_SERVER_SIZE) {
              throw new Error(
                `File is ${Math.round(selectedFile.size / 1024 / 1024)}MB. ` +
                "Cloud storage is not configured. Please configure Cloudflare R2 for large file uploads, " +
                "or use a file under 25MB."
              );
            }
            // Continue with server upload (handled below)
          } else {
            throw r2Error;
          }
        }
      }

      // Step 2: Create source record
      setStatusMessage("Creating source record...");
      
      const formData = new FormData();
      formData.append("title", title);
      formData.append("sourceType", sourceType);
      
      if (sourceType === "audio" && selectedFile) {
        if (r2Key) {
          // R2 upload succeeded - pass the R2 key
          formData.append("r2Key", r2Key);
          formData.append("fileUrl", fileUrl || "");
          formData.append("originalFilename", selectedFile.name);
          formData.append("fileSizeBytes", String(selectedFile.size));
        } else {
          // Fall back to server upload
          formData.append("file", selectedFile);
        }
      } else if (sourceType === "url") {
        formData.append("url", url);
      }

      const createResponse = await fetch("/api/sources", {
        method: "POST",
        body: formData,
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || "Failed to create source");
      }

      const { source: createdSource } = await createResponse.json();
      setSource(createdSource);

      // Step 3: Transcribe
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

      // Step 4: Extract content
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
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar />

      <main className="flex-1 ml-64">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />
      
        {/* Header */}
        <header className="border-b border-[#333333]">
          <div className="px-8 py-4">
            <h1 className="text-xl font-bold text-white">Upload Episode</h1>
            <p className="text-sm text-[#888888]">
              Upload audio for transcription and AI extraction
            </p>
          </div>
        </header>

        <div className="px-8 py-8 max-w-3xl">
        {status === "idle" && (
          <div className="space-y-6">
            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Content Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., TBB Episode 2847 - Gut Health"
                className="w-full px-4 py-2 rounded border border-[#333333] bg-[#1A1A1A] text-white focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
              />
            </div>

            {/* Source Type Toggle */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Source Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSourceType("audio")}
                  className={`flex-1 px-4 py-3 rounded border flex items-center justify-center gap-2 transition-colors ${
                    sourceType === "audio"
                      ? "bg-[#FF4500] text-white border-[#FF4500]"
                      : "border-[#333333] text-[#888888] hover:text-white hover:bg-[#1A1A1A]"
                  }`}
                >
                  <FileAudio className="h-4 w-4" />
                  Audio File
                </button>
                <button
                  onClick={() => setSourceType("url")}
                  className={`flex-1 px-4 py-3 rounded border flex items-center justify-center gap-2 transition-colors ${
                    sourceType === "url"
                      ? "bg-[#FF4500] text-white border-[#FF4500]"
                      : "border-[#333333] text-[#888888] hover:text-white hover:bg-[#1A1A1A]"
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
                <label className="block text-sm font-medium mb-2 text-white">
                  Audio File
                </label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? "border-[#FF4500] bg-[#FF4500]/10"
                      : selectedFile
                      ? "border-[#22C55E] bg-[#22C55E]/10"
                      : "border-[#333333] hover:border-[#FF4500]/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileAudio className="h-12 w-12 mx-auto text-[#FF4500]" />
                      <p className="font-medium text-white">{selectedFile.name}</p>
                      <p className="text-sm text-[#888888]">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="text-sm text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 mx-auto text-[#888888]" />
                      <p className="font-medium text-white">
                        {isDragActive
                          ? "Drop the file here..."
                          : "Drag and drop an audio file"}
                      </p>
                      <p className="text-sm text-[#888888]">
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
                <label className="block text-sm font-medium mb-2 text-white">
                  Audio URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/episode.mp3"
                  className="w-full px-4 py-2 rounded border border-[#333333] bg-[#1A1A1A] text-white focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
                />
                <p className="text-sm text-[#888888] mt-1">
                  Direct link to audio file or YouTube URL
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!title || (sourceType === "audio" && !selectedFile) || (sourceType === "url" && !url)}
              className="w-full bg-gradient-to-r from-[#FF4500] to-[#CC3700] text-white px-4 py-3 rounded font-medium hover:from-[#FF6633] hover:to-[#FF4500] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              Process Content
            </button>
          </div>
        )}

        {/* Processing Status */}
        {(status === "uploading" || status === "transcribing" || status === "extracting") && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-[#FF4500] mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-white">
              {status === "uploading" && "Uploading..."}
              {status === "transcribing" && "Transcribing..."}
              {status === "extracting" && "Extracting Content..."}
            </h2>
            <p className="text-[#888888]">{statusMessage}</p>
            
            {/* Progress Steps */}
            <div className="flex justify-center gap-4 mt-8">
              <div className={`flex items-center gap-2 ${status === "uploading" ? "text-[#FF4500]" : "text-[#22C55E]"}`}>
                {status === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span className="text-sm">Upload</span>
              </div>
              <div className={`flex items-center gap-2 ${
                status === "transcribing" ? "text-[#FF4500]" : 
                status === "extracting" ? "text-[#22C55E]" : "text-[#888888]"
              }`}>
                {status === "transcribing" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : status === "extracting" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-[#888888]" />
                )}
                <span className="text-sm">Transcribe</span>
              </div>
              <div className={`flex items-center gap-2 ${
                status === "extracting" ? "text-[#FF4500]" : "text-[#888888]"
              }`}>
                {status === "extracting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-[#888888]" />
                )}
                <span className="text-sm">Extract</span>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="text-center py-12">
            <XCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-white">Processing Failed</h2>
            <p className="text-[#888888] mb-6">{error}</p>
            <button
              onClick={resetForm}
              className="bg-gradient-to-r from-[#FF4500] to-[#CC3700] text-white px-6 py-2 rounded hover:from-[#FF6633] hover:to-[#FF4500] transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Success State */}
        {status === "complete" && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-[#22C55E] mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-white">Processing Complete!</h2>
              <p className="text-[#888888]">{statusMessage}</p>
            </div>

            {/* Extractions Preview */}
            {extractions.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Extracted Content ({extractions.length})</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {extractions.slice(0, 10).map((extraction) => (
                    <div
                      key={extraction.id}
                      className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          extraction.type === "quote" ? "bg-blue-500/20 text-blue-400" :
                          extraction.type === "stat" ? "bg-[#22C55E]/20 text-[#22C55E]" :
                          extraction.type === "hot_take" ? "bg-[#FF4500]/20 text-[#FF4500]" :
                          extraction.type === "story" ? "bg-purple-500/20 text-purple-400" :
                          "bg-[#333333] text-[#888888]"
                        }`}>
                          {extraction.type}
                        </span>
                        <span className="text-xs text-[#888888]">
                          {Math.round(extraction.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-white line-clamp-3">{extraction.text}</p>
                    </div>
                  ))}
                  {extractions.length > 10 && (
                    <p className="text-sm text-[#888888] text-center">
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
                className="flex-1 border border-[#333333] text-white px-4 py-2 rounded hover:bg-[#1A1A1A] transition-colors"
              >
                Upload Another
              </button>
              <Link
                href="/queue"
                className="flex-1 bg-gradient-to-r from-[#FF4500] to-[#CC3700] text-white px-4 py-2 rounded text-center hover:from-[#FF6633] hover:to-[#FF4500] transition-all"
              >
                View Queue →
              </Link>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
