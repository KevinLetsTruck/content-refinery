"use client";

import { useState } from "react";
import {
  X,
  Download,
  Loader2,
  Check,
  AlertCircle,
  Link as LinkIcon,
  HelpCircle,
} from "lucide-react";

interface GammaImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

export default function GammaImportModal({
  onClose,
  onImported,
}: GammaImportModalProps) {
  const [urls, setUrls] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    invalid: number;
    errors: string[];
  } | null>(null);

  const parseUrls = (): string[] => {
    return urls
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  };

  const urlCount = parseUrls().length;

  const handleImport = async () => {
    const urlList = parseUrls();
    
    if (urlList.length === 0) {
      setError("Please enter at least one Gamma URL");
      return;
    }

    try {
      setImporting(true);
      setError(null);

      const res = await fetch("/api/gamma/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urlList }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setResult({
        imported: data.imported,
        skipped: data.skipped,
        invalid: data.invalid,
        errors: data.errors || [],
      });

      // Auto-close after success
      if (data.imported > 0) {
        setTimeout(() => onImported(), 2000);
      }
    } catch {
      setError("Failed to import URLs");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-[#FF4500]" />
            <h2 className="text-xl font-semibold text-white">Import from Gamma</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {result ? (
            // Success state
            <div className="text-center py-8">
              <Check className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-white">Import Complete!</h3>
              <p className="text-gray-400">
                Imported {result.imported} item{result.imported !== 1 ? "s" : ""}
                {result.skipped > 0 && (
                  <>, skipped {result.skipped} duplicate{result.skipped !== 1 ? "s" : ""}</>
                )}
              </p>
              {result.errors.length > 0 && (
                <div className="mt-4 text-left bg-red-900/20 border border-red-900/50 rounded-lg p-3">
                  <p className="text-red-400 text-sm font-medium mb-1">
                    {result.invalid} invalid URL{result.invalid !== 1 ? "s" : ""}:
                  </p>
                  <ul className="text-red-400/80 text-xs space-y-1">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>...and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            // Input state
            <>
              <p className="text-gray-400 text-sm mb-4">
                Paste Gamma URLs below (one per line or comma-separated)
              </p>

              <textarea
                value={urls}
                onChange={(e) => {
                  setUrls(e.target.value);
                  setError(null);
                }}
                placeholder={`https://gamma.app/docs/My-Presentation-abc123\nhttps://gamma.app/docs/Another-Doc-xyz789`}
                rows={6}
                className="w-full p-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg focus:border-[#FF4500] outline-none resize-none font-mono text-sm text-white placeholder-gray-600"
              />

              {/* Help text */}
              <div className="flex items-start gap-2 mt-3 p-3 bg-[#0D0D0D] rounded-lg">
                <HelpCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-gray-500">
                  <p className="font-medium text-gray-400 mb-1">How to find Gamma URLs:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open your document in Gamma</li>
                    <li>Copy the URL from your browser&apos;s address bar</li>
                    <li>Paste it here</li>
                  </ol>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 mt-3 p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* URL count */}
              {urlCount > 0 && (
                <p className="text-sm text-gray-500 mt-3">
                  {urlCount} URL{urlCount !== 1 ? "s" : ""} detected
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="flex items-center justify-between p-4 border-t border-[#2A2A2A]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={urlCount === 0 || importing}
              className="flex items-center gap-2 px-6 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition text-white"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Import {urlCount > 0 ? `${urlCount} URL${urlCount !== 1 ? "s" : ""}` : ""}
                </>
              )}
            </button>
          </div>
        )}

        {/* Close button for result state */}
        {result && (
          <div className="flex justify-center p-4 border-t border-[#2A2A2A]">
            <button
              onClick={onImported}
              className="px-6 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg transition text-white"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}




