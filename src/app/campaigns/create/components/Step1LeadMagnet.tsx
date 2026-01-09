"use client";

import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  Check,
  Library,
  Plus,
  Loader2,
  Sparkles,
} from "lucide-react";

interface LeadMagnet {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  fileUrl: string;
  fileName: string | null;
  fileType: string | null;
  fileSizeBytes: string | null;
  extractedData: ExtractedData | null;
  createdAt: string;
}

interface ExtractedData {
  title?: string;
  subtitle?: string;
  summary?: string;
  keyMessages?: string[];
  stats?: string[];
  hooks?: string[];
  chapters?: string[];
}

interface Props {
  onSelect: (leadMagnet: LeadMagnet, extractedData: ExtractedData) => void;
  selectedId?: string;
}

type Mode = "library" | "upload";

export default function Step1LeadMagnet({ onSelect, selectedId }: Props) {
  const [mode, setMode] = useState<Mode>("library");
  const [leadMagnets, setLeadMagnets] = useState<LeadMagnet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch lead magnets on mount
  useEffect(() => {
    fetchLeadMagnets();
  }, []);

  const fetchLeadMagnets = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/lead-magnets");
      if (!response.ok) throw new Error("Failed to fetch lead magnets");
      const data = await response.json();
      setLeadMagnets(data.leadMagnets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lead magnets");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (leadMagnet: LeadMagnet) => {
    try {
      // Fetch full details including extractedData
      const response = await fetch(`/api/lead-magnets/${leadMagnet.id}`);
      if (!response.ok) throw new Error("Failed to fetch lead magnet details");
      const data = await response.json();

      const extractedData = data.extractedData || data.leadMagnet?.extractedData || {};
      onSelect(data.leadMagnet, extractedData);
    } catch (err) {
      console.error("Error fetching lead magnet details:", err);
      // Still call onSelect with what we have
      onSelect(leadMagnet, leadMagnet.extractedData || {});
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Step 1: Upload the file via lead-magnets API
      setUploadProgress(20);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, "")); // Remove extension for title

      const uploadResponse = await fetch("/api/lead-magnets", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        throw new Error(data.error || "Failed to upload file");
      }

      const { leadMagnet } = await uploadResponse.json();
      setUploadProgress(60);

      // Step 2: Trigger AI extraction
      setIsAnalyzing(true);
      setUploadProgress(70);

      const extractResponse = await fetch("/api/lead-magnets/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadMagnetId: leadMagnet.id }),
      });

      setUploadProgress(90);

      let extractedData: ExtractedData = {};
      if (extractResponse.ok) {
        const extractData = await extractResponse.json();
        extractedData = extractData.extractedData || {};
      }

      setUploadProgress(100);

      // Add to list and auto-select
      const updatedLeadMagnet = { ...leadMagnet, extractedData };
      setLeadMagnets((prev) => [updatedLeadMagnet, ...prev]);
      onSelect(updatedLeadMagnet, extractedData);

      // Switch to library mode to show the selection
      setMode("library");

    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  }, [onSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("library")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            mode === "library"
              ? "bg-[#FF4500] text-white"
              : "bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A]"
          }`}
        >
          <Library className="w-4 h-4" />
          Browse Library
        </button>
        <button
          onClick={() => setMode("upload")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            mode === "upload"
              ? "bg-[#FF4500] text-white"
              : "bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A]"
          }`}
        >
          <Plus className="w-4 h-4" />
          Upload New
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Library Mode */}
      {mode === "library" && (
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : leadMagnets.length === 0 ? (
            <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No lead magnets yet</p>
              <button
                onClick={() => setMode("upload")}
                className="px-4 py-2 bg-[#FF4500] text-white rounded-lg font-medium hover:bg-[#FF4500]/90 transition-colors"
              >
                Upload Your First
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leadMagnets.map((lm) => {
                const isSelected = selectedId === lm.id;
                return (
                  <button
                    key={lm.id}
                    onClick={() => handleSelect(lm)}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-[#FF4500] bg-[#FF4500]/10"
                        : "border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]"
                    }`}
                  >
                    {/* Selected Checkmark */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#FF4500] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div className="flex gap-4">
                      {/* Thumbnail/Icon */}
                      <div className="w-16 h-20 flex-shrink-0 rounded-lg bg-[#2A2A2A] flex items-center justify-center">
                        <FileText className="w-8 h-8 text-gray-500" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate pr-8">
                          {lm.title}
                        </h3>
                        {lm.description && (
                          <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                            {lm.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {lm.category && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-[#2A2A2A] text-gray-400">
                              {lm.category}
                            </span>
                          )}
                          {lm.extractedData && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Analyzed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upload Mode */}
      {mode === "upload" && (
        <div>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragActive
                ? "border-[#FF4500] bg-[#FF4500]/10"
                : isUploading
                ? "border-gray-600 bg-[#1A1A1A] cursor-not-allowed"
                : "border-[#2A2A2A] hover:border-[#3A3A3A] hover:bg-[#1A1A1A]"
            }`}
          >
            <input {...getInputProps()} />

            {isUploading ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#FF4500]/20 flex items-center justify-center">
                  {isAnalyzing ? (
                    <Sparkles className="w-8 h-8 text-[#FF4500] animate-pulse" />
                  ) : (
                    <Upload className="w-8 h-8 text-[#FF4500] animate-pulse" />
                  )}
                </div>
                <p className="text-lg">
                  {isAnalyzing ? "Analyzing content with AI..." : "Uploading..."}
                </p>
                <div className="w-full max-w-xs mx-auto bg-[#2A2A2A] rounded-full h-2">
                  <div
                    className="bg-[#FF4500] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {isAnalyzing && (
                  <p className="text-sm text-gray-400">
                    Extracting key messages, statistics, and hooks...
                  </p>
                )}
              </div>
            ) : isDragActive ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#FF4500]/20 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-[#FF4500]" />
                </div>
                <p className="text-lg text-[#FF4500]">Drop your PDF here</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#1A1A1A] flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-lg mb-1">
                    Drag and drop your PDF here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    PDF files only (max 50MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF4500]" />
              AI-Powered Analysis
            </h4>
            <p className="text-sm text-gray-400">
              After upload, our AI will automatically extract key messages,
              statistics, compelling hooks, and chapter outlines from your PDF
              to help generate campaign content.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
