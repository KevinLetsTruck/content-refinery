"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Rocket,
  Target,
  Calendar,
  MessageSquare,
  Image,
  Sparkles,
  Wand2,
  Link,
  FileText,
  X,
} from "lucide-react";

type CampaignType = "product_launch" | "educational_series" | "custom";
type CampaignGoal = "email_signups" | "sales" | "awareness" | "engagement";

interface WizardState {
  // Step 1: Type
  campaignType: CampaignType;
  // Step 2: Details
  name: string;
  goal: CampaignGoal;
  productName: string;
  productUrl: string;
  topic: string;
  // Step 3: Messages
  keyMessages: string[];
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
}

interface AutoGenerateResult {
  summary: string;
  keyFindings: string[];
  campaign: {
    name: string;
    campaignType: CampaignType;
    goal: CampaignGoal;
    productName: string;
    keyMessages: string[];
    suggestedDuration: number;
    angles: string[];
    hooks: string[];
  };
}

const STEPS = [
  { id: 1, name: "Type", icon: Target },
  { id: 2, name: "Details", icon: MessageSquare },
  { id: 3, name: "Messages", icon: MessageSquare },
  { id: 4, name: "Schedule", icon: Calendar },
  { id: 5, name: "Platforms", icon: Image },
  { id: 6, name: "Review", icon: Check },
  { id: 7, name: "Generate", icon: Sparkles },
];

