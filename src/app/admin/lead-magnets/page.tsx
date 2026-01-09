"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  Check,
  Copy,
  ExternalLink,
  Library,
  Plus,
  Loader2,
  Calendar,
  Sparkles,
} from "lucide-react";

interface UploadedFile {
  filename: string;
  publicUrl: string;
  key: string;
  uploadedAt: string;
}

interface LeadMagnet {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  fileUrl: string;
  fileName: string | null;
  extractedData: Record<string, unknown> | null;
  createdAt: string;
}

type Tab = "library" | "upload";

export default function LeadMagnetUploadPage() {
  const [tab, setTab] = useState<Tab>("library");

  // Library state
  const [leadMagnets, setLeadMagnets] = useState<LeadMagnet[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Fetch lead magnets on mount
  useEffect(() => {
    fetchLeadMagnets();
  }, []);

  const fetchLeadMagnets = async () => {
    try {
      setIsLoadingLibrary(true);
      const res = await fetch("/api/lead-magnets");
      const data = await res.json();
      setLeadMagnets(data.leadMagnets || []);
    } catch (err) {
      console.error("Failed to fetch lead magnets:", err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Upload via the lead-magnets API (creates DB record)
      setUploadProgress(20);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

      const uploadResponse = await fetch("/api/lead-magnets", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        throw new Error(data.error || "Failed to upload file");
      }

      const { leadMagnet } = await uploadResponse.json();
      setUploadProgress(100);

      // Add to uploaded files list for this session
      const newFile: UploadedFile = {
        filename: file.name,
        publicUrl: leadMagnet.fileUrl,
        key: leadMagnet.id,
        uploadedAt: new Date().toISOString(),
      };

      setUploadedFiles((prev) => [newFile, ...prev]);

      // Refresh library
      fetchLeadMagnets();

    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const copyToClipboard = async (url: string, key: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Lead Magnets</h1>
          <p className="text-gray-400">
            Upload and manage PDFs and images for your landing pages and campaigns
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("library")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              tab === "library"
                ? "bg-[#FF4500] text-white"
                : "bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A]"
            }`}
          >
            <Library className="w-4 h-4" />
            Library
          </button>
          <button
            onClick={() => setTab("upload")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              tab === "upload"
                ? "bg-[#FF4500] text-white"
                : "bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A]"
            }`}
          >
            <Plus className="w-4 h-4" />
            Upload New
          </button>
        </div>

        {/* Library Tab */}
        {tab === "library" && (
          <div>
            {isLoadingLibrary ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : leadMagnets.length === 0 ? (
              <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No lead magnets yet</p>
                <button
                  onClick={() => setTab("upload")}
                  className="px-4 py-2 bg-[#FF4500] text-white rounded-lg font-medium hover:bg-[#FF4500]/90 transition-colors"
                >
                  Upload Your First
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leadMagnets.map((lm) => (
                  <div
                    key={lm.id}
                    className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl hover:border-[#3A3A3A] transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-full h-32 rounded-lg bg-[#2A2A2A] flex items-center justify-center mb-4">
                      <FileText className="w-12 h-12 text-gray-500" />
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-white truncate mb-1">
                      {lm.title}
                    </h3>

                    {/* Description */}
                    {lm.description && (
                      <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                        {lm.description}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(lm.createdAt)}</span>
                      {lm.category && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#2A2A2A]">
                            {lm.category}
                          </span>
                        </>
                      )}
                      {lm.extractedData && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                          <Sparkles className="w-3 h-3" />
                          Analyzed
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <a
                        href={lm.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-sm transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View PDF
                      </a>
                      <button
                        onClick={() => copyToClipboard(lm.fileUrl, lm.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-sm transition-colors"
                        title="Copy URL"
                      >
                        {copied === lm.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Tab */}
        {tab === "upload" && (
          <div>
            {/* Upload Area */}
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
                    <Upload className="w-8 h-8 text-[#FF4500] animate-pulse" />
                  </div>
                  <p className="text-lg">Uploading...</p>
                  <div className="w-full max-w-xs mx-auto bg-[#2A2A2A] rounded-full h-2">
                    <div
                      className="bg-[#FF4500] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : isDragActive ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#FF4500]/20 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-[#FF4500]" />
                  </div>
                  <p className="text-lg text-[#FF4500]">Drop your file here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#1A1A1A] flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg mb-1">
                      Drag and drop your file here, or click to browse
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports PDF, PNG, JPEG, WebP (max 50MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Recently Uploaded</h2>
                <div className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.key}
                      className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">{file.filename}</p>
                          <p className="text-sm text-gray-500 truncate max-w-md">
                            {file.publicUrl}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(file.publicUrl, file.key)}
                          className="p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors"
                          title="Copy URL"
                        >
                          {copied === file.key ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <a
                          href={file.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-5 h-5 text-gray-400" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-8 p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
              <h3 className="font-semibold mb-3">How to use</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-400">
                <li>Upload your PDF guide or image</li>
                <li>The file will be saved to your lead magnet library</li>
                <li>Copy the URL to use in your landing page or campaign</li>
                <li>AI can analyze PDF content to extract key messages</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
