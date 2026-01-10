"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Check,
  Package,
  Calendar,
  Edit3,
  Eye,
  Upload,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Product } from "@/lib/products/catalog";

interface Email {
  id?: string;
  order: number;
  sendDelayDays: number;
  subject: string;
  preheader: string;
  bodyHtml: string;
  bodyText: string;
  purpose: "value" | "engagement" | "soft_pitch" | "hard_pitch";
  status?: string;
  ccCampaignId?: string;
}

interface EmailSequence {
  id: string;
  name: string;
  sequenceLength: number;
  productId?: string;
  productName?: string;
  productUrl?: string;
  status: string;
  emails: Email[];
}

interface LeadMagnet {
  id: string;
  title: string;
  slug?: string;
  description?: string | null;
}

interface Props {
  leadMagnet: LeadMagnet;
  onSequenceGenerated: (sequence: EmailSequence, selectedProduct?: Product) => void;
  initialSequence?: EmailSequence | null;
}

const SEQUENCE_LENGTHS = [
  { value: 3, label: "Quick (3 emails)", description: "Value → Value → Soft Pitch" },
  { value: 5, label: "Standard (5 emails)", description: "Best for most campaigns" },
  { value: 7, label: "Extended (7 emails)", description: "Deeper nurturing with more value" },
];

