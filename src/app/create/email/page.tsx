"use client";

import { useRouter } from "next/navigation";
import { useWizardStore } from "../store";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Gift,
  MessageSquare,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

const EMAIL_PURPOSES = [
  { id: "value", name: "Value", icon: <Gift className="w-4 h-4" />, color: "bg-blue-500" },
  { id: "engagement", name: "Engagement", icon: <MessageSquare className="w-4 h-4" />, color: "bg-purple-500" },
  { id: "soft_pitch", name: "Soft Pitch", icon: <Sparkles className="w-4 h-4" />, color: "bg-[#F4A300]" },
  { id: "hard_pitch", name: "Hard Pitch", icon: <ShoppingBag className="w-4 h-4" />, color: "bg-[#FF4500]" },
];

const SEQUENCE_TEMPLATES = [
  { length: 3, name: "Short", description: "3 emails over 7 days" },
  { length: 5, name: "Standard", description: "5 emails over 14 days" },
  { length: 7, name: "Extended", description: "7 emails over 21 days" },
];

const DEFAULT_EMAILS: Record<number, Array<{ day: number; purpose: string; subject: string; preheader?: string }>> = {
  3: [
    { day: 2, purpose: "value", subject: "Here's what most drivers get wrong...", preheader: "And how to fix it" },
    { day: 4, purpose: "value", subject: "The one thing that changed everything", preheader: "A quick story" },
    { day: 7, purpose: "soft_pitch", subject: "Ready to take the next step?", preheader: "Let's do this" },
  ],
  5: [
    { day: 2, purpose: "value", subject: "Here's what most drivers get wrong...", preheader: "And how to fix it" },
    { day: 4, purpose: "value", subject: "The one thing that changed everything", preheader: "A quick story" },
    { day: 7, purpose: "engagement", subject: "Quick question for you", preheader: "I'd love to hear from you" },
    { day: 10, purpose: "soft_pitch", subject: "Something I think you'll like", preheader: "Based on what you're learning" },
    { day: 14, purpose: "hard_pitch", subject: "Last chance: Special offer inside", preheader: "Don't miss out" },
  ],
  7: [
    { day: 2, purpose: "value", subject: "Here's what most drivers get wrong...", preheader: "And how to fix it" },
    { day: 4, purpose: "value", subject: "The one thing that changed everything", preheader: "A quick story" },
    { day: 6, purpose: "engagement", subject: "Quick question for you", preheader: "I'd love to hear from you" },
    { day: 9, purpose: "value", subject: "The science behind what you're feeling", preheader: "Let me explain" },
    { day: 12, purpose: "soft_pitch", subject: "Something I think you'll like", preheader: "Based on what you're learning" },
    { day: 15, purpose: "engagement", subject: "How are you doing?", preheader: "Check in time" },
    { day: 21, purpose: "hard_pitch", subject: "Last chance: Special offer inside", preheader: "Don't miss out" },
  ],
};

