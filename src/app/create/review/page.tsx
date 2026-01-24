"use client";

import { useRouter } from "next/navigation";
import { useWizardStore } from "../store";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  AlertTriangle,
  Info,
  Edit2,
  Mail,
  FileText,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Music2,
} from "lucide-react";
import { useEffect, useState } from "react";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  instagram_feed: <Instagram className="w-4 h-4" />,
  instagram_story: <Instagram className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  tiktok: <Music2 className="w-4 h-4" />,
};

export default function ReviewPage() {
  const router = useRouter();
  const {
    mode,
    sourceType,
    sourceTitle,
    sourceContent,
    campaignConfig,
    contentStrategy,
    landingPageConfig,
    emailSequence,
    platforms,
    currentStep,
    goToStep,
    getSteps,
    // For quick_post mode - the actual content to be published
    selectedContentId,
    contentOptions,
    editedContent,
  } = useWizardStore();

  const [complianceChecks, setComplianceChecks] = useState<
    { type: "error" | "warning" | "info"; message: string }[]
  >([]);

  // Get the correct step number for review
  const steps = getSteps();
  const reviewStep = steps.find((s) => s.path === "/create/review");
  const reviewStepNumber = reviewStep?.number || 9;

  useEffect(() => {
    if (!sourceType) {
      router.push("/create");
      return;
    }
    if (mode === "campaign" && !contentStrategy) {
      router.push("/create/strategy");
      return;
    }
    if (currentStep !== reviewStepNumber) {
      goToStep(reviewStepNumber);
    }

    // Run compliance checks
    runComplianceChecks();
  }, [sourceType, mode, contentStrategy, currentStep, reviewStepNumber, goToStep, router]);

  const runComplianceChecks = () => {
    const issues: { type: "error" | "warning" | "info"; message: string }[] = [];

    // Check for banned terms
    const bannedTerms = ["trucker", "truckers", "big rig", "18-wheeler"];

    // For quick_post mode, check the actual content to be published (not source content)
    // For campaign mode, check the strategy content
    const selectedContent = contentOptions.find((o) => o.id === selectedContentId);
    const finalPostContent = editedContent || selectedContent?.text || "";

    const contentToCheck = [
      // Only check source content for campaigns, not for quick posts
      mode === "campaign" ? sourceContent : "",
      // For quick posts, check the actual generated/edited content
      mode === "quick_post" ? finalPostContent : "",
      contentStrategy?.keyMessages?.join(" ") || "",
      landingPageConfig?.headline || "",
      landingPageConfig?.subhead || "",
    ].join(" ").toLowerCase();

    bannedTerms.forEach((term) => {
      if (contentToCheck.includes(term)) {
        issues.push({
          type: "error",
          message: `Contains banned term "${term}" - use "driver", "professional driver", or "owner-operator" instead`,
        });
      }
    });

    // Check for platform selection
    const enabledPlatforms = platforms.filter((p) => p.enabled);
    if (enabledPlatforms.length === 0) {
      issues.push({
        type: "error",
        message: "No platforms selected",
      });
    }

    // Campaign-specific checks (only show for campaign mode)
    if (mode === "campaign") {
      // Check for email sequence if enabled
      if (campaignConfig.includeEmail && !emailSequence) {
        issues.push({
          type: "warning",
          message: "Email sequence not configured",
        });
      }

      // Check for landing page if applicable
      if ((sourceType === "guide" || sourceType === "product") && !landingPageConfig) {
        issues.push({
          type: "warning",
          message: "Landing page not configured",
        });
      }

      // Info checks
      if (campaignConfig.duration > 14) {
        issues.push({
          type: "info",
          message: `Long campaign (${campaignConfig.duration} days) - consider breaking into phases`,
        });
      }
    }

    setComplianceChecks(issues);
  };

  // Determine back path based on mode and what was configured
  const getBackPath = () => {
    if (mode === "quick_post") {
      return "/create/visuals";
    }
    // Campaign mode
    if (campaignConfig.includeEmail) {
      return "/create/email";
    }
    if (sourceType === "guide" || sourceType === "product") {
      return "/create/landing-page";
    }
    return "/create/platforms";
  };

  const getNextPath = () => {
    if (mode === "quick_post") {
      return "/create/publish";
    }
    return "/create/generate";
  };

  const enabledPlatforms = platforms.filter((p) => p.enabled);
  const hasErrors = complianceChecks.some((c) => c.type === "error");
  const canProceed = !hasErrors && enabledPlatforms.length > 0;

  const handleContinue = () => {
    if (!canProceed) return;
    router.push(getNextPath());
  };

  if (!sourceType) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push(getBackPath())}
        className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-3xl font-bold mb-2 text-white">
        {mode === "campaign" ? "Review Your Campaign" : "Review Your Post"}
      </h1>
      <p className="text-[#888888] mb-8">
        {mode === "campaign"
          ? "Check everything looks good before generating your content."
          : "Check everything looks good before publishing."}
      </p>

      {/* Compliance Checks */}
      {complianceChecks.length > 0 && (
        <div className="mb-8 space-y-2">
          {complianceChecks.map((check, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-4 rounded-lg border ${
                check.type === "error"
                  ? "bg-red-500/10 border-red-500/50 text-red-400"
                  : check.type === "warning"
                  ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-400"
                  : "bg-blue-500/10 border-blue-500/50 text-blue-400"
              }`}
            >
              {check.type === "error" ? (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              ) : check.type === "warning" ? (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <Info className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm">{check.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Post/Campaign Overview */}
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {mode === "campaign" ? "Campaign Overview" : "Post Overview"}
          </h2>
          {mode === "campaign" && (
            <button
              onClick={() => router.push("/create/configure")}
              className="flex items-center gap-1 text-sm text-[#FF4500] hover:underline"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {mode === "campaign" ? (
            <>
              <div>
                <p className="text-sm text-[#888888]">Name</p>
                <p className="font-medium text-white">
                  {contentStrategy?.campaignName || campaignConfig.name || sourceTitle}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#888888]">Source</p>
                <p className="font-medium capitalize text-white">
                  {sourceType?.replace("_", " ")}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#888888]">Duration</p>
                <p className="font-medium text-white">{campaignConfig.duration} days</p>
              </div>
              <div>
                <p className="text-sm text-[#888888]">CTA Type</p>
                <p className="font-medium capitalize text-white">
                  {campaignConfig.ctaType?.replace("_", " ")}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-[#888888]">Content Type</p>
                <p className="font-medium capitalize text-white">
                  {sourceType?.replace("_", " ") || "Quick Post"}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#888888]">Platforms</p>
                <p className="font-medium text-white">
                  {enabledPlatforms.length} selected
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content Strategy */}
      {contentStrategy && (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Content Strategy</h2>
            <button
              onClick={() => router.push("/create/strategy")}
              className="flex items-center gap-1 text-sm text-[#FF4500] hover:underline"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-[#888888] mb-2">Key Messages</p>
              <div className="space-y-1">
                {contentStrategy.keyMessages.map((message, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#22C55E] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-white">{message}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-[#888888] mb-2">
                Campaign Phases ({contentStrategy.phases.length})
              </p>
              <div className="flex gap-2 flex-wrap">
                {contentStrategy.phases.map((phase, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-[#333333] rounded-full text-sm text-white"
                  >
                    {phase.name} (Day {phase.dayRange[0]}-{phase.dayRange[1]})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Platforms */}
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Platforms</h2>
          <button
            onClick={() => router.push("/create/platforms")}
            className="flex items-center gap-1 text-sm text-[#FF4500] hover:underline"
          >
            <Edit2 className="w-3 h-3" />
            Edit
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {enabledPlatforms.map((platform) => (
            <div
              key={platform.platform}
              className="flex items-center gap-2 px-3 py-2 bg-[#333333] rounded-lg"
            >
              {PLATFORM_ICONS[platform.platform]}
              <span className="text-sm capitalize text-white">
                {platform.platform.replace("_", " ")}
              </span>
              {mode === "campaign" && (
                <span className="text-xs text-[#888888]">
                  ({campaignConfig.frequency[platform.platform.replace("instagram_feed", "instagram")] || 1}/day)
                </span>
              )}
            </div>
          ))}
        </div>

        {mode === "campaign" && (
          <p className="text-sm text-[#888888] mt-4">
            Total:{" "}
            {Object.entries(campaignConfig.frequency)
              .filter(([platform]) =>
                enabledPlatforms.some((p) =>
                  p.platform.includes(platform) || platform.includes(p.platform.replace("instagram_feed", "instagram"))
                )
              )
              .reduce((sum, [, count]) => sum + (count || 0), 0) *
              campaignConfig.duration}{" "}
            posts over {campaignConfig.duration} days
          </p>
        )}
      </div>

      {/* Landing Page */}
      {landingPageConfig && (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Landing Page</h2>
            </div>
            <button
              onClick={() => router.push("/create/landing-page")}
              className="flex items-center gap-1 text-sm text-[#FF4500] hover:underline"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-white">{landingPageConfig.headline}</p>
            <p className="text-sm text-[#888888]">{landingPageConfig.subhead}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 bg-[#333333] rounded text-white">
                {landingPageConfig.template}
              </span>
              {landingPageConfig.useGamma && (
                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                  Gamma
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Sequence */}
      {emailSequence && (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Email Sequence</h2>
            </div>
            <button
              onClick={() => router.push("/create/email")}
              className="flex items-center gap-1 text-sm text-[#FF4500] hover:underline"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-[#888888]">
              {emailSequence.length} emails over{" "}
              {emailSequence.emails[emailSequence.emails.length - 1]?.day || 14} days
            </p>
            {emailSequence.productName && (
              <p className="text-sm">
                <span className="text-[#888888]">Promoting:</span>{" "}
                <span className="text-white">{emailSequence.productName}</span>
              </p>
            )}
            <div className="flex gap-2 mt-2 flex-wrap">
              {emailSequence.emails.map((email, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-1 bg-[#333333] rounded text-white"
                >
                  Day {email.day}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-[#333333] rounded-xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-[#FF4500]" />
          <h2 className="text-lg font-semibold text-white">
            {mode === "campaign" ? "What We'll Generate" : "Ready to Publish"}
          </h2>
        </div>

        {mode === "campaign" ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-[#0D0D0D] rounded-lg">
              <p className="text-2xl font-bold text-white">
                {Object.entries(campaignConfig.frequency)
                  .filter(([platform]) =>
                    enabledPlatforms.some((p) =>
                      p.platform.includes(platform) || platform.includes(p.platform.replace("instagram_feed", "instagram"))
                    )
                  )
                  .reduce((sum, [, count]) => sum + (count || 0), 0) *
                  campaignConfig.duration}
              </p>
              <p className="text-sm text-[#888888]">Posts</p>
            </div>
            <div className="text-center p-4 bg-[#0D0D0D] rounded-lg">
              <p className="text-2xl font-bold text-white">
                {emailSequence ? emailSequence.length : 0}
              </p>
              <p className="text-sm text-[#888888]">Emails</p>
            </div>
            <div className="text-center p-4 bg-[#0D0D0D] rounded-lg">
              <p className="text-2xl font-bold text-white">
                {landingPageConfig ? 1 : 0}
              </p>
              <p className="text-sm text-[#888888]">Landing Page</p>
            </div>
          </div>
        ) : (
          <div className="text-center p-4 bg-[#0D0D0D] rounded-lg">
            <p className="text-2xl font-bold text-white">{enabledPlatforms.length}</p>
            <p className="text-sm text-[#888888]">
              {enabledPlatforms.length === 1 ? "Platform" : "Platforms"}
            </p>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={!canProceed}
        className="w-full flex items-center justify-center gap-2 bg-[#FF4500] hover:bg-[#CC3700] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-4 rounded-lg font-medium text-white transition-colors"
      >
        {mode === "campaign" ? "Generate Campaign" : "Continue to Publish"}
        <ArrowRight className="w-4 h-4" />
      </button>

      {hasErrors && (
        <p className="text-center text-sm text-red-400 mt-4">
          Please fix the errors above before continuing.
        </p>
      )}
    </div>
  );
}