export default function CreateCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  
  // Smart input state
  const [showSmartInput, setShowSmartInput] = useState(true);
  const [smartInput, setSmartInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AutoGenerateResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [state, setState] = useState<WizardState>({
    campaignType: "product_launch",
    name: "",
    goal: "email_signups",
    productName: "",
    productUrl: "",
    topic: "",
    keyMessages: ["", "", ""],
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    durationDays: 10,
    platforms: ["twitter", "facebook", "instagram"],
    postsPerDay: { twitter: 1, facebook: 1, instagram: 1 },
    youtubeShorts: 2,
    youtubeStandard: 0,
  });

  const updateState = (updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 7));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // Smart Input Analysis
  const analyzeInput = async () => {
    if (!smartInput.trim()) return;
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    
    try {
      const res = await fetch("/api/campaigns/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: smartInput }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze");
      }
      
      setAnalysisResult(data);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAnalysisResult = () => {
    if (!analysisResult) return;
    
    const { campaign } = analysisResult;
    
    updateState({
      name: campaign.name,
      campaignType: campaign.campaignType,
      goal: campaign.goal,
      productName: campaign.productName || "",
      keyMessages: campaign.keyMessages.length > 0 
        ? campaign.keyMessages 
        : ["", "", ""],
      durationDays: campaign.suggestedDuration || 10,
    });
    
    setShowSmartInput(false);
    setStep(1);
  };

  const skipSmartInput = () => {
    setShowSmartInput(false);
    setStep(1);
  };

  const createCampaign = async () => {
    setGenerating(true);
    
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...state,
          keyMessages: state.keyMessages.filter((m) => m.trim()),
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

  // Smart Input Screen
  if (showSmartInput) {
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

        <div className="max-w-3xl mx-auto p-8">
          {/* Smart Input Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#FF4500] to-[#F4A300] mb-4">
              <Wand2 className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold mb-2">AI Campaign Generator</h2>
            <p className="text-gray-400 max-w-lg mx-auto">
              Paste a URL with your instructions and AI will analyze the content, 
              extract key points, and pre-fill your entire campaign.
            </p>
          </div>

          {/* Input Area */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 mb-6">
            <label className="block text-sm font-medium mb-3 text-gray-300">
              Paste URL + Instructions
            </label>
            <textarea
              value={smartInput}
              onChange={(e) => setSmartInput(e.target.value)}
              placeholder={`Example:
Create a comprehensive report. If this is true compare it to today's conventional medicine view of cholesterol and why statins are so widely prescribed.
__https://pmc.ncbi.nlm.nih.gov/articles/PMC10828184/__

Or simply:
https://example.com/article - Create an educational series about this topic`}
              rows={6}
              className="w-full p-4 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg focus:border-[#FF4500] outline-none resize-none text-white placeholder-gray-500"
            />
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
              <Link className="w-4 h-4" />
              <span>Wrap URLs in __underscores__ or paste them directly</span>
            </div>
          </div>

          {/* Error Message */}
          {analysisError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{analysisError}</p>
            </div>
          )}

          {/* Analysis Result */}
          {analysisResult && (
            <div className="bg-[#1A1A1A] rounded-xl border border-[#FF4500]/30 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#FF4500]" />
                <h3 className="font-semibold text-lg">Analysis Complete</h3>
              </div>
              
              {/* Summary */}
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-1">Summary</div>
                <p className="text-gray-200">{analysisResult.summary}</p>
              </div>
              
              {/* Key Findings */}
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2">Key Findings</div>
                <ul className="space-y-1">
                  {analysisResult.keyFindings.map((finding, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-[#FF4500] mt-1">•</span>
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Suggested Campaign */}
              <div className="bg-[#0D0D0D] rounded-lg p-4 border border-[#2A2A2A]">
                <div className="text-sm text-gray-400 mb-2">Suggested Campaign</div>
                <div className="font-semibold text-lg mb-2">{analysisResult.campaign.name}</div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <span className="text-gray-500">Type:</span>{" "}
                    <span className="capitalize">{analysisResult.campaign.campaignType.replace("_", " ")}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>{" "}
                    {analysisResult.campaign.suggestedDuration} days
                  </div>
                  <div>
                    <span className="text-gray-500">Goal:</span>{" "}
                    <span className="capitalize">{analysisResult.campaign.goal.replace("_", " ")}</span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-400 mb-2">Key Messages</div>
                <ul className="space-y-1 mb-4">
                  {analysisResult.campaign.keyMessages.map((msg, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-[#F4A300]">{i + 1}.</span>
                      {msg}
                    </li>
                  ))}
                </ul>
                
                {analysisResult.campaign.hooks && analysisResult.campaign.hooks.length > 0 && (
                  <>
                    <div className="text-sm text-gray-400 mb-2">Content Hooks</div>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.campaign.hooks.slice(0, 3).map((hook, i) => (
                        <span 
                          key={i} 
                          className="px-3 py-1 bg-[#FF4500]/10 text-[#FF4500] rounded-full text-xs"
                        >
                          {hook}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={applyAnalysisResult}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg font-semibold transition"
                >
                  <Check className="w-5 h-5" />
                  Use This Campaign
                </button>
                <button
                  onClick={() => {
                    setAnalysisResult(null);
                    setSmartInput("");
                  }}
                  className="px-6 py-3 border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-lg transition"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!analysisResult && (
            <div className="flex gap-4">
              <button
                onClick={analyzeInput}
                disabled={!smartInput.trim() || isAnalyzing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Analyze & Generate
                  </>
                )}
              </button>
              <button
                onClick={skipSmartInput}
                className="px-6 py-4 text-gray-400 hover:text-white hover:bg-[#1A1A1A] rounded-lg transition"
              >
                Skip, create manually
              </button>
            </div>
          )}

          {/* Example Cards */}
          {!analysisResult && !isAnalyzing && (
            <div className="mt-12">
              <h3 className="text-sm font-medium text-gray-500 mb-4">Example inputs:</h3>
              <div className="grid gap-3">
                {[
                  {
                    icon: FileText,
                    title: "Research Article",
                    example: "Create an educational series comparing this to mainstream advice\n__https://pubmed.ncbi.nlm.nih.gov/...__",
                  },
                  {
                    icon: Link,
                    title: "Product Page",
                    example: "Launch campaign for this new supplement\nhttps://letstruck.com/products/new-item",
                  },
                  {
                    icon: MessageSquare,
                    title: "Blog Post",
                    example: "Turn this into a 7-day awareness campaign focused on gut health\n__https://blog.example.com/article__",
                  },
                ].map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setSmartInput(ex.example)}
                    className="flex items-start gap-4 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-left hover:border-[#3A3A3A] transition"
                  >
                    <ex.icon className="w-5 h-5 text-[#F4A300] mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">{ex.title}</div>
                      <div className="text-xs text-gray-500 mt-1 whitespace-pre-line">{ex.example}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
          <button
            onClick={() => setShowSmartInput(true)}
            className="flex items-center gap-2 text-[#FF4500] hover:text-[#FF5722] transition text-sm"
          >
            <Wand2 className="w-4 h-4" />
            AI Generate
          </button>
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
        {/* Step 1: Campaign Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Choose Campaign Type</h2>
              <p className="text-gray-400">
                Select the type of campaign you want to create
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  id: "product_launch",
                  name: "Product Launch",
                  desc: "Tease → Announce → Educate → Social Proof → Urgency",
                  duration: "10-14 days",
                },
                {
                  id: "educational_series",
                  name: "Educational Series",
                  desc: "Hook → Foundation → Deep Dives → Integration → CTA",
                  duration: "5-7 days",
                },
                {
                  id: "custom",
                  name: "Custom Campaign",
                  desc: "Define your own phases and structure",
                  duration: "Flexible",
                },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => updateState({ campaignType: type.id as CampaignType })}
                  className={`w-full p-4 rounded-lg border text-left transition ${
                    state.campaignType === type.id
                      ? "border-[#FF4500] bg-[#FF4500]/10"
                      : "border-[#2A2A2A] hover:border-[#3A3A3A]"
                  }`}
                >
                  <div className="font-semibold">{type.name}</div>
                  <div className="text-sm text-gray-400 mt-1">{type.desc}</div>
                  <div className="text-xs text-[#F4A300] mt-2">
                    Typical duration: {type.duration}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Campaign Details</h2>
              <p className="text-gray-400">
                Tell us about your campaign
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={state.name}
                  onChange={(e) => updateState({ name: e.target.value })}
                  placeholder="e.g., 7-Day Gut Reset Challenge Launch"
                  className="w-full p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg focus:border-[#FF4500] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Goal *</label>
                <select
                  value={state.goal}
                  onChange={(e) => updateState({ goal: e.target.value as CampaignGoal })}
                  className="w-full p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg focus:border-[#FF4500] outline-none"
                >
                  <option value="email_signups">Email Signups</option>
                  <option value="sales">Sales / Purchases</option>
                  <option value="awareness">Brand Awareness</option>
                  <option value="engagement">Engagement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={state.productName}
                  onChange={(e) => updateState({ productName: e.target.value })}
                  placeholder="e.g., Gut Reset Challenge"
                  className="w-full p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg focus:border-[#FF4500] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  CTA URL
                </label>
                <input
                  type="url"
                  value={state.productUrl}
                  onChange={(e) => updateState({ productUrl: e.target.value })}
                  placeholder="https://letstruck.com/gut-reset"
                  className="w-full p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg focus:border-[#FF4500] outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Key Messages */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Key Messages</h2>
              <p className="text-gray-400">
                What are the main points you want to communicate?
              </p>
            </div>

            <div className="space-y-4">
              {state.keyMessages.map((msg, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium mb-2">
                    Message {i + 1}
                  </label>
                  <input
                    type="text"
                    value={msg}
                    onChange={(e) => {
                      const newMessages = [...state.keyMessages];
                      newMessages[i] = e.target.value;
                      updateState({ keyMessages: newMessages });
                    }}
                    placeholder={
                      i === 0
                        ? "e.g., 70% of drivers have Candida overgrowth"
                        : i === 1
                        ? "e.g., Free 7-day protocol included"
                        : "e.g., No supplements required to start"
                    }
                    className="w-full p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg focus:border-[#FF4500] outline-none"
                  />
                </div>
              ))}
              
              <button
                onClick={() =>
                  updateState({ keyMessages: [...state.keyMessages, ""] })
                }
                className="text-[#FF4500] text-sm hover:underline"
              >
                + Add another message
              </button>
            </div>
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
              <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                <div className="text-sm text-gray-400">Campaign Name</div>
                <div className="font-semibold">{state.name || "Untitled Campaign"}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                  <div className="text-sm text-gray-400">Type</div>
                  <div className="font-semibold capitalize">
                    {state.campaignType.replace("_", " ")}
                  </div>
                </div>
                <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                  <div className="text-sm text-gray-400">Goal</div>
                  <div className="font-semibold capitalize">
                    {state.goal.replace("_", " ")}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                <div className="text-sm text-gray-400">Duration</div>
                <div className="font-semibold">
                  {state.durationDays} days ({new Date(state.startDate).toLocaleDateString()} - {new Date(
                    new Date(state.startDate).getTime() +
                      (state.durationDays - 1) * 24 * 60 * 60 * 1000
                  ).toLocaleDateString()})
                </div>
              </div>

              <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                <div className="text-sm text-gray-400">Content to Generate</div>
                <div className="font-semibold">
                  {totalPosts} social posts + {state.youtubeShorts + state.youtubeStandard} videos
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Platforms: {state.platforms.join(", ")}
                </div>
              </div>

              {state.keyMessages.filter((m) => m.trim()).length > 0 && (
                <div className="p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                  <div className="text-sm text-gray-400 mb-2">Key Messages</div>
                  <ul className="space-y-1">
                    {state.keyMessages
                      .filter((m) => m.trim())
                      .map((msg, i) => (
                        <li key={i} className="text-sm">
                          • {msg}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 7: Generate */}
        {step === 7 && (
          <div className="space-y-6 text-center py-8">
            {generating ? (
              <>
                <Loader2 className="w-16 h-16 mx-auto text-[#FF4500] animate-spin" />
                <h2 className="text-2xl font-bold">Generating Your Campaign</h2>
                <p className="text-gray-400">
                  AI is creating {totalPosts} posts and {state.youtubeShorts + state.youtubeStandard} video scripts...
                </p>
                <p className="text-sm text-gray-500">
                  This usually takes 30-60 seconds
                </p>
              </>
            ) : (
              <>
                <Rocket className="w-16 h-16 mx-auto text-[#FF4500]" />
                <h2 className="text-2xl font-bold">Ready to Generate!</h2>
                <p className="text-gray-400">
                  Click below to generate all your campaign content with AI
                </p>
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
              disabled={step === 2 && !state.name}
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