const PURPOSE_LABELS: Record<string, { label: string; color: string }> = {
  value: { label: "Value", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  engagement: { label: "Engagement", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  soft_pitch: { label: "Soft Pitch", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  hard_pitch: { label: "Hard Pitch", color: "bg-[#FF4500]/20 text-[#FF4500] border-[#FF4500]/30" },
};

export default function StepEmailSequence({
  leadMagnet,
  onSequenceGenerated,
  initialSequence,
}: Props) {
  const [sequenceLength, setSequenceLength] = useState<3 | 5 | 7>(5);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sequence, setSequence] = useState<EmailSequence | null>(initialSequence || null);
  const [expandedEmail, setExpandedEmail] = useState<number | null>(null);
  const [previewEmail, setPreviewEmail] = useState<Email | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    success: boolean;
    synced: number;
    total: number;
  } | null>(null);

  // Fetch recommended products on mount
  useEffect(() => {
    fetchProducts();
  }, [leadMagnet.slug]);

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const url = leadMagnet.slug
        ? `/api/products?leadMagnetSlug=${encodeURIComponent(leadMagnet.slug)}&limit=8`
        : `/api/products?kevinsDaily=true&limit=8`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRecommendedProducts(data.products || []);
        // Auto-select first product if available
        if (data.products?.length > 0 && !selectedProduct) {
          setSelectedProduct(data.products[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const generateSequence = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/email-sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadMagnetId: leadMagnet.id,
          sequenceLength,
          productId: selectedProduct?.id,
          productName: selectedProduct?.name,
          productUrl: selectedProduct?.url,
          generateEmails: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate email sequence");
      }

      setSequence(data.sequence);
      onSequenceGenerated(data.sequence, selectedProduct || undefined);
    } catch (err) {
      console.error("Error generating sequence:", err);
      setError(err instanceof Error ? err.message : "Failed to generate emails");
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateEmail = async (emailIndex: number) => {
    if (!sequence) return;

    try {
      const response = await fetch(`/api/email-sequences/${sequence.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regenerateEmail: emailIndex,
        }),
      });

      const data = await response.json();

      if (response.ok && data.sequence) {
        setSequence(data.sequence);
        onSequenceGenerated(data.sequence, selectedProduct || undefined);
      }
    } catch (err) {
      console.error("Error regenerating email:", err);
    }
  };

  const toggleEmailExpand = (order: number) => {
    setExpandedEmail(expandedEmail === order ? null : order);
  };

  const syncToConstantContact = async () => {
    if (!sequence) return;

    setIsSyncing(true);
    setSyncStatus(null);
    setError(null);

    try {
      const response = await fetch(`/api/email-sequences/${sequence.id}/sync-to-cc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overwrite: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync to Constant Contact");
      }

      setSyncStatus({
        success: data.success,
        synced: data.summary.created + data.summary.updated,
        total: data.summary.total,
      });

      // Refresh sequence to get updated ccCampaignIds
      const refreshResponse = await fetch(`/api/email-sequences/${sequence.id}`);
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setSequence(refreshData.sequence);
      }
    } catch (err) {
      console.error("Error syncing to CC:", err);
      setError(err instanceof Error ? err.message : "Failed to sync to Constant Contact");
    } finally {
      setIsSyncing(false);
    }
  };

  const getSyncedCount = () => {
    if (!sequence) return 0;
    return sequence.emails.filter(e => e.ccCampaignId).length;
  };

  return (
    <div className="space-y-6">
      {/* Sequence Configuration */}
      {!sequence && (
        <>
          {/* Sequence Length Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">Email Sequence Length</label>
            <div className="space-y-2">
              {SEQUENCE_LENGTHS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSequenceLength(option.value as 3 | 5 | 7)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    sequenceLength === option.value
                      ? "border-[#FF4500] bg-[#FF4500]/10"
                      : "border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-400">{option.description}</div>
                    </div>
                    {sequenceLength === option.value && (
                      <div className="w-6 h-6 rounded-full bg-[#FF4500] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Product to Promote (Optional)
            </label>
            <p className="text-sm text-gray-400 mb-3">
              Select a product to naturally promote in the pitch emails
            </p>

            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
                {/* No Product Option */}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${
                    !selectedProduct
                      ? "border-[#FF4500] bg-[#FF4500]/10"
                      : "border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">No product</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Pure value content
                  </div>
                </button>

                {recommendedProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      selectedProduct?.id === product.id
                        ? "border-[#FF4500] bg-[#FF4500]/10"
                        : "border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]"
                    }`}
                  >
                    <div className="font-medium text-sm truncate">{product.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{product.price}</div>
                    {product.isKevinDaily && (
                      <div className="text-xs text-[#FF4500] mt-1">Kevin&apos;s Daily Stack</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={generateSequence}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating {sequenceLength} Emails...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Email Sequence
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}
        </>
      )}

      {/* Generated Sequence Preview */}
      {sequence && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#FF4500]" />
                <span className="font-medium">{sequence.name}</span>
              </div>
              <span className="text-sm text-gray-400">
                {sequence.emails.length} emails
              </span>
            </div>
            {sequence.productName && (
              <div className="text-sm text-gray-400">
                Promoting: <span className="text-white">{sequence.productName}</span>
              </div>
            )}
          </div>

          {/* Email List */}
          <div className="space-y-3">
            {sequence.emails.map((email) => {
              const purposeConfig = PURPOSE_LABELS[email.purpose] || PURPOSE_LABELS.value;
              const isExpanded = expandedEmail === email.order;

              return (
                <div
                  key={email.order}
                  className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] overflow-hidden"
                >
                  {/* Email Header */}
                  <button
                    onClick={() => toggleEmailExpand(email.order)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center text-sm font-medium">
                        {email.order}
                      </div>
                      <div>
                        <div className="font-medium truncate max-w-md">{email.subject}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${purposeConfig.color}`}>
                            {purposeConfig.label}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Day {email.sendDelayDays}
                          </span>
                          {email.ccCampaignId && (
                            <span className="px-2 py-0.5 text-xs rounded-full border bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              CC
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-[#2A2A2A] pt-4">
                      {/* Preheader */}
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-1">Preview Text</div>
                        <div className="text-sm text-gray-400">{email.preheader}</div>
                      </div>

                      {/* Body Preview */}
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-1">Body Preview</div>
                        <div className="text-sm text-gray-300 line-clamp-4 whitespace-pre-wrap">
                          {email.bodyText.slice(0, 300)}...
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewEmail(email);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded text-sm transition"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            regenerateEmail(email.order);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded text-sm transition"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Regenerate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sync Status */}
          {syncStatus && (
            <div className={`p-4 rounded-lg border ${
              syncStatus.success
                ? "bg-green-500/10 border-green-500/30"
                : "bg-yellow-500/10 border-yellow-500/30"
            }`}>
              <div className="flex items-center gap-2">
                {syncStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                )}
                <span className={syncStatus.success ? "text-green-400" : "text-yellow-400"}>
                  {syncStatus.synced} of {syncStatus.total} emails synced to Constant Contact
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {/* Sync to Constant Contact Button */}
            <button
              onClick={syncToConstantContact}
              disabled={isSyncing || getSyncedCount() === sequence.emails.length}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${
                getSyncedCount() === sequence.emails.length
                  ? "bg-green-500/20 text-green-400 border border-green-500/30 cursor-default"
                  : "bg-[#FF4500] hover:bg-[#FF5722] text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing to Constant Contact...
                </>
              ) : getSyncedCount() === sequence.emails.length ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Synced to Constant Contact
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Sync to Constant Contact
                  {getSyncedCount() > 0 && (
                    <span className="text-sm opacity-75">
                      ({getSyncedCount()}/{sequence.emails.length})
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Start Over Button */}
            <button
              onClick={() => {
                setSequence(null);
                setError(null);
                setSyncStatus(null);
              }}
              className="flex items-center justify-center gap-2 px-6 py-3 border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {previewEmail && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-[#2A2A2A]">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
              <div>
                <div className="font-medium">Email {previewEmail.order} Preview</div>
                <div className="text-sm text-gray-400">{previewEmail.subject}</div>
              </div>
              <button
                onClick={() => setPreviewEmail(null)}
                className="text-gray-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            {/* Email Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div
                dangerouslySetInnerHTML={{ __html: previewEmail.bodyHtml }}
                className="email-preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
