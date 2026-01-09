"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Rocket,
  Calendar,
  MessageSquare,
  Sparkles,
  FileText,
  Layout,
  Share2,
} from "lucide-react";
import Step1LeadMagnet from "./components/Step1LeadMagnet";
import Step2Template from "./components/Step2Template";
import Step3Review from "./components/Step3Review";
import { LANDING_PAGE_TEMPLATES } from "@/lib/landing-pages/templates";

type CampaignGoal = "email_signups" | "sales" | "awareness" | "engagement";

interface LeadMagnet {
  id: string;
  title: string;
  description?: string | null;
  fileUrl: string;
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

interface WizardState {
  // Step 3: Content Review
  name: string;
  keyMessages: string[];
  hooks: string[];
  // Step 4: Schedule
  startDate: string;
  durationDays: number;
  // Step 5: Platforms
  platforms: string[];
  postsPerDay: {
    twitter: number;
    facebook: number;
    instagram: number;
  };
  youtubeShorts: number;
  youtubeStandard: number;
  // Step 6 Review extras
  goal: CampaignGoal;
  productUrl: string;
}

const STEPS = [
  { id: 1, name: "Lead Magnet", icon: FileText },
  { id: 2, name: "Template", icon: Layout },
  { id: 3, name: "Content", icon: MessageSquare },
  { id: 4, name: "Schedule", icon: Calendar },
  { id: 5, name: "Platforms", icon: Share2 },
  { id: 6, name: "Review", icon: Check },
  { id: 7, name: "Generate", icon: Sparkles },
];

export default function CreateCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<"landing" | "posts">("landing");

  // Lead magnet state (Step 1)
  const [selectedLeadMagnet, setSelectedLeadMagnet] = useState<LeadMagnet | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  // Template state (Step 2)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Generated landing page URL
  const [landingPageUrl, setLandingPageUrl] = useState<string | null>(null);

  const [state, setState] = useState<WizardState>({
    name: "",
    keyMessages: [],
    hooks: [],
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    durationDays: 10,
    platforms: ["twitter", "facebook", "instagram"],
    postsPerDay: { twitter: 1, facebook: 1, instagram: 1 },
    youtubeShorts: 2,
    youtubeStandard: 0,
    goal: "email_signups",
    productUrl: "",
  });

  const updateState = useCallback((updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const nextStep = () => setStep((s) => Math.min(s + 1, 7));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // Handle Step 1 selection
  const handleLeadMagnetSelect = (lm: LeadMagnet, data: ExtractedData) => {
    setSelectedLeadMagnet(lm);
    setExtractedData(data);
    // Pre-fill name from lead magnet
    updateState({
      name: `${lm.title} Campaign`,
      keyMessages: data.keyMessages || [],
      hooks: data.hooks || [],
    });
    nextStep();
  };

  // Handle Step 2 selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    nextStep();
  };

  // Handle Step 3 content review updates
  const handleContentUpdate = useCallback((data: { name: string; keyMessages: string[]; hooks: string[] }) => {
    updateState(data);
  }, [updateState]);

  const createCampaign = async () => {
    if (!selectedLeadMagnet || !selectedTemplate) return;

    setGenerating(true);
    setGenerationPhase("landing");

    try {
      // Phase 1: Generate landing page
      const landingRes = await fetch("/api/landing-pages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadMagnetId: selectedLeadMagnet.id,
          template: selectedTemplate,
          title: extractedData?.title || selectedLeadMagnet.title,
          keyMessages: state.keyMessages.filter((m) => m.trim()),
        }),
      });

      const landingData = await landingRes.json();
      let gammaUrl = landingData.gammaUrl || landingData.url || "";
      setLandingPageUrl(gammaUrl);