export default function EmailSequencePage() {
  const router = useRouter();
  const {
    mode,
    sourceType,
    sourceTitle,
    contentStrategy,
    campaignConfig,
    emailSequence,
    setEmailSequence,
    currentStep,
    goToStep,
    getSteps,
  } = useWizardStore();

  const [sequenceLength, setSequenceLength] = useState(
    emailSequence?.length || campaignConfig.emailLength || 5
  );
  const [emails, setEmails] = useState(
    emailSequence?.emails || DEFAULT_EMAILS[sequenceLength as keyof typeof DEFAULT_EMAILS] || []
  );
  const [expandedEmail, setExpandedEmail] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [productSearch, setProductSearch] = useState(campaignConfig.productName || "");

  // Get the correct step number for email
  const steps = getSteps();
  const emailStep = steps.find((s) => s.path === "/create/email");
  const emailStepNumber = emailStep?.number || 8;

  useEffect(() => {
    if (mode !== "campaign") {
      router.push("/create/mode");
      return;
    }
    if (!campaignConfig.includeEmail) {
      router.push("/create/review");
      return;
    }
    if (currentStep !== emailStepNumber) {
      goToStep(emailStepNumber);
    }
  }, [mode, campaignConfig.includeEmail, currentStep, emailStepNumber, goToStep, router]);

  // Update emails when sequence length changes
  useEffect(() => {
    const defaultEmails = DEFAULT_EMAILS[sequenceLength as keyof typeof DEFAULT_EMAILS];
    if (defaultEmails && emails.length !== sequenceLength) {
      setEmails(defaultEmails);
    }
  }, [sequenceLength, emails.length]);

  // Determine back path
  const getBackPath = () => {
    if (sourceType === "guide" || sourceType === "product") {
      return "/create/landing-page";
    }
    return "/create/platforms";
  };

  const handleEmailChange = (index: number, field: string, value: string | number) => {
    const newEmails = [...emails];
    newEmails[index] = { ...newEmails[index], [field]: value };
    setEmails(newEmails);
  };

  const handleGenerateSubjects = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/wizard/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regenerateEmails: true,
          sourceType,
          sourceTitle,
          sequenceLength,
          productName: productSearch,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.emailSubjects && Array.isArray(data.emailSubjects)) {
          const newEmails = emails.map((email, index) => ({
            ...email,
            subject: data.emailSubjects[index] || email.subject,
          }));
          setEmails(newEmails);
        }
      }
    } catch (error) {
      console.error("Failed to generate subjects:", error);
    }
    setIsGenerating(false);
  };

  const handleContinue = () => {
    // Validate emails
    const validEmails = emails.filter((e) => e.subject.trim());
    if (validEmails.length === 0) return;

    setEmailSequence({
      length: sequenceLength,
      productId: campaignConfig.productId,
      productName: productSearch || null,
      emails: validEmails,
    });

    router.push("/create/review");
  };

  const canProceed = emails.some((e) => e.subject.trim());

  if (mode !== "campaign") return null;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push(getBackPath())}
        className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-3xl font-bold mb-2 text-white">Email Sequence</h1>
      <p className="text-[#888888] mb-8">
        Set up your nurture email sequence to follow up with leads.
      </p>

      {/* Sequence Length Selection */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-white">
          Sequence Length
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {SEQUENCE_TEMPLATES.map((template) => (
            <button
              key={template.length}
              onClick={() => setSequenceLength(template.length)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                sequenceLength === template.length
                  ? "border-[#FF4500] bg-[#FF4500]/5"
                  : "border-[#333333] bg-[#1A1A1A] hover:border-[#444444]"
              }`}
            >
              <p className="text-2xl font-bold text-white">{template.length}</p>
              <p className="text-sm font-medium text-white">{template.name}</p>
              <p className="text-xs text-[#888888] mt-1">
                {template.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Product Connection */}
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-4 mb-8">
        <h2 className="text-sm font-semibold mb-3 text-white">
          Product to Promote (Optional)
        </h2>
        <input
          type="text"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          placeholder="e.g., Cardio Miracle, Lyte Balance"
          className="w-full px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
        />
        <p className="text-xs text-[#666666] mt-2">
          This product will be featured in soft and hard pitch emails.
        </p>
      </div>

      {/* Email List */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Email Sequence</h2>
          <button
            onClick={handleGenerateSubjects}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#333333] hover:bg-[#444444] text-sm text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`}
            />
            AI Generate
          </button>
        </div>

        <div className="space-y-3">
          {emails.map((email, index) => {
            const purposeInfo = EMAIL_PURPOSES.find(
              (p) => p.id === email.purpose
            );
            const isExpanded = expandedEmail === index;

            return (
              <div
                key={index}
                className="bg-[#1A1A1A] border border-[#333333] rounded-xl overflow-hidden"
              >
                {/* Header */}
                <button
                  onClick={() =>
                    setExpandedEmail(isExpanded ? null : index)
                  }
                  className="w-full flex items-center justify-between p-4 hover:bg-[#222222] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#333333] rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-[#888888]" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">
                          Day {email.day}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded text-xs text-white ${purposeInfo?.color}`}
                        >
                          {purposeInfo?.name}
                        </span>
                      </div>
                      <p className="text-sm text-[#888888] truncate max-w-md">
                        {email.subject || "Enter subject line..."}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#888888]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#888888]" />
                  )}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-[#333333]">
                    <div className="space-y-4 pt-4">
                      {/* Purpose Selection */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-white">
                          Email Purpose
                        </label>
                        <div className="flex gap-2">
                          {EMAIL_PURPOSES.map((purpose) => (
                            <button
                              key={purpose.id}
                              onClick={() =>
                                handleEmailChange(index, "purpose", purpose.id)
                              }
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                email.purpose === purpose.id
                                  ? "border-[#FF4500] bg-[#FF4500]/10"
                                  : "border-[#333333] hover:border-[#444444]"
                              }`}
                            >
                              {purpose.icon}
                              <span className="text-sm text-white">
                                {purpose.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Send Day */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-white">
                          Send Day
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={email.day}
                          onChange={(e) =>
                            handleEmailChange(
                              index,
                              "day",
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-24 px-3 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20"
                        />
                      </div>

                      {/* Subject Line */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-white">
                          Subject Line
                        </label>
                        <input
                          type="text"
                          value={email.subject}
                          onChange={(e) =>
                            handleEmailChange(index, "subject", e.target.value)
                          }
                          placeholder="Enter subject line"
                          className="w-full px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
                        />
                      </div>

                      {/* Preheader */}
                      <div>
                        <label className="block text-sm font-medium mb-2 text-white">
                          Preheader (Preview Text)
                        </label>
                        <input
                          type="text"
                          value={email.preheader || ""}
                          onChange={(e) =>
                            handleEmailChange(
                              index,
                              "preheader",
                              e.target.value
                            )
                          }
                          placeholder="Short preview text shown in inbox"
                          className="w-full px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline Preview */}
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-4 mb-8">
        <h3 className="text-sm font-semibold mb-4 text-white">
          Sequence Timeline
        </h3>
        <div className="relative">
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-[#333333]" />
          <div className="space-y-3">
            {emails.map((email, index) => {
              const purposeInfo = EMAIL_PURPOSES.find(
                (p) => p.id === email.purpose
              );
              return (
                <div key={index} className="flex items-center gap-3 relative">
                  <div
                    className={`w-4 h-4 rounded-full z-10 ${purposeInfo?.color}`}
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm text-[#888888]">
                      Day {email.day}
                    </span>
                    <span className="text-xs text-white">
                      {purposeInfo?.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={!canProceed}
        className="w-full flex items-center justify-center gap-2 bg-[#FF4500] hover:bg-[#CC3700] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-4 rounded-lg font-medium text-white transition-colors"
      >
        Continue to Review
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
