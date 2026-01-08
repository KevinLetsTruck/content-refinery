"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Check, Copy, ExternalLink } from "lucide-react";

interface UploadedFile {
  filename: string;
  publicUrl: string;
  key: string;
  uploadedAt: string;
}

export default function LeadMagnetUploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned URL
      setUploadProgress(10);
      const presignResponse = await fetch("/api/upload/lead-magnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      if (!presignResponse.ok) {
        const data = await presignResponse.json();
        throw new Error(data.error || "Failed to get upload URL");
      }

      const { uploadUrl, key, publicUrl } = await presignResponse.json();
      setUploadProgress(30);

      // Step 2: Upload file directly to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      setUploadProgress(100);

      // Add to uploaded files list
      const newFile: UploadedFile = {
        filename: file.name,
        publicUrl,
        key,
        uploadedAt: new Date().toISOString(),
      };

      setUploadedFiles((prev) => [newFile, ...prev]);

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

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Lead Magnet Upload</h1>
          <p className="text-gray-400">
            Upload PDFs and images for your landing pages and lead magnets
          </p>
        </div>

        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
            isDragActive
              ? "border-amber-500 bg-amber-500/10"
              : isUploading
              ? "border-gray-600 bg-gray-800/50 cursor-not-allowed"
              : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/30"
          }`}
        >
          <input {...getInputProps()} />

          {isUploading ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
                <Upload className="w-8 h-8 text-amber-500 animate-pulse" />
              </div>
              <p className="text-lg">Uploading...</p>
              <div className="w-full max-w-xs mx-auto bg-gray-700 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : isDragActive ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
                <Upload className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-lg text-amber-400">Drop your file here</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-800 flex items-center justify-center">
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
            <h2 className="text-xl font-semibold mb-4">Uploaded Files</h2>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.key}
                  className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg"
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
                      className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
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
                      className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
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
        <div className="mt-8 p-6 bg-gray-800/30 border border-gray-700 rounded-lg">
          <h3 className="font-semibold mb-3">How to use</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-400">
            <li>Upload your PDF guide or image</li>
            <li>Copy the generated URL</li>
            <li>Paste the URL in your landing page configuration as the download URL</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