      // Phase 2: Create campaign
      setGenerationPhase("posts");

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          campaignType: "product_launch",
          goal: state.goal,
          productName: selectedLeadMagnet.title,
          productUrl: gammaUrl || state.productUrl,
          keyMessages: state.keyMessages.filter((m) => m.trim()),
          startDate: state.startDate,
          durationDays: state.durationDays,
          platforms: state.platforms,
          postsPerDay: state.postsPerDay,
          youtubeShorts: state.youtubeShorts,
          youtubeStandard: state.youtubeStandard,
          // Include lead magnet reference
          leadMagnetId: selectedLeadMagnet.id,
          landingPageTemplate: selectedTemplate,
        }),
      });

      const data = await res.json();

      if (data.success) {
        pollCampaignStatus(data.campaignId);
      } else {
        alert(data.error || "Failed to create campaign");
        setGenerating(false);
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      alert("Failed to create campaign");
      setGenerating(false);
    }
  };

  const pollCampaignStatus = async (id: string) => {
    const checkStatus = async () => {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();

      if (data.campaign?.status === "review") {
        router.push(`/campaigns/${id}`);
      } else if (data.campaign?.status === "generating") {
        setTimeout(checkStatus, 2000);
      } else {
        setGenerating(false);
      }
    };

    checkStatus();
  };

  const totalPosts =
    state.durationDays *
    (state.postsPerDay.twitter + state.postsPerDay.facebook + state.postsPerDay.instagram);

  // Get template name for display
  const templateName = selectedTemplate
    ? LANDING_PAGE_TEMPLATES[selectedTemplate]?.name || selectedTemplate
    : "";

  // Check if can proceed to next step
  const canProceed = () => {
    switch (step) {
      case 1:
        return !!selectedLeadMagnet;
      case 2:
        return !!selectedTemplate;
      case 3:
        return state.name.trim().length > 0;
      case 4:
        return true;
      case 5:
        return state.platforms.length > 0;
      case 6:
        return true;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/campaigns")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Campaigns
          </button>
          <h1 className="text-xl font-semibold">Create Campaign</h1>
          <div className="w-24" />
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-[#2A2A2A] py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isComplete = step > s.id;
            const isCurrent = step === s.id;

            return (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition ${
                    isComplete
                      ? "bg-[#FF4500] border-[#FF4500]"
                      : isCurrent
                      ? "border-[#FF4500] text-[#FF4500]"
                      : "border-[#2A2A2A] text-gray-500"
                  }`}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      isComplete ? "bg-[#FF4500]" : "bg-[#2A2A2A]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-8">
        {/* Step 1: Select Lead Magnet */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Select Lead Magnet</h2>
              <p className="text-gray-400">
                Choose an existing PDF or upload a new one to base your campaign on
              </p>
            </div>
            <Step1LeadMagnet
              onSelect={handleLeadMagnetSelect}
              selectedId={selectedLeadMagnet?.id}
            />
          </div>
        )}

        {/* Step 2: Choose Template */}
        {step === 2 && selectedLeadMagnet && extractedData && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Choose Landing Page Template</h2>
              <p className="text-gray-400">
                Select a template that best fits your campaign goals
              </p>
            </div>
            <Step2Template
              leadMagnet={selectedLeadMagnet}
              extractedData={extractedData}
              onSelect={handleTemplateSelect}
              selectedTemplate={selectedTemplate || undefined}
            />
          </div>
        )}

        {/* Step 3: Review Content */}
        {step === 3 && selectedLeadMagnet && extractedData && selectedTemplate && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Review & Edit Content</h2>
              <p className="text-gray-400">
                Review AI-extracted content and make any adjustments
              </p>
            </div>
            <Step3Review
              leadMagnet={selectedLeadMagnet}
              extractedData={extractedData}
              template={selectedTemplate}
              onUpdate={handleContentUpdate}
            />
          </div>
        )}

        {/* Step 4: Schedule */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Schedule</h2>
              <p className="text-gray-400">When should this campaign run?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={state.startDate}
                  onChange={(e) => updateState({ startDate: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg focus:border-[#FF4500] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Duration: {state.durationDays} days
                </label>
                <input
                  type="range"
                  min={5}
                  max={21}
                  value={state.durationDays}
                  onChange={(e) =>
                    updateState({ durationDays: parseInt(e.target.value) })
                  }
                  className="w-full accent-[#FF4500]"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5 days</span>
                  <span>21 days</span>
                </div>
              </div>

              <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]">
                <div className="text-sm text-gray-400">Campaign will run:</div>
                <div className="text-lg font-semibold mt-1">
                  {new Date(state.startDate).toLocaleDateString()} -{" "}
                  {new Date(
                    new Date(state.startDate).getTime() +
                      (state.durationDays - 1) * 24 * 60 * 60 * 1000
                  ).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Platforms */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Platforms & Frequency</h2>
              <p className="text-gray-400">
                Where and how often should we post?
              </p>
            </div>

            <div className="space-y-4">
              {["twitter", "facebook", "instagram"].map((platform) => (
                <div
                  key={platform}
                  className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={state.platforms.includes(platform)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateState({
                            platforms: [...state.platforms, platform],
                          });
                        } else {
                          updateState({
                            platforms: state.platforms.filter((p) => p !== platform),
                          });
                        }
                      }}
                      className="w-5 h-5 accent-[#FF4500]"
                    />
                    <span className="capitalize font-medium">{platform}</span>
                  </div>

                  {state.platforms.includes(platform) && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Posts/day:</span>
                      <select
                        value={state.postsPerDay[platform as keyof typeof state.postsPerDay]}
                        onChange={(e) =>
                          updateState({
                            postsPerDay: {
                              ...state.postsPerDay,
                              [platform]: parseInt(e.target.value),
                            },
                          })
                        }
                        className="p-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}

              <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                <div className="font-medium mb-3">YouTube Videos</div>
                <div className="flex gap-6">
                  <div>
                    <label className="text-sm text-gray-400">Shorts</label>
                    <select
                      value={state.youtubeShorts}
                      onChange={(e) =>
                        updateState({ youtubeShorts: parseInt(e.target.value) })
                      }
                      className="block mt-1 p-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded"
                    >
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Standard</label>
                    <select
                      value={state.youtubeStandard}
                      onChange={(e) =>
                        updateState({ youtubeStandard: parseInt(e.target.value) })
                      }
                      className="block mt-1 p-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded"
                    >
                      {[0, 1, 2, 3].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#FF4500]/10 border border-[#FF4500]/30 rounded-lg">
                <div className="text-[#F4A300] font-medium">Content Summary</div>
                <div className="mt-2 text-sm">
                  {totalPosts} social posts + {state.youtubeShorts + state.youtubeStandard} videos
                  over {state.durationDays} days
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Review Campaign</h2>
              <p className="text-gray-400">
                Make sure everything looks good before generating
              </p>
            </div>

            <div className="space-y-4">
              {/* Campaign Name */}
              <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                <div className="text-sm text-gray-400">Campaign Name</div>
                <div className="font-semibold">{state.name || "Untitled Campaign"}</div>
              </div>

              {/* Lead Magnet & Template */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                  <div className="text-sm text-gray-400">Lead Magnet</div>
                  <div className="font-semibold truncate">
                    {selectedLeadMagnet?.title || "Not selected"}
                  </div>
                </div>
                <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                  <div className="text-sm text-gray-400">Landing Page</div>
                  <div className="font-semibold">{templateName || "Not selected"}</div>
                </div>
              </div>

              {/* Duration */}
              <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                <div className="text-sm text-gray-400">Duration</div>
                <div className="font-semibold">
                  {state.durationDays} days ({new Date(state.startDate).toLocaleDateString()} -{" "}
                  {new Date(
                    new Date(state.startDate).getTime() +
                      (state.durationDays - 1) * 24 * 60 * 60 * 1000
                  ).toLocaleDateString()})
                </div>
              </div>

              {/* Content Stats */}
              <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                <div className="text-sm text-gray-400">Content to Generate</div>
                <div className="font-semibold">
                  1 landing page + {totalPosts} social posts + {state.youtubeShorts + state.youtubeStandard} videos
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Platforms: {state.platforms.join(", ")}
                </div>
              </div>

              {/* Key Messages Count */}
              {state.keyMessages.filter((m) => m.trim()).length > 0 && (
                <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                  <div className="text-sm text-gray-400 mb-2">
                    Key Messages ({state.keyMessages.filter((m) => m.trim()).length})
                  </div>
                  <ul className="space-y-1">
                    {state.keyMessages
                      .filter((m) => m.trim())
                      .slice(0, 3)
                      .map((msg, i) => (
                        <li key={i} className="text-sm truncate">
                          • {msg}
                        </li>
                      ))}
                    {state.keyMessages.filter((m) => m.trim()).length > 3 && (
                      <li className="text-sm text-gray-500">
                        + {state.keyMessages.filter((m) => m.trim()).length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Landing Page Status */}
              <div className="p-4 bg-[#FF4500]/10 border border-[#FF4500]/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Layout className="w-5 h-5 text-[#FF4500]" />
                  <span className="font-medium text-[#FF4500]">Landing Page</span>
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  A {templateName} landing page will be generated via Gamma API
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Generate */}
        {step === 7 && (
          <div className="space-y-6 text-center py-8">
            {generating ? (
              <>
                <Loader2 className="w-16 h-16 mx-auto text-[#FF4500] animate-spin" />
                <h2 className="text-2xl font-bold">
                  {generationPhase === "landing"
                    ? "Creating Landing Page..."
                    : "Generating Posts..."}
                </h2>
                <p className="text-gray-400">
                  {generationPhase === "landing"
                    ? "AI is building your landing page with Gamma..."
                    : `AI is creating ${totalPosts} posts and ${state.youtubeShorts + state.youtubeStandard} video scripts...`}
                </p>
                {landingPageUrl && (
                  <p className="text-sm text-green-400">
                    Landing page created successfully
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  This usually takes 30-60 seconds
                </p>
              </>
            ) : (
              <>
                <Rocket className="w-16 h-16 mx-auto text-[#FF4500]" />
                <h2 className="text-2xl font-bold">Ready to Generate!</h2>
                <p className="text-gray-400">
                  Click below to generate your landing page and all campaign content
                </p>
                <div className="bg-[#1A1A1A] rounded-lg p-4 text-left max-w-md mx-auto border border-[#2A2A2A]">
                  <div className="text-sm text-gray-400 mb-2">Will create:</div>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <Layout className="w-4 h-4 text-[#FF4500]" />
                      1 {templateName} landing page
                    </li>
                    <li className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#FF4500]" />
                      {totalPosts} social media posts
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#FF4500]" />
                      {state.youtubeShorts + state.youtubeStandard} video scripts
                    </li>
                  </ul>
                </div>
                <button
                  onClick={createCampaign}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg text-lg font-semibold transition"
                >
                  <Sparkles className="w-6 h-6" />
                  Generate Campaign
                </button>
              </>
            )}
          </div>
        )}

        {/* Navigation */}
        {step < 7 && (
          <div className="flex justify-between mt-8 pt-8 border-t border-[#2A2A2A]">
            <button
              onClick={prevStep}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {step === 6 ? "Ready to Generate" : "Continue"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
