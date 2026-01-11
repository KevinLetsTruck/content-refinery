"use client";

import { useRouter } from "next/navigation";
import { useWizardStore } from "../store";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Zap,
  Users,
  ShoppingBag,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";

const TEMPLATES = [
  {
    id: "lead_magnet",
    name: "Lead Magnet Download",
    description: "Focused on getting email signups for your free guide",
    icon: <FileText className="w-6 h-6" />,
    color: "bg-blue-500/20 text-blue-400",
  },
  {
    id: "challenge",
    name: "Challenge Signup",
    description: "Sign up for a multi-day health challenge",
    icon: <Zap className="w-6 h-6" />,
    color: "bg-[#FF4500]/20 text-[#FF4500]",
  },
  {
    id: "waitlist",
    name: "Waitlist",
    description: "Build anticipation for an upcoming product or program",
    icon: <Users className="w-6 h-6" />,
    color: "bg-purple-500/20 text-purple-400",
  },
  {
    id: "product_launch",
    name: "Product Launch",
    description: "Direct sales page for a product or supplement",
    icon: <ShoppingBag className="w-6 h-6" />,
    color: "bg-[#22C55E]/20 text-[#22C55E]",
  },
];

export default function LandingPageConfigPage() {
  const router = useRouter();
  const {
    mode,
    sourceType,
    sourceTitle,
    contentStrategy,
    campaignConfig,
    landingPageConfig,
    setLandingPageConfig,
    currentStep,
    goToStep,
    getSteps,
  } = useWizardStore();

  const [selectedTemplate, setSelectedTemplate] = useState(
    landingPageConfig?.template || "lead_magnet"
  );
  const [headline, setHeadline] = useState(
    landingPageConfig?.headline || contentStrategy?.landingPageCopy?.headline || ""
  );
  const [subhead, setSubhead] = useState(
    landingPageConfig?.subhead || contentStrategy?.landingPageCopy?.subhead || ""
  );
  const [cta, setCta] = useState(
    landingPageConfig?.cta || contentStrategy?.landingPageCopy?.cta || ""
  );
  const [bullets, setBullets] = useState<string[]>(
    landingPageConfig?.bullets || contentStrategy?.landingPageCopy?.bullets || ["", "", ""]
  );
  const [useGamma, setUseGamma] = useState(landingPageConfig?.useGamma ?? true);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Get the correct step number for landing page
  const steps = getSteps();
  const landingPageStep = steps.find((s) => s.path === "/create/landing-page");
  const landingPageStepNumber = landingPageStep?.number || 7;

  useEffect(() => {
    if (mode !== "campaign") {
      router.push("/create/mode");
      return;
    }
    if (!contentStrategy) {
      router.push("/create/strategy");
      return;
    }
    if (currentStep !== landingPageStepNumber) {
      goToStep(landingPageStepNumber);
    }

    // Initialize from strategy if available and fields are empty
    if (contentStrategy?.landingPageCopy) {
      if (!headline) setHeadline(contentStrategy.landingPageCopy.headline);
      if (!subhead) setSubhead(contentStrategy.landingPageCopy.subhead);
      if (!cta) setCta(contentStrategy.landingPageCopy.cta);
      if (bullets.every((b) => !b))
        setBullets(contentStrategy.landingPageCopy.bullets);
    }
  }, [
    mode,
    contentStrategy,
    currentStep,
    landingPageStepNumber,
    goToStep,
    router,
    headline,
    subhead,
    cta,
    bullets,
  ]);

  // Determine next path
  const getNextPath = () => {
    if (campaignConfig.includeEmail) {
      return "/create/email";
    }
    return "/create/review";
  };

  const handleBulletChange = (index: number, value: string) => {
    const newBullets = [...bullets];
    newBullets[index] = value;
    setBullets(newBullets);
  };

  const handleAddBullet = () => {
    if (bullets.length < 6) {
      setBullets([...bullets, ""]);
    }
  };

  const handleRemoveBullet = (index: number) => {
    if (bullets.length > 1) {
      setBullets(bullets.filter((_, i) => i !== index));
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetch("/api/wizard/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regenerateLandingPage: true,
          sourceType,
          sourceTitle,
          template: selectedTemplate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.landingPageCopy) {
          setHeadline(data.landingPageCopy.headline);
          setSubhead(data.landingPageCopy.subhead);
          setCta(data.landingPageCopy.cta);
          setBullets(data.landingPageCopy.bullets);
        }
      }
    } catch (error) {
      console.error("Failed to regenerate:", error);
    }
    setIsRegenerating(false);
  };

  const handleContinue = () => {
    // Filter empty bullets
    const validBullets = bullets.filter((b) => b.trim());

    if (!headline.trim() || !subhead.trim() || !cta.trim() || validBullets.length === 0) {
      return;
    }

    setLandingPageConfig({
      headline,
      subhead,
      cta,
      bullets: validBullets,
      template: selectedTemplate,
      useGamma,
    });

    router.push(getNextPath());
  };

  const canProceed =
    headline.trim() &&
    subhead.trim() &&
    cta.trim() &&
    bullets.some((b) => b.trim());

  if (mode !== "campaign") return null;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push("/create/platforms")}
        className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Platforms
      </button>

      <h1 className="text-3xl font-bold mb-2 text-white">Landing Page</h1>
      <p className="text-[#888888] mb-8">
        Configure your campaign landing page. AI will generate content based on
        your strategy.
      </p>

      {/* Template Selection */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-white">
          Choose a Template
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedTemplate === template.id
                  ? "border-[#FF4500] bg-[#FF4500]/5"
                  : "border-[#333333] bg-[#1A1A1A] hover:border-[#444444]"
              }`}
            >
              <div className={`inline-flex p-2 rounded-lg ${template.color}`}>
                {template.icon}
              </div>
              <h3 className="font-medium mt-3 text-white">{template.name}</h3>
              <p className="text-sm text-[#888888] mt-1">
                {template.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Landing Page Content */}
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Page Content</h2>
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#333333] hover:bg-[#444444] text-sm text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`}
            />
            Regenerate
          </button>
        </div>

        <div className="space-y-5">
          {/* Headline */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Headline
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="The main attention-grabbing headline"
              className="w-full px-4 py-3 rounded border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
            />
          </div>

          {/* Subhead */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Subheadline
            </label>
            <textarea
              value={subhead}
              onChange={(e) => setSubhead(e.target.value)}
              placeholder="Supporting text that expands on the headline"
              rows={2}
              className="w-full px-4 py-3 rounded border border-[#333333] bg-[#0D0D0D] text-white resize-none focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
            />
          </div>

          {/* Bullet Points */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Key Benefits
            </label>
            <div className="space-y-2">
              {bullets.map((bullet, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={bullet}
                    onChange={(e) => handleBulletChange(index, e.target.value)}
                    placeholder={`Benefit ${index + 1}`}
                    className="flex-1 px-4 py-2 rounded border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
                  />
                  {bullets.length > 1 && (
                    <button
                      onClick={() => handleRemoveBullet(index)}
                      className="px-3 rounded border border-[#333333] hover:bg-[#333333] text-[#888888] transition-colors"
                    >
                      -
                    </button>
                  )}
                </div>
              ))}
            </div>
            {bullets.length < 6 && (
              <button
                onClick={handleAddBullet}
                className="mt-2 text-sm text-[#FF4500] hover:underline"
              >
                + Add another benefit
              </button>
            )}
          </div>

          {/* CTA */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Call to Action Button
            </label>
            <input
              type="text"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="e.g., Download Free Guide"
              className="w-full px-4 py-3 rounded border border-[#333333] bg-[#0D0D0D] text-white focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
            />
          </div>
        </div>
      </div>

      {/* Gamma Option */}
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-4 mb-8">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-white">Generate with Gamma</p>
              <p className="text-sm text-[#888888]">
                Create a beautiful landing page using Gamma AI
              </p>
            </div>
          </div>
          <button
            onClick={() => setUseGamma(!useGamma)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              useGamma ? "bg-[#FF4500]" : "bg-[#333333]"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                useGamma ? "left-7" : "left-1"
              }`}
            />
          </button>
        </label>
      </div>

      {/* Preview Card */}
      {headline && (
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-[#333333] rounded-xl p-8 mb-8">
          <p className="text-xs uppercase tracking-wide text-[#FF4500] mb-2">
            Preview
          </p>
          <h3 className="text-2xl font-bold text-white mb-2">{headline}</h3>
          <p className="text-[#888888] mb-4">{subhead}</p>
          <ul className="space-y-2 mb-6">
            {bullets.filter((b) => b.trim()).map((bullet, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-[#FF4500] rounded-full mt-2" />
                <span className="text-[#888888]">{bullet}</span>
              </li>
            ))}
          </ul>
          <div className="inline-block px-6 py-3 bg-gradient-to-r from-[#FF4500] to-[#CC3700] rounded-lg font-medium text-white">
            {cta || "Get Started"}
          </div>
        </div>
      )}

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={!canProceed}
        className="w-full flex items-center justify-center gap-2 bg-[#FF4500] hover:bg-[#CC3700] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-4 rounded-lg font-medium text-white transition-colors"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
